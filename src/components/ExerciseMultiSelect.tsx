import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, X, Check } from 'lucide-react';
import { CATEGORIAS_EXERCICIO } from '@/lib/constants';

interface Exercise {
  id: string;
  nome: string;
  categoria: string;
}

interface ExerciseMultiSelectProps {
  exercises: Exercise[];
  selected: string[];
  onChange: (selected: string[]) => void;
  label?: string;
}

export default function ExerciseMultiSelect({ exercises, selected, onChange, label = 'Exercícios' }: ExerciseMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      const matchSearch = ex.nome.toLowerCase().includes(search.toLowerCase());
      const matchCat = !catFilter || ex.categoria === catFilter;
      return matchSearch && matchCat;
    });
  }, [exercises, search, catFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, Exercise[]> = {};
    filtered.forEach((ex) => {
      const cat = ex.categoria || 'Sem categoria';
      if (!g[cat]) g[cat] = [];
      g[cat].push(ex);
    });
    return g;
  }, [filtered]);

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const selectedNames = selected
    .map((id) => exercises.find((e) => e.id === id))
    .filter(Boolean) as Exercise[];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none">{label}</label>

      <Button
        type="button"
        variant="outline"
        className="w-full justify-between h-auto min-h-10 py-2 text-left"
        onClick={() => setOpen(true)}
      >
        {selected.length === 0 ? (
          <span className="text-muted-foreground">Selecione exercícios...</span>
        ) : (
          <span className="text-sm">{selected.length} exercício{selected.length > 1 ? 's' : ''} selecionado{selected.length > 1 ? 's' : ''}</span>
        )}
        <Search className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
      </Button>

      {selectedNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedNames.map((ex) => (
            <Badge key={ex.id} variant="secondary" className="gap-1 text-xs">
              {ex.nome}
              <X
                className="h-3 w-3 cursor-pointer hover:text-destructive"
                onClick={() => toggle(ex.id)}
              />
            </Badge>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Selecionar Exercícios</DialogTitle>
          </DialogHeader>

          <div className="px-4 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar exercício..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
            >
              <option value="">Todas categorias (lesões)</option>
              {CATEGORIAS_EXERCICIO.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {selected.length > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{selected.length} selecionado{selected.length > 1 ? 's' : ''}</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => onChange([])}>
                  Limpar seleção
                </Button>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 min-h-0 px-4 pb-2" style={{ maxHeight: '50vh' }}>
            {Object.keys(grouped).sort().map((cat) => (
              <div key={cat} className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{cat}</p>
                {grouped[cat].map((ex) => {
                  const isSelected = selected.includes(ex.id);
                  return (
                    <label
                      key={ex.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                      }`}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(ex.id)}
                      />
                      <span className="text-sm flex-1">{ex.nome}</span>
                      <span className="text-xs text-muted-foreground">({ex.categoria})</span>
                    </label>
                  );
                })}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhum exercício encontrado.</p>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 px-4 py-3 border-t bg-background">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              <Check className="h-4 w-4 mr-1" /> Confirmar ({selected.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
