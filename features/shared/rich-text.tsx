import { Node, type Extensions, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { renderToReactElement } from '@tiptap/static-renderer/pm/react';
import type { RichNode } from '@/domain/model';

/** Formatting shared by title and body: bold, italic, underline. Lists are body-only. */
const baseKit = {
  heading: false,
  blockquote: false,
  code: false,
  codeBlock: false,
  horizontalRule: false,
  strike: false,
  link: false,
  dropcursor: false,
  gapcursor: false,
  trailingNode: false,
} as const;

/** Title doc holds exactly one paragraph, so Enter can't add lines. */
const TitleDocument = Node.create({ name: 'doc', topNode: true, content: 'paragraph' });

export const titleExtensions: Extensions = [
  TitleDocument,
  StarterKit.configure({
    ...baseKit,
    document: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    hardBreak: false,
  }),
];

export const bodyExtensions: Extensions = [StarterKit.configure(baseKit)];

/**
 * Typography for rich content, shared by the editor and every renderer so the
 * canvas matches what projects. Tailwind preflight strips list styles, so restore them.
 */
export const richTextClass =
  '[&_p]:min-h-[1lh] [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-[1.5em] [&_ol]:pl-[1.5em] [&_li>p]:min-h-0';

/** Plain text → doc, one paragraph per line. Used to seed the editor from legacy slides. */
export function plainToDoc(text: string, kind: 'title' | 'body'): JSONContent {
  const lines = kind === 'title' ? [text.replace(/\n/g, ' ')] : text.split('\n');
  return {
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      ...(line ? { content: [{ type: 'text', text: line }] } : {}),
    })),
  };
}

/** Title renders inside an <h2>, so drop the paragraph wrapper (p inside h2 is invalid). */
const titleOptions = {
  nodeMapping: {
    paragraph: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  },
};

/**
 * Read-only render of a rich doc as React elements (no innerHTML). Falls back
 * to the plain string for slides saved before rich text existed.
 */
export function RichText({
  doc,
  fallback,
  kind,
}: {
  doc?: RichNode;
  fallback: string;
  kind: 'title' | 'body';
}) {
  let rendered: React.ReactNode = null;
  if (doc) {
    try {
      rendered = renderToReactElement({
        content: doc as JSONContent,
        extensions: kind === 'title' ? titleExtensions : bodyExtensions,
        ...(kind === 'title' ? { options: titleOptions } : {}),
      });
    } catch {
      // Malformed doc: fall through to plain text.
    }
  }
  if (rendered) return <>{rendered}</>;
  return kind === 'title' ? <>{fallback}</> : <p>{fallback}</p>;
}
