#!/usr/bin/env tsx

import { generate } from "../src/generate";
import path from "path";
import { fileURLToPath } from "url";
import { ZodError } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const result = await generate(
    path.join(__dirname, "..", "..", "..", "providers"),
  );
  console.log(JSON.stringify(result, null, 2));
} catch (e: any) {
  if (e instanceof ZodError) {
    console.error("Validation error:", e.errors);
    console.error("When parsing:", e.cause);
    process.exit(1);
  }
  throw e;
}
