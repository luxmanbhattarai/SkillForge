# Packaging: manifest, build, types

- `package.json` declares the public contract explicitly. Use an
  `exports` map with the `types` condition first in each entry,
  `import` and `require` conditions for dual format, and `default`
  last. Declare `engines` (for example `>=20`, matching the oldest
  Node.js line you test) and a `files` array listing only what ships
  (`dist`, `README.md`, `LICENSE`).
- The build emits ESM (`.mjs` or `.js` under `"type": "module"`),
  CJS (`.cjs` or `.js` under `"type": "commonjs"`), and matching
  declaration files (`.d.mts` / `.d.cts` or `.d.ts`). Never ship
  JavaScript without declarations for a public SDK.
- Enable `isolatedDeclarations` in `tsconfig.json` where the build
  tool supports it, so every exported symbol has an explicit type
  and declaration generation is fast and reliable.
- Run `tsc --noEmit` in CI. esbuild- and Rolldown-based bundlers do
  not type check; a green build without `tsc` proves nothing about
  types.
