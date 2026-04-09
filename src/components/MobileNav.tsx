import { LayoutDashboard, ClipboardList, CalendarDays, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

const items = [
  { title: 'Início', url: '/painel', icon: LayoutDashboard },
  { title: 'Plano', url: '/painel/plano', icon: ClipboardList },
  { title: 'Agenda', url: '/painel/agenda', icon: CalendarDays },
  { title: 'Perfil', url: '/painel/perfil', icon: User },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-50 md:hidden">
      <div className="flex justify-around py-2">
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === '/painel'}
            className="flex flex-col items-center gap-1 px-3 py-1 text-muted-foreground text-xs"
            activeClassName="text-primary font-medium"
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
