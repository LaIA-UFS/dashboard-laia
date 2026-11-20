import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { getNotionConfig } from "../lib/notion/config.ts";
import { fetchNotionRows } from "../lib/notion/client.ts";
import { buildNotionDatabase } from "../lib/notion/transform.ts";

const config = getNotionConfig();
const inputIndex = process.argv.indexOf("--from");
if (inputIndex >= 0 && !process.argv[inputIndex + 1]) throw new Error("Informe o arquivo após --from.");
const rows = inputIndex >= 0
  ? JSON.parse(await readFile(process.argv[inputIndex + 1], "utf8"))
  : await fetchNotionRows(config);
if (!Array.isArray(rows.members) || !Array.isArray(rows.projects)) throw new Error("Arquivo de sincronização inválido.");

const database = buildNotionDatabase(rows.members, rows.projects, {
  syncedAt: new Date().toISOString(),
  membersDataSourceId: config.members,
  projectsDataSourceId: config.projects,
});
const destination = path.resolve("db/db.json");
try {
  const previous = await readFile(destination);
  const hash = createHash("sha256").update(previous).digest("hex").slice(0, 12);
  await mkdir(path.resolve("db/backups"), { recursive: true });
  await copyFile(destination, path.resolve(`db/backups/db-${hash}.json`));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const temporary = `${destination}.${process.pid}.tmp`;
await writeFile(temporary, JSON.stringify(database, null, 2) + "\n", "utf8");
await rename(temporary, destination);
console.log(`Notion sincronizado: ${database.membros.length} membros e ${database.projetos.length} projetos.`);
