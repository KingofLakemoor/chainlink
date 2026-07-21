import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"

    const variants = {
      default: "bg-[#22c55e] text-white hover:bg-green-600 shadow-sm cursor-pointer",
      destructive: "bg-red-900 text-red-100 hover:bg-red-800",
      outline: "border border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-100 cursor-pointer",
      secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 cursor-pointer",
      ghost: "hover:bg-zinc-800/60 hover:text-zinc-50 text-zinc-400 cursor-pointer",
      link: "text-green-500 underline-offset-4 hover:underline cursor-pointer",
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-9 rounded-md px-3 text-xs",
      lg: "h-11 rounded-md px-8",
      icon: "h-10 w-10",
    }

    return (
      <Comp
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
