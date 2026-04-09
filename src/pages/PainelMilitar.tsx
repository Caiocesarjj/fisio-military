import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ClipboardList, History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PainelMilitar() {
  const { user } = useAuth();
  const [militar, setMilitar] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [nextSessions, setNextSessions] = useState<any[]>([]);
  const [pastSessions, setPastSessions] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      // Get profile
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single();
      if (!profile) return;

      // Get militar record
      const { data: mil } = await supabase.from('militares').select('*').eq('profile_id', profile.id).single();
      if (!mil) return;
      setMilitar(mil);

      // Get active plans with exercises
      const { data: plansData } = await supabase
        .from('treatment_plans')
        .select('*, plan_exercises(*, exercises(nome, categoria, instrucoes))')
        .eq('militar_id', mil.id)
        .eq('ativo', true);
      setPlans(plansData || []);

      const now = new Date().toISOString();
      // Next sessions
      const { data: next } = await supabase.from('sessions').select('*').eq('militar_id', mil.id).gte('data_hora', now).order('data_hora').limit(5);
      setNextSessions(next || []);

      // Past sessions
      const { data: past } = await supabase.from('sessions').select('*').eq('militar_id', mil.id).lt('data_hora', now).order('data_hora', { ascending: false }).limit(10);
      setPastSessions(past || []);
    };
    fetchData();
  }, [user]);

  if (!militar) return <p className="text-center text-muted-foreground py-12">Carregando...</p>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={militar.foto_url} />
          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
            {militar.nome_guerra.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Bem-vindo, {militar.posto_graduacao} {militar.nome_guerra}
          </h1>
          <p className="text-sm text-muted-foreground">{militar.companhia}{militar.setor ? ` · ${militar.setor}` : ''}</p>
        </div>
      </div>

      {/* Active Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-primary" /> Plano de Exercícios Ativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum plano ativo no momento.</p>
          ) : (
            plans.map((plan) => (
              <div key={plan.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{plan.nome}</h3>
                  <Badge>Ativo</Badge>
                </div>
                {plan.objetivo && <p className="text-sm text-muted-foreground">{plan.objetivo}</p>}
                <div className="space-y-2">
                  {plan.plan_exercises?.map((pe: any) => (
                    <div key={pe.id} className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium text-sm text-foreground">{pe.exercises?.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {pe.series}x{pe.repeticoes} · Descanso: {pe.descanso} · {pe.frequencia_semanal}x/semana
                      </p>
                      {pe.exercises?.instrucoes && (
                        <p className="text-xs text-muted-foreground mt-1">{pe.exercises.instrucoes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Next Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-info" /> Próximas Sessões
          </CardTitle>
        </CardHeader>
        <CardContent>
          {nextSessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma sessão agendada.</p>
          ) : (
            <div className="space-y-2">
              {nextSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {format(new Date(s.data_hora), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.duracao}min · {s.tipo}</p>
                  </div>
                  <Badge variant="secondary">{s.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" /> Histórico de Sessões
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pastSessions.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma sessão anterior.</p>
          ) : (
            <div className="space-y-2">
              {pastSessions.map((s) => {
                const statusColor = s.status === 'realizado' ? 'bg-success/10 text-success' : s.status === 'faltou' ? 'bg-destructive/10 text-destructive' : 'bg-muted';
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <p className="text-sm text-foreground">{format(new Date(s.data_hora), 'dd/MM/yyyy HH:mm')}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor}`}>{s.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
