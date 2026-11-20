"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { login } from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(login, { error: "" });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">E-mail institucional</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input id="email" name="email" type="email" autoComplete="username" required maxLength={254} placeholder="Seu e-mail institucional" className="h-11 rounded-xl border-white/15 bg-background/40 pl-10" aria-describedby={state.error ? "login-error" : undefined} />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">Senha</label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={256} placeholder="Digite sua senha" className="h-11 rounded-xl border-white/15 bg-background/40 pl-10 pr-12" aria-describedby={state.error ? "login-error" : undefined} />
          <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword} className="absolute right-1 top-1 rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {state.error ? <p id="login-error" role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-[0_8px_30px_rgba(100,60,240,0.2)] hover:bg-primary/90">
        {pending ? <><LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Entrando...</> : "Entrar no dashboard"}
      </Button>
    </form>
  );
}
