import { defineConfig } from "vite";

import { BASE_PATH_ENV, getBasePath, withBasePath } from "./src/base-path.js";

const basePath = getBasePath(process.env[BASE_PATH_ENV]);

export default defineConfig({
  root: ".",
  base: withBasePath("/", basePath),
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  publicDir: "public",
  plugins: [
    {
      name: "base-path-social-share",
      transformIndexHtml: {
        order: "pre",
        handler: (html) => {
          const marker = "__MODELS_DEV_SOCIAL_SHARE__";

          return html.replace(
            /content=(['"])\/social-share\.png\1/g,
            `content="${marker}"`
          ).replace(
            marker,
            withBasePath("/social-share.png", basePath)
          );
        },
      },
    },
  ],
});
