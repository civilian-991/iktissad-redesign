/**
 * RichTextEditor - TipTap-based Rich Text Editor
 *
 * Full-featured editor with RTL support for Arabic content.
 * Toolbar matches the existing admin article editor styling.
 * Uses TipTap extensions for formatting, alignment, images, links.
 */

'use client';

import { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
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
} from 'lucide-react';
import { iconSizes } from '@/lib/design-tokens';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface RichTextEditorProps {
  /** HTML content value */
  value?: string;
  /** Called when content changes, receives HTML string */
  onChange?: (html: string) => void;
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
}

interface ToolbarButtonConfig {
  icon?: typeof Bold;
  label: string;
  action: string;
  divider?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// TOOLBAR CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const toolbarButtons: ToolbarButtonConfig[] = [
  { icon: Bold, label: 'Bold', action: 'bold' },
  { icon: Italic, label: 'Italic', action: 'italic' },
  { icon: UnderlineIcon, label: 'Underline', action: 'underline' },
  { label: '', action: '', divider: true },
  { icon: Heading1, label: 'Heading 1', action: 'heading1' },
  { icon: Heading2, label: 'Heading 2', action: 'heading2' },
  { label: '', action: '', divider: true },
  { icon: List, label: 'Bullet List', action: 'bulletList' },
  { icon: ListOrdered, label: 'Ordered List', action: 'orderedList' },
  { label: '', action: '', divider: true },
  { icon: AlignRight, label: 'Align Right', action: 'alignRight' },
  { icon: AlignCenter, label: 'Align Center', action: 'alignCenter' },
  { icon: AlignLeft, label: 'Align Left', action: 'alignLeft' },
  { label: '', action: '', divider: true },
  { icon: Link2, label: 'Link', action: 'link' },
  { icon: Quote, label: 'Blockquote', action: 'blockquote' },
  { icon: Code, label: 'Code Block', action: 'codeBlock' },
  { icon: ImageIcon, label: 'Image', action: 'image' },
];

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
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = '',
  dir = 'rtl',
  minHeight = 400,
  showToolbar = true,
  onImageInsert,
  className = '',
}: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);

  const editor = useEditor({
    extensions: [
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
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-xl max-w-full mx-auto my-4',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class: `prose prose-invert max-w-none focus:outline-none font-[family-name:var(--font-body)] text-lg leading-relaxed text-white`,
        dir,
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
  });

  // Execute toolbar actions
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
            // Fallback: prompt for URL
            const url = window.prompt('Image URL:');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }
          break;
      }
    },
    [editor, onImageInsert]
  );

  // Check if a toolbar button is active
  const isActive = useCallback(
    (action: string): boolean => {
      if (!editor) return false;
      switch (action) {
        case 'bold':
          return editor.isActive('bold');
        case 'italic':
          return editor.isActive('italic');
        case 'underline':
          return editor.isActive('underline');
        case 'heading1':
          return editor.isActive('heading', { level: 1 });
        case 'heading2':
          return editor.isActive('heading', { level: 2 });
        case 'bulletList':
          return editor.isActive('bulletList');
        case 'orderedList':
          return editor.isActive('orderedList');
        case 'alignRight':
          return editor.isActive({ textAlign: 'right' });
        case 'alignCenter':
          return editor.isActive({ textAlign: 'center' });
        case 'alignLeft':
          return editor.isActive({ textAlign: 'left' });
        case 'link':
          return editor.isActive('link');
        case 'blockquote':
          return editor.isActive('blockquote');
        case 'codeBlock':
          return editor.isActive('codeBlock');
        default:
          return false;
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
   * Insert an image into the editor at the current cursor position.
   * Called externally via ref or from the MediaPicker.
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

  return (
    <div className={`bg-midnight/50 backdrop-blur-sm border border-gold/10 rounded-xl overflow-hidden ${className}`}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="relative flex flex-wrap items-center gap-1 p-3 border-b border-gold/10 bg-white/5">
          {toolbarButtons.map((btn, index) =>
            btn.divider ? (
              <div key={index} className="w-px h-6 bg-gold/10 mx-1" />
            ) : btn.icon ? (
              <button
                key={index}
                type="button"
                title={btn.label}
                onClick={() => handleAction(btn.action)}
                className={`p-2 rounded-lg transition-colors ${
                  isActive(btn.action)
                    ? 'text-gold bg-gold/10'
                    : 'text-white/50 hover:text-white hover:bg-white/10'
                }`}
              >
                <btn.icon size={iconSizes.md} />
              </button>
            ) : null
          )}

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

      {/* Editor Content */}
      <div className="p-6" dir={dir}>
        <EditorContent editor={editor} />
      </div>

      {/* TipTap Prose Styles */}
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
      `}</style>
    </div>
  );
}

// Re-export for convenience
export { RichTextEditor };
