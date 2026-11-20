"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createLoginLimiter, isAllowedEmail, verifyPassword } from "@/lib/auth/credentials";
import { createAdminSession, destroyAdminSession } from "@/lib/auth/session";

export interface LoginState { error: string; }
const limiter = createLoginLimiter();

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const requestHeaders = await headers();
  const client = `ip:${requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "local"}`;
  if (!limiter.consume(client)) return { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };

  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string" || email.length > 254 || !password || password.length > 256) {
    return { error: "E-mail ou senha inválidos." };
  }

  const encoded = process.env.ADMIN_PASSWORD_HASH;
  if (!encoded) return { error: "O acesso administrativo precisa ser configurado." };
  const passwordValid = await verifyPassword(password, encoded);
  if (!isAllowedEmail(email) || !passwordValid) return { error: "E-mail ou senha inválidos." };

  await createAdminSession();
  limiter.reset(client);
  redirect("/");
}

export async function logout() {
  await destroyAdminSession();
  redirect("/login");
}
