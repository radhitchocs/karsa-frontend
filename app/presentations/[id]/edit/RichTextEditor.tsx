'use client';

import { useLayoutEffect, useRef } from 'react';
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react';
import { Placeholder } from '@tiptap/extensions';
import { BoldIcon, ItalicIcon, ListIcon, ListOrderedIcon, UnderlineIcon } from 'lucide-react';
import type { RichNode } from '@/domain/model';
import {
  bodyExtensions,
  plainToDoc,
  richTextClass,
  sanitizeDoc,
  titleExtensions,
} from '@/features/shared/rich-text';

const placeholderClass =
  "[&_p.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_p.is-editor-empty:first-child]:before:float-left [&_p.is-editor-empty:first-child]:before:h-0 [&_p.is-editor-empty:first-child]:before:pointer-events-none [&_p.is-editor-empty:first-child]:before:text-foreground/50";

/** One line per paragraph (list items included), for the plain `title`/`body` mirror. */
function plainText(editor: Editor): string {
  const lines: string[] = [];
  editor.state.doc.descendants((node) => {
    if (!node.isTextblock) return true;
    lines.push(node.textContent);
    return false;
  });
  return lines.join('\n');
}

/**
 * Tiptap field for a materi title or body. Uncontrolled: content is seeded once
 * on mount (the parent remounts per slide), then every edit reports both the
 * rich doc and its plain-text mirror.
 */
export function RichTextField({
  kind,
  doc,
  text,
  placeholder,
  className = '',
  testId,
  onChange,
  onFocus,
  onBlur,
}: {
  kind: 'title' | 'body';
  doc?: RichNode;
  text: string;
  placeholder: string;
  className?: string;
  testId?: string;
  onChange: (doc: RichNode, text: string) => void;
  onFocus?: (editor: Editor) => void;
  onBlur?: (editor: Editor) => void;
}) {
  // Keep handlers fresh: the slide's index (baked into onChange) can change on reorder.
  const handlers = useRef({ onChange, onFocus, onBlur });
  useLayoutEffect(() => {
    handlers.current = { onChange, onFocus, onBlur };
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      ...(kind === 'title' ? titleExtensions : bodyExtensions),
      Placeholder.configure({ placeholder }),
    ],
    content: doc ? sanitizeDoc(doc, kind) : plainToDoc(text, kind),
    editorProps: {
      attributes: {
        class: `outline-none ${richTextClass} ${placeholderClass} ${className}`,
        'aria-label': placeholder,
      },
    },
    onUpdate: ({ editor }) => handlers.current.onChange(editor.getJSON() as RichNode, plainText(editor)),
    onFocus: ({ editor }) => handlers.current.onFocus?.(editor),
    onBlur: ({ editor }) => handlers.current.onBlur?.(editor),
  });

  return <EditorContent editor={editor} data-testid={testId} />;
}

/** Formatting buttons for whichever field was focused last. Lists only apply to the body. */
export function RichTextToolbar({ editor }: { editor: Editor | null }) {
  // useEditorState only recomputes on the watched editor's transactions, so a
  // focus switch would leave stale state; remount per editor instead.
  return <ToolbarButtons key={editor?.instanceId ?? 'none'} editor={editor} />;
}

function ToolbarButtons({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            // Schema without bold (title): show bold as permanently on.
            boldFixed: !e.schema.marks.bold,
            bold: !e.schema.marks.bold || e.isActive('bold'),
            italic: e.isActive('italic'),
            underline: e.isActive('underline'),
            bulletList: e.isActive('bulletList'),
            orderedList: e.isActive('orderedList'),
            lists: !!e.schema.nodes.bulletList,
          }
        : null,
  });

  const buttons = [
    { key: 'bold', label: 'Tebal', icon: BoldIcon, run: (e: Editor) => e.chain().focus().toggleBold().run() },
    { key: 'italic', label: 'Miring', icon: ItalicIcon, run: (e: Editor) => e.chain().focus().toggleItalic().run() },
    { key: 'underline', label: 'Garis bawah', icon: UnderlineIcon, run: (e: Editor) => e.chain().focus().toggleUnderline().run() },
    { key: 'bulletList', label: 'Daftar poin', icon: ListIcon, run: (e: Editor) => e.chain().focus().toggleBulletList().run(), list: true },
    { key: 'orderedList', label: 'Daftar bernomor', icon: ListOrderedIcon, run: (e: Editor) => e.chain().focus().toggleOrderedList().run(), list: true },
  ] as const;

  return (
    <div role="toolbar" aria-label="Format teks" className="flex items-center gap-1" data-testid="rich-toolbar">
      {buttons.map(({ key, label, icon: Icon, run, ...rest }) => {
        const disabled =
          !editor || !state || ('list' in rest && !state.lists) || (key === 'bold' && state.boldFixed);
        const active = !!state?.[key];
        return (
          <button
            key={key}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={active}
            disabled={disabled}
            // Keep focus (and selection) in the editor while clicking.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor && run(editor)}
            className={`inline-flex size-8 items-center justify-center rounded-base border-2 cursor-pointer disabled:cursor-not-allowed ${active
              ? 'border-foreground bg-foreground text-background'
              : 'border-border bg-secondary-background hover:bg-gray-100 disabled:opacity-40'
              }`}
            data-testid={`rich-${key}`}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
