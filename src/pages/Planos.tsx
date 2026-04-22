import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ExercisePreview } from '@/components/military/ExercisePreview';
import { Plus, ChevronDown, ChevronUp, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import ExerciseSelectionList from '@/components/planos/ExerciseSelectionList';
import { cn } from '@/lib/utils';

export default function Planos() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [militares, setMilitares] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [planExercises, setPlanExercises] = useState<Record<string, any[]>>({});
  const [form, setForm] = useState({ militar_id: '', nome: '', objetivo: '', data_inicio: '', data_fim: '' });
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [sharedConfig, setSharedConfig] = useState({ series: 3, repeticoes: 10, descanso: '60s', frequencia_semanal: 3, observacoes: '' });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [militarSearchOpen, setMilitarSearchOpen] = useState(false);

  const [exDialogOpen, setExDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [addExerciseIds, setAddExerciseIds] = useState<string[]>([]);
  const [addConfig, setAddConfig] = useState({ series: 3, repeticoes: 10, descanso: '60s', frequencia_semanal: 3, observacoes: '' });

  const fetchAll = async () => {
    const [plansRes, milRes, exRes] = await Promise.all([
      supabase.from('treatment_plans').select('*, militares(nome_guerra, posto_graduacao)').order('created_at', { ascending: false }),
      supabase.from('militares').select('id, nome_guerra, posto_graduacao, nip').eq('ativo', true),
      supabase.from('exercises').select('id, nome, categoria, dificuldade, fase, imagem_url, video_url').order('categoria').order('nome'),
    ]);

    setPlans(plansRes.data || []);
    setMilitares(milRes.data || []);
    setExercises(exRes.data || []);
    setPageLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchPlanExercises = async (planId: string) => {
    const { data } = await supabase
      .from('plan_exercises')
      .select('*, exercises(id, nome, categoria, dificuldade, fase, descricao, instrucoes, video_url, imagem_url)')
      .eq('plan_id', planId);

    setPlanExercises((prev) => ({ ...prev, [planId]: data || [] }));
  };

  const toggleExpand = (planId: string) => {
    if (expandedPlan === planId) {
      setExpandedPlan(null);
      return;
    }

    setExpandedPlan(planId);
    if (!planExercises[planId]) fetchPlanExercises(planId);
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: planData, error } = await supabase
        .from('treatment_plans')
        .insert({
          ...form,
          fisio_id: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      if (selectedExerciseIds.length > 0) {
        const exInserts = selectedExerciseIds.map((exercise_id) => ({
          plan_id: planData.id,
          exercise_id,
          series: sharedConfig.series,
          repeticoes: sharedConfig.repeticoes,
          descanso: sharedConfig.descanso,
          frequencia_semanal: sharedConfig.frequencia_semanal,
          observacoes: sharedConfig.observacoes || null,
        }));

        const { error: exError } = await supabase.from('plan_exercises').insert(exInserts);
        if (exError) throw exError;
      }

      toast.success('Plano criado com exercícios!');
      setDialogOpen(false);
      setForm({ militar_id: '', nome: '', objetivo: '', data_inicio: '', data_fim: '' });
      setSelectedExerciseIds([]);
      setSharedConfig({ series: 3, repeticoes: 10, descanso: '60s', frequencia_semanal: 3, observacoes: '' });
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    }

    setLoading(false);
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addExerciseIds.length === 0) {
      toast.error('Selecione ao menos um exercício.');
      return;
    }

    setLoading(true);

    try {
      const inserts = addExerciseIds.map((exercise_id) => ({
        plan_id: selectedPlan.id,
        exercise_id,
        series: Number(addConfig.series),
        repeticoes: Number(addConfig.repeticoes),
        descanso: addConfig.descanso,
        frequencia_semanal: Number(addConfig.frequencia_semanal),
        observacoes: addConfig.observacoes || null,
      }));

      const { error } = await supabase.from('plan_exercises').insert(inserts);
      if (error) throw error;

      toast.success(`${addExerciseIds.length} exercício(s) adicionado(s) ao plano!`);
      setExDialogOpen(false);
      setAddExerciseIds([]);
      setAddConfig({ series: 3, repeticoes: 10, descanso: '60s', frequencia_semanal: 3, observacoes: '' });
      fetchPlanExercises(selectedPlan.id);
    } catch (err: any) {
      toast.error(err.message);
    }

    setLoading(false);
  };

  const handleDeleteExercise = async (peId: string, planId: string) => {
    const { error } = await supabase.from('plan_exercises').delete().eq('id', peId);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Exercício removido do plano.');
    fetchPlanExercises(planId);
  };

  if (pageLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-10 w-32" />
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-foreground">Planos de Tratamento</h1>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Novo Plano
        </Button>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardContent className="p-4">
              <div className="flex cursor-pointer items-center justify-between" onClick={() => toggleExpand(plan.id)}>
                <div>
                  <h3 className="font-semibold text-foreground">{plan.nome}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.militares?.posto_graduacao} {plan.militares?.nome_guerra}
                  </p>
                  <div className="mt-1 flex gap-2">
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
                <div className="mt-4 space-y-3 border-t pt-4">
                  {plan.objetivo && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Objetivo:</strong> {plan.objetivo}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-foreground">Exercícios do Plano</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedPlan(plan);
                        setExDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Adicionar
                    </Button>
                  </div>
                  {(planExercises[plan.id] || []).map((pe) => (
                    <div key={pe.id} className="relative">
                      <ExercisePreview planExercise={pe} />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-2 top-2 h-7 w-7 text-destructive bg-background/80 hover:bg-destructive/10 z-10"
                        onClick={() => handleDeleteExercise(pe.id, plan.id)}
                      >
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
        {plans.length === 0 && <p className="py-8 text-center text-muted-foreground">Nenhum plano cadastrado.</p>}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Plano de Tratamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreatePlan} className="space-y-4">
            <div className="space-y-2">
              <Label>Militar *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.militar_id}
                onChange={(e) => setForm({ ...form, militar_id: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {militares.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.posto_graduacao} {m.nome_guerra}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Nome do Plano *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label>Objetivo</Label>
              <Textarea value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início *</Label>
                <Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Término</Label>
                <Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <ExerciseSelectionList
                exercises={exercises}
                selectedIds={selectedExerciseIds}
                onChange={setSelectedExerciseIds}
                label="Exercícios do Plano"
                heightClassName="h-80"
              />

              {selectedExerciseIds.length > 0 && (
                <Card>
                  <CardContent className="space-y-3 p-3">
                    <Label className="text-xs font-semibold">Configuração dos exercícios selecionados</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Séries</Label>
                        <Input type="number" className="h-9" value={sharedConfig.series} onChange={(e) => setSharedConfig({ ...sharedConfig, series: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Repetições</Label>
                        <Input type="number" className="h-9" value={sharedConfig.repeticoes} onChange={(e) => setSharedConfig({ ...sharedConfig, repeticoes: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Descanso</Label>
                        <Input className="h-9" value={sharedConfig.descanso} onChange={(e) => setSharedConfig({ ...sharedConfig, descanso: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Freq. Semanal</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                          value={sharedConfig.frequencia_semanal}
                          onChange={(e) => setSharedConfig({ ...sharedConfig, frequencia_semanal: Number(e.target.value) })}
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}x/semana
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Observações</Label>
                      <Input
                        className="h-9"
                        value={sharedConfig.observacoes}
                        onChange={(e) => setSharedConfig({ ...sharedConfig, observacoes: e.target.value })}
                        placeholder="Opcional..."
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Plano'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={exDialogOpen} onOpenChange={setExDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Exercícios ao Plano</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddExercise} className="space-y-4">
            <ExerciseSelectionList
              exercises={exercises}
              selectedIds={addExerciseIds}
              onChange={setAddExerciseIds}
              label="Exercícios disponíveis"
              heightClassName="h-72"
            />

            {addExerciseIds.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs font-semibold">Configuração</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Séries</Label>
                    <Input type="number" className="h-9" value={addConfig.series} onChange={(e) => setAddConfig({ ...addConfig, series: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Repetições</Label>
                    <Input type="number" className="h-9" value={addConfig.repeticoes} onChange={(e) => setAddConfig({ ...addConfig, repeticoes: Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Descanso</Label>
                    <Input className="h-9" value={addConfig.descanso} onChange={(e) => setAddConfig({ ...addConfig, descanso: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Frequência Semanal</Label>
                  <Input type="number" className="h-9" value={addConfig.frequencia_semanal} onChange={(e) => setAddConfig({ ...addConfig, frequencia_semanal: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Observações</Label>
                  <Textarea value={addConfig.observacoes} onChange={(e) => setAddConfig({ ...addConfig, observacoes: e.target.value })} />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pb-1">
              <Button type="button" variant="outline" onClick={() => setExDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || addExerciseIds.length === 0}>
                {loading ? 'Adicionando...' : `Adicionar (${addExerciseIds.length})`}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
