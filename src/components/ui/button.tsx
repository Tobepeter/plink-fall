import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50 outline-none select-none',
  {
    variants: {
      variant: {
        default: 'bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,.45)] hover:bg-cyan-300',
        ghost: 'bg-white/5 text-white hover:bg-white/10 border border-white/10',
        gold: 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,.5)] hover:bg-amber-300',
      },
      size: { default: 'h-10 px-4', sm: 'h-8 px-3 text-sm', icon: 'size-10' },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
