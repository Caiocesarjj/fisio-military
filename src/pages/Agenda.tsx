import { useEffect, useState, useRef } from 'react';
import { CalendarSkeleton } from '@/components/Skeletons';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { STATUS_SESSAO, TIPOS_ATENDIMENTO } from '@/lib/constants';
import { EvaScale } from '@/components/EvaScale';
import { LesaoSelector, type Lesao } from '@/components/LesaoSelector';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core';

export default function Agenda() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [militares, setMilitares] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [editForm, setEditForm] = useState({ data_hora: '', duracao: 60, tipo: 'presencial', anotacao_clinica: '', queixa: '' });
  const [editLesoes, setEditLesoes] = useState<Lesao[]>([]);
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);
  const [form, setForm] = useState({ militar_id: '', data_hora: '', duracao: 60, tipo: 'presencial', status: 'agendado', anotacao_clinica: '', queixa: '' });
  const [formLesoes, setFormLesoes] = useState<Lesao[]>([]);
  const [loading, setLoading] = useState(false);
  const [painLevel, setPainLevel] = useState(0);
  const [calLoading, setCalLoading] = useState(false);

  // Fetch militares once on mount
  useEffect(() => {
    supabase.from('militares').select('id, nome_guerra, posto_graduacao').eq('status_militar', 'ativo')
      .then(({ data }) => setMilitares(data || []));
  }, []);

  const fetchSessions = async (start?: Date, end?: Date) => {
    const s = start || dateRange?.start || new Date();
    const e = end || dateRange?.end || new Date();
    const { data } = await supabase.from('sessions')
      .select('*, militares(nome_guerra, posto_graduacao, companhia, foto_url), session_notes(nivel_dor)')
      .gte('data_hora', s.toISOString())
      .lte('data_hora', e.toISOString())
      .order('data_hora');
    setSessions(data || []);
  };

  const handleDatesSet = (arg: DatesSetArg) => {
    setDateRange({ start: arg.start, end: arg.end });
    fetchSessions(arg.start, arg.end);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('sessions').insert({ ...form, fisio_id: user?.id, duracao: Number(form.duracao), lesoes: formLesoes as any });
      if (error) throw error;
      toast.success('Sessão agendada!');
      setDialogOpen(false);
      setForm({ militar_id: '', data_hora: '', duracao: 60, tipo: 'presencial', status: 'agendado', anotacao_clinica: '', queixa: '' });
      setFormLesoes([]);
      fetchSessions();
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const updateStatus = async (sessionId: string, status: string) => {
    await supabase.from('sessions').update({ status }).eq('id', sessionId);
    // Save pain level as session note if status is realizado
    if (status === 'realizado' && detailDialog) {
      const existingNote = detailDialog.session_notes?.[0];
      if (existingNote) {
        await supabase.from('session_notes').update({ nivel_dor: painLevel }).eq('id', existingNote.id);
      } else {
        await supabase.from('session_notes').insert({
          session_id: sessionId,
          militar_id: detailDialog.militar_id,
          nivel_dor: painLevel,
        });
      }
    }
    toast.success(`Status atualizado para "${status}".`);
    setDetailDialog(null);
    setPainLevel(0);
    fetchSessions();
  };

  const handleSaveEdit = async () => {
    if (!detailDialog) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('sessions').update({
        data_hora: new Date(editForm.data_hora).toISOString(),
        duracao: Number(editForm.duracao),
        tipo: editForm.tipo,
        anotacao_clinica: editForm.anotacao_clinica,
        queixa: editForm.queixa,
        lesoes: editLesoes as any,
      }).eq('id', detailDialog.id);
      if (error) throw error;
      toast.success('Sessão atualizada!');
      setDetailDialog(null);
      fetchSessions();
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!detailDialog) return;
    if (!confirm('Tem certeza que deseja excluir esta sessão?')) return;
    try {
      // Delete related session notes first
      await supabase.from('session_notes').delete().eq('session_id', detailDialog.id);
      const { error } = await supabase.from('sessions').delete().eq('id', detailDialog.id);
      if (error) throw error;
      toast.success('Sessão excluída!');
      setDetailDialog(null);
      fetchSessions();
    } catch (err: any) { toast.error(err.message); }
  };

  const statusColors: Record<string, string> = {
    agendado: 'hsl(220, 70%, 25%)',
    realizado: 'hsl(142, 71%, 45%)',
    faltou: 'hsl(0, 84%, 60%)',
    cancelado: 'hsl(215, 16%, 47%)',
  };

  const events = sessions.map((s) => ({
    id: s.id,
    title: s.militares?.nome_guerra || 'Militar',
    start: s.data_hora,
    end: new Date(new Date(s.data_hora).getTime() + (s.duracao || 60) * 60000).toISOString(),
    backgroundColor: statusColors[s.status] || statusColors.agendado,
    borderColor: statusColors[s.status] || statusColors.agendado,
    extendedProps: { session: s },
  }));

  const handleEventClick = (info: EventClickArg) => {
    const session = info.event.extendedProps.session;
    const existingNote = session.session_notes?.[0];
    setPainLevel(existingNote?.nivel_dor ?? 0);
    const dtLocal = new Date(session.data_hora);
    const isoLocal = new Date(dtLocal.getTime() - dtLocal.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditForm({
      data_hora: isoLocal,
      duracao: session.duracao || 60,
      tipo: session.tipo || 'presencial',
      anotacao_clinica: session.anotacao_clinica || '',
      queixa: session.queixa || '',
    });
    setEditLesoes(Array.isArray(session.lesoes) ? session.lesoes : []);
    setDetailDialog(session);
  };

  const handleDateClick = (arg: any) => {
    const dt = arg.dateStr.length > 10 ? arg.dateStr.slice(0, 16) : arg.dateStr + 'T08:00';
    setForm({ ...form, data_hora: dt });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Agendar</Button>
      </div>

      {calLoading ? <CalendarSkeleton /> : (
        <div className="bg-card rounded-lg border p-4 fullcalendar-wrapper">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            locale="pt-br"
            buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
            events={events}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            datesSet={handleDatesSet}
            height="auto"
            editable={false}
            selectable
            dayMaxEvents={3}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            allDaySlot={false}
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          />
        </div>
      )}

      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Sessão</DialogTitle></DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <p className="font-medium text-foreground">{detailDialog.militares?.posto_graduacao} {detailDialog.militares?.nome_guerra}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data e Hora</Label>
                  <Input type="datetime-local" value={editForm.data_hora} onChange={(e) => setEditForm({ ...editForm, data_hora: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input type="number" value={editForm.duracao} onChange={(e) => setEditForm({ ...editForm, duracao: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={editForm.tipo} onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}>
                    {TIPOS_ATENDIMENTO.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={detailDialog.status}
                    onChange={(e) => updateStatus(detailDialog.id, e.target.value)}
                  >
                    {STATUS_SESSAO.map((st) => <option key={st} value={st}>{st}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Queixa</Label>
                <Textarea value={editForm.queixa} onChange={(e) => setEditForm({ ...editForm, queixa: e.target.value })} placeholder="Queixa principal do atendimento" />
              </div>
              <div className="space-y-2">
                <Label>Lesões / Regiões Tratadas</Label>
                <LesaoSelector lesoes={editLesoes} onChange={setEditLesoes} />
              </div>
              <div className="space-y-2">
                <Label>Anotação Clínica</Label>
                <Textarea value={editForm.anotacao_clinica} onChange={(e) => setEditForm({ ...editForm, anotacao_clinica: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nível de Dor (EVA)</Label>
                <EvaScale value={painLevel} onChange={setPainLevel} />
              </div>
              <div className="flex justify-between">
                <Button variant="destructive" size="sm" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-1" /> Excluir
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDetailDialog(null)}>Cancelar</Button>
                  <Button onClick={handleSaveEdit} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
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
            <div className="space-y-2"><Label>Queixa</Label><Textarea value={form.queixa} onChange={(e) => setForm({ ...form, queixa: e.target.value })} placeholder="Queixa principal do atendimento" /></div>
            <div className="space-y-2">
              <Label>Lesões / Regiões Tratadas</Label>
              <LesaoSelector lesoes={formLesoes} onChange={setFormLesoes} />
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
