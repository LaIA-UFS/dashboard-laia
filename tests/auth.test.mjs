import assert from "node:assert/strict";
import test from "node:test";
import { getIronSession } from "iron-session";
import { ADMIN_EMAIL, createLoginLimiter, credentialVersion, hashPassword, isAllowedEmail, isValidAdminSession, verifyPassword } from "../lib/auth/credentials.ts";

test("somente o e-mail administrativo é aceito", () => {
  assert.equal(isAllowedEmail(ADMIN_EMAIL), true);
  assert.equal(isAllowedEmail(`  ${ADMIN_EMAIL.toUpperCase()} `), true);
  for (const email of ["outro@dcomp.ufs.br", "laia@ufs.br", `${ADMIN_EMAIL}.invalid`, `prefix${ADMIN_EMAIL}`, "lаia@dcomp.ufs.br"]) {
    assert.equal(isAllowedEmail(email), false);
  }
});

test("a senha tem salt aleatório e a verificação rejeita senhas incorretas", async () => {
  const password = "fixture-password-for-tests";
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.ok(!first.includes(password));
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword("wrong", first), false);
  assert.equal(await verifyPassword("x".repeat(257), first), false);
  await assert.rejects(verifyPassword(password, "not-a-hash"), /configurada/);
  assert.notEqual(credentialVersion(first), credentialVersion(second));
});

test("sessões expiradas, de outra conta ou de uma senha anterior não autorizam acesso", () => {
  const session = { email: ADMIN_EMAIL, version: "current", expiresAt: 2000 };
  assert.equal(isValidAdminSession(session, "current", 1000), true);
  assert.equal(isValidAdminSession(session, "current", 2000), false);
  assert.equal(isValidAdminSession(session, "rotated", 1000), false);
  assert.equal(isValidAdminSession({ ...session, email: "other@example.invalid" }, "current", 1000), false);
  assert.equal(isValidAdminSession({}, "current", 1000), false);
});

test("a sessão é cifrada, não aceita adulteração e sai ao remover o cookie", async () => {
  const jar = new Map();
  const store = {
    get(name) { return jar.has(name) ? { name, value: jar.get(name) } : undefined; },
    set(name, value, options) { if (options.maxAge === 0) jar.delete(name); else jar.set(name, value); },
  };
  const options = { cookieName: "test-session", password: "a-test-session-secret-with-more-than-32-characters", ttl: 3600, cookieOptions: { httpOnly: true, sameSite: "strict", secure: true } };
  const session = await getIronSession(store, options);
  session.email = ADMIN_EMAIL;
  await session.save();
  const sealed = jar.get("test-session");
  assert.ok(!sealed.includes(ADMIN_EMAIL));
  assert.equal((await getIronSession(store, options)).email, ADMIN_EMAIL);
  jar.set("test-session", sealed.slice(0, -12) + "tampered-data");
  assert.equal((await getIronSession(store, options)).email, undefined);
  jar.set("test-session", sealed);
  (await getIronSession(store, options)).destroy();
  assert.equal((await getIronSession(store, options)).email, undefined);
});

test("tentativas repetidas são limitadas e o bloqueio expira", () => {
  const limiter = createLoginLimiter();
  for (let attempt = 0; attempt < 5; attempt++) assert.equal(limiter.consume("ip:one", 0), true);
  assert.equal(limiter.consume("ip:one", 0), false);
  assert.equal(limiter.consume("ip:two", 0), true);
  assert.equal(limiter.consume("ip:one", 300001), true);
  const shared = createLoginLimiter();
  for (let attempt = 0; attempt < 30; attempt++) assert.equal(shared.consume(`ip:${attempt}`, 0), true);
  assert.equal(shared.consume("ip:new", 0), false);
});
