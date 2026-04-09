import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface EvaScaleProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const faces = ['😊', '🙂', '😐', '😕', '😣', '😖', '😫', '😭', '🤯', '😱', '💀'];

const labels: Record<number, string> = {
  0: 'Sem dor',
  1: 'Dor mínima',
  2: 'Dor leve',
  3: 'Dor leve',
  4: 'Dor moderada',
  5: 'Dor moderada',
  6: 'Dor moderada',
  7: 'Dor intensa',
  8: 'Dor intensa',
  9: 'Dor muito intensa',
  10: 'Pior dor possível',
};

function getColor(val: number): string {
  if (val <= 3) return 'text-emerald-600';
  if (val <= 6) return 'text-amber-500';
  return 'text-red-600';
}

function getBgColor(val: number): string {
  if (val <= 3) return 'bg-emerald-500';
  if (val <= 6) return 'bg-amber-500';
  return 'bg-red-500';
}

function getTrackStyle(val: number): string {
  if (val <= 3) return '[&_[data-slot=range]]:bg-emerald-500';
  if (val <= 6) return '[&_[data-slot=range]]:bg-amber-500';
  return '[&_[data-slot=range]]:bg-red-500';
}

export function EvaScale({ value, onChange, className }: EvaScaleProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{faces[value]}</span>
          <div>
            <span className={cn('text-2xl font-bold', getColor(value))}>{value}</span>
            <span className="text-sm text-muted-foreground ml-1">/ 10</span>
          </div>
        </div>
        <span className={cn('text-sm font-medium px-2 py-1 rounded', getColor(value))}>
          {labels[value]}
        </span>
      </div>

      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={0}
        max={10}
        step={1}
        className={cn('w-full', getTrackStyle(value))}
      />

      <div className="flex justify-between text-[10px] text-muted-foreground px-1">
        {Array.from({ length: 11 }, (_, i) => (
          <span key={i}>{i}</span>
        ))}
      </div>
    </div>
  );
}

export function EvaBadge({ value }: { value: number }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
      value <= 3 ? 'bg-emerald-100 text-emerald-700' :
      value <= 6 ? 'bg-amber-100 text-amber-700' :
      'bg-red-100 text-red-700'
    )}>
      {faces[value]} {value}/10
    </span>
  );
}
