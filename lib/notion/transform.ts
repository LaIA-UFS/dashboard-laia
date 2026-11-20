import type { RawMember, RawProject, RawDashboardAnalyses } from "../types";

export type NotionRow = Record<string, unknown> & { url: string };

export interface NotionDatabase {
  membros: RawMember[];
  projetos: RawProject[];
  analises: RawDashboardAnalyses;
  notion: {
    syncedAt: string;
    membersDataSourceId: string;
    projectsDataSourceId: string;
  };
}

export function notionId(value: unknown): string {
  const match = String(value ?? "").match(/[a-f\d]{8}-?[a-f\d]{4}-?[a-f\d]{4}-?[a-f\d]{4}-?[a-f\d]{12}/i);
  return match?.[0].replaceAll("-", "").toLowerCase() ?? "";
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string").map(v => v.trim()).filter(Boolean);
  if (!text(value)) return [];
  const input = String(value).trim();
  if (input.startsWith("[")) {
    const parsed: unknown = JSON.parse(input);
    if (!Array.isArray(parsed)) throw new Error("Lista inválida no Notion.");
    return list(parsed);
  }
  return input.split(/[,;\n]/).map(v => v.trim()).filter(Boolean);
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function date(value: unknown): string | null {
  const input = text(value);
  const match = input?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : input;
}

function countValues(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
}

export function buildNotionDatabase(
  memberRows: NotionRow[],
  projectRows: NotionRow[],
  metadata: NotionDatabase["notion"],
): NotionDatabase {
  const members = memberRows.filter(row => !row.archived && !row.in_trash);
  const projects = projectRows.filter(row => !row.archived && !row.in_trash);
  const membersById = new Map<string, { name: string; row: NotionRow }>();
  for (const row of members) {
    const id = notionId(row.url);
    const name = text(row["Nome Completo"]) ?? text(row.Name);
    if (!id || !name || membersById.has(id)) throw new Error("Cadastro de membro inválido ou duplicado no Notion.");
    membersById.set(id, { name, row });
  }

  const resolveMembers = (value: unknown) => [...new Set(list(value).map(reference => {
    const member = membersById.get(notionId(reference));
    if (!member) throw new Error("Um projeto está vinculado a um membro fora da base configurada. Confira o acesso às duas bases do Notion.");
    return member.name;
  }))];

  const projectIds = new Set<string>();
  const projectRecords = projects.map(row => {
    const id = notionId(row.url);
    const name = text(row["Nome do Projeto"]);
    if (!id || !name || projectIds.has(id)) throw new Error("Cadastro de projeto inválido ou duplicado no Notion.");
    projectIds.add(id);
    const owners = resolveMembers(row["Responsável"]);
    const team = resolveMembers(row.Time);
    const project: RawProject = {
      "Nome do Projeto": name,
      "Nome do Projeto Original": name,
      "Responsável": owners.join(", ") || null,
      "Data de Início": date(row["date:Data de Início:start"]),
      "Data de Encerramento": date(row["date:Data de Encerramento:start"]),
      Status: text(row.Status),
      Prioridade: text(row.Prioridade),
      Time: team,
      "Documentação": text(row["Documentação"]),
      "Link para o repositório": text(row["Link para o repositório"]),
      Progresso: number(row.Progresso),
      notionId: id,
      notionUrl: row.url,
    };
    return { project, owners, team };
  });

  const membros: RawMember[] = [...membersById].map(([id, { name, row }]) => {
    const assignments = projectRecords.filter(record => record.team.includes(name));
    return {
      "Nome Completo": name,
      "Nome Completo Original": name,
      "Áreas de atuação": list(row["Áreas de atuação"]),
      "Projetos Atuais Em Andamento": assignments.filter(r => r.project.Status === "Em andamento").map(r => r.project["Nome do Projeto Original"]!),
      "Projetos Finalizados": assignments.filter(r => r.project.Status === "Finalizado").map(r => r.project["Nome do Projeto Original"]!),
      "Projetos Coordenados": projectRecords.filter(r => r.owners.includes(name)).map(r => r.project["Nome do Projeto Original"]!),
      "Projetos com Interesse": list(row["Projetos com Interesse"]),
      "Projetos Declarados no Forms": [],
      Techs: list(row.Techs),
      "Período": number(row["Período"]),
      "Áreas de interesse": list(row["Áreas de interesse"]),
      Disponibilidade: text(row.Disponibilidade),
      Carreira: list(row.Carreira),
      Maturidade: text(row.Maturidade),
      Curso: text(row.Curso),
      Entrada: date(row["date:Entrada:start"]),
      "Tempo de Liga": text(row["Tempo de Liga"]),
      "Data de Resposta": text(row["Data de Resposta"]),
      "Nota Técnica": number(row["Nota Técnica"]),
      Atributos: list(row.Atributos),
      "Objetivo na LaIA": text(row["Objetivo na LaIA"]),
      "Sugestão de Retomada": text(row["Sugestão de Retomada"]),
      "Sugeriu Retomada": row["Sugeriu Retomada"] === true,
      "Proposta de Projeto Pessoal": text(row["Proposta de Projeto Pessoal"]),
      "Possui Projeto Pessoal": row["Possui Projeto Pessoal"] === true,
      "Aniversário": date(row["date:Aniversário:start"]),
      Status: text(row.Status),
      notionId: id,
      notionUrl: row.url,
    };
  });

  const counted = (field: keyof RawMember) => countValues(membros.flatMap(m => list(m[field])));
  const scores = membros.flatMap(m => m["Nota Técnica"] === null ? [] : [m["Nota Técnica"]]);
  const resumo = [
    { "Métrica": "Membros no Notion", Valor: membros.length },
    { "Métrica": "Respostas no Forms", Valor: membros.filter(m => m["Data de Resposta"]).length },
  ];
  if (scores.length) resumo.push({ "Métrica": "Média da nota técnica", Valor: scores.reduce((a, b) => a + b, 0) / scores.length });
  const analises: RawDashboardAnalyses = {
    resumo,
    porCurso: counted("Curso").map(v => ({ Curso: v.label, Quantidade: v.value })),
    porDisponibilidade: counted("Disponibilidade").map(v => ({ Disponibilidade: v.label, Quantidade: v.value })),
    porMaturidade: counted("Maturidade").map(v => ({ Maturidade: v.label, Quantidade: v.value })),
    carreirasMaisCitadas: counted("Carreira").map(v => ({ Carreira: v.label, Quantidade: v.value })),
    atributosMaisCitados: counted("Atributos").map(v => ({ Atributo: v.label, Quantidade: v.value })),
    techsMaisCitadas: counted("Techs").map(v => ({ Tecnologia: v.label, Quantidade: v.value })),
    projetosDeInteresse: counted("Projetos com Interesse").map(v => ({ Projeto: v.label, Quantidade: v.value })),
    nomesSemMatch: { formsSemNotion: [], notionSemForms: [] },
  };
  return { membros, projetos: projectRecords.map(r => r.project), analises, notion: metadata };
}
