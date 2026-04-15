import { useMemo, useState } from 'react';
import { Search, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CATEGORIAS_EXERCICIO } from '@/lib/constants';

interface Exercise {
  id: string;
  nome: string;
  categoria: string;
}

interface ExerciseSelectionListProps {
  exercises: Exercise[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  heightClassName?: string;
}

export default function ExerciseSelectionList({
  exercises,
  selectedIds,
  onChange,
  label = 'Exercícios',
  heightClassName = 'h-72',
}: ExerciseSelectionListProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const filteredExercises = useMemo(() => {
    return exercises.filter((exercise) => {
      const matchesSearch = exercise.nome.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !category || exercise.categoria === category;
      return matchesSearch && matchesCategory;
    });
  }, [category, exercises, search]);

  const toggleExercise = (exerciseId: string) => {
    onChange(
      selectedIds.includes(exerciseId)
        ? selectedIds.filter((id) => id !== exerciseId)
        : [...selectedIds, exerciseId]
    );
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">{label}</Label>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar exercício..."
            className="pl-10"
          />
        </div>

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas categorias</option>
          {CATEGORIAS_EXERCICIO.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filteredExercises.length} exercício{filteredExercises.length !== 1 ? 's' : ''} encontrado{filteredExercises.length !== 1 ? 's' : ''}
        </span>
        {selectedIds.length > 0 && (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => onChange([])}>
            Limpar seleção
          </Button>
        )}
      </div>

      <div className={`rounded-lg border border-border bg-muted/20 ${heightClassName} overflow-y-auto pr-1`}>
        <div className="space-y-2 p-2">
          {filteredExercises.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">
              Nenhum exercício encontrado.
            </div>
          ) : (
            filteredExercises.map((exercise) => {
              const isSelected = selectedIds.includes(exercise.id);

              return (
                <Card
                  key={exercise.id}
                  className={`border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-background hover:border-primary/40'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExercise(exercise.id)}
                    className="block w-full text-left"
                  >
                    <CardContent className="flex items-start gap-3 p-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleExercise(exercise.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-0.5"
                      />

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-medium leading-tight text-foreground">{exercise.nome}</p>
                        <Badge variant="secondary" className="text-[11px]">
                          {exercise.categoria}
                        </Badge>
                      </div>

                      {isSelected && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                    </CardContent>
                  </button>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
