'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDownIcon, LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/** Up to two initials for an avatar, e.g. "Citra Ayu Lestari" → "CA". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

/**
 * Slim top bar for participant screens (phone-first): brand left, name pill right.
 * The name pill opens a menu with the presentation title and "Keluar dari sesi",
 * so leaving is deliberate (menu + confirm) instead of a one-tap back arrow.
 */
export function ParticipantHeader({
  name,
  title,
  onExit,
}: {
  name: string;
  title: string;
  onExit: () => void;
}) {
  const [confirmExit, setConfirmExit] = useState(false);

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b-2 border-border bg-secondary-background px-4 py-2.5">
      <div className="flex items-center gap-2">
        <Image src="/faveicon.svg" alt="" aria-hidden="true" width={32} height={32} />
        <span className="text-2xl font-black tracking-tight">Karsa</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Menu peserta: ${name}`}
          className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-full border-2 border-border bg-background py-0.5 pl-0.5 pr-2 text-sm font-semibold transition-colors hover:bg-gray-100 data-[popup-open]:bg-gray-100"
        >
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-main text-[11px] font-black text-main-foreground"
          >
            {initials(name)}
          </span>
          <span className="max-w-32 truncate">{name}</span>
          <ChevronDownIcon className="size-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom" align="end" className="w-60 p-0.5">
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2 py-1.5">
            <span className="text-[11px] font-normal text-foreground/70">Sesi</span>
            <span className="truncate text-sm font-bold" title={title}>{title}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setConfirmExit(true)}
            className="cursor-pointer gap-1.5 px-2 py-1.5 text-sm [&_svg]:size-4 text-[var(--error-fg)] hover:bg-[var(--error)] hover:text-black hover:border-border focus:bg-[var(--error)] focus:text-black focus:border-border data-highlighted:bg-[var(--error)] data-highlighted:text-black data-highlighted:border-border"
          >
            <LogOutIcon /> Keluar dari sesi
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmExit} onOpenChange={setConfirmExit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Keluar dari sesi?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground/70">
            Kamu akan diarahkan ke halaman bergabung. Gunakan kode yang sama untuk bergabung kembali.
          </p>
          <DialogFooter>
            <DialogClose render={<Button variant="neutral" size="sm" />}>Batal</DialogClose>
            <Button
              size="sm"
              className="border-2 border-border bg-[var(--error)] text-black hover:bg-[var(--error)]/90"
              onClick={onExit}
            >
              Keluar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
