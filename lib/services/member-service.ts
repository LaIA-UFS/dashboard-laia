import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { getNotionConfig } from "@/lib/notion/config";
import { fetchNotionRows } from "@/lib/notion/client";
import { buildNotionDatabase } from "@/lib/notion/transform";
import { requireAdmin } from "@/lib/auth/session";
import {
  normalizeNameKey,
  rawAnalysesToAnalyses,
  rawMemberToMember,
  rawProjectToProject,
} from "@/lib/mappers/member";
import type {
  DashboardData,
  RawDashboardAnalyses,
  RawMember,
  RawProject,
} from "@/lib/types";

const DB_PATH = path.join(process.cwd(), "db", "db.json");

interface DatabaseFile {
  membros: RawMember[];
  projetos: RawProject[];
  analises?: RawDashboardAnalyses;
  notion?: {
    syncedAt: string;
    membersDataSourceId: string;
    projectsDataSourceId: string;
  };
}

export class MemberServiceError extends Error {
  constructor(
    message: string,
    public status = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = "MemberServiceError";
  }
}

function isErrorWithCode(error: unknown): error is Error & { code: string } {
  return (
    error instanceof Error &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

async function readDatabase(): Promise<DatabaseFile> {
  const config = getNotionConfig();
  if (config.token) {
    // Only source data is shared. Authorization stays outside the cache.
    return unstable_cache(async () => {
      const rows = await fetchNotionRows(config);
      return buildNotionDatabase(rows.members, rows.projects, {
        syncedAt: new Date().toISOString(),
        membersDataSourceId: config.members,
        projectsDataSourceId: config.projects,
      });
    }, ["laia-notion-v2", config.members, config.projects], { revalidate: 30, tags: ["laia-notion"] })();
  }
  const fileContent = await readFile(DB_PATH, "utf-8");
  const parsed = JSON.parse(fileContent) as Partial<DatabaseFile>;

  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.membros)) {
    throw new MemberServiceError("Formato invalido em db/db.json.");
  }

  if (!parsed.notion || parsed.notion.membersDataSourceId !== config.members || parsed.notion.projectsDataSourceId !== config.projects) {
    throw new MemberServiceError("Sincronize as bases da LaIA antes de abrir o dashboard. Consulte a configuração do Notion no README.");
  }

  return {
    membros: parsed.membros as RawMember[],
    projetos: Array.isArray(parsed.projetos) ? (parsed.projetos as RawProject[]) : [],
    analises: parsed.analises as RawDashboardAnalyses | undefined,
    notion: parsed.notion,
  };
}

function toServiceError(error: unknown): MemberServiceError {
  if (error instanceof MemberServiceError) {
    return error;
  }

  if (error instanceof SyntaxError) {
    return new MemberServiceError("O arquivo db/db.json contem JSON invalido.");
  }

  if (isErrorWithCode(error)) {
    if (error.code === "ENOENT") {
      return new MemberServiceError("O arquivo db/db.json nao foi encontrado.");
    }

    return new MemberServiceError(
      "Nao foi possivel acessar o arquivo db/db.json.",
      500,
      { code: error.code }
    );
  }

  if (error instanceof Error) {
    return new MemberServiceError(error.message);
  }

  return new MemberServiceError("Erro inesperado ao processar membros.");
}

export const getDashboardData = cache(async (): Promise<DashboardData> => {
  await requireAdmin();
  try {
    const database = await readDatabase();
    const members = database.membros.map(rawMemberToMember);
    const membersByNameKey = new Map(
      members.map((member) => [normalizeNameKey(member.nomeOriginal), member.slug])
    );

    const resolveMemberSlug = (name: string | null) => {
      if (!name) {
        return null;
      }

      return membersByNameKey.get(normalizeNameKey(name)) ?? null;
    };

    return {
      source: {
        mode: getNotionConfig().token ? "live" : "snapshot",
        syncedAt: database.notion!.syncedAt,
        revision: createHash("sha256").update(JSON.stringify({ members: database.membros, projects: database.projetos, analyses: database.analises })).digest("hex").slice(0, 20),
      },
      members,
      projects: database.projetos.map((project) =>
        rawProjectToProject(project, resolveMemberSlug)
      ),
      analyses: rawAnalysesToAnalyses(database.analises),
    };
  } catch (error) {
    throw toServiceError(error);
  }
});

export async function getMemberBySlug(slug: string) {
  const { members } = await getDashboardData();
  const member = members.find((item) => item.slug === slug);

  if (!member) {
    throw new MemberServiceError("Membro nao encontrado.", 404);
  }

  return member;
}
