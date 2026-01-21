import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-verqo-turquoise text-verqo-white",
        secondary:
          "border-transparent bg-verqo-navy-medium text-verqo-white",
        destructive:
          "border-transparent bg-verqo-red text-verqo-white",
        outline: "border-verqo-gray-light text-verqo-navy-dark bg-verqo-white",
        success:
          "border-transparent bg-green-600 text-white",
        warning:
          "border-transparent bg-orange-500 text-white",
        error:
          "border-transparent bg-verqo-red text-verqo-white",
        info:
          "border-transparent bg-blue-500 text-white",
        // Status variants for test flows
        idle:
          "border-transparent bg-verqo-gray-medium text-verqo-white",
        running:
          "border-transparent bg-blue-500 text-white animate-pulse",
        completed:
          "border-transparent bg-green-600 text-white",
        failed:
          "border-transparent bg-verqo-red text-verqo-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
