import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { CONDUTAS_PADRAO } from '@/lib/constants';

interface CondutaSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function CondutaSelector({ value, onChange }: CondutaSelectorProps) {
  const parseValue = (raw: string): { selected: string[]; outros: string } => {
    if (!raw) return { selected: [], outros: '' };
    const parts = raw.split(';').map((p) => p.trim()).filter(Boolean);
    const selected: string[] = [];
    let outros = '';
    parts.forEach((part) => {
      const match = part.match(/^Outros:\s*(.*)$/i);
      if (match) {
        outros = match[1];
        if (!selected.includes('Outros')) selected.push('Outros');
      } else if (CONDUTAS_PADRAO.includes(part)) {
        selected.push(part);
      } else {
        outros = outros ? `${outros}; ${part}` : part;
        if (!selected.includes('Outros')) selected.push('Outros');
      }
    });
    return { selected, outros };
  };

  const { selected, outros } = parseValue(value);
  const [outrosText, setOutrosText] = useState(outros);

  const buildValue = (nextSelected: string[], nextOutros: string): string => {
    const parts = nextSelected.filter((s) => s !== 'Outros');
    if (nextSelected.includes('Outros')) {
      parts.push(nextOutros.trim() ? `Outros: ${nextOutros.trim()}` : 'Outros');
    }
    return parts.join('; ');
  };

  const toggle = (option: string) => {
    const nextSelected = selected.includes(option)
      ? selected.filter((s) => s !== option)
      : [...selected, option];
    onChange(buildValue(nextSelected, outrosText));
  };

  const handleOutrosChange = (text: string) => {
    setOutrosText(text);
    const nextSelected = selected.includes('Outros') ? selected : [...selected, 'Outros'];
    onChange(buildValue(nextSelected, text));
  };

  const clear = () => {
    onChange('');
    setOutrosText('');
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-red-500">DEBUG selected: {selected.join(',')}</div>
      <div className="flex flex-wrap gap-2">
        {selected.filter((s) => s !== 'Outros').map((s) => (
          <Badge key={s} variant="secondary" className="gap-1 py-1 px-2">
            {s}
            <button type="button" onClick={() => toggle(s)} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {selected.includes('Outros') && (
          <Badge variant="secondary" className="gap-1 py-1 px-2">
            Outros{outrosText ? `: ${outrosText}` : ''}
            <button type="button" onClick={() => { setOutrosText(''); toggle('Outros'); }} className="ml-1 hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CONDUTAS_PADRAO.map((option) => (
          <label
            key={option}
            className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm cursor-pointer hover:bg-accent"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-primary"
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>

      {selected.includes('Outros') && (
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Descreva outros procedimentos</label>
          <Input
            className="h-9 text-sm"
            placeholder="Ex: mobilização articular, drenagem linfática..."
            value={outrosText}
            onChange={(e) => handleOutrosChange(e.target.value)}
          />
        </div>
      )}

      {selected.length > 0 && (
        <button
          type="button"
          onClick={clear}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          Limpar seleção
        </button>
      )}
    </div>
  );
}
