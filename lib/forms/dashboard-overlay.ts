import type { RawMember, RawDashboardAnalyses } from "../types";
import type { DashboardResponse } from "./response-store";

export function applyDashboardResponses<T extends { membros: RawMember[]; analises?: RawDashboardAnalyses }>(database: T, responses: Map<string, DashboardResponse>): T {
  const membros = database.membros.map(member => {
    const answer = responses.get(member.notionId?.replaceAll("-", "").toLowerCase() ?? "");
    return answer ? { ...member, Curso: answer.course, Disponibilidade: answer.availability, "Data de Resposta": answer.submittedAt } : member;
  });
  function counts(field: "Curso" | "Disponibilidade") {
    const values = new Map<string, number>();
    for (const member of membros) { const value = member[field]; if (value) values.set(value, (values.get(value) ?? 0) + 1); }
    return [...values].sort((a, b) => b[1] - a[1]);
  }
  const summary = database.analises?.resumo?.filter(row => row["Métrica"] !== "Respostas no Forms") ?? [];
  return { ...database, membros, analises: { ...database.analises,
    resumo: [...summary, { "Métrica": "Respostas no Forms", Valor: membros.filter(member => member["Data de Resposta"]).length }],
    porCurso: counts("Curso").map(([Curso, Quantidade]) => ({ Curso, Quantidade })),
    porDisponibilidade: counts("Disponibilidade").map(([Disponibilidade, Quantidade]) => ({ Disponibilidade, Quantidade })),
  } };
}
