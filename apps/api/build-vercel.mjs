import * as esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/vercel.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/vercel-bundle.mjs",
  external: ["@prisma/client"],
});

console.log("Built dist/vercel-bundle.mjs");
