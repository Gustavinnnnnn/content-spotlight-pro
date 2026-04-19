import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LogOut, Menu, LayoutDashboard, User, Tag, Image as ImageIcon, ShoppingBag, Users } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Section = "dashboard" | "sales" | "customers" | "profile" | "plans" | "gallery";

const SECTIONS: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "sales", label: "Vendas", icon: ShoppingBag },
  { id: "customers", label: "Clientes", icon: Users },
  { id: "profile", label: "Perfil", icon: User },
  { id: "plans", label: "Planos", icon: Tag },
  { id: "gallery", label: "Galeria", icon: ImageIcon },
];

const Admin = () => {
  const [section, setSection] = useState<Section>("dashboard");
  const [open, setOpen] = useState(false);

  const current = SECTIONS.find((s) => s.id === section)!;

  const select = (id: Section) => {
    setSection(id);
    setOpen(false);
  };

  return (
    <RequireAdmin>
      <div className="min-h-screen bg-gradient-warm pb-16">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-center gap-1">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Abrir menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <SheetHeader>
                    <SheetTitle>Painel Admin</SheetTitle>
                  </SheetHeader>
                  <nav className="mt-6 space-y-1">
                    {SECTIONS.map((s) => {
                      const Icon = s.icon;
                      const active = s.id === section;
                      return (
                        <button
                          key={s.id}
                          onClick={() => select(s.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth",
                            active
                              ? "bg-primary text-primary-foreground shadow-soft"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {s.label}
                        </button>
                      );
                    })}
                  </nav>
                  <div className="mt-6 border-t border-border pt-4 space-y-1">
                    <Link
                      to="/"
                      onClick={() => setOpen(false)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                    >
                      <ArrowLeft className="h-4 w-4" /> Ver site
                    </Link>
                    <button
                      onClick={() => supabase.auth.signOut()}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
                    >
                      <LogOut className="h-4 w-4" /> Sair
                    </button>
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="text-base font-extrabold">{current.label}</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()} aria-label="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-6">
          {section === "dashboard" && <DashboardEditor />}
          {section === "sales" && <SalesEditor />}
          {section === "profile" && <SettingsEditor />}
          {section === "plans" && <PlansEditor />}
          {section === "gallery" && <GalleryEditor />}
        </main>
      </div>
    </RequireAdmin>
  );
};

export default Admin;
