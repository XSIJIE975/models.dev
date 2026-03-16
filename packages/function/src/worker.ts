import {
  BASE_PATH_ENV,
  getBasePath,
  stripBasePath,
  withBasePath,
} from "../../web/src/base-path.js";

export interface Env {
  ASSETS: any;
  MODELS_DEV_BASE_PATH?: string;
  PosthogToken: string;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const basePath = getBasePath(env[BASE_PATH_ENV]);
    const baseRootPath = withBasePath("/", basePath);
    const appPath = stripBasePath(url.pathname, basePath);
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const country = request.headers.get("cf-ipcountry") || "unknown";
    const agent = request.headers.get("user-agent") || "unknown";

    if (basePath !== "/" && url.pathname === basePath) {
      return new Response(null, {
        status: 302,
        headers: { Location: baseRootPath },
      });
    }

    if (!appPath) {
      return new Response("Not found", { status: 404 });
    }

    if (agent.includes("opencode") || agent.includes("bun")) {
      ctx.waitUntil(
        fetch("https://us.i.posthog.com/i/v0/e/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: JSON.parse(env.PosthogToken).value,
            event: "hit",
            distinct_id: ip,
            properties: {
              $process_person_profile: false,
              user_agent: agent,
              country,
              path: url.pathname,
            },
          }),
        }),
      );
    }

    const assetUrl = new URL(url);
    assetUrl.pathname = appPath;

    if (appPath === "/model-schema.json") {
      const apiUrl = new URL(url);
      apiUrl.pathname = "/_api.json";
      const apiResponse = await env.ASSETS.fetch(
        new Request(apiUrl.toString(), request),
      );
      const providers = (await apiResponse.json()) as Record<
        string,
        { models: Record<string, unknown> }
      >;

      const modelIds: string[] = [];
      for (const [providerId, provider] of Object.entries(providers)) {
        for (const modelId of Object.keys(provider.models)) {
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

      return new Response(JSON.stringify(schema, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    if (appPath === "/api.json") {
      assetUrl.pathname = "/_api.json";
    } else if (
      appPath === "/" ||
      appPath === "/index.html" ||
      appPath === "/index"
    ) {
      assetUrl.pathname = "/_index";
    } else if (appPath.startsWith("/logos/")) {
      // Check if the specific provider logo exists in static assets
      const logoResponse = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));

      if (logoResponse.status === 404) {
        // Fallback to default logo
        const defaultUrl = new URL(assetUrl);
        defaultUrl.pathname = "/logos/default.svg";
        return await env.ASSETS.fetch(new Request(defaultUrl.toString(), request));
      }

      return logoResponse;
    } else if (
      appPath.startsWith("/assets/") ||
      appPath.startsWith("/fonts/") ||
      appPath === "/favicon.svg" ||
      appPath === "/social-share.png"
    ) {
      assetUrl.pathname = appPath;
    } else {
      return new Response(null, {
        status: 302,
        headers: { Location: baseRootPath },
      });
    }

    return await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
  },
};
