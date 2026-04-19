import { Link } from "react-router-dom";
import { ArrowLeft, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequireAdmin } from "@/components/RequireAdmin";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
import { PlansEditor } from "@/components/admin/PlansEditor";
import { GalleryEditor } from "@/components/admin/GalleryEditor";

const Admin = () => {
  return (
    <RequireAdmin>
      <div className="min-h-screen bg-gradient-warm pb-16">
        <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link to="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Ver site
            </Link>
            <h1 className="text-base font-extrabold">Painel Admin</h1>
            <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="mx-auto max-w-3xl px-4 py-6">
          <Tabs defaultValue="profile">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="plans">Planos</TabsTrigger>
              <TabsTrigger value="gallery">Galeria</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="mt-4"><SettingsEditor /></TabsContent>
            <TabsContent value="plans" className="mt-4"><PlansEditor /></TabsContent>
            <TabsContent value="gallery" className="mt-4"><GalleryEditor /></TabsContent>
          </Tabs>
        </main>
      </div>
    </RequireAdmin>
  );
};

export default Admin;
