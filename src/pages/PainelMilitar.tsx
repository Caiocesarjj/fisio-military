import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, ClipboardList, History, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ExercisePreview } from '@/components/military/ExercisePreview';

export default function PainelMilitar() {
  const { user } = useAuth();
  const location = useLocation();
  const [militar, setMilitar] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [nextSessions, setNextSessions] = useState<any[]>([]);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      if (!user) {
        if (active) setLoading(false);
        return;
      }

      setLoading(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) {
        if (!active) return;
        setMilitar(null);
        setPlans([]);
        setNextSessions([]);
        setPastSessions([]);
        setLoading(false);
        return;
      }

      const { data: mil } = await supabase
        .from('militares')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      if (!mil) {
        if (!active) return;
        setMilitar(null);
        setPlans([]);
        setNextSessions([]);
        setPastSessions([]);
        setLoading(false);
        return;
      }

      const now = new Date().toISOString();
      const [plansRes, nextRes, pastRes] = await Promise.all([
        supabase
          .from('treatment_plans')
          .select('*, plan_exercises(*, exercises(nome, categoria, instrucoes, video_url, imagem_url))')
          .eq('militar_id', mil.id)
          .eq('ativo', true),
        supabase
          .from('sessions')
          .select('*')
          .eq('militar_id', mil.id)
          .gte('data_hora', now)
          .order('data_hora')
          .limit(5),
        supabase
          .from('sessions')
          .select('*')
          .eq('militar_id', mil.id)
          .lt('data_hora', now)
          .order('data_hora', { ascending: false })
          .limit(10),
      ]);

      if (!active) return;

      setMilitar(mil);
      setPlans(plansRes.data || []);
      setNextSessions(nextRes.data || []);
      setPastSessions(pastRes.data || []);
      setLoading(false);
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [user]);

  const section = location.pathname.startsWith('/painel/plano')
    ? 'plano'
    : location.pathname.startsWith('/painel/agenda')
      ? 'agenda'
      : location.pathname.startsWith('/painel/perfil')
        ? 'perfil'
        : 'inicio';

  if (loading) {
    return <p className="py-12 text-center text-muted-foreground">Carregando...</p>;
  }

  if (!militar) {
    return <p className="py-12 text-center text-muted-foreground">Seu acesso militar ainda não está vinculado corretamente.</p>;
  }

  const renderSessions = (items: any[], emptyMessage: string, isHistory = false) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {isHistory ? <History className="h-5 w-5 text-muted-foreground" /> : <CalendarDays className="h-5 w-5 text-primary" />}
          {isHistory ? 'Histórico de Sessões' : 'Próximas Sessões'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {items.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(session.data_hora), isHistory ? 'dd/MM/yyyy HH:mm' : "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">{session.duracao}min · {session.tipo}</p>
                </div>
                <Badge variant={session.status === 'agendado' ? 'secondary' : 'outline'}>{session.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderPlans = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" /> Plano de Exercícios
        </CardTitle>
      </CardHeader>
      <CardContent>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum plano ativo no momento.</p>
        ) : (
          <div className="space-y-6">
            {plans.map((plan) => (
              <div key={plan.id} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-foreground">{plan.nome}</h2>
                    {plan.objetivo && <p className="text-sm text-muted-foreground">{plan.objetivo}</p>}
                  </div>
                  <Badge>Ativo</Badge>
                </div>

                <div className="space-y-3">
                  {plan.plan_exercises?.length ? (
                    plan.plan_exercises.map((planExercise: any) => (
                      <ExercisePreview key={planExercise.id} planExercise={planExercise} />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nenhum exercício vinculado a este plano.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderProfile = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-primary" /> Meu Perfil
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={militar.foto_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
              {militar.nome_guerra?.slice(0, 2)?.toUpperCase() || 'MI'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-foreground">{militar.posto_graduacao} {militar.nome_guerra}</p>
            <p className="text-sm text-muted-foreground">{militar.nome_completo}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Companhia</p>
            <p className="mt-1 text-sm text-foreground">{militar.companhia || 'Não informado'}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Setor</p>
            <p className="mt-1 text-sm text-foreground">{militar.setor || 'Não informado'}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Telefone</p>
            <p className="mt-1 text-sm text-foreground">{militar.telefone || 'Não informado'}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</p>
            <p className="mt-1 text-sm text-foreground">{militar.email || 'Não informado'}</p>
          </div>
        </div>

        {militar.diagnostico && (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Diagnóstico</p>
            <p className="mt-1 text-sm text-foreground">{militar.diagnostico}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={militar.foto_url} />
          <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
            {militar.nome_guerra?.slice(0, 2)?.toUpperCase() || 'MI'}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {section === 'inicio' ? `Bem-vindo, ${militar.posto_graduacao} ${militar.nome_guerra}` :
              section === 'plano' ? 'Meu plano de exercícios' :
              section === 'agenda' ? 'Minha agenda' : 'Meu perfil'}
          </h1>
          <p className="text-sm text-muted-foreground">{militar.companhia}{militar.setor ? ` · ${militar.setor}` : ''}</p>
        </div>
      </div>

      {section === 'inicio' && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Planos ativos</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{plans.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Próximas sessões</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{nextSessions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Sessões anteriores</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{pastSessions.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {(section === 'inicio' || section === 'plano') && renderPlans()}
      {(section === 'inicio' || section === 'agenda') && renderSessions(nextSessions, 'Nenhuma sessão agendada.')}
      {section === 'agenda' && renderSessions(pastSessions, 'Nenhuma sessão anterior.', true)}
      {section === 'perfil' && renderProfile()}
    </div>
  );
}
