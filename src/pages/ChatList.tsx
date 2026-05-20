import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Loader2, ChevronRight } from "lucide-react";

type Row = {
  id: string;
  lawyer_id: string;
  client_id: string | null;
  last_message_at: string | null;
  created_at: string;
  peer_name?: string;
  peer_email?: string;
  preview?: string;
};

const ChatList = () => {
  const { user, role } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: threads } = await supabase
        .from("chat_threads")
        .select("*")
        .or(`lawyer_id.eq.${user.id},client_id.eq.${user.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      const ts = (threads ?? []) as any[];
      const peerIds = Array.from(
        new Set(ts.map((t) => (t.lawyer_id === user.id ? t.client_id : t.lawyer_id)).filter(Boolean)),
      );
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", peerIds.length ? peerIds : ["00000000-0000-0000-0000-000000000000"]);
      const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));

      const enriched: Row[] = await Promise.all(
        ts.map(async (t) => {
          const peerId = t.lawyer_id === user.id ? t.client_id : t.lawyer_id;
          const p = peerId ? pmap.get(peerId) : null;
          const { data: last } = await supabase
            .from("chat_thread_messages")
            .select("content, attachment_path")
            .eq("thread_id", t.id)
            .order("created_at", { ascending: false })
            .limit(1);
          const lastMsg = last?.[0] as any;
          return {
            ...t,
            peer_name: p?.full_name || null,
            peer_email: p?.email || null,
            preview: lastMsg?.content || (lastMsg?.attachment_path ? "📎 Файл" : ""),
          };
        }),
      );
      setRows(enriched);
      setLoading(false);
    };
    load();
  }, [user]);

  const backHref = role === "lawyer" ? "/lawyer" : role === "admin" ? "/admin" : "/account";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-app flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border px-3 py-3">
        <Link to={backHref} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-sm font-semibold text-foreground">Чаты</p>
          <p className="text-xs text-muted-foreground">Общение по принятым делам</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            <MessageCircle className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            Пока нет чатов
          </Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <Link key={r.id} to={`/chat/${r.id}`}>
                <Card className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {(r.peer_name || r.peer_email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {r.peer_name || r.peer_email || "Собеседник"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{r.preview || "Нет сообщений"}</p>
                  </div>
                  {r.last_message_at && (
                    <p className="shrink-0 text-[10px] text-muted-foreground">
                      {new Date(r.last_message_at).toLocaleDateString("ru-RU")}
                    </p>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
