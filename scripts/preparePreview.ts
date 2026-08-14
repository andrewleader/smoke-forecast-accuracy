import { cp, rm } from "node:fs/promises";

await rm("public", { recursive: true, force: true });
await cp("site", "public", { recursive: true });
await cp("data", "public/data", { recursive: true });