import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageCircle, Send, Search, User, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface TgMessage {
  update_id: number;
  chat_id: number;
  username: string | null;
  first_name: string | null;
  text: string | null;
  direction: string;
  created_at: string;
}

interface Chat {
  chat_id: number;
  name: string;
  username: string | null;
  last_text: string;
  last_at: string;
}

export const TelegramChatEditor = () => {
  const [messages, setMessages] = useState<TgMessage[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [q, setQ] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("telegram_messages")
      .select("update_id, chat_id, username, first_name, text, direction, created_at")
      .order("created_at", { ascending: true })
      .limit(2000);
    if (error) toast.error(error.message);
    else setMessages((data as TgMessage[]) ?? []);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("telegram_messages_admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "telegram_messages" }, (p) => {
        setMessages((prev) => [...prev, p.new as TgMessage]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const chats: Chat[] = useMemo(() => {
    const map = new Map<number, Chat>();
    for (const m of messages) {
      const name = m.first_name || m.username || `Chat ${m.chat_id}`;
      const existing = map.get(m.chat_id);
      if (!existing || existing.last_at < m.created_at) {
        map.set(m.chat_id, {
          chat_id: m.chat_id,
          name: existing?.name || name,
          username: existing?.username ?? m.username,
          last_text: m.text || (m.direction === "out" ? "Você: (sem texto)" : "(sem texto)"),
          last_at: m.created_at,
        });
      } else if (!existing.username && m.username) {
        existing.username = m.username;
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.last_at < b.last_at ? 1 : -1));
  }, [messages]);

  const filteredChats = chats.filter((c) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      c.name.toLowerCase().includes(s) ||
      (c.username ?? "").toLowerCase().includes(s) ||
      String(c.chat_id).includes(s)
    );
  });

  const activeMessages = messages.filter((m) => m.chat_id === selected);
  const activeChat = chats.find((c) => c.chat_id === selected);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected, activeMessages.length]);

  const send = async () => {
    if (!selected || !text.trim()) return;
    setSending(true);
    const { error } = await supabase.functions.invoke("telegram-send-message", {
      body: { chat_id: selected, text: text.trim() },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      {/* Chat list */}
      <aside
        className={cn(
          "flex flex-col rounded-2xl border border-border bg-gradient-admin-card p-3 shadow-admin",
          selected !== null && "hidden lg:flex",
        )}
      >
        <div className="mb-3 flex items-center gap-2 px-1">
          <MessageCircle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Conversas</h3>
          <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
            {chats.length}
          </span>
        </div>
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 bg-card/50 pl-8 text-sm"
          />
        </div>
        <div className="-mx-1 flex-1 space-y-1 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 260px)" }}>
          {filteredChats.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              Nenhuma conversa ainda. Quando alguém der /start no bot, aparece aqui.
            </div>
          )}
          {filteredChats.map((c) => (
            <button
              key={c.chat_id}
              onClick={() => setSelected(c.chat_id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-smooth",
                selected === c.chat_id
                  ? "bg-gradient-admin-accent text-white shadow-admin-glow"
                  : "hover:bg-card",
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase",
                  selected === c.chat_id ? "bg-white/20 text-white" : "bg-primary/15 text-primary",
                )}
              >
                {c.name.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{c.name}</span>
                  <span
                    className={cn(
                      "shrink-0 text-[10px]",
                      selected === c.chat_id ? "text-white/70" : "text-muted-foreground",
                    )}
                  >
                    {new Date(c.last_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>
                <div
                  className={cn(
                    "truncate text-xs",
                    selected === c.chat_id ? "text-white/75" : "text-muted-foreground",
                  )}
                >
                  {c.last_text}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversation */}
      <section
        className={cn(
          "flex min-h-[60vh] flex-col rounded-2xl border border-border bg-gradient-admin-card shadow-admin",
          selected === null && "hidden lg:flex",
        )}
      >
        {selected === null ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            <div>
              <MessageCircle className="mx-auto mb-2 h-8 w-8 text-primary/60" />
              Selecione uma conversa para responder.
            </div>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSelected(null)}
                aria-label="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold">{activeChat?.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {activeChat?.username ? `@${activeChat.username} · ` : ""}ID {selected}
                </div>
              </div>
            </header>

            <div
              className="flex-1 space-y-2 overflow-y-auto p-4"
              style={{ maxHeight: "calc(100vh - 340px)" }}
            >
              {activeMessages.map((m) => {
                const mine = m.direction === "out";
                return (
                  <div key={m.update_id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                        mine
                          ? "rounded-br-md bg-gradient-admin-accent text-white"
                          : "rounded-bl-md bg-card text-foreground",
                      )}
                    >
                      <div className="whitespace-pre-wrap break-words">{m.text || <span className="opacity-60">(sem texto)</span>}</div>
                      <div className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-muted-foreground")}>
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <footer className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Escreva uma mensagem..."
                  className="min-h-[42px] resize-none bg-card/50"
                  maxLength={4000}
                />
                <Button
                  onClick={send}
                  disabled={sending || !text.trim()}
                  className="bg-gradient-admin-accent shadow-admin-glow hover:opacity-90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-1 px-1 text-[10px] text-muted-foreground">
                Enter envia · Shift+Enter quebra linha · {text.length}/4000
              </p>
            </footer>
          </>
        )}
      </section>
    </div>
  );
};
