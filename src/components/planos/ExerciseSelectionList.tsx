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
  fase?: string | null;
  dificuldade?: string | null;
  imagem_url?: string | null;
  video_url?: string | null;
}

interface ExerciseSelectionListProps {
  exercises: Exercise[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
  heightClassName?: string;
}

function getYouTubeThumbnail(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|.*&v=))([^?&]+)/);
  return match?.[1] ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

function isGif(url?: string | null) {
  return !!url && /\.gif(\?.*)?$/i.test(url);
}

const diffColor: Record<string, string> = {
  'Fácil': 'bg-green-500/10 text-green-600 dark:text-green-400',
  'Moderado': 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  'Difícil': 'bg-destructive/10 text-destructive',
  'Avançado': 'bg-primary/10 text-primary',
};

function getExerciseThumb(exercise: Exercise): string | null {
  const ytThumb = getYouTubeThumbnail(exercise.video_url);
  if (ytThumb) return ytThumb;
  if (isGif(exercise.video_url)) return exercise.video_url!;
  if (exercise.imagem_url) return exercise.imagem_url;
  return null;
}

export default function ExerciseSelectionList({
  exercises,
  selectedIds,
  onChange,
  label = 'Exercícios',
  heightClassName = 'h-80',
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
            Limpar seleção ({selectedIds.length})
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
              const thumb = getExerciseThumb(exercise);

              return (
                <Card
                  key={exercise.id}
                  className={`border transition-all overflow-hidden ${
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
                    <CardContent className="flex items-start gap-3 p-2.5">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleExercise(exercise.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="mt-4 shrink-0"
                      />

                      {thumb ? (
                        <img
                          src={thumb}
                          alt={exercise.nome}
                          loading="lazy"
                          className="h-14 w-20 shrink-0 rounded object-cover bg-muted"
                        />
                      ) : (
                        <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                          Sem mídia
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-sm font-medium leading-tight text-foreground">{exercise.nome}</p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {exercise.categoria}
                          </Badge>
                          {exercise.dificuldade && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${diffColor[exercise.dificuldade] || ''}`}>
                              {exercise.dificuldade}
                            </span>
                          )}
                          {exercise.fase && (
                            <Badge variant="outline" className="text-[10px]">
                              {exercise.fase}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isSelected && <Check className="mt-4 h-4 w-4 shrink-0 text-primary" />}
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
