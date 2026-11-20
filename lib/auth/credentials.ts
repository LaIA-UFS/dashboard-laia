import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

export const ADMIN_EMAIL = "laia@dcomp.ufs.br";
const HASH_BYTES = 64;
const SCRYPT_OPTIONS = { N: 65536, r: 8, p: 2, maxmem: 96 * 1024 * 1024 };

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, HASH_BYTES, SCRYPT_OPTIONS, (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt-v1:${salt}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [version, salt, digest, extra] = encoded.split(":");
  if (version !== "scrypt-v1" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(digest ?? "") || extra) {
    throw new Error("A senha do administrador não está configurada corretamente.");
  }
  if (password.length > 256) return false;
  const candidate = await derive(password, salt);
  return timingSafeEqual(candidate, Buffer.from(digest, "hex"));
}

export function credentialVersion(encoded: string) {
  return createHash("sha256").update(encoded).digest("hex");
}

export function isAllowedEmail(email: string) {
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

export function isValidAdminSession(value: unknown, version: string, now = Date.now()): value is { email: string; expiresAt: number; version: string } {
  if (!value || typeof value !== "object") return false;
  const session = value as Record<string, unknown>;
  return session.email === ADMIN_EMAIL && typeof session.expiresAt === "number" && session.expiresAt > now && session.version === version;
}

export function createLoginLimiter() {
  const attempts = new Map<string, { count: number; expires: number }>();
  const windowMs = 5 * 60 * 1000;
  return {
    consume(key: string, now = Date.now()) {
      for (const [id, value] of attempts) if (value.expires <= now) attempts.delete(id);
      const perClient = attempts.get(key);
      const global = attempts.get("global");
      if ((perClient?.count ?? 0) >= 5 || (global?.count ?? 0) >= 30) return false;
      attempts.set(key, { count: (perClient?.count ?? 0) + 1, expires: perClient?.expires ?? now + windowMs });
      attempts.set("global", { count: (global?.count ?? 0) + 1, expires: global?.expires ?? now + windowMs });
      return true;
    },
    reset(key: string) { attempts.delete(key); },
  };
}
