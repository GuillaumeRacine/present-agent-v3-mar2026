import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-black text-white hover:bg-gray-800",
        primary: "bg-green-700 text-white hover:bg-green-800",
        secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
        outline: "border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300",
        ghost: "hover:bg-gray-100 text-gray-500 hover:text-gray-700",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        link: "text-blue-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-3",
        sm: "h-9 px-3 text-xs",
        lg: "h-12 px-8 text-[15px]",
        icon: "h-10 w-10",
        pill: "h-8 px-3.5 py-1.5 text-[13px] rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
