import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export const root = process.cwd();
export const dataPath = (...parts: string[]) => join(root, "data", ...parts);

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try { return JSON.parse(await readFile(path, "utf8")) as T; } catch { return fallback; }
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readJsonDirectory<T>(directory: string): Promise<T[]> {
  try {
    const files = (await readdir(directory)).filter((file) => file.endsWith(".json"));
    return Promise.all(files.map((file) => readJson<T>(join(directory, file), [] as unknown as T)));
  } catch { return []; }
}