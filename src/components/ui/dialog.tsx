import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

const Dialog = DialogPrimitive.Root
const DialogTitle = DialogPrimitive.Title
const DialogDescription = DialogPrimitive.Description

function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal container={document.getElementById('frame')}>
      <DialogPrimitive.Overlay className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm" />
      <DialogPrimitive.Content
        className={cn(
          'absolute left-1/2 top-1/2 z-50 w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-cyan-300/30 bg-slate-950/95 p-[5cqw] text-center text-white shadow-[0_0_60px_rgba(34,211,238,.25)]',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export { Dialog, DialogContent, DialogTitle, DialogDescription }
