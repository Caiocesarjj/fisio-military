import { useState } from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Dumbbell } from 'lucide-react';
import { ExerciseDuvidas } from './ExerciseDuvidas';

type ExercisePreviewProps = {
  planExercise: any;
};

function getYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|.*&v=))([^?&]+)/);
  return match?.[1] || null;
}

function isDirectVideo(url?: string | null) {
  return !!url && /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

function isGif(url?: string | null) {
  return !!url && /\.gif(\?.*)?$/i.test(url);
}

const diffColor: Record<string, string> = {
  'Fácil': 'bg-success/10 text-success border-success/20',
  'Moderado': 'bg-warning/10 text-warning border-warning/20',
  'Difícil': 'bg-destructive/10 text-destructive border-destructive/20',
  'Avançado': 'bg-primary/10 text-primary border-primary/20',
};

export function ExercisePreview({ planExercise }: ExercisePreviewProps) {
  const exercise = planExercise.exercises;
  const youtubeId = getYouTubeId(exercise?.video_url);
  const [expanded, setExpanded] = useState(false);

  const descricao = exercise?.descricao || '';
  const isLongDesc = descricao.length > 120;

  return (
    <Card className="overflow-hidden">
      {/* MÍDIA */}
      {youtubeId ? (
        <AspectRatio ratio={16 / 9}>
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={exercise?.nome || 'Vídeo do exercício'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </AspectRatio>
      ) : isGif(exercise?.video_url) ? (
        <AspectRatio ratio={16 / 9}>
          <img src={exercise.video_url} alt={exercise?.nome || 'GIF'} className="h-full w-full object-cover" />
        </AspectRatio>
      ) : isDirectVideo(exercise?.video_url) ? (
        <video src={exercise.video_url} controls preload="metadata" className="w-full max-h-[400px] object-contain bg-muted" />
      ) : exercise?.imagem_url ? (
        <AspectRatio ratio={16 / 9}>
          <img src={exercise.imagem_url} alt={exercise?.nome || 'Imagem'} loading="lazy" className="h-full w-full object-cover" />
        </AspectRatio>
      ) : (
        <AspectRatio ratio={16 / 9}>
          <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
            <Dumbbell className="h-8 w-8" />
            <span className="text-sm">Sem mídia</span>
          </div>
        </AspectRatio>
      )}

      <CardContent className="p-4 space-y-3">
        {/* TÍTULO */}
        <h3 className="font-semibold text-base text-foreground">{exercise?.nome || 'Exercício'}</h3>

        {/* TAGS */}
        <div className="flex flex-wrap gap-1.5">
          {exercise?.categoria && <Badge variant="secondary" className="text-xs">{exercise.categoria}</Badge>}
          {exercise?.dificuldade && (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${diffColor[exercise.dificuldade] || ''}`}>
              {exercise.dificuldade}
            </span>
          )}
          {exercise?.fase && <Badge variant="outline" className="text-xs">{exercise.fase}</Badge>}
        </div>

        {/* DESCRIÇÃO */}
        {descricao && (
          <div className="text-sm text-muted-foreground">
            <p className={!expanded && isLongDesc ? 'line-clamp-2' : ''}>
              {descricao}
            </p>
            {isLongDesc && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs font-medium text-primary hover:underline"
              >
                {expanded ? 'Ver menos' : 'Ver mais'}
              </button>
            )}
          </div>
        )}

        {/* INSTRUÇÕES */}
        {exercise?.instrucoes && (
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Instruções <ChevronDown className="h-3 w-3" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{exercise.instrucoes}</p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* INFO DO PLANO */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <div>
            <span className="text-xs text-muted-foreground">Séries</span>
            <p className="font-semibold text-foreground">{planExercise.series ?? 3}x</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Repetições</span>
            <p className="font-semibold text-foreground">{planExercise.repeticoes ?? 10}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Descanso</span>
            <p className="font-semibold text-foreground">{planExercise.descanso || '60s'}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Frequência</span>
            <p className="font-semibold text-foreground">{planExercise.frequencia_semanal ?? 3}x/sem</p>
          </div>
        </div>

        {/* OBSERVAÇÕES */}
        {planExercise.observacoes && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary mb-1">Observações do fisioterapeuta</p>
            <p className="text-sm text-foreground">{planExercise.observacoes}</p>
          </div>
        )}

        <ExerciseDuvidas exerciseId={exercise?.id || planExercise.exercise_id} exerciseName={exercise?.nome || 'Exercício'} />
      </CardContent>
    </Card>
  );
}
