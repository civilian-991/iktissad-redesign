/**
 * Button Component
 * IKTISSAD Design System
 *
 * A versatile button component with multiple variants, sizes, and states.
 *
 * @example
 * <Button variant="primary">Subscribe</Button>
 * <Button variant="outline" size="lg" loading>Loading...</Button>
 * <Button variant="ghost" leftIcon={<Search />}>Search</Button>
 */

'use client';

import React, { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { Loader2 } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Button variant style */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Full width button */
  fullWidth?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Icon on the left */
  leftIcon?: ReactNode;
  /** Icon on the right */
  rightIcon?: ReactNode;
  /** Button content */
  children: ReactNode;
  /** Additional class names */
  className?: string;
  /** Enable hover animation */
  animated?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-br from-accent to-accent-600
    text-ink
    hover:shadow-gold
    hover:from-accent-400 hover:to-accent
    active:from-accent-600 active:to-accent-700
    border border-transparent
  `,
  secondary: `
    bg-brand
    text-white
    hover:bg-brand-500
    hover:shadow-blue
    active:bg-brand-700
    border border-transparent
  `,
  outline: `
    bg-transparent
    text-brand
    border-2 border-brand
    hover:bg-brand
    hover:text-white
    active:bg-brand-700
  `,
  ghost: `
    bg-transparent
    text-graphite
    hover:bg-slate-100
    hover:text-brand
    active:bg-slate-200
    border border-transparent
  `,
  danger: `
    bg-loss
    text-white
    hover:bg-loss-light
    active:bg-red-700
    border border-transparent
  `,
  success: `
    bg-profit
    text-white
    hover:bg-profit-light
    active:bg-green-700
    border border-transparent
  `,
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'px-2.5 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
  xl: 'px-8 py-4 text-lg gap-3',
};

const iconSizes: Record<ButtonSize, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      className = '',
      animated = true,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    const iconSize = iconSizes[size];

    const baseStyles = `
      inline-flex items-center justify-center
      font-bold tracking-wide
      rounded-sm
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-brand/50 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
      select-none
      font-[family-name:var(--font-display)]
    `;

    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${fullWidth ? 'w-full' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    const content = (
      <>
        {loading ? (
          <Loader2 size={iconSize} className="animate-spin" />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        <span>{children}</span>
        {!loading && rightIcon && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </>
    );

    if (animated && !isDisabled) {
      return (
        <motion.button
          ref={ref}
          type={type}
          disabled={isDisabled}
          className={combinedClassName}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.15 }}
          {...(props as HTMLMotionProps<'button'>)}
        >
          {content}
        </motion.button>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={combinedClassName}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';

// ═══════════════════════════════════════════════════════════════
// ICON BUTTON VARIANT
// ═══════════════════════════════════════════════════════════════

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon'> {
  /** The icon to display */
  icon: ReactNode;
  /** Accessible label */
  'aria-label': string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'md', className = '', ...props }, ref) => {
    const iconSizeMap: Record<ButtonSize, string> = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
      xl: 'w-14 h-14',
    };

    return (
      <Button
        ref={ref}
        size={size}
        className={`!p-0 ${iconSizeMap[size]} ${className}`}
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

// ═══════════════════════════════════════════════════════════════
// BUTTON GROUP
// ═══════════════════════════════════════════════════════════════

export interface ButtonGroupProps {
  children: ReactNode;
  /** Stack buttons vertically on mobile */
  responsive?: boolean;
  /** Gap between buttons */
  gap?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function ButtonGroup({
  children,
  responsive = false,
  gap = 'md',
  className = '',
}: ButtonGroupProps) {
  const gapStyles: Record<string, string> = {
    none: 'gap-0',
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  };

  return (
    <div
      className={`
        inline-flex items-center
        ${gapStyles[gap]}
        ${responsive ? 'flex-col sm:flex-row w-full sm:w-auto' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default Button;
