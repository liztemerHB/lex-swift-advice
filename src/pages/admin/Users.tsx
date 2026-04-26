import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users as UsersIcon, Loader2, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  roles: string[];
  credits_remaining: number | null;
  balance_rub: number | null;
};

const roleVariant = (r: string) =>
  r === "admin" ? "default" : r === "lawyer" ? "secondary" : "outline";

const roleLabel = (r: string) =>
  r === "admin" ? "Админ" : r === "lawyer" ? "Юрист" : "Клиент";

const Users = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const [{ data: profiles }, { data: roles }, { data: credits }] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("user_credits").select("user_id, credits_remaining, balance_rub"),
      ]);

      const byUser = new Map<string, string[]>();
      (roles ?? []).forEach((r: any) => {
        const arr = byUser.get(r.user_id) ?? [];
        arr.push(r.role);
        byUser.set(r.user_id, arr);
      });
      const credMap = new Map<string, { credits_remaining: number; balance_rub: number }>();
      (credits ?? []).forEach((c: any) => credMap.set(c.user_id, c));

      setRows(
        (profiles ?? []).map((p: any) => ({
          id: p.id,
          email: p.email,
          full_name: p.full_name,
          created_at: p.created_at,
          roles: byUser.get(p.id) ?? [],
          credits_remaining: credMap.get(p.id)?.credits_remaining ?? null,
          balance_rub: credMap.get(p.id)?.balance_rub ?? null,
        }))
      );
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Пользователи</h2>
        <p className="mt-1 text-sm text-muted-foreground">Всего: {rows.length} · нажмите на строку для управления</p>
      </div>

      <Card className="shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Имя</TableHead>
              <TableHead>Роли</TableHead>
              <TableHead className="text-right">Кредиты</TableHead>
              <TableHead className="text-right">Баланс</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UsersIcon className="h-8 w-8" />
                    <p className="text-sm">Пока нет пользователей</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((u) => (
                <TableRow
                  key={u.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => navigate(`/admin/users/${u.id}`)}
                >
                  <TableCell className="font-mono text-xs">{u.email ?? "—"}</TableCell>
                  <TableCell>{u.full_name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        u.roles.map((r) => (
                          <Badge key={r} variant={roleVariant(r) as any}>
                            {roleLabel(r)}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-sm">{u.credits_remaining ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm">{u.balance_rub != null ? `${u.balance_rub} ₽` : "—"}</TableCell>
                  <TableCell className="w-8 text-right">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Users;
