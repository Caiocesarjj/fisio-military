import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronDown, ChevronUp, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface InlineExercise {
  exercise_id: string;
  nome?: string;
  categoria?: string;
  series: number;
  repeticoes: number;
  descanso: string;
  frequencia_semanal: number;
  observacoes: string;
}

export default function Planos() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [militares, setMilitares] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [planExercises, setPlanExercises] = useState<Record<string, any[]>>({});
  const [form, setForm] = useState({ militar_id: '', nome: '', objetivo: '', data_inicio: '', data_fim: '' });
  const [inlineExercises, setInlineExercises] = useState<InlineExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // For adding exercises to existing plans
  const [exDialogOpen, setExDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [exForm, setExForm] = useState({ exercise_id: '', series: 3, repeticoes: 10, descanso: '60s', frequencia_semanal: 3, observacoes: '' });

  const fetchAll = async () => {
    const [plansRes, milRes, exRes] = await Promise.all([
      supabase.from('treatment_plans').select('*, militares(nome_guerra, posto_graduacao)').order('created_at', { ascending: false }),
      supabase.from('militares').select('id, nome_guerra, posto_graduacao').eq('ativo', true),
      supabase.from('exercises').select('id, nome, categoria'),
    ]);
    setPlans(plansRes.data || []);
    setMilitares(milRes.data || []);
    setExercises(exRes.data || []);
    setPageLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchPlanExercises = async (planId: string) => {
    const { data } = await supabase.from('plan_exercises').select('*, exercises(nome, categoria)').eq('plan_id', planId);
    setPlanExercises((prev) => ({ ...prev, [planId]: data || [] }));
  };

  const toggleExpand = (planId: string) => {
    if (expandedPlan === planId) {
      setExpandedPlan(null);
    } else {
      setExpandedPlan(planId);
      if (!planExercises[planId]) fetchPlanExercises(planId);
    }
  };

  const addInlineExercise = () => {
    setInlineExercises([...inlineExercises, {
      exercise_id: '', series: 3, repeticoes: 10, descanso: '60s', frequencia_semanal: 3, observacoes: '',
    }]);
  };

  const updateInlineExercise = (index: number, field: string, value: any) => {
    const updated = [...inlineExercises];
    (updated[index] as any)[field] = value;
    if (field === 'exercise_id') {
      const ex = exercises.find((e) => e.id === value);
      if (ex) { updated[index].nome = ex.nome; updated[index].categoria = ex.categoria; }
    }
    setInlineExercises(updated);
  };

  const removeInlineExercise = (index: number) => {
    setInlineExercises(inlineExercises.filter((_, i) => i !== index));
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: planData, error } = await supabase.from('treatment_plans').insert({
        ...form, fisio_id: user?.id,
      }).select().single();
      if (error) throw error;

      // Insert inline exercises
      if (inlineExercises.length > 0) {
        const exInserts = inlineExercises.filter((ie) => ie.exercise_id).map((ie) => ({
          plan_id: planData.id,
          exercise_id: ie.exercise_id,
          series: ie.series,
          repeticoes: ie.repeticoes,
          descanso: ie.descanso,
          frequencia_semanal: ie.frequencia_semanal,
          observacoes: ie.observacoes || null,
        }));
        if (exInserts.length > 0) {
          const { error: exError } = await supabase.from('plan_exercises').insert(exInserts);
          if (exError) throw exError;
        }
      }

      toast.success('Plano criado com exercícios!');
      setDialogOpen(false);
      setForm({ militar_id: '', nome: '', objetivo: '', data_inicio: '', data_fim: '' });
      setInlineExercises([]);
      fetchAll();
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('plan_exercises').insert({
        plan_id: selectedPlan.id, ...exForm, series: Number(exForm.series), repeticoes: Number(exForm.repeticoes), frequencia_semanal: Number(exForm.frequencia_semanal),
      });
      if (error) throw error;
      toast.success('Exercício adicionado ao plano!');
      setExDialogOpen(false);
      setExForm({ exercise_id: '', series: 3, repeticoes: 10, descanso: '60s', frequencia_semanal: 3, observacoes: '' });
      fetchPlanExercises(selectedPlan.id);
    } catch (err: any) { toast.error(err.message); }
    setLoading(false);
  };

  const handleDeleteExercise = async (peId: string, planId: string) => {
    const { error } = await supabase.from('plan_exercises').delete().eq('id', peId);
    if (error) { toast.error(error.message); return; }
    toast.success('Exercício removido do plano.');
    fetchPlanExercises(planId);
  };

  if (pageLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10 w-32" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}><CardContent className="p-4 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-20" />
          </CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Planos de Tratamento</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Novo Plano</Button>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(plan.id)}>
                <div>
                  <h3 className="font-semibold text-foreground">{plan.nome}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.militares?.posto_graduacao} {plan.militares?.nome_guerra}
                  </p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant={plan.ativo ? 'default' : 'secondary'}>{plan.ativo ? 'Ativo' : 'Encerrado'}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(plan.data_inicio), 'dd/MM/yyyy')}
                      {plan.data_fim && ` → ${format(new Date(plan.data_fim), 'dd/MM/yyyy')}`}
                    </span>
                  </div>
                </div>
                {expandedPlan === plan.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>

              {expandedPlan === plan.id && (
                <div className="mt-4 border-t pt-4 space-y-3">
                  {plan.objetivo && <p className="text-sm text-muted-foreground"><strong>Objetivo:</strong> {plan.objetivo}</p>}
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm text-foreground">Exercícios do Plano</h4>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedPlan(plan); setExDialogOpen(true); }}>
                      <Plus className="h-3 w-3 mr-1" /> Adicionar
                    </Button>
                  </div>
                  {(planExercises[plan.id] || []).map((pe) => (
                    <div key={pe.id} className="p-3 rounded bg-muted/50 text-sm flex items-start justify-between">
                      <div>
                        <p className="font-medium text-foreground">{pe.exercises?.nome}</p>
                        <p className="text-muted-foreground">
                          {pe.series}x{pe.repeticoes} · Descanso: {pe.descanso} · {pe.frequencia_semanal}x/semana
                        </p>
                        {pe.observacoes && <p className="text-xs text-muted-foreground mt-1">{pe.observacoes}</p>}
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDeleteExercise(pe.id, plan.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {(planExercises[plan.id] || []).length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum exercício adicionado.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {plans.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum plano cadastrado.</p>}
      </div>

      {/* New Plan Dialog with inline exercises */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Plano de Tratamento</DialogTitle></DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="space-y-2">
              <Label>Militar *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.militar_id} onChange={(e) => setForm({ ...form, militar_id: e.target.value })} required>
                <option value="">Selecione...</option>
                {militares.map((m) => <option key={m.id} value={m.id}>{m.posto_graduacao} {m.nome_guerra}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label>Nome do Plano *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div className="space-y-2"><Label>Objetivo</Label><Textarea value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Início *</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} required /></div>
              <div className="space-y-2"><Label>Término</Label><Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></div>
            </div>

            {/* Inline exercises section */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Exercícios do Plano</Label>
                <Button type="button" size="sm" variant="outline" onClick={addInlineExercise}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar Exercício
                </Button>
              </div>

              {inlineExercises.map((ie, idx) => (
                <Card key={idx} className="relative">
                  <Button type="button" size="icon" variant="ghost" className="absolute top-2 right-2 h-6 w-6 text-destructive" onClick={() => removeInlineExercise(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <CardContent className="p-3 space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Exercício *</Label>
                      <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                        value={ie.exercise_id} onChange={(e) => updateInlineExercise(idx, 'exercise_id', e.target.value)}>
                        <option value="">Selecione...</option>
                        {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.nome} ({ex.categoria})</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Séries</Label>
                        <Input type="number" className="h-9" value={ie.series} onChange={(e) => updateInlineExercise(idx, 'series', Number(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Repetições</Label>
                        <Input type="number" className="h-9" value={ie.repeticoes} onChange={(e) => updateInlineExercise(idx, 'repeticoes', Number(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descanso</Label>
                        <Input className="h-9" value={ie.descanso} onChange={(e) => updateInlineExercise(idx, 'descanso', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Freq. Semanal</Label>
                        <select className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                          value={ie.frequencia_semanal} onChange={(e) => updateInlineExercise(idx, 'frequencia_semanal', Number(e.target.value))}>
                          {[1,2,3,4,5].map((n) => <option key={n} value={n}>{n}x/semana</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Observações</Label>
                      <Input className="h-9" value={ie.observacoes} onChange={(e) => updateInlineExercise(idx, 'observacoes', e.target.value)} placeholder="Opcional..." />
                    </div>
                  </CardContent>
                </Card>
              ))}
              {inlineExercises.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">Nenhum exercício adicionado ao plano.</p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar Plano'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Exercise to existing Plan Dialog */}
      <Dialog open={exDialogOpen} onOpenChange={setExDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Adicionar Exercício ao Plano</DialogTitle></DialogHeader>
          <form onSubmit={handleAddExercise} className="space-y-4">
            <div className="space-y-2">
              <Label>Exercício *</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={exForm.exercise_id} onChange={(e) => setExForm({ ...exForm, exercise_id: e.target.value })} required>
                <option value="">Selecione...</option>
                {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.nome} ({ex.categoria})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Séries</Label><Input type="number" value={exForm.series} onChange={(e) => setExForm({ ...exForm, series: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Repetições</Label><Input type="number" value={exForm.repeticoes} onChange={(e) => setExForm({ ...exForm, repeticoes: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Descanso</Label><Input value={exForm.descanso} onChange={(e) => setExForm({ ...exForm, descanso: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Frequência Semanal</Label><Input type="number" value={exForm.frequencia_semanal} onChange={(e) => setExForm({ ...exForm, frequencia_semanal: Number(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={exForm.observacoes} onChange={(e) => setExForm({ ...exForm, observacoes: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setExDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Adicionando...' : 'Adicionar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
