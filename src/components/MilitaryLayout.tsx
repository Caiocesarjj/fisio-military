import { Outlet } from 'react-router-dom';
import { CalendarDays, ClipboardList, LayoutDashboard, LogOut, Shield, User } from 'lucide-react';
import { MobileNav } from '@/components/MobileNav';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const items = [
  { title: 'Início', url: '/painel', icon: LayoutDashboard },
  { title: 'Plano', url: '/painel/plano', icon: ClipboardList },
  { title: 'Agenda', url: '/painel/agenda', icon: CalendarDays },
  { title: 'Perfil', url: '/painel/perfil', icon: User },
];

export default function MilitaryLayout() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold text-primary">Fisioteria Tonelero</span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {items.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.url === '/painel'}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeClassName="bg-muted text-foreground"
              >
                {item.title}
              </NavLink>
            ))}
          </nav>

          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-4 md:p-6">
        <Outlet />
      </main>

      <MobileNav />
    </div>
  );
}
