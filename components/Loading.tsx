import { Loader2Icon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Spinning loader. Size = icon size (default 16px, matches buttons). */
export function Spinner({ className, size = 4 }: { className?: string; size?: number }) {
  return (
    <Loader2Icon
      aria-hidden="true"
      className={cn('animate-spin', className)}
      style={{ width: `calc(var(--spacing) * ${size})`, height: `calc(var(--spacing) * ${size})` }}
    />
  );
}

/** Whole-page loader for data still arriving. Use inside `flex flex-1 items-center justify-center`. */
export function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-3" role="status">
      <Spinner size={7} className="text-foreground/70" />
      <p className="text-sm text-foreground/70">{label}</p>
    </div>
  );
}

/** Skeleton placeholder for a single card while a list loads. */
export function SkeletonCard() {
  return (
    <div className="h-36 rounded-base border-2 border-border bg-secondary-background">
      <div className="animate-pulse space-y-3 p-4">
        <div className="h-4 w-2/3 rounded-base bg-border/40" />
        <div className="h-3 w-1/3 rounded-base bg-border/40" />
        <div className="flex gap-1.5">
          <div className="h-4 w-12 rounded-base bg-border/40" />
          <div className="h-4 w-12 rounded-base bg-border/40" />
          <div className="h-4 w-12 rounded-base bg-border/40" />
        </div>
      </div>
    </div>
  );
}
