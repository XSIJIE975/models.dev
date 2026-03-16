#!/usr/bin/env tsx

import { access, readFile } from "node:fs/promises";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer, type ViteDevServer } from "vite";

import {
  BASE_PATH_ENV,
  getBasePath,
  stripBasePath,
  withBasePath,
} from "./base-path.js";

const port = 16_000;
const hostname = "0.0.0.0";
const basePath = getBasePath(process.env[BASE_PATH_ENV]);
const baseRootPath = withBasePath("/", basePath);
const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const providersRoot = path.resolve(webRoot, "..", "..", "providers");
const defaultLogoPath = path.join(providersRoot, "logo.svg");

type RenderResult = {
  Rendered: string;
  Providers: unknown;
};

type RenderModule = {
  default?: () => Promise<RenderResult>;
  render?: () => Promise<RenderResult>;
};

const pathExists = async (targetPath: string) => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const createBaseUrl = (request: IncomingMessage) => {
  return new URL(request.url ?? "/", `http://${request.headers.host ?? `localhost:${port}`}`);
};

const loadRenderResult = async (vite: ViteDevServer) => {
  const renderModule = (await vite.ssrLoadModule("/src/render.tsx")) as RenderModule;
  const render = renderModule.render ?? renderModule.default;

  if (!render) {
    throw new Error("render.tsx must export render() or default render");
  }

  return render();
};

const sendJson = (response: ServerResponse, body: unknown) => {
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
};

const redirect = (response: ServerResponse, location: string) => {
  response.statusCode = 302;
  response.setHeader("Location", location);
  response.end();
};

const sendSvg = async (response: ServerResponse, providerId: string) => {
  const providerLogoPath = path.join(providersRoot, providerId, "logo.svg");
  const logoPath = (await pathExists(providerLogoPath))
    ? providerLogoPath
    : defaultLogoPath;

  if (!(await pathExists(logoPath))) {
    response.statusCode = 404;
    response.end("Logo not found");
    return;
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", "image/svg+xml");
  response.setHeader("Cache-Control", "public, max-age=3600");
  response.end(await readFile(logoPath));
};

const sendIndexHtml = async (
  requestUrl: URL,
  response: ServerResponse,
  vite: ViteDevServer
) => {
  const template = await readFile(path.join(webRoot, "index.html"), "utf8");
  const { Rendered } = await loadRenderResult(vite);
  const transformedTemplate = await vite.transformIndexHtml(
    requestUrl.pathname,
    template
  );
  const html = transformedTemplate.replace("<!--static-->", Rendered);

  response.statusCode = 200;
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(html);
};

const runViteMiddleware = async (
  vite: ViteDevServer,
  request: IncomingMessage,
  response: ServerResponse
) => {
  await new Promise<void>((resolve, reject: (reason?: unknown) => void) => {
    vite.middlewares(request, response, (error: Error | null | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
};

const main = async () => {
  const httpServer = createServer();
  const vite = await createViteServer({
    root: webRoot,
    configFile: path.join(webRoot, "vite.config.ts"),
    appType: "custom",
    server: {
      middlewareMode: true,
      hmr: { server: httpServer },
    },
  });

  httpServer.on("request", (request, response) => {
    void (async () => {
      const requestUrl = createBaseUrl(request);

      try {
        if (basePath !== "/" && requestUrl.pathname === basePath) {
          redirect(response, baseRootPath);
          return;
        }

        const appPath = stripBasePath(requestUrl.pathname, basePath);

        if (!appPath) {
          response.statusCode = 404;
          response.end("Not found");
          return;
        }

        if (appPath === "/api.json") {
          const { Providers } = await loadRenderResult(vite);
          sendJson(response, Providers);
          return;
        }

        if (appPath.startsWith("/logos/") && appPath.endsWith(".svg")) {
          const providerId = decodeURIComponent(
            appPath.slice("/logos/".length, -".svg".length)
          );
          await sendSvg(response, providerId);
          return;
        }

        if (
          appPath === "/" ||
          appPath === "/index" ||
          appPath === "/index.html"
        ) {
          await sendIndexHtml(requestUrl, response, vite);
          return;
        }

        await runViteMiddleware(vite, request, response);

        if (!response.writableEnded) {
          response.statusCode = 404;
          response.end("Not found");
        }
      } catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error));
        vite.ssrFixStacktrace(failure);
        response.statusCode = 500;
        response.setHeader("Content-Type", "text/plain; charset=utf-8");
        response.end(failure.stack ?? failure.message);
      }
    })();
  });

  httpServer.listen(port, hostname, () => {
    console.log(`Dev server running at http://localhost:${port}`);
  });
};

void main();
