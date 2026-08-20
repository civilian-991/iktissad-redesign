/**
 * Input Component
 * IKTISSAD Design System
 *
 * A versatile input component with multiple variants, states, and features.
 *
 * @example
 * <Input label="Email" placeholder="Enter email" />
 * <Input variant="filled" leftIcon={<Search />} />
 * <Input type="password" error="Invalid password" />
 */

'use client';

import React, { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type InputVariant = 'default' | 'filled' | 'outline';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Input variant style */
  variant?: InputVariant;
  /** Input size */
  size?: InputSize;
  /** Label text */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Success state */
  success?: boolean;
  /** Icon on the left */
  leftIcon?: ReactNode;
  /** Icon on the right */
  rightIcon?: ReactNode;
  /** Full width input */
  fullWidth?: boolean;
  /** Additional class names for container */
  containerClassName?: string;
  /** Additional class names for input */
  className?: string;
}

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Input variant style */
  variant?: InputVariant;
  /** Input size */
  size?: InputSize;
  /** Label text */
  label?: string;
  /** Helper text below input */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Success state */
  success?: boolean;
  /** Full width input */
  fullWidth?: boolean;
  /** Additional class names for container */
  containerClassName?: string;
  /** Additional class names for textarea */
  className?: string;
  /** Auto-resize based on content */
  autoResize?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const variantStyles: Record<InputVariant, string> = {
  default: `
    bg-white
    border border-slate-200
    hover:border-slate-300
    focus:border-brand focus:ring-2 focus:ring-brand/20
  `,
  filled: `
    bg-slate-50
    border border-transparent
    hover:bg-slate-100
    focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20
  `,
  outline: `
    bg-transparent
    border-2 border-slate-300
    hover:border-slate-400
    focus:border-brand focus:ring-0
  `,
};

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'px-5 py-3.5 text-lg',
};

const labelSizeStyles: Record<InputSize, string> = {
  sm: 'text-xs mb-1',
  md: 'text-sm mb-1.5',
  lg: 'text-base mb-2',
};

// ═══════════════════════════════════════════════════════════════
// INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant = 'default',
      size = 'md',
      label,
      helperText,
      error,
      success,
      leftIcon,
      rightIcon,
      fullWidth = true,
      containerClassName = '',
      className = '',
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const hasError = !!error;
    const hasSuccess = success && !hasError;

    const baseInputStyles = `
      w-full
      rounded-md
      outline-none
      transition-all duration-200
      font-[family-name:var(--font-body)]
      placeholder:text-slate-400
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100
    `;

    const stateStyles = hasError
      ? 'border-loss focus:border-loss focus:ring-loss/20'
      : hasSuccess
      ? 'border-profit focus:border-profit focus:ring-profit/20'
      : '';

    const iconPadding = leftIcon ? 'ps-4 pe-11' : rightIcon || isPassword ? 'ps-11 pe-4' : '';

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
        {label && (
          <label
            className={`
              block font-medium text-graphite
              ${labelSizeStyles[size]}
            `}
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            disabled={disabled}
            className={`
              ${baseInputStyles}
              ${variantStyles[variant]}
              ${sizeStyles[size]}
              ${stateStyles}
              ${iconPadding}
              ${className}
            `}
            aria-invalid={hasError}
            aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
            {...props}
          />

          {(rightIcon || isPassword || hasError || hasSuccess) && (
            <div className="absolute end-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {hasError && <AlertCircle className="text-loss" size={18} />}
              {hasSuccess && <CheckCircle className="text-profit" size={18} />}
              {isPassword && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-graphite transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              )}
              {rightIcon && !isPassword && !hasError && !hasSuccess && (
                <span className="text-slate-400">{rightIcon}</span>
              )}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <p
            id={error ? `${props.id}-error` : `${props.id}-helper`}
            className={`
              mt-1.5 text-sm
              ${hasError ? 'text-loss' : 'text-pewter'}
            `}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// ═══════════════════════════════════════════════════════════════
// TEXTAREA COMPONENT
// ═══════════════════════════════════════════════════════════════

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      variant = 'default',
      size = 'md',
      label,
      helperText,
      error,
      success,
      fullWidth = true,
      containerClassName = '',
      className = '',
      autoResize = false,
      disabled,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;
    const hasSuccess = success && !hasError;

    const baseStyles = `
      w-full
      rounded-md
      outline-none
      transition-all duration-200
      font-[family-name:var(--font-body)]
      placeholder:text-slate-400
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100
      resize-none
    `;

    const stateStyles = hasError
      ? 'border-loss focus:border-loss focus:ring-loss/20'
      : hasSuccess
      ? 'border-profit focus:border-profit focus:ring-profit/20'
      : '';

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${containerClassName}`}>
        {label && (
          <label
            className={`
              block font-medium text-graphite
              ${labelSizeStyles[size]}
            `}
          >
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          disabled={disabled}
          rows={rows}
          className={`
            ${baseStyles}
            ${variantStyles[variant]}
            ${sizeStyles[size]}
            ${stateStyles}
            ${autoResize ? 'overflow-hidden' : ''}
            ${className}
          `}
          aria-invalid={hasError}
          aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
          {...props}
        />

        {(error || helperText) && (
          <p
            id={error ? `${props.id}-error` : `${props.id}-helper`}
            className={`
              mt-1.5 text-sm
              ${hasError ? 'text-loss' : 'text-pewter'}
            `}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// ═══════════════════════════════════════════════════════════════
// SEARCH INPUT
// ═══════════════════════════════════════════════════════════════

import { Search, X } from 'lucide-react';

export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rightIcon' | 'type'> {
  /** Clear button handler */
  onClear?: () => void;
  /** Show clear button */
  showClear?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, showClear = true, value, ...props }, ref) => {
    const hasValue = value && String(value).length > 0;

    return (
      <Input
        ref={ref}
        type="search"
        value={value}
        leftIcon={<Search size={18} />}
        rightIcon={
          showClear && hasValue && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-slate-400 hover:text-graphite transition-colors"
              aria-label="مسح البحث"
            >
              <X size={18} />
            </button>
          ) : undefined
        }
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

export default Input;
