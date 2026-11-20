"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, Users, FolderOpen, Network, PanelLeftClose, PanelLeftOpen, Menu, LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/membros", label: "Membros", icon: Users },
  { href: "/projetos", label: "Projetos", icon: FolderOpen },
  { href: "/organograma", label: "Organograma", icon: Network },
];

function Navigation({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Navegação principal" className="space-y-1 p-2">
    {navigation.map(({ href, label, icon: Icon }) => {
      const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
      return <Link key={href} href={href} prefetch={false} onClick={onNavigate} aria-current={active ? "page" : undefined} title={compact ? label : undefined}
        className={`flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${active ? "bg-primary/20 text-violet-200" : "text-muted-foreground hover:bg-secondary hover:text-foreground"} ${compact ? "justify-center px-0" : ""}`}>
        <Icon className="size-4 shrink-0" aria-hidden="true" /><span className={compact ? "sr-only" : ""}>{label}</span>
      </Link>;
    })}
  </nav>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" prefetch={false} className={`flex h-14 items-center gap-2.5 border-b border-border/40 px-4 ${compact ? "justify-center px-0" : ""}`} aria-label="SimMAP — início">
    <Image src="/logo-mark.webp" width={32} height={32} alt="" className="size-8 object-contain" priority />
    <span className={compact ? "sr-only" : "text-lg font-semibold tracking-tight"}>SimMAP</span>
  </Link>;
}

export function AppFrame({ children, initiallyCollapsed = false }: { children: ReactNode; initiallyCollapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const current = navigation.find(item => item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `laia-sidebar=${next ? "collapsed" : "expanded"}; Path=/; Max-Age=31536000; SameSite=Strict`;
  };

  return <div className="app-frame min-h-screen bg-background bg-grid" data-collapsed={collapsed}>
    <a href="#main-content" className="sr-only z-[100] rounded bg-background p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Ir para o conteúdo</a>
    <aside id="desktop-navigation" className="app-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border/40 bg-sidebar md:flex">
      <Brand compact={collapsed} />
      <div className="flex-1 overflow-y-auto pt-3"><Navigation compact={collapsed} /></div>
      <form action={logout} className="border-t border-border/40 p-2">
        <button type="submit" title="Sair" className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground ${collapsed ? "justify-center px-0" : ""}`}>
          <LogOut className="size-4" aria-hidden="true" /><span className={collapsed ? "sr-only" : ""}>Sair</span>
        </button>
      </form>
    </aside>
    <div className="app-workspace min-w-0">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/40 bg-background px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={toggle} aria-controls="desktop-navigation" aria-expanded={!collapsed} aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"} className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring md:inline-flex">
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild><button type="button" aria-label="Abrir menu de navegação" className="inline-flex size-9 items-center justify-center rounded-lg hover:bg-secondary md:hidden"><Menu className="size-5" /></button></SheetTrigger>
            <SheetContent side="left" className="w-64 gap-0 bg-sidebar p-0">
              <SheetHeader className="sr-only"><SheetTitle>Menu de navegação</SheetTitle><SheetDescription>Dashboard, membros, projetos e organograma da LaIA.</SheetDescription></SheetHeader>
              <Brand /><Navigation onNavigate={() => setMobileOpen(false)} />
              <form action={logout} className="mt-auto border-t border-border/40 p-3"><button type="submit" className="flex h-10 items-center gap-3 px-2 text-sm"><LogOut className="size-4" />Sair</button></form>
            </SheetContent>
          </Sheet>
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{current?.label ?? "SimMAP"}</p><p className="truncate text-xs text-muted-foreground">Liga Acadêmica de Inteligência Artificial</p></div>
        </div>
        <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-xs text-violet-200">LaIA</span>
      </header>
      {children}
    </div>
  </div>;
}
