/**
 * RichTextEditor - TipTap-based Rich Text Editor
 *
 * Full-featured editor with RTL support for Arabic content.
 * Toolbar matches the existing admin article editor styling.
 * Includes custom block extensions: PullQuote, Figure, Sidebar, Callout, OrnamentalDivider.
 * Table support, character count, color, highlight, text focus.
 *
 * OUTPUT: TipTap JSON (editor.getJSON()) — NOT HTML.
 * Backward-compatible: string defaultValue loaded via setContent().
 */

'use client';

import { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Focus from '@tiptap/extension-focus';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link2,
  Quote,
  Code,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Unlink,
  Table as TableIcon,
  Minus,
  MessageSquareQuote,
  Type,
  Languages,
} from 'lucide-react';
import { iconSizes } from '@/lib/design-tokens';
import { PullQuoteExtension } from './tiptap/PullQuoteExtension';
import { FigureExtension } from './tiptap/FigureExtension';
import { SidebarExtension } from './tiptap/SidebarExtension';
import { CalloutExtension } from './tiptap/CalloutExtension';
import { DividerExtension } from './tiptap/DividerExtension';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface RichTextEditorProps {
  /** TipTap JSON content (preferred) or legacy HTML string */
  value?: JSONContent | string;
  /** Called when content changes — receives TipTap JSON */
  onChange?: (json: JSONContent) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Text direction */
  dir?: 'rtl' | 'ltr';
  /** Minimum height in pixels */
  minHeight?: number;
  /** Whether to show toolbar */
  showToolbar?: boolean;
  /** Called when the image button is clicked (opens media picker) */
  onImageInsert?: () => void;
  /** Additional className for the editor wrapper */
  className?: string;
  /**
   * @deprecated Pass JSONContent to value instead.
   * Legacy prop alias for string HTML value.
   */
  defaultValue?: JSONContent | string;
}

// ═══════════════════════════════════════════════════════════════
// LINK INPUT MODAL
// ═══════════════════════════════════════════════════════════════

function LinkInput({
  onSubmit,
  onCancel,
  initialUrl,
}: {
  onSubmit: (url: string) => void;
  onCancel: () => void;
  initialUrl?: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? '');

  return (
    <div className="flex items-center gap-2 p-2 bg-obsidian/80 border border-gold/20 rounded-lg absolute top-full mt-1 right-0 z-10 min-w-[320px]">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com"
        className="flex-1 bg-white/5 border border-gold/10 rounded-lg py-1.5 px-3 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/30"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (url) onSubmit(url);
          }
          if (e.key === 'Escape') onCancel();
        }}
      />
      <button
        onClick={() => { if (url) onSubmit(url); }}
        className="px-3 py-1.5 bg-gold text-obsidian rounded-lg text-sm font-semibold hover:bg-gold/90 transition-colors"
      >
        OK
      </button>
      {initialUrl && (
        <button
          onClick={() => onSubmit('')}
          className="p-1.5 text-loss hover:bg-loss/10 rounded-lg transition-colors"
          title="Remove link"
        >
          <Unlink size={14} />
        </button>
      )}
      <button
        onClick={onCancel}
        className="px-2 py-1.5 text-white/50 hover:text-white text-sm transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TOOLBAR BUTTON
// ═══════════════════════════════════════════════════════════════

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active = false,
  title,
}: {
  icon: React.ElementType;
  label?: string;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${
        active
          ? 'text-gold bg-gold/10'
          : 'text-white/50 hover:text-white hover:bg-white/10'
      }`}
    >
      <Icon size={iconSizes.md} />
      {label && <span className="text-xs">{label}</span>}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function RichTextEditor({
  value,
  onChange,
  placeholder = '',
  dir = 'rtl',
  minHeight = 400,
  showToolbar = true,
  onImageInsert,
  className = '',
  defaultValue,
}: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);

  // Resolve initial content — accept JSON or legacy HTML string
  const resolvedValue = value ?? defaultValue ?? '';

  const editor = useEditor({
    extensions: [
      // ── Core ──────────────────────────────────────────────
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        blockquote: {},
        codeBlock: {},
        bulletList: {},
        orderedList: {},
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: dir === 'rtl' ? 'right' : 'left',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-gold underline hover:text-gold/80',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      // Keep TipTap Image for simple inline images (media picker)
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-w-full mx-auto my-4',
        },
      }),
      Placeholder.configure({ placeholder }),

      // ── Custom Blocks ─────────────────────────────────────
      PullQuoteExtension,
      FigureExtension,
      SidebarExtension,
      CalloutExtension,
      DividerExtension,

      // ── Table ─────────────────────────────────────────────
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,

      // ── Typography / Color ────────────────────────────────
      TextStyle, // Required for Color extension
      Color.configure({ types: ['textStyle'] }),
      Highlight.configure({ multicolor: true }),

      // ── UX ───────────────────────────────────────────────
      CharacterCount,
      Focus.configure({ className: 'has-focus', mode: 'all' }),
    ],
    // Accept both JSON and HTML string as initial content
    content: typeof resolvedValue === 'string' ? resolvedValue : resolvedValue,
    editorProps: {
      attributes: {
        class: `prose prose-invert max-w-none focus:outline-none font-[family-name:var(--font-body)] text-lg leading-relaxed text-white`,
        dir,
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Output TipTap JSON (not HTML)
      onChange?.(ed.getJSON());
    },
  });

  // ── Toolbar Actions ────────────────────────────────────────

  const handleAction = useCallback(
    (action: string) => {
      if (!editor) return;

      switch (action) {
        case 'bold':
          editor.chain().focus().toggleBold().run();
          break;
        case 'italic':
          editor.chain().focus().toggleItalic().run();
          break;
        case 'underline':
          editor.chain().focus().toggleUnderline().run();
          break;
        case 'heading1':
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case 'heading2':
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case 'bulletList':
          editor.chain().focus().toggleBulletList().run();
          break;
        case 'orderedList':
          editor.chain().focus().toggleOrderedList().run();
          break;
        case 'alignRight':
          editor.chain().focus().setTextAlign('right').run();
          break;
        case 'alignCenter':
          editor.chain().focus().setTextAlign('center').run();
          break;
        case 'alignLeft':
          editor.chain().focus().setTextAlign('left').run();
          break;
        case 'link':
          setShowLinkInput(true);
          break;
        case 'blockquote':
          editor.chain().focus().toggleBlockquote().run();
          break;
        case 'codeBlock':
          editor.chain().focus().toggleCodeBlock().run();
          break;
        case 'image':
          if (onImageInsert) {
            onImageInsert();
          } else {
            const url = window.prompt('Image URL:');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }
          break;
        case 'table':
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
          break;
        case 'pullQuote':
          editor.chain().focus().insertPullQuote().run();
          break;
        case 'divider':
          editor.chain().focus().insertOrnamentalDivider().run();
          break;
        case 'rtlToggle': {
          // Toggle paragraph direction between RTL and LTR
          const currentDir = editor.getAttributes('paragraph').dir ?? 'rtl';
          editor
            .chain()
            .focus()
            .updateAttributes('paragraph', { dir: currentDir === 'rtl' ? 'ltr' : 'rtl' })
            .run();
          break;
        }
      }
    },
    [editor, onImageInsert]
  );

  const isActive = useCallback(
    (action: string): boolean => {
      if (!editor) return false;
      switch (action) {
        case 'bold':        return editor.isActive('bold');
        case 'italic':      return editor.isActive('italic');
        case 'underline':   return editor.isActive('underline');
        case 'heading1':    return editor.isActive('heading', { level: 1 });
        case 'heading2':    return editor.isActive('heading', { level: 2 });
        case 'bulletList':  return editor.isActive('bulletList');
        case 'orderedList': return editor.isActive('orderedList');
        case 'alignRight':  return editor.isActive({ textAlign: 'right' });
        case 'alignCenter': return editor.isActive({ textAlign: 'center' });
        case 'alignLeft':   return editor.isActive({ textAlign: 'left' });
        case 'link':        return editor.isActive('link');
        case 'blockquote':  return editor.isActive('blockquote');
        case 'codeBlock':   return editor.isActive('codeBlock');
        case 'pullQuote':   return editor.isActive('pullQuote');
        default:            return false;
      }
    },
    [editor]
  );

  const handleLinkSubmit = useCallback(
    (url: string) => {
      if (!editor) return;
      if (url === '') {
        editor.chain().focus().unsetLink().run();
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
      }
      setShowLinkInput(false);
    },
    [editor]
  );

  /**
   * Insert an image (via TipTap Image extension — simple inline image).
   * For rich figure with caption/credit, use FigureExtension.insertFigure().
   */
  const insertImage = useCallback(
    (url: string, alt?: string) => {
      if (!editor) return;
      editor.chain().focus().setImage({ src: url, alt: alt ?? '' }).run();
    },
    [editor]
  );

  // Expose insertImage on the component for parent access
  (RichTextEditor as any).__insertImage = insertImage;

  if (!editor) return null;

  const charCount = editor.storage.characterCount?.characters?.() ?? 0;

  return (
    <div className={`bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden ${className}`}>
      {/* ── Toolbar ─────────────────────────────────────────── */}
      {showToolbar && (
        <div className="relative flex flex-wrap items-center gap-1 p-3 border-b border-gold/10 bg-white/5">
          {/* Formatting */}
          <ToolbarButton icon={Bold}           onClick={() => handleAction('bold')}         active={isActive('bold')}         title="Bold" />
          <ToolbarButton icon={Italic}         onClick={() => handleAction('italic')}       active={isActive('italic')}       title="Italic" />
          <ToolbarButton icon={UnderlineIcon}  onClick={() => handleAction('underline')}    active={isActive('underline')}    title="Underline" />

          <div className="w-px h-6 bg-gold/10 mx-1" />

          {/* Headings */}
          <ToolbarButton icon={Heading1} onClick={() => handleAction('heading1')} active={isActive('heading1')} title="Heading 1" />
          <ToolbarButton icon={Heading2} onClick={() => handleAction('heading2')} active={isActive('heading2')} title="Heading 2" />

          <div className="w-px h-6 bg-gold/10 mx-1" />

          {/* Lists */}
          <ToolbarButton icon={List}         onClick={() => handleAction('bulletList')}  active={isActive('bulletList')}  title="Bullet List" />
          <ToolbarButton icon={ListOrdered}  onClick={() => handleAction('orderedList')} active={isActive('orderedList')} title="Ordered List" />

          <div className="w-px h-6 bg-gold/10 mx-1" />

          {/* Alignment */}
          <ToolbarButton icon={AlignRight}  onClick={() => handleAction('alignRight')}  active={isActive('alignRight')}  title="Align Right (RTL)" />
          <ToolbarButton icon={AlignCenter} onClick={() => handleAction('alignCenter')} active={isActive('alignCenter')} title="Align Center" />
          <ToolbarButton icon={AlignLeft}   onClick={() => handleAction('alignLeft')}   active={isActive('alignLeft')}   title="Align Left (LTR)" />

          <div className="w-px h-6 bg-gold/10 mx-1" />

          {/* Link / Quote / Code / Image */}
          <ToolbarButton icon={Link2}     onClick={() => handleAction('link')}       active={isActive('link')}       title="Link" />
          <ToolbarButton icon={Quote}     onClick={() => handleAction('blockquote')} active={isActive('blockquote')} title="Blockquote" />
          <ToolbarButton icon={Code}      onClick={() => handleAction('codeBlock')}  active={isActive('codeBlock')}  title="Code Block" />
          <ToolbarButton icon={ImageIcon} onClick={() => handleAction('image')}      title="Insert Image" />

          <div className="w-px h-6 bg-gold/10 mx-1" />

          {/* Table */}
          <ToolbarButton
            icon={TableIcon}
            onClick={() => handleAction('table')}
            title="إدراج جدول 3×3"
            label="جدول"
          />

          <div className="w-px h-6 bg-gold/10 mx-1" />

          {/* Custom blocks */}
          <ToolbarButton
            icon={MessageSquareQuote}
            onClick={() => handleAction('pullQuote')}
            active={isActive('pullQuote')}
            title="إدراج اقتباس بارز"
            label="اقتباس"
          />

          <ToolbarButton
            icon={Minus}
            onClick={() => handleAction('divider')}
            title="إدراج فاصل زخرفي"
            label="فاصل"
          />

          {/* RTL / LTR toggle */}
          <ToolbarButton
            icon={Languages}
            onClick={() => handleAction('rtlToggle')}
            title="تبديل اتجاه الفقرة (RTL / LTR)"
            label={dir === 'rtl' ? 'RTL' : 'LTR'}
          />

          {/* Link Input Popover */}
          {showLinkInput && (
            <LinkInput
              initialUrl={editor.getAttributes('link').href}
              onSubmit={handleLinkSubmit}
              onCancel={() => setShowLinkInput(false)}
            />
          )}
        </div>
      )}

      {/* ── Editor Content ───────────────────────────────────── */}
      <div className="p-6" dir={dir}>
        <EditorContent editor={editor} />
      </div>

      {/* ── Character Count ──────────────────────────────────── */}
      <div className="flex justify-end px-6 pb-3">
        <span className="text-xs text-white/30 font-[family-name:var(--font-display)] tabular-nums">
          {charCount.toLocaleString('ar')} حرف
        </span>
      </div>

      {/* ── TipTap Prose Styles ──────────────────────────────── */}
      <style jsx global>{`
        .tiptap {
          outline: none;
        }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: ${dir === 'rtl' ? 'right' : 'left'};
          color: rgba(255, 255, 255, 0.3);
          pointer-events: none;
          height: 0;
        }
        .tiptap h1 {
          font-size: 2rem;
          font-weight: 700;
          font-family: var(--font-display);
          margin: 1.5rem 0 0.75rem;
          color: white;
          line-height: 1.2;
        }
        .tiptap h2 {
          font-size: 1.5rem;
          font-weight: 600;
          font-family: var(--font-display);
          margin: 1.25rem 0 0.625rem;
          color: white;
          line-height: 1.3;
        }
        .tiptap h3 {
          font-size: 1.25rem;
          font-weight: 600;
          font-family: var(--font-display);
          margin: 1rem 0 0.5rem;
          color: white;
          line-height: 1.4;
        }
        .tiptap p {
          margin: 0.5rem 0;
          color: rgba(255, 255, 255, 0.9);
        }
        .tiptap ul,
        .tiptap ol {
          padding-${dir === 'rtl' ? 'right' : 'left'}: 1.5rem;
          margin: 0.5rem 0;
        }
        .tiptap ul {
          list-style-type: disc;
        }
        .tiptap ol {
          list-style-type: decimal;
        }
        .tiptap li {
          margin: 0.25rem 0;
          color: rgba(255, 255, 255, 0.9);
        }
        .tiptap blockquote {
          border-${dir === 'rtl' ? 'right' : 'left'}: 3px solid #DDA853;
          padding-${dir === 'rtl' ? 'right' : 'left'}: 1rem;
          margin: 1rem 0;
          color: rgba(255, 255, 255, 0.7);
          font-style: italic;
        }
        .tiptap pre {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(221, 168, 83, 0.1);
          border-radius: 0.75rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
          direction: ltr;
          text-align: left;
        }
        .tiptap code {
          font-family: 'SF Mono', Monaco, Consolas, monospace;
          font-size: 0.875em;
          color: #DDA853;
        }
        .tiptap pre code {
          color: rgba(255, 255, 255, 0.8);
        }
        .tiptap img {
          border-radius: 0.75rem;
          max-width: 100%;
          height: auto;
          margin: 1rem auto;
          display: block;
        }
        .tiptap a {
          color: #DDA853;
          text-decoration: underline;
        }
        .tiptap a:hover {
          color: rgba(221, 168, 83, 0.8);
        }
        .tiptap hr.ornamental {
          border: none;
          text-align: center;
          margin: 2rem auto;
          position: relative;
        }
        .tiptap hr.ornamental::after {
          content: '✦  ✦  ✦';
          color: #DDA853;
          font-size: 0.875rem;
          letter-spacing: 0.5rem;
        }
        .tiptap hr {
          border: none;
          border-top: 1px solid rgba(221, 168, 83, 0.1);
          margin: 1.5rem 0;
        }
        .tiptap strong {
          font-weight: 700;
          color: white;
        }
        .tiptap em {
          font-style: italic;
        }
        .tiptap u {
          text-decoration: underline;
        }
        /* Table styles */
        .tiptap table {
          border-collapse: collapse;
          width: 100%;
          margin: 1.5rem 0;
        }
        .tiptap th {
          background: rgba(221, 168, 83, 0.15);
          border: 1px solid rgba(221, 168, 83, 0.2);
          padding: 0.625rem 0.875rem;
          color: #DDA853;
          font-weight: 700;
          text-align: ${dir === 'rtl' ? 'right' : 'left'};
        }
        .tiptap td {
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.5rem 0.875rem;
          color: rgba(255, 255, 255, 0.85);
        }
        .tiptap tr:nth-child(even) td {
          background: rgba(255, 255, 255, 0.02);
        }
        /* Focus ring for custom blocks */
        .tiptap .has-focus {
          outline: 2px solid rgba(221, 168, 83, 0.4);
          outline-offset: 2px;
          border-radius: 0.5rem;
        }
        /* Highlight marks */
        .tiptap mark {
          background: rgba(221, 168, 83, 0.3);
          color: inherit;
          border-radius: 2px;
          padding: 0 2px;
        }
      `}</style>
    </div>
  );
}

// Re-export for convenience
export { RichTextEditor };
