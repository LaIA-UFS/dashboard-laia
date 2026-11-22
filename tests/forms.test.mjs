import assert from "node:assert/strict";
import test from "node:test";
import { createMemberInvite, readMemberInvite, createSubmissionLimiter, INVITE_SECONDS } from "../lib/forms/member-invite.ts";
import { profileAnswerSchema, AVAILABILITY_OPTIONS } from "../lib/forms/profile.ts";
import { loadMemberProfile, saveMemberProfile } from "../lib/forms/notion-profile.ts";
import { createResponseStore, getResponseStoreConfig } from "../lib/forms/response-store.ts";
import { applyDashboardResponses } from "../lib/forms/dashboard-overlay.ts";
import { buildNotionDatabase } from "../lib/notion/transform.ts";
import { rawMemberToMember } from "../lib/mappers/member.ts";
import { getMemberPhoto } from "../lib/member-media.ts";

const memberId = "11111111-1111-1111-1111-111111111111";
const otherId = "22222222-2222-2222-2222-222222222222";
const sourceId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const config = { token: "fictional-notion-token", members: sourceId };
const env = { SESSION_SECRET: "fictional-secret-for-tests-12345678901234567890" };
const options = names => ({ options: names.map(name => ({ name })) });
const schema = { properties: {
  Name: { type: "title" }, Email: { type: "email" }, Phone: { type: "phone_number" },
  Techs: { type: "multi_select", multi_select: options(["Python", "React"]) },
  "Áreas de interesse": { type: "multi_select", multi_select: options(["Machine Learning"]) },
  Cadastro: { type: "select", select: options(["incompleto", "atualizado"]) },
} };
const page = { id: memberId, parent: { data_source_id: sourceId }, properties: {
  Name: { type: "title", title: [{ plain_text: "Ana Lima" }] },
  Email: { type: "email", email: "ana@example.com" },
  Phone: { type: "phone_number", phone_number: "79999990000" },
  Techs: { type: "multi_select", multi_select: [{ name: "Python" }] },
  "Áreas de interesse": { type: "multi_select", multi_select: [] },
  Status: { type: "status", status: { name: "Diretor" } },
} };
function notionMock(overrides = {}) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    if (overrides.status) return Response.json({ secret: "must-not-leak" }, { status: overrides.status });
    if (init.method === "PATCH") return Response.json(overrides.patch ?? { id: memberId }, { status: overrides.patchStatus ?? 200 });
    return Response.json(url.includes("data_sources/") ? (overrides.schema ?? schema) : (overrides.page ?? page));
  };
  return { calls, fetcher };
}
function answer(revision) {
  return profileAnswerSchema.parse({ name: "Ana Souza", email: "ana.souza@example.com", phone: "+55 (79) 99999-0000", techs: ["React"], interests: ["Machine Learning"], course: "Ciência da Computação", availability: AVAILABILITY_OPTIONS[1], revision, confirmed: true });
}

test("links só permitem o membro, base e finalidade corretos, com validade limitada", async () => {
  const invite = await createMemberInvite(memberId, sourceId, env);
  const decoded = await readMemberInvite(invite.token, sourceId, env);
  assert.equal(decoded.memberId, memberId);
  assert.ok(invite.expiresAt <= Date.now() + INVITE_SECONDS * 1000);
  assert.equal(await readMemberInvite(invite.token, otherId, env), null);
  assert.equal(await readMemberInvite(`${invite.token.slice(0, 20)}X${invite.token.slice(21)}`, sourceId, env), null);
  assert.equal(await readMemberInvite(invite.token, sourceId, { SESSION_SECRET: "another-secret-with-more-than-32-characters" }), null);
  assert.equal(await readMemberInvite(invite.token, sourceId, env, invite.expiresAt + 1), null);
  assert.equal(await readMemberInvite("x".repeat(4097), sourceId, env), null);
  await assert.rejects(createMemberInvite("bad-id", sourceId, env));
  await assert.rejects(createMemberInvite(memberId, sourceId, { SESSION_SECRET: "short" }));
});

test("chave separada permite revogar formulários sem mudar a sessão administrativa", async () => {
  const keys = { ...env, MEMBER_FORM_SECRET: "form-secret-separate-12345678901234567890" };
  const invite = await createMemberInvite(memberId, sourceId, keys);
  assert.ok(await readMemberInvite(invite.token, sourceId, { ...keys, SESSION_SECRET: "changed-admin-secret-12345678901234567890" }));
  assert.equal(await readMemberInvite(invite.token, sourceId, { ...keys, MEMBER_FORM_SECRET: "rotated-form-secret-12345678901234567890" }), null);
});

test("validação exige curso, disponibilidade e confirmação, normaliza telefone e rejeita campos administrativos", () => {
  const valid = answer("a".repeat(64));
  assert.equal(valid.phone, "5579999990000");
  for (const changed of [{ course: "" }, { availability: "qualquer" }, { confirmed: false }, { phone: "123" }, { name: "x" }, { email: "bad" }, { Status: "Presidente" }, { revision: "old" }, { techs: Array(31).fill("React") }]) {
    assert.equal(profileAnswerSchema.safeParse({ ...valid, ...changed }).success, false);
  }
});

test("leitura individual não expõe propriedades de cargos nem permite página de outra base", async () => {
  const mock = notionMock();
  const { profile } = await loadMemberProfile(config, memberId, mock.fetcher);
  assert.equal(profile.name, "Ana Lima");
  assert.equal(profile.revision.length, 64);
  assert.equal(profile.Status, undefined);
  assert.equal(profile.memberId, undefined);
  for (const altered of [{ parent: { data_source_id: otherId } }, { archived: true }, { in_trash: true }]) {
    const foreign = notionMock({ page: { ...page, ...altered } });
    await assert.rejects(loadMemberProfile(config, memberId, foreign.fetcher), error => error.status === 404);
    assert.equal(foreign.calls.length, 1);
  }
});

test("PATCH contém apenas os campos existentes autorizados e nunca curso ou disponibilidade", async () => {
  const mock = notionMock();
  const { profile } = await loadMemberProfile(config, memberId, mock.fetcher);
  await saveMemberProfile(config, memberId, answer(profile.revision), mock.fetcher);
  const changes = mock.calls.filter(call => call.init.method === "PATCH");
  assert.equal(changes.length, 1);
  assert.equal(changes[0].url, `https://api.notion.com/v1/pages/${memberId}`);
  const payload = JSON.parse(changes[0].init.body);
  assert.deepEqual(Object.keys(payload), ["properties"]);
  assert.deepEqual(Object.keys(payload.properties).sort(), ["Name", "Email", "Phone", "Techs", "Áreas de interesse", "Cadastro"].sort());
  assert.equal(payload.properties.Cadastro.select.name, "atualizado");
  for (const field of ["course", "availability", "Curso", "Disponibilidade", "submittedAt", "Status", "Projetos", "Resumo da IA"]) assert.equal(payload.properties[field], undefined);
  assert.ok(mock.calls.every(call => ["GET", "PATCH"].includes(call.init.method)));
});

test("opções desconhecidas e revisão antiga não sobrescrevem dados nem criam opções no Notion", async () => {
  for (const change of [{ revision: "b".repeat(64) }, { techs: ["Nova tecnologia"] }, { interests: ["Nova área"] }]) {
    const mock = notionMock();
    const { profile } = await loadMemberProfile(config, memberId, mock.fetcher);
    await assert.rejects(saveMemberProfile(config, memberId, { ...answer(profile.revision), ...change }, mock.fetcher), error => error.status === 409);
    assert.ok(mock.calls.every(call => call.init.method === "GET"));
  }
});

test("Cadastro não é criado quando a propriedade ou a opção atualizado não existe", async () => {
  const reduced = structuredClone(schema);
  delete reduced.properties.Cadastro;
  const mock = notionMock({ schema: reduced });
  const { profile } = await loadMemberProfile(config, memberId, mock.fetcher);
  await saveMemberProfile(config, memberId, answer(profile.revision), mock.fetcher);
  assert.equal(JSON.parse(mock.calls.at(-1).init.body).properties.Cadastro, undefined);
});

test("falhas do Notion são reportadas sem vazar resposta externa nem confirmar sucesso", async () => {
  for (const [status, expected] of [[403, 503], [429, 429], [404, 404], [500, 502]]) {
    await assert.rejects(loadMemberProfile(config, memberId, notionMock({ status }).fetcher), error => error.status === expected && !error.message.includes("must-not-leak"));
  }
  await assert.rejects(loadMemberProfile({ ...config, token: "" }, memberId), error => error.status === 503);
  const broken = notionMock({ patchStatus: 500 });
  const { profile } = await loadMemberProfile(config, memberId, broken.fetcher);
  await assert.rejects(saveMemberProfile(config, memberId, answer(profile.revision), broken.fetcher), error => error.status === 502);
});

function redisMock() {
  const values = new Map();
  const calls = [];
  let failCommit = false;
  const fetcher = async (_url, init) => {
    const args = JSON.parse(init.body);
    calls.push(args);
    let result;
    if (args[0] === "MGET") result = args.slice(1).map(key => values.get(key) ?? null);
    else if (args[0] === "SET") {
      if (args.includes("NX") && values.has(args[1])) result = null;
      else { values.set(args[1], args[2]); result = "OK"; }
    } else if (args[0] === "EVAL" && args[2] === 1) {
      result = values.get(args[3]) === args[4] ? Number(values.delete(args[3])) : 0;
    } else if (args[0] === "EVAL" && args[2] === 3) {
      if (failCommit) return Response.json({ error: "unavailable" }, { status: 503 });
      if (values.get(args[3]) !== args[6]) result = 0;
      else { values.set(args[4], args[7]); values.delete(args[5]); values.delete(args[3]); result = 1; }
    } else throw new Error(`Unexpected command ${args[0]}`);
    return Response.json({ result });
  };
  const store = createResponseStore({ url: "https://fictional-redis.upstash.io", token: "fictional-store-token", prefix: "test" }, sourceId, fetcher);
  return { store, values, calls, failNextCommit: () => { failCommit = true; } };
}
const extra = { course: "Estatística", availability: AVAILABILITY_OPTIONS[0], submittedAt: "2026-11-22T12:00:00Z" };

test("configuração exige persistência externa HTTPS, sem fallback temporário", () => {
  assert.equal(getResponseStoreConfig({}), null);
  assert.equal(getResponseStoreConfig({ UPSTASH_REDIS_REST_URL: "http://localhost", UPSTASH_REDIS_REST_TOKEN: "secret" }), null);
  assert.equal(getResponseStoreConfig({ UPSTASH_REDIS_REST_URL: "https://test.upstash.io", UPSTASH_REDIS_REST_TOKEN: "secret" }).url, "https://test.upstash.io");
});

test("rascunho recuperável não alimenta os gráficos antes da confirmação", async () => {
  const mock = redisMock();
  const transaction = await mock.store.begin(memberId, extra);
  assert.deepEqual(await mock.store.readForForm(memberId), extra);
  assert.equal((await mock.store.readMany([memberId])).size, 0);
  await transaction.commit();
  assert.deepEqual((await mock.store.readMany([memberId])).get(memberId.replaceAll("-", "")), extra);
  const saved = mock.calls.find(call => call[0] === "EVAL" && call[2] === 3);
  assert.ok(saved[1].includes("redis.call('SET',KEYS[2],ARGV[2])"));
  assert.ok(!saved[1].includes("EXPIRE"));
  assert.ok(mock.calls.every(call => !JSON.stringify(call).includes("ana@example.com")));
});

test("bloqueio impede envios simultâneos e falha de gravação preserva a resposta confirmada anterior", async () => {
  const mock = redisMock();
  const previous = await mock.store.begin(memberId, extra);
  await previous.commit();
  const next = await mock.store.begin(memberId, { ...extra, course: "Física" });
  await assert.rejects(mock.store.begin(memberId, extra), error => error.status === 409);
  mock.failNextCommit();
  await assert.rejects(next.commit(), error => error.status === 503);
  await next.release();
  assert.equal((await mock.store.readMany([memberId])).get(memberId.replaceAll("-", "")).course, "Estatística");
  assert.equal((await mock.store.readForForm(memberId)).course, "Física");
});

test("respostas entram em perfis e análises por ID, preservando dados oficiais e ignorando membros removidos", () => {
  const metadata = { syncedAt: extra.submittedAt, membersDataSourceId: sourceId, projectsDataSourceId: otherId };
  const database = buildNotionDatabase([{ url: `https://www.notion.so/${memberId}`, Name: "Ana Renomeada", Status: "Diretor", Techs: ["Python"] }], [], metadata);
  const merged = applyDashboardResponses(database, new Map([[memberId.replaceAll("-", ""), extra], [otherId.replaceAll("-", ""), { ...extra, course: "Curso removido" }]]));
  const member = rawMemberToMember(merged.membros[0]);
  assert.equal(member.curso, "Estatística");
  assert.equal(member.disponibilidade, extra.availability);
  assert.equal(member.respondeuForms, true);
  assert.equal(member.status, "Diretor");
  assert.deepEqual(member.techs, ["Python"]);
  assert.equal(database.membros[0].Curso, null);
  assert.deepEqual(merged.analises.porCurso, [{ Curso: "Estatística", Quantidade: 1 }]);
  assert.deepEqual(merged.analises.porDisponibilidade, [{ Disponibilidade: extra.availability, Quantidade: 1 }]);
  assert.equal(merged.analises.resumo.find(row => row["Métrica"] === "Respostas no Forms").Valor, 1);
  assert.deepEqual(merged.analises.porMaturidade, []);
});

test("foto vinculada ao ID continua disponível após uma correção de nome", () => {
  const photo = getMemberPhoto({ nome: "Nome corrigido", nomeOriginal: "Nome corrigido", notionId: "f507067d-e5d1-8390-9a83-81cdd5b732d7" });
  assert.ok(photo.includes("caio-mendonca-barreto-de-brito"));
});

test("limite de tentativas distingue membros e reabre depois de um minuto", () => {
  const limiter = createSubmissionLimiter();
  for (let i = 0; i < 5; i++) assert.equal(limiter.consume(memberId, 1000), true);
  assert.equal(limiter.consume(memberId, 1000), false);
  assert.equal(limiter.consume(otherId, 1000), true);
  assert.equal(limiter.consume(memberId, 61001), true);
});
