import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ScoreChipProps {
  score: number; // 0 to 10
}

export function ScoreChip({ score }: ScoreChipProps) {
  let colorClass = "";
  let Icon = Minus;
  
  if (score >= 7.5) {
    colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
    Icon = TrendingUp;
  } else if (score >= 5.0) {
    colorClass = "bg-amber-50 text-amber-700 border-amber-200";
    Icon = Minus;
  } else {
    colorClass = "bg-rose-50 text-rose-700 border-rose-200";
    Icon = TrendingDown;
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold text-sm", colorClass)}>
      <Icon className="w-4 h-4" />
      <span>{score.toFixed(1)}</span>
    </div>
  );
}
