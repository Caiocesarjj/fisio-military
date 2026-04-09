import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { STATUS_SESSAO, TIPOS_ATENDIMENTO } from '@/lib/constants';

export default function Agenda() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [militares, setMilitares] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [form, setForm] = useState({ militar_id: '', data_hora: '', duracao: 60, tipo: 'presencial', status: 'agendado', anotacao_clinica: '' });
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const [sessRes, milRes] = await Promise.all([
      supabase.from('sessions').select('*, militares(nome_guerra, posto_graduacao, companhia, foto_url)').gte('data_hora', start.toISOString()).lte('data_hora', end.toISOString()).order('data_hora'),
      supabase.from('militares').select('id, nome_guerra, posto_graduacao').eq('ativo', true),
    ]);
    setSessions(sessRes.data || []);
    setMilitares(milRes.data || []);
  };

  useEffect(() => { fetchData(); }, [currentMonth]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('sessions').insert({ ...form, fisio_id: user?.id, duracao: Number(form.duracao) });
      if (error) throw error;
      toast.success('Sessão agendada!');
      setDialogOpen(false);
      setForm({ militar_id: '', data_hora: '', duracao: 60, tipo: 'presencial', status: 'agendado', anotacao_clinica: '' });
      fetchData();
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const updateStatus = async (sessionId: string, status: string) => {
    await supabase.from('sessions').update({ status }).eq('id', sessionId);
    toast.success(`Status atualizado para "${status}".`);
    fetchData();
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const statusColors: Record<string, string> = {
    agendado: 'bg-info/10 text-info',
    realizado: 'bg-success/10 text-success',
    faltou: 'bg-destructive/10 text-destructive',
    cancelado: 'bg-muted text-muted-foreground',
  };

  const weekSessions = sessions.filter((s) => {
    const d = new Date(s.data_hora);
    const now = new Date();
    const weekStart = startOfWeek(now, { locale: ptBR });
    const weekEnd = endOfWeek(now, { locale: ptBR });
    return d >= weekStart && d <= weekEnd;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <div className="flex gap-2">
          <Button variant={view === 'calendar' ? 'default' : 'outline'} size="sm" onClick={() => setView('calendar')}>Calendário</Button>
          <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>Lista Semanal</Button>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Agendar</Button>
        </div>
      </div>

      {view === 'calendar' ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>←</Button>
              <CardTitle className="text-lg capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>→</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {days.map((day) => {
                const daySessions = sessions.filter((s) => isSameDay(new Date(s.data_hora), day));
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                return (
                  <div key={day.toISOString()} className={`min-h-[60px] p-1 rounded text-xs ${isCurrentMonth ? 'bg-card' : 'bg-muted/30'}`}>
                    <span className={`block text-right ${isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'}`}>{format(day, 'd')}</span>
                    {daySessions.slice(0, 2).map((s) => (
                      <div key={s.id} className={`mt-0.5 px-1 py-0.5 rounded text-[10px] truncate ${statusColors[s.status]}`}>
                        {format(new Date(s.data_hora), 'HH:mm')} {s.militares?.nome_guerra}
                      </div>
                    ))}
                    {daySessions.length > 2 && <span className="text-[10px] text-muted-foreground">+{daySessions.length - 2}</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {weekSessions.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma sessão esta semana.</p>}
          {weekSessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{s.militares?.posto_graduacao} {s.militares?.nome_guerra}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(s.data_hora), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })} · {s.duracao}min · {s.tipo}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="h-8 rounded border border-input bg-background px-2 text-xs"
                    value={s.status}
                    onChange={(e) => updateStatus(s.id, e.target.value)}
                  >
                    {STATUS_SESSAO.map((st) => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Agendar Sessão</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Militar *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.militar_id} onChange={(e) => setForm({ ...form, militar_id: e.target.value })} required>
                <option value="">Selecione...</option>
                {militares.map((m) => <option key={m.id} value={m.id}>{m.posto_graduacao} {m.nome_guerra}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data e Hora *</Label><Input type="datetime-local" value={form.data_hora} onChange={(e) => setForm({ ...form, data_hora: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Duração (min)</Label><Input type="number" value={form.duracao} onChange={(e) => setForm({ ...form, duracao: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                  {TIPOS_ATENDIMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUS_SESSAO.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2"><Label>Anotação Clínica</Label><Textarea value={form.anotacao_clinica} onChange={(e) => setForm({ ...form, anotacao_clinica: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Agendando...' : 'Agendar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
