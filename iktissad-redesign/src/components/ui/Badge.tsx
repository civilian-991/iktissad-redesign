/**
 * Badge Component
 * IKTISSAD Design System
 *
 * A versatile badge/tag component for status indicators, categories, and labels.
 *
 * @example
 * <Badge>Default</Badge>
 * <Badge variant="success">Published</Badge>
 * <Badge variant="warning" size="lg">Pending</Badge>
 * <Badge variant="premium" animated>Exclusive</Badge>
 */

'use client';

import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'premium'
  | 'breaking'
  | 'trending'
  | 'outline';

export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge variant style */
  variant?: BadgeVariant;
  /** Badge size */
  size?: BadgeSize;
  /** Icon on the left */
  leftIcon?: ReactNode;
  /** Icon on the right */
  rightIcon?: ReactNode;
  /** Dot indicator */
  dot?: boolean;
  /** Dot color (if dot is true) */
  dotColor?: string;
  /** Pill shape (fully rounded) */
  pill?: boolean;
  /** Animated badge */
  animated?: boolean;
  /** Animation type */
  animationType?: 'pulse' | 'bounce' | 'glow';
  /** Badge content */
  children: ReactNode;
  /** Additional class names */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const variantStyles: Record<BadgeVariant, string> = {
  default: `
    bg-slate-100
    text-slate-700
    border border-slate-200
  `,
  primary: `
    bg-brand
    text-white
    border border-brand
  `,
  secondary: `
    bg-brand-100
    text-brand
    border border-brand-200
  `,
  success: `
    bg-profit-bg
    text-profit
    border border-profit/20
  `,
  warning: `
    bg-warning-bg
    text-warning
    border border-warning/20
  `,
  danger: `
    bg-loss-bg
    text-loss
    border border-loss/20
  `,
  info: `
    bg-info-bg
    text-info
    border border-info/20
  `,
  premium: `
    bg-gradient-to-r from-brand-900 to-brand-700
    text-accent
    border border-accent/30
  `,
  breaking: `
    bg-loss
    text-white
    border border-loss
  `,
  trending: `
    bg-gradient-to-r from-accent to-accent-600
    text-brand-900
    border border-accent
  `,
  outline: `
    bg-transparent
    text-slate-600
    border border-slate-300
    hover:bg-slate-50
  `,
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

const dotSizeStyles: Record<BadgeSize, string> = {
  xs: 'w-1 h-1',
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════

const animationStyles: Record<string, string> = {
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  glow: 'animate-glow',
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      size = 'md',
      leftIcon,
      rightIcon,
      dot,
      dotColor,
      pill = false,
      animated = false,
      animationType = 'pulse',
      children,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center
      font-semibold tracking-wide uppercase
      transition-all duration-200
      font-[family-name:var(--font-display)]
      whitespace-nowrap
      select-none
    `;

    const shapeStyles = pill ? 'rounded-full' : 'rounded';

    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${shapeStyles}
      ${animated ? animationStyles[animationType] : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    const content = (
      <>
        {dot && (
          <span
            className={`
              ${dotSizeStyles[size]}
              rounded-full
              ${dotColor || (variant === 'success' ? 'bg-profit' : variant === 'danger' ? 'bg-loss' : 'bg-current')}
              ms-1.5
            `}
          />
        )}
        {leftIcon && <span className="ms-1 flex-shrink-0">{leftIcon}</span>}
        {children}
        {rightIcon && <span className="me-1 flex-shrink-0">{rightIcon}</span>}
      </>
    );

    if (animated && animationType === 'glow') {
      return (
        <motion.span
          ref={ref}
          className={combinedClassName}
          animate={{
            boxShadow: [
              '0 0 0 0 rgba(245, 158, 11, 0)',
              '0 0 20px 5px rgba(245, 158, 11, 0.3)',
              '0 0 0 0 rgba(245, 158, 11, 0)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          {...(props as HTMLMotionProps<'span'>)}
        >
          {content}
        </motion.span>
      );
    }

    return (
      <span ref={ref} className={combinedClassName} {...props}>
        {content}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

// ═══════════════════════════════════════════════════════════════
// STATUS BADGE (Convenience Component)
// ═══════════════════════════════════════════════════════════════

export type StatusType = 'published' | 'draft' | 'review' | 'scheduled' | 'active' | 'inactive' | 'suspended';

const statusConfig: Record<StatusType, { variant: BadgeVariant; label: string; labelAr: string }> = {
  published: { variant: 'success', label: 'Published', labelAr: 'منشور' },
  draft: { variant: 'default', label: 'Draft', labelAr: 'مسودة' },
  review: { variant: 'warning', label: 'In Review', labelAr: 'قيد المراجعة' },
  scheduled: { variant: 'info', label: 'Scheduled', labelAr: 'مجدول' },
  active: { variant: 'success', label: 'Active', labelAr: 'نشط' },
  inactive: { variant: 'default', label: 'Inactive', labelAr: 'غير نشط' },
  suspended: { variant: 'danger', label: 'Suspended', labelAr: 'موقوف' },
};

export interface StatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  /** Status type */
  status: StatusType;
  /** Use Arabic label */
  arabic?: boolean;
}

export function StatusBadge({ status, arabic = true, ...props }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} dot {...props}>
      {arabic ? config.labelAr : config.label}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════
// ROLE BADGE (Convenience Component)
// ═══════════════════════════════════════════════════════════════

export type RoleType = 'admin' | 'editor' | 'writer' | 'contributor';

const roleConfig: Record<RoleType, { variant: BadgeVariant; label: string; labelAr: string }> = {
  admin: { variant: 'premium', label: 'Admin', labelAr: 'مدير' },
  editor: { variant: 'primary', label: 'Editor', labelAr: 'محرر' },
  writer: { variant: 'secondary', label: 'Writer', labelAr: 'كاتب' },
  contributor: { variant: 'default', label: 'Contributor', labelAr: 'مساهم' },
};

export interface RoleBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  /** Role type */
  role: RoleType;
  /** Use Arabic label */
  arabic?: boolean;
}

export function RoleBadge({ role, arabic = true, ...props }: RoleBadgeProps) {
  const config = roleConfig[role];
  return (
    <Badge variant={config.variant} {...props}>
      {arabic ? config.labelAr : config.label}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY BADGE (Convenience Component)
// ═══════════════════════════════════════════════════════════════

export interface CategoryBadgeProps extends Omit<BadgeProps, 'children'> {
  /** Category name */
  category: string;
}

export function CategoryBadge({ category, ...props }: CategoryBadgeProps) {
  return (
    <Badge variant="trending" size="sm" {...props}>
      {category}
    </Badge>
  );
}

// ═══════════════════════════════════════════════════════════════
// BADGE GROUP
// ═══════════════════════════════════════════════════════════════

export interface BadgeGroupProps {
  children: ReactNode;
  /** Gap between badges */
  gap?: 'xs' | 'sm' | 'md';
  /** Wrap badges */
  wrap?: boolean;
  className?: string;
}

export function BadgeGroup({ children, gap = 'sm', wrap = true, className = '' }: BadgeGroupProps) {
  const gapStyles = {
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-3',
  };

  return (
    <div
      className={`
        inline-flex items-center
        ${gapStyles[gap]}
        ${wrap ? 'flex-wrap' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default Badge;
