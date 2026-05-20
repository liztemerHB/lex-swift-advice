import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Paperclip, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

type Msg = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string | null;
  attachment_path: string | null;
  attachment_type: string | null;
  created_at: string;
};

type Thread = {
  id: string;
  lawyer_id: string;
  client_id: string | null;
  lead_id: string;
  case_id: string | null;
};

type Peer = { id: string; full_name: string | null; email: string | null };

const useSignedUrl = (path: string | null) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    supabase.storage.from("chat-attachments").createSignedUrl(path, 3600).then(({ data }) => {
      if (alive) setUrl(data?.signedUrl ?? null);
    });
    return () => {
      alive = false;
    };
  }, [path]);
  return url;
};

const Attachment = ({ path, type }: { path: string; type: string | null }) => {
  const url = useSignedUrl(path);
  if (!url) return <div className="h-32 w-48 animate-pulse rounded-lg bg-muted" />;
  if (type?.startsWith("image/")) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt="attachment" className="max-h-64 max-w-[260px] rounded-lg border border-border object-cover" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-muted">
      <Paperclip className="h-3.5 w-3.5" /> Файл
    </a>
  );
};

const ChatThread = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [thread, setThread] = useState<Thread | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!threadId) return;
    const { data: t } = await supabase.from("chat_threads").select("*").eq("id", threadId).maybeSingle();
    if (!t) {
      toast.error("Чат не найден");
      navigate(-1);
      return;
    }
    setThread(t as any);
    const peerId = user?.id === t.lawyer_id ? t.client_id : t.lawyer_id;
    if (peerId) {
      const { data: p } = await supabase.from("profiles").select("id, full_name, email").eq("id", peerId).maybeSingle();
      setPeer((p as any) ?? null);
    }
    const { data: m } = await supabase
      .from("chat_thread_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    setMessages((m ?? []) as any);
    setLoading(false);
  }, [threadId, user?.id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`chat_${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_thread_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages((prev) => (prev.some((m) => m.id === (payload.new as any).id) ? prev : [...prev, payload.new as any]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const sendText = async () => {
    if (!text.trim() || !threadId || !user) return;
    setSending(true);
    const content = text.trim();
    setText("");
    const { error } = await supabase
      .from("chat_thread_messages")
      .insert({ thread_id: threadId, sender_id: user.id, content });
    setSending(false);
    if (error) {
      toast.error(error.message);
      setText(content);
    }
  };

  const onPickFile = () => fileRef.current?.click();

  const uploadFile = async (file: File) => {
    if (!threadId || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Максимальный размер 10 МБ");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${threadId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { error: msgErr } = await supabase.from("chat_thread_messages").insert({
        thread_id: threadId,
        sender_id: user.id,
        attachment_path: path,
        attachment_type: file.type,
      });
      if (msgErr) throw msgErr;
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось загрузить");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const backHref = role === "lawyer" ? "/lawyer" : role === "admin" ? "/admin" : "/account";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-app flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-3 py-3">
        <Link to={backHref} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          {thread && user?.id !== thread.lawyer_id ? (
            <Link to={`/lawyers/${thread.lawyer_id}`} className="block min-w-0 hover:underline">
              <p className="truncate text-sm font-semibold text-foreground">
                {peer?.full_name || peer?.email || "Юрист"}
              </p>
              <p className="text-xs text-muted-foreground">Юрист · открыть профиль</p>
            </Link>
          ) : (
            <>
              <p className="truncate text-sm font-semibold text-foreground">
                {peer?.full_name || peer?.email || "Собеседник"}
              </p>
              <p className="text-xs text-muted-foreground">
                {user?.id === thread?.lawyer_id ? "Клиент" : "Юрист"}
              </p>
            </>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Сообщений ещё нет. Напишите первым.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {m.attachment_path && <Attachment path={m.attachment_path} type={m.attachment_type} />}
                  {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                  <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border bg-background px-2 py-2">
        <div className="flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])}
          />
          <button
            onClick={onPickFile}
            disabled={uploading}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
            title="Прикрепить"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          </button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText();
              }
            }}
            placeholder="Сообщение…"
            className="flex-1 rounded-full"
          />
          <Button
            size="icon"
            variant="hero"
            className="rounded-full"
            disabled={sending || !text.trim()}
            onClick={sendText}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatThread;
