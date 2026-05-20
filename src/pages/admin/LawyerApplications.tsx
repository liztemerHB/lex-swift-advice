import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Check, X, UserCheck, Mail, Clock } from "lucide-react";
import { toast } from "sonner";

type App = {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  status: "pending" | "approved" | "rejected";
  notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const statusVariant = (s: string) =>
  s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";
const statusLabel = (s: string) =>
  s === "approved" ? "Одобрено" : s === "rejected" ? "Отклонено" : "Ожидает";

const LawyerApplications = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("pending");

  const load = async () => {
    const { data } = await supabase
      .from("lawyer_applications")
      .select("*")
      .order("created_at", { ascending: false });
    setApps((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const review = async (id: string, action: "approve" | "reject") => {
    setBusyId(id);
    try {
      const { error } = await supabase.functions.invoke("review-lawyer-application", {
        body: { application_id: id, action, notes: notes[id] },
      });
      if (error) throw error;
      toast.success(action === "approve" ? "Юрист одобрен" : "Заявка отклонена");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = apps.filter((a) =>
    tab === "all" ? true : a.status === tab,
  );
  const pendingCount = apps.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          Заявки юристов
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ожидают одобрения: <b>{pendingCount}</b>
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Ожидают ({pendingCount})</TabsTrigger>
          <TabsTrigger value="approved">Одобрены</TabsTrigger>
          <TabsTrigger value="rejected">Отклонены</TabsTrigger>
          <TabsTrigger value="all">Все</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Нет заявок
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((a) => (
                <Card key={a.id} className="p-4 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {a.full_name || "Без имени"}
                        </h3>
                        <Badge variant={statusVariant(a.status) as any}>
                          {statusLabel(a.status)}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {a.email ?? "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(a.created_at).toLocaleString("ru-RU")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {a.status === "pending" ? (
                    <>
                      <Textarea
                        placeholder="Комментарий (необязательно, отправится юристу при отклонении)"
                        value={notes[a.id] ?? ""}
                        onChange={(e) =>
                          setNotes({ ...notes, [a.id]: e.target.value })
                        }
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="hero"
                          disabled={busyId === a.id}
                          onClick={() => review(a.id, "approve")}
                        >
                          {busyId === a.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Одобрить
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === a.id}
                          onClick={() => review(a.id, "reject")}
                        >
                          <X className="h-4 w-4" />
                          Отклонить
                        </Button>
                      </div>
                    </>
                  ) : a.notes ? (
                    <p className="text-xs text-muted-foreground">
                      Комментарий: {a.notes}
                    </p>
                  ) : null}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LawyerApplications;
