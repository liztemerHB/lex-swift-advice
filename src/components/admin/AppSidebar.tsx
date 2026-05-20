import { LayoutDashboard, Users, FolderOpen, Scale, BarChart3, Wallet, Filter, UserCheck } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const items = [
  { title: "Обзор", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Аналитика", url: "/admin/analytics", icon: BarChart3 },
  { title: "Финансы", url: "/admin/finance", icon: Wallet },
  { title: "Воронка", url: "/admin/funnel", icon: Filter },
  { title: "Пользователи", url: "/admin/users", icon: Users },
  { title: "Заявки юристов", url: "/admin/lawyer-applications", icon: UserCheck, badge: true },
  { title: "Дела", url: "/admin/cases", icon: FolderOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { count } = await supabase
        .from("lawyer_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingCount(count ?? 0);
    };
    load();
    const ch = supabase
      .channel("lawyer_apps_sidebar")
      .on("postgres_changes", { event: "*", schema: "public", table: "lawyer_applications" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [location.pathname]);

  const getCls = (active: boolean) =>
    active ? "bg-secondary text-primary font-medium" : "hover:bg-muted/50 text-foreground";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-2 px-3 py-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-hero">
            <Scale className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="text-sm font-semibold text-foreground">LexTriage Admin</span>}
        </div>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Навигация</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = item.end
                  ? location.pathname === item.url
                  : location.pathname.startsWith(item.url);
                const showBadge = (item as any).badge && pendingCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end={item.end} className={getCls(active)}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && (
                          <span className="flex-1 flex items-center justify-between">
                            <span>{item.title}</span>
                            {showBadge && (
                              <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5 text-[10px]">
                                {pendingCount}
                              </Badge>
                            )}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
