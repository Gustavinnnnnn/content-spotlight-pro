import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageCircle, Send, Search, User, ArrowLeft, Image as ImageIcon, Mic, Video, X, Loader2, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface TgMessage {
  update_id: number;
  chat_id: number;
  username: string | null;
  first_name: string | null;
  text: string | null;
  media_url: string | null;
  media_type: string | null;
  media_caption: string | null;
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

type PendingMedia = { file: Blob; url: string; type: "photo" | "video" | "voice"; name: string };

export const TelegramChatEditor = () => {
  const [messages, setMessages] = useState<TgMessage[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<PendingMedia | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("telegram_messages")
      .select("update_id, chat_id, username, first_name, text, media_url, media_type, media_caption, direction, created_at")
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
    return () => { supabase.removeChannel(ch); };
  }, []);

  const chats: Chat[] = useMemo(() => {
    const map = new Map<number, Chat>();
    for (const m of messages) {
      const name = m.first_name || m.username || `Chat ${m.chat_id}`;
      const preview = m.text || (m.media_type ? `📎 ${m.media_type}` : "(sem texto)");
      const existing = map.get(m.chat_id);
      if (!existing || existing.last_at < m.created_at) {
        map.set(m.chat_id, {
          chat_id: m.chat_id,
          name: existing?.name || name,
          username: existing?.username ?? m.username,
          last_text: m.direction === "out" ? `Você: ${preview}` : preview,
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
    return c.name.toLowerCase().includes(s) || (c.username ?? "").toLowerCase().includes(s) || String(c.chat_id).includes(s);
  });

  const activeMessages = messages.filter((m) => m.chat_id === selected);
  const activeChat = chats.find((c) => c.chat_id === selected);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected, activeMessages.length]);

  const uploadMedia = async (file: Blob, type: PendingMedia["type"], name: string): Promise<string | null> => {
    const ext = name.split(".").pop() || (type === "photo" ? "jpg" : type === "video" ? "mp4" : "webm");
    const path = `chat-media/out-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("club-assets").upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) {
      toast.error("Upload falhou: " + error.message);
      return null;
    }
    const { data } = supabase.storage.from("club-assets").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleFile = async (f: File | null, type: "photo" | "video") => {
    if (!f) return;
    const url = URL.createObjectURL(f);
    setPending({ file: f, url, type, name: f.name });
  };

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const url = URL.createObjectURL(blob);
        setPending({ file: blob, url, type: "voice", name: `voice.webm` });
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (e) {
      toast.error("Permissão de microfone negada");
    }
  };

  const stopRecord = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const send = async () => {
    if (!selected) return;
    if (!text.trim() && !pending) return;
    setSending(true);
    try {
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;
      if (pending) {
        setUploading(true);
        mediaUrl = await uploadMedia(pending.file, pending.type, pending.name);
        setUploading(false);
        if (!mediaUrl) { setSending(false); return; }
        mediaType = pending.type;
      }
      const { error } = await supabase.functions.invoke("telegram-send-message", {
        body: {
          chat_id: selected,
          text: text.trim() || undefined,
          media_url: mediaUrl,
          media_type: mediaType,
        },
      });
      if (error) { toast.error(error.message); return; }
      setText("");
      if (pending) { URL.revokeObjectURL(pending.url); setPending(null); }
    } finally {
      setSending(false);
    }
  };

  const renderBubble = (m: TgMessage) => {
    const mine = m.direction === "out";
    const bubble = cn(
      "max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm",
      mine ? "rounded-br-md bg-gradient-admin-accent text-white" : "rounded-bl-md bg-card text-foreground",
    );

    return (
      <div key={m.update_id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <div className={bubble}>
          {m.media_url && m.media_type === "photo" && (
            <img src={m.media_url} alt="" className="mb-1 max-h-64 rounded-lg" />
          )}
          {m.media_url && m.media_type === "video" && (
            <video src={m.media_url} controls className="mb-1 max-h-64 rounded-lg" />
          )}
          {m.media_url && (m.media_type === "voice" || m.media_type === "audio") && (
            <audio src={m.media_url} controls className="mb-1 w-full" />
          )}
          {(m.text || m.media_caption) && (
            <div className="whitespace-pre-wrap break-words">{m.text || m.media_caption}</div>
          )}
          {!m.text && !m.media_url && !m.media_caption && <span className="opacity-60">(sem conteúdo)</span>}
          <div className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-muted-foreground")}>
            {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className={cn("flex flex-col rounded-2xl border border-border bg-gradient-admin-card p-3 shadow-admin", selected !== null && "hidden lg:flex")}>
        <div className="mb-3 flex items-center gap-2 px-1">
          <MessageCircle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">Conversas</h3>
          <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">{chats.length}</span>
        </div>
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cliente..." value={q} onChange={(e) => setQ(e.target.value)} className="h-9 bg-card/50 pl-8 text-sm" />
        </div>
        <div className="-mx-1 flex-1 space-y-1 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 260px)" }}>
          {filteredChats.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">Nenhuma conversa ainda.</div>
          )}
          {filteredChats.map((c) => (
            <button
              key={c.chat_id}
              onClick={() => setSelected(c.chat_id)}
              className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-smooth", selected === c.chat_id ? "bg-gradient-admin-accent text-white shadow-admin-glow" : "hover:bg-card")}
            >
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase", selected === c.chat_id ? "bg-white/20 text-white" : "bg-primary/15 text-primary")}>
                {c.name.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold">{c.name}</span>
                  <span className={cn("shrink-0 text-[10px]", selected === c.chat_id ? "text-white/70" : "text-muted-foreground")}>
                    {new Date(c.last_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>
                <div className={cn("truncate text-xs", selected === c.chat_id ? "text-white/75" : "text-muted-foreground")}>{c.last_text}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <section className={cn("flex min-h-[60vh] flex-col rounded-2xl border border-border bg-gradient-admin-card shadow-admin", selected === null && "hidden lg:flex")}>
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
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelected(null)} aria-label="Voltar">
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

            <div className="flex-1 space-y-2 overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 380px)" }}>
              {activeMessages.map(renderBubble)}
              <div ref={bottomRef} />
            </div>

            {pending && (
              <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl border border-border bg-card/60 p-2">
                {pending.type === "photo" && <img src={pending.url} className="h-14 w-14 rounded-lg object-cover" alt="" />}
                {pending.type === "video" && (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/20">
                    <Play className="h-6 w-6 text-primary" />
                  </div>
                )}
                {pending.type === "voice" && <audio src={pending.url} controls className="h-10 flex-1" />}
                <div className="min-w-0 flex-1 text-xs">
                  <div className="truncate font-semibold">
                    {pending.type === "photo" ? "Imagem" : pending.type === "video" ? "Vídeo" : "Áudio"}
                  </div>
                  <div className="truncate text-muted-foreground">{pending.name}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { URL.revokeObjectURL(pending.url); setPending(null); }} aria-label="Remover">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <footer className="border-t border-border p-3">
              <div className="flex items-end gap-2">
                <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0] || null, "photo")} />
                <input ref={videoInputRef} type="file" accept="video/*" hidden onChange={(e) => handleFile(e.target.files?.[0] || null, "video")} />

                <Button variant="ghost" size="icon" onClick={() => photoInputRef.current?.click()} disabled={sending || recording} aria-label="Enviar imagem" className="text-primary">
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => videoInputRef.current?.click()} disabled={sending || recording} aria-label="Enviar vídeo" className="text-primary">
                  <Video className="h-4 w-4" />
                </Button>
                <Button
                  variant={recording ? "destructive" : "ghost"}
                  size="icon"
                  onClick={recording ? stopRecord : startRecord}
                  disabled={sending}
                  aria-label={recording ? "Parar gravação" : "Gravar áudio"}
                  className={cn(!recording && "text-primary")}
                >
                  <Mic className="h-4 w-4" />
                </Button>

                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={1}
                  placeholder={pending ? "Legenda (opcional)..." : "Escreva uma mensagem..."}
                  className="min-h-[42px] resize-none bg-card/50"
                  maxLength={4000}
                />
                <Button
                  onClick={send}
                  disabled={sending || (!text.trim() && !pending)}
                  className="bg-gradient-admin-accent shadow-admin-glow hover:opacity-90"
                >
                  {sending || uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-1 px-1 text-[10px] text-muted-foreground">
                {recording ? "🔴 Gravando... clique no microfone para parar." : "Enter envia · Shift+Enter quebra linha"}
              </p>
            </footer>
          </>
        )}
      </section>
    </div>
  );
};
