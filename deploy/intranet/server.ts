#!/usr/bin/env tsx

import { access, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  BASE_PATH_ENV,
  getBasePath,
  stripBasePath,
  withBasePath,
} from "../../packages/web/src/base-path.js";

const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
const rootDir = path.resolve(scriptDirectory, "..", "..");
const requireFromWeb = createRequire(
  path.join(rootDir, "packages", "web", "package.json")
);
const { serve } = requireFromWeb("@hono/node-server") as {
  serve: (options: {
    fetch: (request: Request) => Response | Promise<Response>;
    hostname: string;
    port: number;
  }) => unknown;
};
const { Hono } = requireFromWeb("hono") as {
  Hono: new () => {
    fetch: (request: Request) => Response | Promise<Response>;
    get: (
      path: string,
      handler: (context: {
        req: { path: string };
        body: (
          body: string,
          status?: number,
          headers?: Record<string, string>
        ) => Response;
        text: (body: string, status?: number) => Response;
      }) => Response | Promise<Response>
    ) => unknown;
  };
};
const distDir = process.env.DIST_DIR
  ? path.resolve(process.env.DIST_DIR)
  : path.join(rootDir, "packages", "web", "dist");
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? "3000");
const basePath = getBasePath(process.env[BASE_PATH_ENV]);
const baseRootPath = withBasePath("/", basePath);

const apiJsonPath = path.join(distDir, "_api.json");
const indexPath = path.join(distDir, "_index.html");
const faviconPath = path.join(distDir, "favicon.svg");
const socialSharePath = path.join(distDir, "social-share.png");
const assetsDir = path.join(distDir, "assets");
const fontsDir = path.join(distDir, "fonts");
const logosDir = path.join(distDir, "logos");
const defaultLogoPath = path.join(logosDir, "default.svg");

type ProviderData = Record<string, { models?: Record<string, unknown> }>;

let modelSchemaCache = "";
let modelSchemaCacheAt = 0;

const pathExists = async (targetPath: string) => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const resolveSafePath = (basePath: string, requestPath: string) => {
  const cleanedPath = requestPath.replace(/^\/+/, "");
  const resolvedPath = path.resolve(basePath, cleanedPath);

  if (
    resolvedPath !== basePath &&
    !resolvedPath.startsWith(`${basePath}${path.sep}`)
  ) {
    return null;
  }

  return resolvedPath;
};

const getContentType = (filePath: string) => {
  switch (path.extname(filePath).toLowerCase()) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".map":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
};

const createFileResponse = async (
  filePath: string,
  cacheControl = "public, max-age=3600"
) => {
  const body = await readFile(filePath);

  return new Response(body, {
    headers: {
      "Content-Type": getContentType(filePath),
      "Cache-Control": cacheControl,
    },
  });
};

const buildModelSchema = async (): Promise<string> => {
  const now = Date.now();
  if (modelSchemaCache && now - modelSchemaCacheAt < 60_000) {
    return modelSchemaCache;
  }

  const providers = JSON.parse(
    await readFile(apiJsonPath, "utf8")
  ) as ProviderData;
  const modelIds: string[] = [];

  for (const [providerId, provider] of Object.entries(providers)) {
    for (const modelId of Object.keys(provider.models ?? {})) {
      modelIds.push(`${providerId}/${modelId}`);
    }
  }

  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://models.dev/model-schema.json",
    $defs: {
      Model: {
        type: "string",
        enum: modelIds.sort(),
        description: "AI model identifier in provider/model format",
      },
    },
  };

  modelSchemaCache = JSON.stringify(schema, null, 2);
  modelSchemaCacheAt = now;
  return modelSchemaCache;
};

const redirectToRoot = () => {
  return new Response(null, {
    status: 302,
    headers: { Location: baseRootPath },
  });
};

const app = new Hono();

app.get("*", async (context) => {
  const requestPath = context.req.path;

  if (basePath !== "/" && requestPath === basePath) {
    return redirectToRoot();
  }

  const appPath = stripBasePath(requestPath, basePath);

  if (!appPath) {
    return context.text("Not found", 404);
  }

  if (appPath === "/api.json") {
    return createFileResponse(apiJsonPath);
  }

  if (appPath === "/model-schema.json") {
    try {
      const body = await buildModelSchema();
      return context.body(body, 200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      });
    } catch {
      return context.text("Failed to build model schema", 500);
    }
  }

  if (appPath.startsWith("/logos/")) {
    const requestedPath = appPath.slice("/logos/".length);
    const logoPath = resolveSafePath(logosDir, requestedPath);
    const filePath = logoPath && (await pathExists(logoPath)) ? logoPath : defaultLogoPath;
    return createFileResponse(filePath);
  }

  if (appPath.startsWith("/assets/")) {
    const requestedPath = appPath.slice("/assets/".length);
    const assetPath = resolveSafePath(assetsDir, requestedPath);

    if (!assetPath || !(await pathExists(assetPath))) {
      return redirectToRoot();
    }

    return createFileResponse(assetPath);
  }

  if (appPath.startsWith("/fonts/")) {
    const requestedPath = appPath.slice("/fonts/".length);
    const fontPath = resolveSafePath(fontsDir, requestedPath);

    if (!fontPath || !(await pathExists(fontPath))) {
      return redirectToRoot();
    }

    return createFileResponse(fontPath);
  }

  if (appPath === "/favicon.svg") {
    return createFileResponse(faviconPath);
  }

  if (appPath === "/social-share.png") {
    return createFileResponse(socialSharePath);
  }

  if (appPath === "/" || appPath === "/index" || appPath === "/index.html") {
    return createFileResponse(indexPath);
  }

  return redirectToRoot();
});

serve({
  fetch: app.fetch,
  hostname,
  port,
});

console.log(`models.dev intranet server listening on ${hostname}:${port}`);
console.log(`serving dist from ${distDir}`);
