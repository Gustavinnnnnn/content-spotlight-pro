import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LogOut, Menu, LayoutDashboard, User, Tag, Image as ImageIcon, ShoppingBag, Users, Sparkles, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RequireAdmin } from "@/components/RequireAdmin";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
import { PlansEditor } from "@/components/admin/PlansEditor";
import { GalleryEditor } from "@/components/admin/GalleryEditor";
import { DashboardEditor } from "@/components/admin/DashboardEditor";
import { SalesEditor } from "@/components/admin/SalesEditor";
import { CustomersEditor } from "@/components/admin/CustomersEditor";
import { TelegramEditor } from "@/components/admin/TelegramEditor";
import { cn } from "@/lib/utils";

type Section = "dashboard" | "sales" | "customers" | "profile" | "plans" | "gallery" | "telegram";

const SECTIONS: { id: Section; label: string; icon: typeof LayoutDashboard; hint: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Visão geral" },
  { id: "sales", label: "Vendas", icon: ShoppingBag, hint: "Transações" },
  { id: "customers", label: "Clientes", icon: Users, hint: "Pagos e pendentes" },
  { id: "profile", label: "Perfil", icon: User, hint: "Identidade do clube" },
  { id: "plans", label: "Planos", icon: Tag, hint: "Preços e ofertas" },
  { id: "gallery", label: "Galeria", icon: ImageIcon, hint: "Fotos e vídeos" },
  { id: "telegram", label: "Telegram", icon: Bot, hint: "Bot e canal VIP" },
];

const NavList = ({ section, onSelect }: { section: Section; onSelect: (id: Section) => void }) => (
  <nav className="space-y-1">
    {SECTIONS.map((s) => {
      const Icon = s.icon;
      const active = s.id === section;
      return (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={cn(
            "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-smooth",
            active
              ? "bg-gradient-admin-accent text-white shadow-admin-glow"
              : "text-muted-foreground hover:bg-card hover:text-foreground"
          )}
        >
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-smooth",
              active ? "bg-white/15" : "bg-muted group-hover:bg-card"
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="flex-1 text-left">
            <span className="block leading-tight">{s.label}</span>
            <span className={cn("block text-[10px] font-normal", active ? "text-white/70" : "text-muted-foreground/70")}>
              {s.hint}
            </span>
          </span>
        </button>
      );
    })}
  </nav>
);

const Admin = () => {
  const [section, setSection] = useState<Section>("dashboard");
  const [open, setOpen] = useState(false);

  const current = SECTIONS.find((s) => s.id === section)!;
  const CurrentIcon = current.icon;

  const select = (id: Section) => {
    setSection(id);
    setOpen(false);
  };

  return (
    <RequireAdmin>
      <div className="admin-scope min-h-screen">
        {/* Decorative glow */}
        <div className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-72 bg-[radial-gradient(ellipse_at_top,hsl(20_95%_55%/0.18),transparent_60%)]" />

        <div className="relative mx-auto flex max-w-7xl gap-6 px-4 py-4 lg:px-8 lg:py-8">
          {/* Desktop sidebar */}
          <aside className="sticky top-8 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col rounded-3xl border border-border bg-gradient-admin-card p-4 shadow-admin lg:flex">
            <div className="flex items-center gap-2.5 px-2 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-admin-accent shadow-admin-glow">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-bold leading-tight">Painel Admin</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Control center</div>
              </div>
            </div>

            <div className="my-3 h-px bg-border" />

            <div className="flex-1 overflow-y-auto pr-1">
              <NavList section={section} onSelect={select} />
            </div>

            <div className="mt-3 space-y-1 border-t border-border pt-3">
              <Link to="/" className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-smooth">
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao site
              </Link>
              <button
                onClick={() => supabase.auth.signOut()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground transition-smooth"
              >
                <LogOut className="h-3.5 w-3.5" /> Sair da conta
              </button>
            </div>
          </aside>

          {/* Main */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {/* Topbar */}
            <header className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-gradient-admin-card px-4 py-3 shadow-admin lg:px-6">
              <div className="flex items-center gap-3">
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="admin-scope w-72 border-border bg-gradient-admin-bg">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-admin-accent">
                          <Sparkles className="h-3.5 w-3.5 text-white" />
                        </span>
                        Painel Admin
                      </SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                      <NavList section={section} onSelect={select} />
                    </div>
                    <div className="mt-6 border-t border-border pt-4 space-y-1">
                      <Link to="/" onClick={() => setOpen(false)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground">
                        <ArrowLeft className="h-4 w-4" /> Ver site
                      </Link>
                      <button onClick={() => supabase.auth.signOut()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground">
                        <LogOut className="h-4 w-4" /> Sair
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>

                <div className="flex items-center gap-3">
                  <div className="hidden h-10 w-10 items-center justify-center rounded-xl bg-gradient-admin-accent shadow-admin-glow sm:flex">
                    <CurrentIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{current.hint}</div>
                    <h1 className="text-lg font-extrabold leading-tight sm:text-xl">{current.label}</h1>
                  </div>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} className="hidden lg:inline-flex" aria-label="Sair">
                <LogOut className="mr-1 h-3.5 w-3.5" /> Sair
              </Button>
            </header>

            <main className="pb-12">
              {section === "dashboard" && <DashboardEditor />}
              {section === "sales" && <SalesEditor />}
              {section === "customers" && <CustomersEditor />}
              {section === "profile" && <SettingsEditor />}
              {section === "plans" && <PlansEditor />}
              {section === "gallery" && <GalleryEditor />}
              {section === "telegram" && <TelegramEditor />}
            </main>
          </div>
        </div>
      </div>
    </RequireAdmin>
  );
};

export default Admin;
