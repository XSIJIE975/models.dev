#!/usr/bin/env tsx

import { access, copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execa } from "execa";
import glob from "fast-glob";

const scriptDirectory = fileURLToPath(new URL(".", import.meta.url));
const webRoot = path.resolve(scriptDirectory, "..");
const providersRoot = path.resolve(webRoot, "..", "..", "providers");
const distRoot = path.join(webRoot, "dist");

const pathExists = async (targetPath: string) => {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const copyProviderLogos = async () => {
  const logosDirectory = path.join(distRoot, "logos");
  await mkdir(logosDirectory, { recursive: true });

  const defaultLogoPath = path.join(providersRoot, "logo.svg");
  if (await pathExists(defaultLogoPath)) {
    await copyFile(defaultLogoPath, path.join(logosDirectory, "default.svg"));
  }

  const providerLogos = await glob("*/logo.svg", {
    cwd: providersRoot,
    onlyFiles: true,
  });

  for (const relativeLogoPath of providerLogos) {
    const providerId = path.basename(path.dirname(relativeLogoPath));
    const sourcePath = path.join(providersRoot, relativeLogoPath);
    const destinationPath = path.join(logosDirectory, `${providerId}.svg`);
    await copyFile(sourcePath, destinationPath);
  }
};

const copyFavicon = async () => {
  const faviconMatches = await glob("favicon.svg", {
    cwd: path.join(webRoot, "public"),
    onlyFiles: true,
  });

  if (faviconMatches.length === 0) {
    return;
  }

  await copyFile(
    path.join(webRoot, "public", faviconMatches[0]),
    path.join(distRoot, "favicon.svg")
  );
};

const main = async () => {
  await rm(distRoot, { recursive: true, force: true });
  await execa("vite", ["build"], {
    cwd: webRoot,
    stdio: "inherit",
  });

  await copyProviderLogos();
  await copyFavicon();

  const { default: render } = (await import("../src/render.tsx")) as {
    default: () => Promise<{
      Rendered: string;
      Providers: unknown;
    }>;
  };
  const { Rendered, Providers } = await render();

  const builtHtmlPath = path.join(distRoot, "index.html");
  const injectedHtml = (await readFile(builtHtmlPath, "utf8")).replace(
    "<!--static-->",
    Rendered
  );

  await writeFile(builtHtmlPath, injectedHtml, "utf8");
  await writeFile(
    path.join(distRoot, "api.json"),
    JSON.stringify(Providers),
    "utf8"
  );

  await rename(builtHtmlPath, path.join(distRoot, "_index.html"));
  await rename(path.join(distRoot, "api.json"), path.join(distRoot, "_api.json"));
};

void main();
