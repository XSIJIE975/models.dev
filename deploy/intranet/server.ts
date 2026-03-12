import path from "node:path";

const rootDir = path.resolve(import.meta.dir, "..", "..");
const distDir = process.env.DIST_DIR
  ? path.resolve(process.env.DIST_DIR)
  : path.join(rootDir, "packages", "web", "dist");
const hostname = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? "3000");

const apiJsonPath = path.join(distDir, "_api.json");
const indexPath = path.join(distDir, "_index.html");
const defaultLogoPath = path.join(distDir, "logos", "default.svg");

type ProviderData = Record<string, { models?: Record<string, unknown> }>;

let modelSchemaCache = "";
let modelSchemaCacheAt = 0;

async function buildModelSchema(): Promise<string> {
  const now = Date.now();
  if (modelSchemaCache && now - modelSchemaCacheAt < 60_000) {
    return modelSchemaCache;
  }

  const providers = (await Bun.file(apiJsonPath).json()) as ProviderData;
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
}

function redirectToRoot(): Response {
  return new Response(null, {
    status: 302,
    headers: { Location: "/" },
  });
}

function resolveDistPath(pathname: string): string {
  return path.join(distDir, pathname.replace(/^\/+/, ""));
}

const server = Bun.serve({
  hostname,
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/model-schema.json") {
      try {
        const body = await buildModelSchema();
        return new Response(body, {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch {
        return new Response("Failed to build model schema", { status: 500 });
      }
    }

    if (url.pathname === "/api.json") {
      return new Response(Bun.file(apiJsonPath), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    if (
      url.pathname === "/" ||
      url.pathname === "/index" ||
      url.pathname === "/index.html"
    ) {
      return new Response(Bun.file(indexPath), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    if (url.pathname.startsWith("/logos/")) {
      const logoFilePath = resolveDistPath(url.pathname);
      let file = Bun.file(logoFilePath);
      if (!(await file.exists())) {
        file = Bun.file(defaultLogoPath);
      }

      return new Response(file, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const staticFilePath = resolveDistPath(url.pathname);
    const staticFile = Bun.file(staticFilePath);
    if (await staticFile.exists()) {
      return new Response(staticFile);
    }

    return redirectToRoot();
  },
});

console.log(`models.dev intranet server listening on ${server.hostname}:${server.port}`);
console.log(`serving dist from ${distDir}`);
