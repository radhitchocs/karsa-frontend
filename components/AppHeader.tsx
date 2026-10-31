'use client';

import Image from 'next/image';
import { HomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * App top bar with three zones: brand + home (left), what you're on (center),
 * actions (right). The 1fr/auto/1fr grid keeps the center truly centered no
 * matter how wide the side zones get.
 */
export function AppHeader({
  onHome,
  center,
  right,
}: {
  /** Shows the home button; omit on the home page itself. */
  onHome?: () => void;
  center?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b-2 border-border bg-secondary-background px-4 py-3">
      <div className="flex w-[12.25rem] items-center gap-2 justify-self-start">
        <Image src="/faveicon.svg" alt="" aria-hidden="true" width={40} height={40} />
        <span className="text-3xl font-black tracking-tight">Karsa</span>
        {onHome && (
          <Tooltip disableHoverablePopup>
            <TooltipTrigger
              render={
                <Button variant="neutral" size="icon" className="ml-auto" aria-label="Beranda" onClick={onHome}>
                  <HomeIcon />
                </Button>
              }
            />
            <TooltipContent side="bottom" className="pointer-events-none">Beranda</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex min-w-0 max-w-[40vw] items-center justify-center gap-2">{center}</div>
      <div className="flex min-w-0 items-center justify-end gap-2 justify-self-end">{right}</div>
    </header>
  );
}

/**
 * Read-only presentation title styled like the editor's title field (same size,
 * border and centered text), so the header looks the same on every screen.
 * `aside` hangs off the right edge without shifting the centered field.
 */
export function HeaderTitle({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="relative">
      <h1
        title={title}
        className="flex h-10 w-80 max-w-full items-center justify-center truncate rounded-base border-2 border-border bg-secondary-background px-3 text-sm font-semibold"
      >
        <span className="truncate">{title}</span>
      </h1>
      {aside && (
        <div className="absolute left-full top-1/2 ml-3 flex -translate-y-1/2 items-center gap-2 whitespace-nowrap">
          {aside}
        </div>
      )}
    </div>
  );
}
