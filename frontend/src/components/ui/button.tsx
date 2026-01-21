import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-sm hover:shadow-md",
  {
    variants: {
      variant: {
        // Primary: Verqo turquoise
        default: "bg-verqo-turquoise text-verqo-white hover:bg-verqo-turquoise/90 border-0",
        // Secondary: Navy outline
        secondary: "border-2 border-verqo-navy-medium text-verqo-navy-dark bg-transparent hover:bg-verqo-navy-medium hover:text-verqo-white",
        // Danger: Red
        destructive: "bg-verqo-red text-verqo-white hover:bg-verqo-red/90 border-0",
        // Outline: Light border
        outline: "border border-verqo-gray-light bg-verqo-white text-verqo-navy-dark hover:bg-verqo-gray-light hover:text-verqo-navy-dark",
        // Ghost: Transparent
        ghost: "text-verqo-navy-dark hover:bg-verqo-gray-light hover:text-verqo-navy-dark",
        // Link: Underlined
        link: "text-verqo-turquoise underline-offset-4 hover:underline hover:text-verqo-turquoise/80",
        // Success: Green
        success: "bg-green-600 text-white hover:bg-green-700 border-0",
        // Warning: Orange
        warning: "bg-orange-500 text-white hover:bg-orange-600 border-0",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-11 w-11",
        xs: "h-8 rounded-md px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
