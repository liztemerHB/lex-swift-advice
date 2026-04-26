import { LayoutDashboard, Users, FolderOpen, Scale, BarChart3, Wallet, Filter } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
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
  { title: "Дела", url: "/admin/cases", icon: FolderOpen },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

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
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end={item.end} className={getCls(active)}>
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
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
