/**
 * Card Component
 * IKTISSAD Design System
 *
 * A versatile card component with multiple variants for content display.
 *
 * @example
 * <Card>
 *   <CardHeader>Title</CardHeader>
 *   <CardContent>Content here</CardContent>
 *   <CardFooter>Footer actions</CardFooter>
 * </Card>
 */

'use client';

import React, { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import Image from 'next/image';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'premium' | 'glass' | 'gradient';
export type CardSize = 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card variant style */
  variant?: CardVariant;
  /** Padding size */
  size?: CardSize;
  /** Enable hover effects */
  hoverable?: boolean;
  /** Clickable card */
  clickable?: boolean;
  /** Full height */
  fullHeight?: boolean;
  /** Additional class names */
  className?: string;
  /** Card content */
  children: ReactNode;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const variantStyles: Record<CardVariant, string> = {
  default: `
    bg-white
    border border-slate-200
    shadow-subtle
  `,
  elevated: `
    bg-white
    border border-slate-100
    shadow-card
  `,
  outlined: `
    bg-white
    border-2 border-slate-200
  `,
  premium: `
    bg-gradient-to-br from-white to-slate-50
    border border-slate-200
    shadow-card
    relative
    overflow-hidden
    before:content-['']
    before:absolute
    before:top-0
    before:right-0
    before:left-0
    before:h-1
    before:bg-gradient-to-r
    before:from-accent
    before:via-accent-400
    before:to-accent
    before:opacity-0
    before:transition-opacity
    before:duration-300
    hover:before:opacity-100
  `,
  glass: `
    bg-white/80
    backdrop-blur-xl
    border border-white/30
    shadow-card
  `,
  gradient: `
    bg-gradient-to-br from-brand-900 to-brand-800
    text-white
    border border-brand-700
    shadow-blue
  `,
};

const sizeStyles: Record<CardSize, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const hoverStyles: Record<CardVariant, string> = {
  default: 'hover:shadow-card hover:border-slate-300',
  elevated: 'hover:shadow-elevated hover:-translate-y-1',
  outlined: 'hover:border-brand hover:shadow-card',
  premium: 'hover:shadow-elevated hover:-translate-y-1',
  glass: 'hover:bg-white/90 hover:shadow-elevated',
  gradient: 'hover:shadow-blue hover:-translate-y-1',
};

// ═══════════════════════════════════════════════════════════════
// CARD COMPONENT
// ═══════════════════════════════════════════════════════════════

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      size = 'md',
      hoverable = false,
      clickable = false,
      fullHeight = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      rounded-lg
      transition-all duration-300 ease-out
    `;

    const combinedClassName = `
      ${baseStyles}
      ${variantStyles[variant]}
      ${sizeStyles[size]}
      ${hoverable || clickable ? hoverStyles[variant] : ''}
      ${clickable ? 'cursor-pointer' : ''}
      ${fullHeight ? 'h-full' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ');

    if (clickable) {
      return (
        <motion.div
          ref={ref}
          className={combinedClassName}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          transition={{ duration: 0.15 }}
          role="button"
          tabIndex={0}
          {...(props as HTMLMotionProps<'div'>)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={combinedClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// ═══════════════════════════════════════════════════════════════
// CARD HEADER
// ═══════════════════════════════════════════════════════════════

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Title text */
  title?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Action element (e.g., button, menu) */
  action?: ReactNode;
  /** Border at bottom */
  bordered?: boolean;
  children?: ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  subtitle,
  action,
  bordered = false,
  children,
  className = '',
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={`
        flex items-start justify-between gap-4
        ${bordered ? 'pb-4 border-b border-slate-200 mb-4' : 'mb-4'}
        ${className}
      `}
      {...props}
    >
      {children || (
        <>
          <div>
            {title && (
              <h3 className="text-lg font-bold text-ink font-[family-name:var(--font-display)]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-pewter mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CARD CONTENT
// ═══════════════════════════════════════════════════════════════

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Remove default padding */
  noPadding?: boolean;
  children: ReactNode;
  className?: string;
}

export function CardContent({
  noPadding = false,
  children,
  className = '',
  ...props
}: CardContentProps) {
  return (
    <div
      className={`
        ${noPadding ? '' : 'py-2'}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CARD FOOTER
// ═══════════════════════════════════════════════════════════════

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Border at top */
  bordered?: boolean;
  /** Align items */
  align?: 'start' | 'center' | 'end' | 'between';
  children: ReactNode;
  className?: string;
}

export function CardFooter({
  bordered = false,
  align = 'end',
  children,
  className = '',
  ...props
}: CardFooterProps) {
  const alignStyles: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={`
        flex items-center gap-3
        ${alignStyles[align]}
        ${bordered ? 'pt-4 border-t border-slate-200 mt-4' : 'mt-4'}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ARTICLE CARD (Specialized)
// ═══════════════════════════════════════════════════════════════

export interface ArticleCardProps {
  /** Article image */
  image?: string;
  /** Image alt text */
  imageAlt?: string;
  /** Category badge */
  category?: string;
  /** Article title */
  title: string;
  /** Article excerpt */
  excerpt?: string;
  /** Author name */
  author?: string;
  /** Published date */
  date?: string;
  /** Reading time */
  readTime?: string;
  /** Click handler */
  onClick?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Layout orientation */
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

export function ArticleCard({
  image,
  imageAlt = '',
  category,
  title,
  excerpt,
  author,
  date,
  readTime,
  onClick,
  size = 'md',
  orientation = 'vertical',
  className = '',
}: ArticleCardProps) {
  const imageSizes: Record<string, string> = {
    sm: 'h-32',
    md: 'h-48',
    lg: 'h-64',
  };

  const isHorizontal = orientation === 'horizontal';

  return (
    <Card
      variant="elevated"
      size="sm"
      hoverable
      clickable={!!onClick}
      onClick={onClick}
      className={`
        overflow-hidden
        ${isHorizontal ? 'flex flex-row' : 'flex flex-col'}
        ${className}
      `}
    >
      {image && (
        <div
          className={`
            relative overflow-hidden
            ${isHorizontal ? 'w-1/3 flex-shrink-0' : `w-full ${imageSizes[size]}`}
          `}
        >
          <Image
            src={image}
            alt={imageAlt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {category && (
            <span className="absolute top-3 right-3 px-2 py-1 bg-accent text-ink text-xs font-bold uppercase tracking-wide">
              {category}
            </span>
          )}
        </div>
      )}

      <div className={`flex flex-col ${isHorizontal ? 'flex-1 p-4' : 'p-4'}`}>
        <h3
          className={`
            font-bold text-ink line-clamp-2 font-[family-name:var(--font-display)]
            ${size === 'lg' ? 'text-xl' : size === 'md' ? 'text-lg' : 'text-base'}
          `}
        >
          {title}
        </h3>

        {excerpt && (
          <p className="text-graphite text-sm mt-2 line-clamp-2">{excerpt}</p>
        )}

        {(author || date || readTime) && (
          <div className="flex items-center gap-3 mt-auto pt-3 text-xs text-pewter">
            {author && <span className="font-medium">{author}</span>}
            {date && <span>{date}</span>}
            {readTime && <span>{readTime}</span>}
          </div>
        )}
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAT CARD (Specialized)
// ═══════════════════════════════════════════════════════════════

export interface StatCardProps {
  /** Stat label */
  label: string;
  /** Stat value */
  value: string | number;
  /** Change value (e.g., "+12%") */
  change?: string;
  /** Change is positive */
  changePositive?: boolean;
  /** Icon */
  icon?: ReactNode;
  /** Icon background color */
  iconBg?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  change,
  changePositive,
  icon,
  iconBg = 'bg-brand-100',
  className = '',
}: StatCardProps) {
  return (
    <Card variant="elevated" size="md" className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-pewter font-medium">{label}</p>
          <p className="text-2xl font-bold text-ink mt-1 font-[family-name:var(--font-display)]">
            {value}
          </p>
          {change && (
            <p
              className={`text-sm font-medium mt-1 ${
                changePositive ? 'text-profit' : 'text-loss'
              }`}
            >
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={`
              w-12 h-12 rounded-xl flex items-center justify-center
              ${iconBg} text-brand
            `}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export default Card;
