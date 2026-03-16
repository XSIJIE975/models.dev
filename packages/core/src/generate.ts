import path from "path";
import { readFile } from "fs/promises";

import glob from "fast-glob";
import { parse } from "@iarna/toml";

import { Provider, Model } from "./schema.js";

export async function generate(directory: string) {
  const result = {} as Record<string, Provider>;
  const providerPaths = await glob("*/provider.toml", {
    cwd: directory,
    absolute: true,
  });
  for (const providerPath of providerPaths) {
    const providerID = path.basename(path.dirname(providerPath));
    const toml = parse(await readFile(providerPath, "utf8")) as Record<string, unknown>;
    toml.id = providerID;
    toml.models = {};
    const provider = Provider.safeParse(toml);
    if (!provider.success) {
      provider.error.cause = { providerPath, toml };
      throw provider.error;
    }

    const modelsPath = path.join(directory, providerID, "models");
    const modelPaths = await glob("**/*.toml", {
      cwd: modelsPath,
      absolute: true,
      followSymbolicLinks: true,
    });
    for (const modelPath of modelPaths) {
      const modelID = path.relative(modelsPath, modelPath).slice(0, -5);
      const toml = parse(await readFile(modelPath, "utf8")) as Record<string, unknown>;
      toml.id = modelID;
      const model = Model.safeParse(toml);
      if (!model.success) {
        model.error.cause = { modelPath, toml };
        throw model.error;
      }
      provider.data.models[modelID] = model.data;
    }
    result[providerID] = provider.data;
  }

  return result;
}
