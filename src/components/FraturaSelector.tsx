import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useState } from 'react';

const FRATURAS_OPTIONS = [
  'Fêmur', 'Tíbia', 'Fíbula', 'Úmero', 'Rádio', 'Ulna',
  'Clavícula', 'Coluna cervical', 'Coluna torácica', 'Coluna lombar',
  'Costelas', 'Pelve', 'Tornozelo', 'Punho', 'Mão', 'Pé',
];

interface FraturaSelectorProps {
  selected: string[];
  onChange: (fraturas: string[]) => void;
}

export function FraturaSelector({ selected, onChange }: FraturaSelectorProps) {
  const [outroTexto, setOutroTexto] = useState('');
  const [outroAtivo, setOutroAtivo] = useState(
    selected.some((s) => !FRATURAS_OPTIONS.includes(s))
  );

  const predefinidas = selected.filter((s) => FRATURAS_OPTIONS.includes(s));
  const customItems = selected.filter((s) => !FRATURAS_OPTIONS.includes(s));

  const toggle = (fratura: string) => {
    if (selected.includes(fratura)) {
      onChange(selected.filter((s) => s !== fratura));
    } else {
      onChange([...selected, fratura]);
    }
  };

  const addOutro = () => {
    const trimmed = outroTexto.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
      setOutroTexto('');
    }
  };

  const clear = () => {
    onChange([]);
    setOutroAtivo(false);
    setOutroTexto('');
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Fraturas</h4>
          <p className="text-xs text-muted-foreground">Selecione as fraturas do paciente</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.length > 0 && (
            <>
              <Badge variant="secondary" className="text-xs">{selected.length} selecionada{selected.length !== 1 ? 's' : ''}</Badge>
              <Button type="button" variant="ghost" size="sm" onClick={clear} className="h-7 px-2 text-xs">
                <X className="h-3 w-3 mr-1" /> Limpar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {FRATURAS_OPTIONS.map((fratura) => (
          <label
            key={fratura}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors text-sm ${
              selected.includes(fratura)
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            <Checkbox
              checked={selected.includes(fratura)}
              onCheckedChange={() => toggle(fratura)}
            />
            {fratura}
          </label>
        ))}
      </div>

      <div className="space-y-2 pt-2 border-t border-border">
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox checked={outroAtivo} onCheckedChange={(v) => setOutroAtivo(!!v)} />
          <span className="text-muted-foreground">Outros</span>
        </label>
        {outroAtivo && (
          <div className="flex gap-2">
            <Input
              value={outroTexto}
              onChange={(e) => setOutroTexto(e.target.value)}
              placeholder="Descreva a fratura..."
              className="text-sm"
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addOutro())}
            />
            <Button type="button" size="sm" onClick={addOutro} disabled={!outroTexto.trim()}>Adicionar</Button>
          </div>
        )}
        {customItems.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {customItems.map((item) => (
              <Badge key={item} variant="outline" className="text-xs gap-1">
                {item}
                <X className="h-3 w-3 cursor-pointer" onClick={() => onChange(selected.filter((s) => s !== item))} />
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function FraturaBadges({ fraturas }: { fraturas: string[] }) {
  if (!fraturas.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {fraturas.slice(0, 3).map((f) => (
        <Badge key={f} variant="outline" className="text-[10px] px-1.5 py-0 border-orange-300 text-orange-600">{f}</Badge>
      ))}
      {fraturas.length > 3 && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{fraturas.length - 3}</Badge>
      )}
    </div>
  );
}
