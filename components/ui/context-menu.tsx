"use client"

import { ContextMenu as ContextMenuPrimitive } from "@base-ui/react/context-menu"
import * as React from "react"

import { cn } from "@/lib/utils"
import { dropdownMenuPopupClassName } from "./dropdown-menu"

function ContextMenu({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" {...props} />
}

function ContextMenuTrigger({
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Trigger>) {
  return (
    <ContextMenuPrimitive.Trigger data-slot="context-menu-trigger" {...props} />
  )
}

function ContextMenuContent({
  className,
  side,
  sideOffset,
  align,
  alignOffset,
  ...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof ContextMenuPrimitive.Positioner>,
    "side" | "sideOffset" | "align" | "alignOffset"
  >) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
      >
        <ContextMenuPrimitive.Popup
          data-slot="context-menu-content"
          className={cn(dropdownMenuPopupClassName, className)}
          {...props}
        />
      </ContextMenuPrimitive.Positioner>
    </ContextMenuPrimitive.Portal>
  )
}

// Items, labels, separators etc. are the same Base UI menu parts as the
// dropdown menu, so reuse them instead of duplicating the styling.
export {
  DropdownMenuGroup as ContextMenuGroup,
  DropdownMenuItem as ContextMenuItem,
  DropdownMenuCheckboxItem as ContextMenuCheckboxItem,
  DropdownMenuRadioGroup as ContextMenuRadioGroup,
  DropdownMenuRadioItem as ContextMenuRadioItem,
  DropdownMenuLabel as ContextMenuLabel,
  DropdownMenuSeparator as ContextMenuSeparator,
  DropdownMenuShortcut as ContextMenuShortcut,
  DropdownMenuSub as ContextMenuSub,
  DropdownMenuSubTrigger as ContextMenuSubTrigger,
  DropdownMenuSubContent as ContextMenuSubContent,
} from "./dropdown-menu"

export { ContextMenu, ContextMenuTrigger, ContextMenuContent }
