"use client"

import * as React from "react"
import { MinusIcon, PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/**
 * Number field with − / + buttons instead of the browser's spin arrows.
 * Typing is free; the value is clamped to [min, max] when the field loses focus.
 */
function NumberStepper({
  id,
  value,
  min,
  max,
  step = 1,
  onChange,
  decrementLabel = "Kurangi",
  incrementLabel = "Tambah",
  className,
}: {
  id?: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  /** Tooltip + accessible name for the − button, e.g. "Kurangi kelompok". */
  decrementLabel?: string
  /** Tooltip + accessible name for the + button. */
  incrementLabel?: string
  className?: string
}) {
  // Raw text while typing, so an empty or partial entry isn't forced to a number mid-edit.
  const [draft, setDraft] = React.useState<string | null>(null)
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const safe = Number.isFinite(value) ? value : min

  function commit(text: string) {
    const n = Number(text)
    onChange(clamp(text.trim() === "" || !Number.isFinite(n) ? safe : Math.round(n)))
    setDraft(null)
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <StepButton label={decrementLabel} disabled={safe <= min} onClick={() => onChange(clamp(safe - step))}>
        <MinusIcon />
      </StepButton>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft ?? String(safe)}
        onChange={(e) => {
          setDraft(e.target.value)
          const n = Number(e.target.value)
          if (e.target.value.trim() !== "" && Number.isFinite(n) && n >= min && n <= max) onChange(n)
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(e.currentTarget.value)
        }}
        className="w-16 text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <StepButton label={incrementLabel} disabled={safe >= max} onClick={() => onChange(clamp(safe + step))}>
        <PlusIcon />
      </StepButton>
    </div>
  )
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip disableHoverablePopup>
      <TooltipTrigger
        render={
          <Button type="button" variant="neutral" size="icon" aria-label={label} disabled={disabled} onClick={onClick}>
            {children}
          </Button>
        }
      />
      <TooltipContent side="bottom" className="pointer-events-none">{label}</TooltipContent>
    </Tooltip>
  )
}

export { NumberStepper }
