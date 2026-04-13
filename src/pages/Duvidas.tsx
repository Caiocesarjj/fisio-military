import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function Duvidas() {
  const [duvidas, setDuvidas] = useState<any[]>([]);
  const [militaresMap, setMilitaresMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pendente' | 'respondido' | 'todos'>('pendente');

  const fetchDuvidas = async () => {
    let query = supabase
      .from('duvidas_exercicios')
      .select('*, exercises(nome, categoria)')
      .order('created_at', { ascending: false });

    if (filter !== 'todos') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    const items = data || [];
    setDuvidas(items);

    // Fetch militar info for each unique user_id
    const userIds = [...new Set(items.map((d: any) => d.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, full_name')
        .in('user_id', userIds);

      const profileIds = (profiles || []).map((p: any) => p.id);
      const { data: mils } = profileIds.length > 0
        ? await supabase
            .from('militares')
            .select('profile_id, nome_guerra, posto_graduacao, companhia, foto_url')
            .in('profile_id', profileIds)
        : { data: [] };

      const map: Record<string, any> = {};
      for (const uid of userIds) {
        const profile = (profiles || []).find((p: any) => p.user_id === uid);
        const mil = profile ? (mils || []).find((m: any) => m.profile_id === profile.id) : null;
        map[uid] = mil ? { ...mil, email: profile?.full_name } : { nome_guerra: profile?.full_name || 'Paciente', posto_graduacao: '' };
      }
      setMilitaresMap(map);
    }

    setLoading(false);
  };

  useEffect(() => { fetchDuvidas(); }, [filter]);

  const handleResponder = async (id: string) => {
    const resposta = respostas[id]?.trim();
    if (!resposta) return;
    setSending(id);
    const { error } = await supabase
      .from('duvidas_exercicios')
      .update({ resposta, status: 'respondido', responded_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('Erro ao responder.'); }
    else {
      toast.success('Resposta enviada!');
      setRespostas((prev) => { const n = { ...prev }; delete n[id]; return n; });
      fetchDuvidas();
    }
    setSending(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        {[1, 2, 3].map(i => (
          <Card key={i}><CardContent className="p-4 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-32" />
          </CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageCircle className="h-6 w-6" /> Dúvidas dos Pacientes
        </h1>
        <div className="flex gap-2">
          {(['pendente', 'respondido', 'todos'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
            >
              {f === 'pendente' ? 'Pendentes' : f === 'respondido' ? 'Respondidas' : 'Todas'}
            </Button>
          ))}
        </div>
      </div>

      {duvidas.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhuma dúvida {filter === 'pendente' ? 'pendente' : filter === 'respondido' ? 'respondida' : ''} encontrada.</p>
      ) : (
        <div className="space-y-4">
          {duvidas.map((d) => (
             <Card key={d.id}>
              <CardContent className="p-4 space-y-3">
                {/* Patient info */}
                {(() => {
                  const mil = militaresMap[d.user_id];
                  return mil ? (
                    <div className="flex items-center gap-3 pb-2 border-b">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={mil.foto_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                          {(mil.nome_guerra || '?').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {mil.posto_graduacao} {mil.nome_guerra}
                        </p>
                        {mil.companhia && <p className="text-xs text-muted-foreground">{mil.companhia}</p>}
                      </div>
                    </div>
                  ) : null;
                })()}

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{d.exercises?.nome || 'Exercício'}</p>
                    {d.exercises?.categoria && <Badge variant="secondary">{d.exercises.categoria}</Badge>}
                  </div>
                  <Badge variant={d.status === 'respondido' ? 'default' : 'destructive'}>
                    {d.status === 'respondido' ? 'Respondido' : 'Pendente'}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground">
                  {format(new Date(d.created_at), 'dd/MM/yyyy HH:mm')}
                </p>

                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-foreground">{d.mensagem}</p>
                </div>

                {d.resposta ? (
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-xs font-medium text-primary mb-1">Sua resposta:</p>
                    <p className="text-sm text-foreground">{d.resposta}</p>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Escreva sua resposta..."
                      value={respostas[d.id] || ''}
                      onChange={(e) => setRespostas((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      className="min-h-[60px] text-sm"
                    />
                    <Button
                      size="sm"
                      className="self-end"
                      onClick={() => handleResponder(d.id)}
                      disabled={sending === d.id || !respostas[d.id]?.trim()}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
