import { Outlet } from 'react-router-dom';
import { MobileNav } from '@/components/MobileNav';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Shield } from 'lucide-react';

export default function MilitaryLayout() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      <header className="h-14 flex items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-bold text-primary">FisioApp</span>
        </div>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-1" />
          Sair
        </Button>
      </header>
      <main className="p-4 md:p-6 max-w-4xl mx-auto">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  );
}
