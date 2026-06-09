import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

globalThis.require = createRequire(import.meta.url);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));

await esbuild({
  entryPoints: [path.resolve(artifactDir, "src/seed/seed.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: path.resolve(artifactDir, "dist/seed.mjs"),
  outExtension: { ".js": ".mjs" },
  external: ["*.node"],
  banner: {
    js: `import { createRequire as __cr } from 'node:module'; globalThis.require = __cr(import.meta.url);`,
  },
});

console.log("Seed built successfully");
