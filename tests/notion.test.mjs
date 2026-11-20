import assert from "node:assert/strict";
import test from "node:test";
import { buildNotionDatabase } from "../lib/notion/transform.ts";
import { fetchNotionRows, pageToRow } from "../lib/notion/client.ts";
import { rawProjectToProject } from "../lib/mappers/member.ts";

const memberId = "11111111-1111-1111-1111-111111111111";
const otherId = "22222222-2222-2222-2222-222222222222";
const projectId = "33333333-3333-3333-3333-333333333333";
const membersId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const projectsId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const config = { token: "test-token", members: membersId, projects: projectsId };
const metadata = { syncedAt: "2026-11-20T12:00:00Z", membersDataSourceId: membersId, projectsDataSourceId: projectsId };
const members = [
  { url: `https://app.notion.com/p/${memberId.replaceAll("-", "")}`, Name: "Ana Lima", "Áreas de atuação": '["Pesquisa"]' },
  { url: `https://www.notion.so/${otherId}`, Name: "Bruno Reis" },
];
const project = {
  url: `https://www.notion.so/${projectId}`, "Nome do Projeto": "Laboratório",
  Time: JSON.stringify([memberId, memberId]), "Responsável": [otherId], Status: "Em andamento", Progresso: 0,
  "date:Data de Início:start": "2026-11-20",
};

test("equipes e coordenação são resolvidas por ID e não pelo nome ou pelo Forms antigo", () => {
  const database = buildNotionDatabase(members, [project], metadata);
  assert.equal(database.membros.length, 2);
  assert.deepEqual(database.projetos[0].Time, ["Ana Lima"]);
  assert.equal(database.projetos[0]["Responsável"], "Bruno Reis");
  assert.deepEqual(database.membros[0]["Projetos Atuais Em Andamento"], ["Laboratório"]);
  assert.deepEqual(database.membros[1]["Projetos Coordenados"], ["Laboratório"]);
  assert.deepEqual(database.membros[1]["Projetos Atuais Em Andamento"], []);
  assert.equal(database.projetos[0]["Data de Início"], "20/11/2026");
  assert.equal(database.projetos[0].Progresso, 0);
  assert.equal(database.membros[0]["Nota Técnica"], null);
  assert.ok(!database.analises.resumo.some(row => row["Métrica"] === "Média da nota técnica"));
  const renamed = buildNotionDatabase([{ ...members[0], Name: "Ana Souza" }, members[1]], [project], metadata);
  assert.deepEqual(renamed.projetos[0].Time, ["Ana Souza"]);
});

test("alterações de status e remoção de projetos atualizam os perfis", () => {
  const completed = buildNotionDatabase(members, [{ ...project, Status: "Finalizado" }], metadata);
  assert.deepEqual(completed.membros[0]["Projetos Atuais Em Andamento"], []);
  assert.deepEqual(completed.membros[0]["Projetos Finalizados"], ["Laboratório"]);
  const archived = buildNotionDatabase(members, [{ ...project, archived: true }], metadata);
  assert.equal(archived.projetos.length, 0);
  assert.deepEqual(archived.membros[0]["Projetos Finalizados"], []);
});

test("relações fora da base e IDs duplicados não são descartados silenciosamente", () => {
  assert.throws(() => buildNotionDatabase(members, [{ ...project, Time: [projectId] }], metadata), /fora da base/);
  assert.throws(() => buildNotionDatabase([...members, members[0]], [], metadata), /duplicado/);
});

test("o mapper respeita o status informado no Notion mesmo sem datas ou responsável", () => {
  const raw = buildNotionDatabase(members, [{ ...project, Time: [], "Responsável": [], "date:Data de Início:start": null }], metadata).projetos[0];
  const mapped = rawProjectToProject(raw, () => null);
  assert.equal(mapped.status, "Em andamento");
  assert.equal(mapped.isActive, true);
  assert.equal(mapped.progresso, 0);
});

test("propriedades da API são convertidas sem expor e-mail e telefone", () => {
  const row = pageToRow({ id: memberId, url: `https://www.notion.so/${memberId}`, properties: {
    Name: { id: "title", type: "title", title: [{ plain_text: "Ana " }, { plain_text: "Lima" }] },
    Status: { id: "status", type: "status", status: { name: "Membro Efetivo" } },
    Techs: { id: "tech", type: "multi_select", multi_select: [{ name: "Python" }] },
    Email: { id: "mail", type: "email", email: "private@example.invalid" },
    Entrada: { id: "date", type: "date", date: { start: "2026-11-20" } },
  } });
  assert.equal(row.Name, "Ana Lima");
  assert.deepEqual(row.Techs, ["Python"]);
  assert.equal(row["date:Entrada:start"], "2026-11-20");
  assert.ok(!Object.hasOwn(row, "Email"));
});

test("a consulta percorre páginas e relações com mais de 25 participantes", async () => {
  const calls = [];
  const mock = async (url, options) => {
    calls.push({ url, options });
    const body = options.body ? JSON.parse(options.body) : {};
    let result;
    if (url.includes("/properties/")) {
      result = { results: [{ relation: { id: url.includes("start_cursor") ? otherId : memberId } }], has_more: !url.includes("start_cursor"), next_cursor: url.includes("start_cursor") ? null : "team-next" };
    } else if (url.includes(membersId)) {
      result = { results: [{ id: memberId, url: `https://www.notion.so/${memberId}`, properties: {} }], has_more: !body.start_cursor, next_cursor: body.start_cursor ? null : "next" };
    } else {
      result = { results: [{ id: projectId, url: `https://www.notion.so/${projectId}`, properties: {
        Time: { id: "team", type: "relation", relation: [{ id: memberId }], has_more: true },
      } }], has_more: false, next_cursor: null };
    }
    return Response.json(result);
  };
  const rows = await fetchNotionRows(config, mock);
  assert.equal(rows.members.length, 2);
  assert.deepEqual(rows.projects[0].Time, [memberId, otherId]);
  assert.equal(calls.length, 5);
  assert.ok(calls.every(call => call.options.cache === "no-store"));
  assert.ok(calls.every(call => call.options.headers["Notion-Version"] === "2025-09-03"));
});

test("falhas de autenticação e paginação inválida interrompem a sincronização", async () => {
  await assert.rejects(fetchNotionRows(config, async () => new Response("", { status: 401 })), /token/);
  await assert.rejects(fetchNotionRows(config, async () => Response.json({ results: [], has_more: true, next_cursor: null })), /Paginação/);
});
