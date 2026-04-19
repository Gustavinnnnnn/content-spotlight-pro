import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Customer {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  plan_name: string | null;
  amount: number;
  status: string;
  created_at: string;
}

const formatBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
const formatPhone = (p: string | null) => {
  if (!p) return "—";
  const d = p.replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
};

const CustomerTable = ({ rows, emptyText }: { rows: Customer[]; emptyText: string }) => (
  <div className="overflow-hidden rounded-2xl bg-card shadow-card">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Telefone</TableHead>
          <TableHead>Plano</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Data</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">{emptyText}</TableCell></TableRow>
        )}
        {rows.map((c) => {
          const digits = (c.customer_phone || "").replace(/\D/g, "");
          const wa = digits ? `https://wa.me/${digits.length <= 11 ? "55" + digits : digits}` : null;
          return (
            <TableRow key={c.id}>
              <TableCell className="text-xs font-medium">{c.customer_name || "—"}</TableCell>
              <TableCell className="text-xs">{formatPhone(c.customer_phone)}</TableCell>
              <TableCell className="text-xs">{c.plan_name || "—"}</TableCell>
              <TableCell className="text-xs font-bold">{formatBRL(c.amount)}</TableCell>
              <TableCell className="text-xs">{new Date(c.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</TableCell>
              <TableCell className="text-right">
                {wa && (
                  <Button asChild size="icon" variant="ghost" className="h-7 w-7" aria-label="Abrir WhatsApp">
                    <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-3.5 w-3.5" /></a>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);

export const CustomersEditor = () => {
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id,customer_name,customer_phone,plan_name,amount,status,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (data) setRows(data as Customer[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("customers-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando clientes...</div>;
  }

  const paid = rows.filter((r) => r.status === "approved");
  const pending = rows.filter((r) => r.status === "pending" || r.status === "processing" || r.status === "under_review");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="text-2xl font-extrabold">{paid.length}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Clientes pagos</div>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="text-2xl font-extrabold">{pending.length}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pendentes</div>
        </div>
      </div>

      <Tabs defaultValue="paid" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="paid">Pagos ({paid.length})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({pending.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="paid" className="mt-3">
          <CustomerTable rows={paid} emptyText="Nenhum cliente pagou ainda." />
        </TabsContent>
        <TabsContent value="pending" className="mt-3">
          <CustomerTable rows={pending} emptyText="Nenhum cliente pendente." />
        </TabsContent>
      </Tabs>
    </div>
  );
};
