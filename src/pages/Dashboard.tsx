import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, CalendarDays, ClipboardList, TrendingUp, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { WhatsAppReminderButton } from '@/components/WhatsAppReminderButton';
import { ptBR } from 'date-fns/locale';
import { DashboardSkeleton } from '@/components/Skeletons';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import {
  formatStoredSessionTime,
  getBrasiliaCalendarDate,
  getBrasiliaYear,
  getStoredSessionDayRangeForBrasilia,
  getStoredSessionYearRangeForBrasilia,
} from '@/lib/sessionDateTime';

const PIE_COLORS = [
  'hsl(220, 70%, 25%)', 'hsl(45, 93%, 47%)', 'hsl(142, 71%, 45%)',
  'hsl(199, 89%, 48%)', 'hsl(0, 84%, 60%)',
];

export default function Dashboard() {
  const [stats, setStats] = useState({ militares: 0, sessionsToday: 0, presenceRate: 0, activePlans: 0 });
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [weeklyPresence, setWeeklyPresence] = useState<any[]>([]);
  const [companyDist, setCompanyDist] = useState<any[]>([]);
  const [topLesoes, setTopLesoes] = useState<any[]>([]);
  const [monthlyLine, setMonthlyLine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const { start: todayStart, end: todayEnd } = getStoredSessionDayRangeForBrasilia();
    const { start: yearStart, end: yearEnd } = getStoredSessionYearRangeForBrasilia();
    const now = new Date(`${getBrasiliaCalendarDate()}T12:00:00Z`);

    const [militaresRes, todayRes, plansRes, sessionsYearRes, allMilitaresRes] = await Promise.all([
      supabase.from('militares').select('id', { count: 'exact' }).eq('ativo', true),
      supabase.from('sessions').select('*, militares(nome_guerra, posto_graduacao, companhia, foto_url, telefone)')
        .gte('data_hora', todayStart).lte('data_hora', todayEnd).order('data_hora'),
      supabase.from('treatment_plans').select('id', { count: 'exact' }).eq('ativo', true),
      supabase.from('sessions').select('id, data_hora, status').gte('data_hora', yearStart).lte('data_hora', yearEnd),
      supabase.from('militares').select('companhia, lesoes').eq('ativo', true),
    ]);

    const todaySess = todayRes.data || [];
    const yearSessions = sessionsYearRes.data || [];
    const allMil = allMilitaresRes.data || [];

    const totalSessions = yearSessions.length;
    const realized = yearSessions.filter((s: any) => s.status === 'realizado').length;
    const presenceRate = totalSessions > 0 ? Math.round((realized / totalSessions) * 100) : 0;

    setStats({
      militares: militaresRes.count || 0,
      sessionsToday: todaySess.length,
      presenceRate,
      activePlans: plansRes.count || 0,
    });
    setTodaySessions(todaySess);

    const weeks: any[] = [];
    for (let i = 7; i >= 0; i--) {
      const ws = startOfWeek(subWeeks(now, i), { locale: ptBR });
      const we = endOfWeek(subWeeks(now, i), { locale: ptBR });
      const weekSess = yearSessions.filter((s: any) => {
        const d = new Date(s.data_hora);
        return d >= ws && d <= we;
      });
      const real = weekSess.filter((s: any) => s.status === 'realizado').length;
      const falt = weekSess.filter((s: any) => s.status === 'faltou').length;
      weeks.push({ name: format(ws, 'dd/MM', { locale: ptBR }), Realizadas: real, Faltas: falt });
    }
    setWeeklyPresence(weeks);

    const ciaMap: Record<string, number> = {};
    allMil.forEach((m: any) => { ciaMap[m.companhia] = (ciaMap[m.companhia] || 0) + 1; });
    setCompanyDist(Object.entries(ciaMap).map(([name, value]) => ({ name, value })));

    const lesaoMap: Record<string, number> = {};
    allMil.forEach((m: any) => {
      if (Array.isArray(m.lesoes)) {
        m.lesoes.forEach((l: any) => {
          if (l?.segmento) lesaoMap[l.segmento] = (lesaoMap[l.segmento] || 0) + 1;
        });
      }
    });
    setTopLesoes(Object.entries(lesaoMap).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5));

    const monthMap: Record<string, number> = {};
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    months.forEach((m) => { monthMap[m] = 0; });
    yearSessions.forEach((s: any) => {
      const idx = new Date(s.data_hora).getUTCMonth();
      monthMap[months[idx]]++;
    });
    setMonthlyLine(months.map((m) => ({ name: m, sessoes: monthMap[m] })));

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const quickUpdate = async (sessionId: string, status: string) => {
    await supabase.from('sessions').update({ status }).eq('id', sessionId);
    toast.success(`Marcado como "${status}"`);
    fetchData();
  };

  if (loading) return <DashboardSkeleton />;

  const metricCards = [
    { title: 'Militares Ativos', value: stats.militares, icon: Users, color: 'text-primary' },
    { title: 'Sessões Hoje', value: stats.sessionsToday, icon: CalendarDays, color: 'text-info' },
    { title: 'Taxa de Presença', value: `${stats.presenceRate}%`, icon: TrendingUp, color: 'text-success' },
    { title: 'Planos Ativos', value: stats.activePlans, icon: ClipboardList, color: 'text-warning' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((card) => (
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Presença Semanal (últimos 2 meses)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyPresence}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Realizadas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Faltas" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Militares por Companhia</CardTitle></CardHeader>
          <CardContent>
            {companyDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={companyDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, value }) => `${name}: ${value}`}>
                    {companyDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Top 5 Lesões</CardTitle></CardHeader>
          <CardContent>
            {topLesoes.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topLesoes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados de lesões.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Sessões por Mês ({getBrasiliaYear()})</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyLine}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="sessoes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Sessões de Hoje</CardTitle></CardHeader>
        <CardContent>
          {todaySessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum agendamento para hoje.</p>
          ) : (
            <div className="space-y-3">
              {todaySessions.map((s) => (
                <div key={s.id} className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={s.militares?.foto_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {s.militares?.nome_guerra?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {s.militares?.posto_graduacao} {s.militares?.nome_guerra}
                      </p>
                      <p className="text-xs text-muted-foreground">{s.militares?.companhia}</p>
                    </div>
                    <p className="text-sm font-medium text-foreground">{formatStoredSessionTime(s.data_hora)}</p>
                    {s.status === 'agendado' ? (
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => quickUpdate(s.id, 'realizado')}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => quickUpdate(s.id, 'faltou')}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant={s.status === 'realizado' ? 'default' : 'secondary'} className="text-xs">{s.status}</Badge>
                    )}
                  </div>
                  {s.status === 'agendado' && (
                    <WhatsAppReminderButton
                      nome={s.militares?.nome_guerra || 'Paciente'}
                      telefone={s.militares?.telefone}
                      dataHora={s.data_hora}
                      size="sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
