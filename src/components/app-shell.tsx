import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Inbox, School, ClipboardCheck, CalendarDays, Library, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { INSPECTOR } from "@/lib/constants";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Trámites y Correo", url: "/tramites", icon: Inbox },
  { title: "Mis Centros y Equipos", url: "/centros", icon: School },
  { title: "Checklists de Supervisión", url: "/checklists", icon: ClipboardCheck },
  { title: "Agenda y Plazos", url: "/agenda", icon: CalendarDays },
  { title: "Biblioteca Normativa CLM", url: "/normativa", icon: Library },
] as const;

export function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b border-sidebar-border">
            <div className="flex items-center gap-2 px-1 py-2">
              <div className="h-7 w-1.5 shrink-0 bg-sidebar-primary" />
              <div className="overflow-hidden group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-bold tracking-wide text-sidebar-accent-foreground">SIE-CLM</p>
                <p className="truncate text-[11px] text-sidebar-foreground/60">Inspección · Albacete</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((it, i) => (
                    <SidebarMenuItem key={it.url}>
                      <SidebarMenuButton asChild isActive={path.startsWith(it.url)} tooltip={it.title}>
                        <Link to={it.url}>
                          <it.icon className="h-4 w-4" />
                          <span>
                            <span className="mr-1 font-mono text-[10px] opacity-50">{i + 1}.</span>
                            {it.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-sidebar-border">
            <div className="px-1 text-xs group-data-[collapsible=icon]:hidden">
              <p className="font-semibold text-sidebar-accent-foreground">{INSPECTOR.nombre}</p>
              <p className="text-sidebar-foreground/60">{INSPECTOR.email}</p>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Cerrar sesión" onClick={() => supabase.auth.signOut()}>
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar sesión</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-12 items-center gap-3 border-b bg-card/90 px-3 backdrop-blur">
            <SidebarTrigger />
            <span className="text-xs text-muted-foreground">
              Delegación Provincial de Educación, Cultura y Deportes de Albacete
            </span>
            <span className="ml-auto h-1 w-16 bg-crimson" />
          </header>
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-serif text-3xl font-semibold text-primary">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
