/**
 * Modal Component
 * IKTISSAD Design System
 *
 * An accessible modal/dialog component with animations.
 *
 * @example
 * <Modal open={isOpen} onClose={handleClose} title="Confirm Action">
 *   <p>Are you sure you want to continue?</p>
 * </Modal>
 */

'use client';

import React, { useEffect, useCallback, ReactNode, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal subtitle/description */
  description?: string;
  /** Modal size */
  size?: ModalSize;
  /** Close on backdrop click */
  closeOnBackdropClick?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Show close button */
  showCloseButton?: boolean;
  /** Custom header content */
  header?: ReactNode;
  /** Custom footer content */
  footer?: ReactNode;
  /** Modal content */
  children: ReactNode;
  /** Additional class names for content area */
  className?: string;
  /** Additional class names for modal container */
  containerClassName?: string;
  /** Center content vertically */
  centered?: boolean;
  /** Disable body scroll when open */
  lockScroll?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]',
};

// ═══════════════════════════════════════════════════════════════
// ANIMATIONS
// ═══════════════════════════════════════════════════════════════

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: {
      duration: 0.15,
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  header,
  footer,
  children,
  className = '',
  containerClassName = '',
  centered = true,
  lockScroll = true,
}: ModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Handle body scroll lock
  useEffect(() => {
    if (open && lockScroll) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [open, lockScroll]);

  // Handle escape key listener
  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open, handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  // Don't render if not in browser
  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <Fragment>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={handleBackdropClick}
          />

          {/* Modal Container */}
          <div
            className={`
              fixed inset-0 z-50 overflow-y-auto
              ${centered ? 'flex items-center justify-center' : 'flex items-start justify-center pt-16'}
              p-4
              ${containerClassName}
            `}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            aria-describedby={description ? 'modal-description' : undefined}
          >
            {/* Modal Content */}
            <motion.div
              className={`
                relative w-full
                ${sizeStyles[size]}
                bg-white rounded-xl shadow-dramatic
                overflow-hidden
              `}
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {(title || header || showCloseButton) && (
                <div className="flex items-start justify-between gap-4 p-5 border-b border-slate-200">
                  {header || (
                    <div>
                      {title && (
                        <h2
                          id="modal-title"
                          className="text-lg font-bold text-slate-900 font-[family-name:var(--font-display)]"
                        >
                          {title}
                        </h2>
                      )}
                      {description && (
                        <p
                          id="modal-description"
                          className="text-sm text-slate-500 mt-1"
                        >
                          {description}
                        </p>
                      )}
                    </div>
                  )}
                  {showCloseButton && (
                    <IconButton
                      icon={<X size={20} />}
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      aria-label="Close modal"
                      className="flex-shrink-0 -mt-1 -ml-1"
                    />
                  )}
                </div>
              )}

              {/* Body */}
              <div className={`p-5 ${className}`}>{children}</div>

              {/* Footer */}
              {footer && (
                <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </Fragment>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════
// CONFIRM MODAL (Convenience Component)
// ═══════════════════════════════════════════════════════════════

import { Button } from './Button';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

export type ConfirmVariant = 'info' | 'warning' | 'danger' | 'success';

export interface ConfirmModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Modal title */
  title: string;
  /** Modal message */
  message: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Variant for styling */
  variant?: ConfirmVariant;
  /** Loading state for confirm button */
  loading?: boolean;
}

const variantConfig: Record<ConfirmVariant, { icon: ReactNode; iconBg: string; buttonVariant: 'primary' | 'danger' | 'success' | 'secondary' }> = {
  info: {
    icon: <Info size={24} />,
    iconBg: 'bg-info-bg text-info',
    buttonVariant: 'primary',
  },
  warning: {
    icon: <AlertTriangle size={24} />,
    iconBg: 'bg-warning-bg text-warning',
    buttonVariant: 'primary',
  },
  danger: {
    icon: <XCircle size={24} />,
    iconBg: 'bg-loss-bg text-loss',
    buttonVariant: 'danger',
  },
  success: {
    icon: <CheckCircle size={24} />,
    iconBg: 'bg-profit-bg text-profit',
    buttonVariant: 'success',
  },
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'warning',
  loading = false,
}: ConfirmModalProps) {
  const config = variantConfig[variant];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      centered
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="text-center">
        <div
          className={`
            w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4
            ${config.iconBg}
          `}
        >
          {config.icon}
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-2 font-[family-name:var(--font-display)]">
          {title}
        </h3>
        <p className="text-slate-600">{message}</p>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHEET (Slide-in panel variant)
// ═══════════════════════════════════════════════════════════════

export type SheetPosition = 'right' | 'left' | 'top' | 'bottom';

export interface SheetProps {
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when sheet should close */
  onClose: () => void;
  /** Sheet position */
  position?: SheetPosition;
  /** Sheet title */
  title?: string;
  /** Show close button */
  showCloseButton?: boolean;
  /** Sheet content */
  children: ReactNode;
  /** Width for left/right sheets */
  width?: string;
  /** Height for top/bottom sheets */
  height?: string;
  className?: string;
}

const sheetAnimationVariants: Record<SheetPosition, { initial: object; animate: object; exit: object }> = {
  right: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
  },
  left: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
  },
  top: {
    initial: { y: '-100%' },
    animate: { y: 0 },
    exit: { y: '-100%' },
  },
  bottom: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  },
};

const sheetPositionStyles: Record<SheetPosition, string> = {
  right: 'inset-y-0 left-0',
  left: 'inset-y-0 right-0',
  top: 'inset-x-0 top-0',
  bottom: 'inset-x-0 bottom-0',
};

export function Sheet({
  open,
  onClose,
  position = 'right',
  title,
  showCloseButton = true,
  children,
  width = '400px',
  height = '50vh',
  className = '',
}: SheetProps) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [open, onClose]);

  if (typeof window === 'undefined') {
    return null;
  }

  const isHorizontal = position === 'left' || position === 'right';

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <Fragment>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className={`
              fixed z-50 bg-white shadow-dramatic
              ${sheetPositionStyles[position]}
              ${className}
            `}
            style={{
              width: isHorizontal ? width : '100%',
              height: isHorizontal ? '100%' : height,
            }}
            initial={sheetAnimationVariants[position].initial}
            animate={sheetAnimationVariants[position].animate}
            exit={sheetAnimationVariants[position].exit}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between p-5 border-b border-slate-200">
                {title && (
                  <h2 className="text-lg font-bold text-slate-900 font-[family-name:var(--font-display)]">
                    {title}
                  </h2>
                )}
                {showCloseButton && (
                  <IconButton
                    icon={<X size={20} />}
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    aria-label="Close"
                  />
                )}
              </div>
            )}

            {/* Content */}
            <div className="p-5 overflow-y-auto h-[calc(100%-5rem)]">
              {children}
            </div>
          </motion.div>
        </Fragment>
      )}
    </AnimatePresence>,
    document.body
  );
}

export default Modal;
