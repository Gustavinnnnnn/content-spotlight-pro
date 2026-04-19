import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";

interface Tx {
  id: string;
  reference: string;
  plan_name: string | null;
  amount: number;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  created_at: string;
}

const formatBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "approved") return "default";
  if (s === "pending" || s === "processing") return "secondary";
  if (s === "failed" || s === "refunded" || s === "chargeback") return "destructive";
  return "outline";
};

const statusLabel: Record<string, string> = {
  approved: "Aprovado",
  pending: "Aguardando",
  processing: "Processando",
  under_review: "Em análise",
  failed: "Falhou",
  refunded: "Reembolsado",
  chargeback: "Chargeback",
};

export const SalesEditor = () => {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id,reference,plan_name,amount,status,customer_name,customer_email,created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (data) setTxs(data as Tx[]);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("transactions-admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando vendas...</div>;

  const approved = txs.filter(t => t.status === "approved");
  const totalApproved = approved.reduce((s, t) => s + t.amount, 0);
  const pending = txs.filter(t => t.status === "pending").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="text-2xl font-extrabold">{formatBRL(totalApproved)}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Receita aprovada</div>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="text-2xl font-extrabold">{approved.length}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Vendas pagas</div>
        </div>
        <div className="rounded-2xl bg-card p-4 shadow-card">
          <div className="text-2xl font-extrabold">{pending}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pendentes</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {txs.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhuma venda ainda.</TableCell></TableRow>
            )}
            {txs.map(t => (
              <TableRow key={t.id}>
                <TableCell className="text-xs">{new Date(t.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                <TableCell className="text-xs">
                  <div className="font-medium">{t.customer_name || "—"}</div>
                  <div className="text-muted-foreground">{t.customer_email}</div>
                </TableCell>
                <TableCell className="text-xs">{t.plan_name || "—"}</TableCell>
                <TableCell className="text-xs font-bold">{formatBRL(t.amount)}</TableCell>
                <TableCell><Badge variant={statusVariant(t.status)}>{statusLabel[t.status] || t.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
