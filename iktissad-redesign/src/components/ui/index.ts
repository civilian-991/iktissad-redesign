/**
 * IKTISSAD UI Component Library
 *
 * A comprehensive set of reusable UI components built with the IKTISSAD Design System.
 *
 * Usage:
 * import { Button, Input, Card, Badge, Modal } from '@/components/ui';
 */

// Button Components
export {
  Button,
  IconButton,
  ButtonGroup,
  type ButtonProps,
  type IconButtonProps,
  type ButtonGroupProps,
  type ButtonVariant,
  type ButtonSize,
} from './Button';

// Input Components
export {
  Input,
  Textarea,
  SearchInput,
  type InputProps,
  type TextareaProps,
  type SearchInputProps,
  type InputVariant,
  type InputSize,
} from './Input';

// Badge Components
export {
  Badge,
  StatusBadge,
  RoleBadge,
  CategoryBadge,
  BadgeGroup,
  type BadgeProps,
  type StatusBadgeProps,
  type RoleBadgeProps,
  type CategoryBadgeProps,
  type BadgeGroupProps,
  type BadgeVariant,
  type BadgeSize,
  type StatusType,
  type RoleType,
} from './Badge';

// Card Components
export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  ArticleCard,
  StatCard,
  type CardProps,
  type CardHeaderProps,
  type CardContentProps,
  type CardFooterProps,
  type ArticleCardProps,
  type StatCardProps,
  type CardVariant,
  type CardSize,
} from './Card';

// Modal Components
export {
  Modal,
  ConfirmModal,
  Sheet,
  type ModalProps,
  type ConfirmModalProps,
  type SheetProps,
  type ModalSize,
  type ConfirmVariant,
  type SheetPosition,
} from './Modal';

// Re-export design tokens for convenience
export {
  colors,
  typography,
  spacing,
  shadows,
  borders,
  animations,
  breakpoints,
  config,
  zIndex,
  iconSizes,
  withOpacity,
} from '@/lib/design-tokens';

// Re-export i18n utilities
export {
  useTranslation,
  t,
  TranslationProvider,
  type Locale,
} from '@/lib/i18n';
