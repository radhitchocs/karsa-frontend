"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

type DropzoneProps = Omit<React.ComponentProps<"div">, "onDrop"> & {
  /** Called with the first dropped or picked file. */
  onFile: (file: File) => void
  /** Passed to the hidden file input, e.g. "image/*". */
  accept?: string
  disabled?: boolean
}

/**
 * Drag-and-drop target that also opens the file picker on click / Enter / Space.
 * Sets `data-dragging` while a file hovers it, for styling.
 */
function Dropzone({
  onFile,
  accept,
  disabled = false,
  className,
  children,
  ...props
}: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)

  function take(files: FileList | null) {
    const file = files?.[0]
    if (file && !disabled) onFile(file)
  }

  return (
    <div
      data-slot="dropzone"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      data-dragging={dragging || undefined}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (disabled || (e.key !== "Enter" && e.key !== " ")) return
        e.preventDefault()
        inputRef.current?.click()
      }}
      onDragEnter={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        // Ignore leave events fired when moving between child elements.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        take(e.dataTransfer.files)
      }}
      className={cn(
        "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 aria-disabled:cursor-default",
        className,
      )}
      {...props}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          take(e.target.files)
          e.target.value = "" // allow re-picking the same file
        }}
      />
      {children}
    </div>
  )
}

export { Dropzone }
