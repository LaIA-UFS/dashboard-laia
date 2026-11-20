import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession, type SessionOptions } from "iron-session";
import { ADMIN_EMAIL, credentialVersion, isValidAdminSession } from "./credentials";

export const SESSION_COOKIE = "laia-admin-session";
const SESSION_SECONDS = 8 * 60 * 60;

interface AdminSession {
  email: string;
  expiresAt: number;
  version: string;
}

function options(): SessionOptions {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("Configure SESSION_SECRET com pelo menos 32 caracteres.");
  const secure = process.env.APP_URL
    ? new URL(process.env.APP_URL).protocol === "https:"
    : process.env.NODE_ENV === "production";
  return {
    cookieName: SESSION_COOKIE,
    password: secret,
    ttl: SESSION_SECONDS,
    cookieOptions: { httpOnly: true, secure, sameSite: "strict", path: "/" },
  };
}

export const getAdminSession = cache(async () => {
  const session = await getIronSession<AdminSession>(await cookies(), options());
  if (!isValidAdminSession(session, credentialVersion(process.env.ADMIN_PASSWORD_HASH ?? ""))) return null;
  return { email: session.email };
});

export async function requireAdmin() {
  if (!await getAdminSession()) redirect("/login");
}

export async function createAdminSession() {
  const session = await getIronSession<AdminSession>(await cookies(), options());
  session.email = ADMIN_EMAIL;
  session.expiresAt = Date.now() + SESSION_SECONDS * 1000;
  session.version = credentialVersion(process.env.ADMIN_PASSWORD_HASH ?? "");
  await session.save();
}

export async function destroyAdminSession() {
  const session = await getIronSession<AdminSession>(await cookies(), options());
  session.destroy();
}
