'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';

export function QuizCountdown({ deadlineAt, duration }: { deadlineAt: number; duration: number }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    setRemaining(Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)));
    const tick = setInterval(() => {
      const secs = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
      setRemaining(secs);
      if (secs <= 0) clearInterval(tick);
    }, 250);
    return () => clearInterval(tick);
  }, [deadlineAt]);

  const pct = duration > 0 ? Math.max(0, Math.min(100, (remaining / duration) * 100)) : 0;

  return (
    <div className="flex items-center gap-3">
      <Progress value={pct} className="flex-1" />
      <span
        className={`text-2xl font-black w-12 text-center tabular-nums ${
          remaining <= 5 ? 'text-[var(--error)]' : ''
        }`}
      >
        {remaining}
      </span>
    </div>
  );
}
