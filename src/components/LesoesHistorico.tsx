import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Check, Trash2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

const SEGMENTOS: Record<string, string[]> = {
  'Membro Superior': ['Muscular', 'Ombro', 'Cotovelo', 'Punho', 'Mão', 'Dedos da Mão'],
  'Membro Inferior': ['Muscular', 'Quadril', 'Coxa', 'Joelho', 'Panturrilha', 'Tendão de Aquiles', 'Tornozelo', 'Pé', 'Dedos do Pé', 'Fascite Plantar', 'Esporão de Calcâneo'],
  'Coluna': ['Muscular', 'Cervical', 'Torácica', 'Lombar', 'Sacral'],
  'Tronco': ['Muscular', 'Abdômen', 'Tórax', 'Costelas', 'Lombar'],
  'Outras': [],
};
const REGIOES = Object.keys(SEGMENTOS);

interface LesaoHistorico {
  id: string;
  militar_id: string;
  regiao: string;
  segmento: string;
  data_inicio: string;
  data_fim: string | null;
  status: string;
  observacoes: string | null;
  created_at: string;
}

interface Props {
  militarId: string;
  canEdit?: boolean;
}

export function LesoesHistorico({ militarId, canEdit = true }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<LesaoHistorico[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [regiao, setRegiao] = useState('');
  const [segmento, setSegmento] = useState('');
  const [customSeg, setCustomSeg] = useState('');
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [obs, setObs] = useState('');

  const fetchItems = async () => {
    const { data } = await supabase
      .from('lesoes_historico')
      .select('*')
      .eq('militar_id', militarId)
      .order('data_inicio', { ascending: false });
    setItems((data as any) || []);
  };

  useEffect(() => {
    if (militarId) fetchItems();
  }, [militarId]);

  const reset = () => {
    setRegiao(''); setSegmento(''); setCustomSeg(''); setObs('');
    setDataInicio(new Date().toISOString().slice(0, 10));
    setShowForm(false);
  };

  const add = async () => {
    const seg = regiao === 'Outras' ? customSeg.trim() : segmento;
    if (!regiao || !seg) { toast.error('Preencha região e segmento.'); return; }
    setLoading(true);
    const { error } = await supabase.from('lesoes_historico').insert({
      militar_id: militarId,
      regiao,
      segmento: seg,
      data_inicio: dataInicio,
      observacoes: obs || null,
      created_by: user?.id,
    });
    setLoading(false);
    if (error) { toast.error('Erro ao adicionar.'); return; }
    toast.success('Lesão adicionada ao histórico.');
    reset();
    fetchItems();
  };

  const marcarCurada = async (id: string) => {
    const { error } = await supabase
      .from('lesoes_historico')
      .update({ status: 'curada', data_fim: new Date().toISOString().slice(0, 10) })
      .eq('id', id);
    if (error) { toast.error('Erro ao atualizar.'); return; }
    toast.success('Marcada como curada.');
    fetchItems();
  };

  const reativar = async (id: string) => {
    const { error } = await supabase
      .from('lesoes_historico')
      .update({ status: 'ativa', data_fim: null })
      .eq('id', id);
    if (error) { toast.error('Erro ao reativar.'); return; }
    toast.success('Lesão reativada.');
    fetchItems();
  };

  const remover = async (id: string) => {
    if (!confirm('Remover este registro do histórico?')) return;
    const { error } = await supabase.from('lesoes_historico').delete().eq('id', id);
    if (error) { toast.error('Erro ao remover.'); return; }
    toast.success('Registro removido.');
    fetchItems();
  };

  const fmt = (d?: string | null) => d ? new Date(d + 'T00:00').toLocaleDateString('pt-BR') : '—';
  const selectClass = "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Histórico de Lesões</Label>
        {canEdit && !showForm && (
          <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" /> Nova Lesão
          </Button>
        )}
      </div>

      {showForm && (
        <div className="border rounded-md p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Região</Label>
              <select className={selectClass} value={regiao} onChange={(e) => { setRegiao(e.target.value); setSegmento(''); setCustomSeg(''); }}>
                <option value="">Selecione...</option>
                {REGIOES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Segmento</Label>
              {regiao === 'Outras' ? (
                <Input className="h-9 text-sm" value={customSeg} onChange={(e) => setCustomSeg(e.target.value)} placeholder="Digite..." />
              ) : (
                <select className={selectClass} value={segmento} onChange={(e) => setSegmento(e.target.value)} disabled={!regiao}>
                  <option value="">Selecione...</option>
                  {(SEGMENTOS[regiao] || []).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
          </div>
          <div>
            <Label className="text-xs">Data de início</Label>
            <Input type="date" className="h-9 text-sm" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Observações</Label>
            <Textarea className="text-sm min-h-[50px]" value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Detalhes sobre a lesão..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={reset}>Cancelar</Button>
            <Button type="button" size="sm" onClick={add} disabled={loading}>{loading ? 'Salvando...' : 'Adicionar'}</Button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Nenhuma lesão registrada no histórico.</p>
      ) : (
        <div className="space-y-2">
          {items.map(it => (
            <div key={it.id} className="border rounded-md p-2 flex items-start justify-between gap-2 text-sm">
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{it.segmento}</span>
                  <Badge variant="outline" className="text-[10px]">{it.regiao}</Badge>
                  <Badge className={`text-[10px] ${it.status === 'ativa' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'}`}>
                    {it.status === 'ativa' ? 'Ativa' : 'Curada'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Início: {fmt(it.data_inicio)}{it.data_fim ? ` · Fim: ${fmt(it.data_fim)}` : ''}
                </p>
                {it.observacoes && <p className="text-xs text-foreground/80">{it.observacoes}</p>}
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  {it.status === 'ativa' ? (
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" title="Marcar como curada" onClick={() => marcarCurada(it.id)}>
                      <Check className="h-4 w-4 text-emerald-600" />
                    </Button>
                  ) : (
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" title="Reativar" onClick={() => reativar(it.id)}>
                      <RotateCcw className="h-4 w-4 text-amber-600" />
                    </Button>
                  )}
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" title="Remover" onClick={() => remover(it.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
