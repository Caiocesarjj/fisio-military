import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

const SEGMENTOS: Record<string, string[]> = {
  'Membro Superior': ['Ombro', 'Cotovelo', 'Punho', 'Mão', 'Dedos da Mão'],
  'Membro Inferior': ['Quadril', 'Coxa', 'Joelho', 'Panturrilha', 'Tornozelo', 'Pé', 'Dedos do Pé', 'Fascite Plantar', 'Esporão de Calcâneo'],
  'Coluna': ['Cervical', 'Torácica', 'Lombar', 'Sacral'],
};

const REGIOES = Object.keys(SEGMENTOS);

export interface Lesao {
  regiao: string;
  segmento: string;
}

interface LesaoSelectorProps {
  lesoes: Lesao[];
  onChange: (lesoes: Lesao[]) => void;
}

export function LesaoSelector({ lesoes, onChange }: LesaoSelectorProps) {
  const [regiao, setRegiao] = useState('');
  const [segmento, setSegmento] = useState('');

  const addLesao = () => {
    if (regiao && segmento) {
      onChange([...lesoes, { regiao, segmento }]);
      setRegiao('');
      setSegmento('');
    }
  };

  const removeLesao = (index: number) => {
    onChange(lesoes.filter((_, i) => i !== index));
  };

  const selectClass = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {lesoes.map((l, i) => (
          <Badge key={i} variant="secondary" className="gap-1 py-1 px-2">
            {l.segmento}
            <button type="button" onClick={() => removeLesao(i)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <select className={selectClass} value={regiao} onChange={(e) => { setRegiao(e.target.value); setSegmento(''); }}>
            <option value="">Região...</option>
            {REGIOES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {regiao && (
          <div className="flex-1 space-y-1">
            <select className={selectClass} value={segmento} onChange={(e) => setSegmento(e.target.value)}>
              <option value="">Segmento...</option>
              {SEGMENTOS[regiao].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <Button type="button" variant="outline" size="sm" onClick={addLesao} disabled={!regiao || !segmento}>
          <Plus className="h-4 w-4 mr-1" /> Adicionar
        </Button>
      </div>
    </div>
  );
}

const BADGE_COLORS: Record<string, string> = {
  'Membro Superior': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Membro Inferior': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Coluna': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function LesaoBadges({ lesoes }: { lesoes: Lesao[] }) {
  if (!lesoes?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {lesoes.map((l, i) => (
        <span key={i} className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_COLORS[l.regiao] || ''}`}>
          {l.segmento}
        </span>
      ))}
    </div>
  );
}
