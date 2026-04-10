import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Badge } from '@/components/ui/badge';

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

export function ExercisePreview({ planExercise }: ExercisePreviewProps) {
  const exercise = planExercise.exercises;
  const youtubeId = getYouTubeId(exercise?.video_url);

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-start">
        <div className="overflow-hidden rounded-lg border bg-muted/40">
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
          ) : isDirectVideo(exercise?.video_url) ? (
            <AspectRatio ratio={16 / 9}>
              <video src={exercise.video_url} controls className="h-full w-full object-cover" preload="metadata" />
            </AspectRatio>
          ) : exercise?.imagem_url ? (
            <AspectRatio ratio={16 / 9}>
              <img
                src={exercise.imagem_url}
                alt={exercise?.nome || 'Imagem do exercício'}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </AspectRatio>
          ) : (
            <AspectRatio ratio={16 / 9}>
              <div className="flex h-full items-center justify-center bg-muted text-sm text-muted-foreground">
                Mídia não disponível
              </div>
            </AspectRatio>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{exercise?.nome || 'Exercício'}</p>
            {exercise?.categoria && <Badge variant="secondary">{exercise.categoria}</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {planExercise.series}x{planExercise.repeticoes} · Descanso: {planExercise.descanso} · {planExercise.frequencia_semanal}x/semana
          </p>
          {exercise?.instrucoes && <p className="text-sm text-muted-foreground">{exercise.instrucoes}</p>}
          {planExercise.observacoes && <p className="text-sm text-foreground">{planExercise.observacoes}</p>}
        </div>
      </div>
    </div>
  );
}
