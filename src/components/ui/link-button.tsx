import * as React from "react"
import Link from "next/link"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function LinkButton({
  className,
  variant = "default",
  size = "default",
  href,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> &
  VariantProps<typeof buttonVariants> & {
    href: string
  }) {
  return (
    <Link
      href={href}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </Link>
  )
}

export { LinkButton }
