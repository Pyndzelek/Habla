"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { forwardRef } from "react";
import { spring } from "@/lib/motion";

type Variant = "primary" | "secondary" | "ghost" | "green" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-[0_8px_24px_-8px_rgb(110_80_250/0.6)]",
  green: "bg-brand-green text-white shadow-[0_8px_24px_-8px_rgb(48_209_88/0.6)]",
  secondary: "bg-surface text-ink border border-line shadow-card",
  ghost: "bg-transparent text-ink-2 hover:bg-surface-2 hover:text-ink",
  danger: "bg-red/10 text-red hover:bg-red/15",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl gap-1.5",
  md: "h-11 px-5 text-[15px] rounded-2xl gap-2",
  lg: "h-14 px-7 text-[17px] rounded-[1.25rem] gap-2.5",
};

export interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className = "", disabled, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={spring.snappy}
      disabled={disabled}
      className={`inline-flex select-none items-center justify-center font-semibold tracking-tight transition-[background-color,color,opacity] disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    />
  );
});

export function IconButton({ className = "", label, ...rest }: HTMLMotionProps<"button"> & { label: string }) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      transition={spring.snappy}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink ${className}`}
      {...rest}
    />
  );
}
