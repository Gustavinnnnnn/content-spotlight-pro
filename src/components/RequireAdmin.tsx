import { useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "ok" | "deny">("loading");

  useEffect(() => {
    const check = async (userId: string | undefined) => {
      if (!userId) { navigate("/auth"); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (data) setStatus("ok"); else setStatus("deny");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      check(session?.user.id);
    });
    supabase.auth.getSession().then(({ data: { session } }) => check(session?.user.id));
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (status === "loading") {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }
  if (status === "deny") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">Acesso negado</h1>
        <p className="text-muted-foreground">Você não tem permissão de administrador.</p>
      </div>
    );
  }
  return <>{children}</>;
};
