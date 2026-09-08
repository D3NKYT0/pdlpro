import { useEffect, type ReactNode } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Link2,
  Undo2,
  Redo2,
} from 'lucide-react'
import { isRichTextEmpty, sanitizeRichText } from '../../lib/rich-text'
import './rich-text.css'

export interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  'aria-label'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  'aria-describedby'?: string
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`rich-text-tool${active ? ' is-active' : ''}`}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

/** Editor TipTap controlado; persiste HTML sanitizável nos mesmos campos de texto. */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escreva o conteúdo…',
  disabled,
  required,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
          defaultProtocol: 'https',
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
    editorProps: {
      attributes: {
        class: 'rich-text-prose',
        role: 'textbox',
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        ...(ariaInvalid != null ? { 'aria-invalid': String(ariaInvalid) } : {}),
        ...(ariaDescribedBy ? { 'aria-describedby': ariaDescribedBy } : {}),
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!disabled)
  }, [disabled, editor])

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    const incoming = value || ''
    if (isRichTextEmpty(current) && isRichTextEmpty(incoming)) return
    if (current === incoming) return
    editor.commands.setContent(incoming, { emitUpdate: false })
  }, [value, editor])

  function setLink() {
    if (!editor) return
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL do link', previous || 'https://')
    if (url === null) return
    const trimmed = url.trim()
    if (!trimmed) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run()
  }

  const empty = isRichTextEmpty(value)

  return (
    <div
      data-theme-part="rich-text-editor"
      className={`rich-text-editor${disabled ? ' is-disabled' : ''}`}
    >
      <div className="rich-text-toolbar" role="toolbar" aria-label="Formatação">
        <ToolbarButton label="Negrito" active={editor?.isActive('bold')} disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleBold().run()}>
          <Bold size={15} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Itálico" active={editor?.isActive('italic')} disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleItalic().run()}>
          <Italic size={15} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Sublinhado" active={editor?.isActive('underline')} disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={15} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Tachado" active={editor?.isActive('strike')} disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleStrike().run()}>
          <Strikethrough size={15} aria-hidden="true" />
        </ToolbarButton>
        <span className="rich-text-toolbar-sep" aria-hidden="true" />
        <ToolbarButton label="Lista" active={editor?.isActive('bulletList')} disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
          <List size={15} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Lista numerada" active={editor?.isActive('orderedList')} disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={15} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor?.isActive('link')} disabled={!editor || disabled} onClick={setLink}>
          <Link2 size={15} aria-hidden="true" />
        </ToolbarButton>
        <span className="rich-text-toolbar-sep" aria-hidden="true" />
        <ToolbarButton label="Desfazer" disabled={!editor || disabled || !editor.can().undo()} onClick={() => editor?.chain().focus().undo().run()}>
          <Undo2 size={15} aria-hidden="true" />
        </ToolbarButton>
        <ToolbarButton label="Refazer" disabled={!editor || disabled || !editor.can().redo()} onClick={() => editor?.chain().focus().redo().run()}>
          <Redo2 size={15} aria-hidden="true" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      {required ? (
        <input
          className="rich-text-required"
          tabIndex={-1}
          aria-hidden="true"
          value={empty ? '' : '1'}
          required
          onChange={() => undefined}
        />
      ) : null}
    </div>
  )
}

export interface RichTextContentProps {
  html: string
  className?: string
}

/** Renderiza HTML sanitizado para leitura pública. */
export function RichTextContent({ html, className = '' }: RichTextContentProps) {
  const safe = sanitizeRichText(html)
  if (!safe) return null
  return (
    <div
      data-theme-part="rich-text-content"
      className={`rich-text-content ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
