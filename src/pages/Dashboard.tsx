import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CalendarDays, ClipboardList, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const [stats, setStats] = useState({ militares: 0, sessionsToday: 0, sessionsWeek: 0, activePlans: 0 });
  const [todaySessions, setTodaySessions] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);

      const [militaresRes, todayRes, weekRes, plansRes, sessionsRes] = await Promise.all([
        supabase.from('militares').select('id', { count: 'exact' }).eq('ativo', true),
        supabase.from('sessions').select('id', { count: 'exact' }).gte('data_hora', startOfDay).lte('data_hora', endOfDay),
        supabase.from('sessions').select('id', { count: 'exact' }).gte('data_hora', startOfWeek.toISOString()).lte('data_hora', endOfWeek.toISOString()),
        supabase.from('treatment_plans').select('id', { count: 'exact' }).eq('ativo', true),
        supabase.from('sessions').select('*, militares(nome_guerra, posto_graduacao, companhia, foto_url)').gte('data_hora', new Date(new Date().setHours(0,0,0,0)).toISOString()).lte('data_hora', new Date(new Date().setHours(23,59,59,999)).toISOString()).order('data_hora'),
      ]);

      setStats({
        militares: militaresRes.count || 0,
        sessionsToday: todayRes.count || 0,
        sessionsWeek: weekRes.count || 0,
        activePlans: plansRes.count || 0,
      });
      setTodaySessions(sessionsRes.data || []);
    };
    fetchData();
  }, []);

  const cards = [
    { title: 'Militares Ativos', value: stats.militares, icon: Users, color: 'text-primary' },
    { title: 'Sessões Hoje', value: stats.sessionsToday, icon: CalendarDays, color: 'text-info' },
    { title: 'Sessões na Semana', value: stats.sessionsWeek, icon: Activity, color: 'text-success' },
    { title: 'Planos Ativos', value: stats.activePlans, icon: ClipboardList, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{card.value}</p>
                </div>
                <card.icon className={`h-10 w-10 ${card.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Agendamentos de Hoje</CardTitle>
        </CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum agendamento para hoje.</p>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((session) => (
                <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={session.militares?.foto_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {session.militares?.nome_guerra?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {session.militares?.posto_graduacao} {session.militares?.nome_guerra}
                    </p>
                    <p className="text-xs text-muted-foreground">{session.militares?.companhia}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(session.data_hora), 'HH:mm')}
                    </p>
                    <Badge variant={session.status === 'realizado' ? 'default' : 'secondary'} className="text-xs">
                      {session.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
