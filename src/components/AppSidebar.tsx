import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Dumbbell,
  ClipboardList,
  CalendarDays,
  BarChart3,
  LogOut,
  Shield,
  ScrollText,
  Settings,
  UserCog,
  FileText,
  MessageCircle,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const adminItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Militares', url: '/militares', icon: Users },
  { title: 'Prontuário', url: '/prontuario', icon: FileText },
  { title: 'Exercícios', url: '/exercicios', icon: Dumbbell },
  { title: 'Planos', url: '/planos', icon: ClipboardList },
  { title: 'Dúvidas', url: '/duvidas', icon: MessageCircle, hasBadge: true },
  { title: 'Agenda', url: '/agenda', icon: CalendarDays },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
  { title: 'Usuários', url: '/usuarios', icon: UserCog },
  { title: 'Auditoria', url: '/auditoria', icon: ScrollText },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const { signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from('duvidas_exercicios')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pendente');
      setPendingCount(count || 0);
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-4">
            <div className="flex items-center gap-2">
              <img src="/logo-tonelero.jpg" alt="Logo" className="w-6 h-6 rounded-full object-cover" />
              {!collapsed && <span className="font-bold text-sm text-sidebar-primary">Fisioteria Tonelero</span>}
            </div>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/dashboard'}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                      {(item as any).hasBadge && pendingCount > 0 && (
                        <span className="ml-auto inline-flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold min-w-[20px] h-5 px-1.5">
                          {pendingCount}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
