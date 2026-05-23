/**
 * LiteMarkdown - 轻量级 Markdown 渲染器
 * 支持：标题、粗体、斜体、行内代码、代码块、列表、分隔线、Mermaid
 * 不依赖外部库，适合讨论消息的实时渲染
 *
 * Performance: wrapped in React.memo and parseBlocks is memoized so the
 * (potentially long) markdown string is only re-parsed when it actually
 * changes. Historical messages no longer re-parse on every streaming
 * token update of a *different* message.
 */
import { memo, useMemo } from 'react'
import { CodeBlock } from './CodeBlock'

interface Props {
  content: string
}

export const LiteMarkdown = memo(function LiteMarkdown({ content }: Props) {
  const blocks = useMemo(() => parseBlocks(content), [content])

  return (
    <div className="text-sm text-gray-300 leading-relaxed space-y-2">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  )
})

// ============ Types ============

type BlockType =
  | { type: 'paragraph'; content: string }
  | { type: 'heading'; level: number; content: string }
  | { type: 'code'; lang: string; content: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'hr' }

// ============ Block Parser ============

function parseBlocks(text: string): BlockType[] {
  const lines = text.split('\n')
  const blocks: BlockType[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Empty line - skip
    if (trimmed === '') {
      i++
      continue
    }

    // Orphan backticks (1-2 backticks on their own line, not a code fence) — skip
    if (/^`{1,2}$/.test(trimmed)) {
      i++
      continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // Code block (``` with optional language)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      // Only emit if there's actual content (skip empty code blocks)
      const code = codeLines.join('\n')
      if (code.trim()) {
        blocks.push({ type: 'code', lang, content: code })
      }
      if (i < lines.length) i++ // skip closing ```
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/)
    if (headingMatch) {
      blocks.push({ type: 'heading', level: headingMatch[1].length, content: headingMatch[2] })
      i++
      continue
    }

    // Unordered list
    if (/^[\s]*[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[\s]*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*[-*+]\s+/, ''))
        i++
      }
      blocks.push({ type: 'list', ordered: false, items })
      continue
    }

    // Ordered list
    if (/^[\s]*\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[\s]*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\s]*\d+[.)]\s+/, ''))
        i++
      }
      blocks.push({ type: 'list', ordered: true, items })
      continue
    }

    // Paragraph (collect consecutive non-special lines)
    const paraLines: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^`{1,2}$/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].match(/^#{1,4}\s+/) &&
      !/^[\s]*[-*+]\s+/.test(lines[i]) &&
      !/^[\s]*\d+[.)]\s+/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i])
      i++
    }
    if (paraLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paraLines.join('\n') })
    }
  }

  return blocks
}

// ============ Block Renderer ============

function Block({ block }: { block: BlockType }) {
  switch (block.type) {
    case 'hr':
      return <hr className="border-white/10 my-3" />

    case 'heading':
      const Tag = `h${block.level}` as keyof JSX.IntrinsicElements
      const sizes: Record<number, string> = {
        1: 'text-base font-bold text-gray-100',
        2: 'text-sm font-bold text-gray-200',
        3: 'text-sm font-semibold text-gray-200',
        4: 'text-sm font-medium text-gray-300',
      }
      return <Tag className={sizes[block.level] || sizes[4]}><InlineContent text={block.content} /></Tag>

    case 'code':
      return <CodeBlock code={block.content} lang={block.lang} />

    case 'list':
      const ListTag = block.ordered ? 'ol' : 'ul'
      return (
        <ListTag className={`space-y-1 pl-4 ${block.ordered ? 'list-decimal' : 'list-disc'} marker:text-gray-600`}>
          {block.items.map((item, i) => (
            <li key={i} className="text-sm text-gray-300">
              <InlineContent text={item} />
            </li>
          ))}
        </ListTag>
      )

    case 'paragraph':
      return (
        <p className="text-sm text-gray-300 leading-relaxed">
          <InlineContent text={block.content} />
        </p>
      )
  }
}

// ============ Inline Parser & Renderer ============

function InlineContent({ text }: { text: string }) {
  const parts = parseInline(text)
  return (
    <>
      {parts.map((part, i) => {
        switch (part.type) {
          case 'text':
            return <span key={i}>{part.content}</span>
          case 'bold':
            return <strong key={i} className="font-semibold text-gray-200">{part.content}</strong>
          case 'italic':
            return <em key={i} className="italic text-gray-400">{part.content}</em>
          case 'code':
            return <code key={i} className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 text-xs font-mono">{part.content}</code>
          case 'bolditalic':
            return <strong key={i} className="font-semibold italic text-gray-200">{part.content}</strong>
        }
      })}
    </>
  )
}

type InlinePart = { type: 'text' | 'bold' | 'italic' | 'code' | 'bolditalic'; content: string }

function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = []
  // Regex to match inline elements: code, bold+italic, bold, italic
  const regex = /(`[^`]+`|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }

    const token = match[0]
    if (token.startsWith('`')) {
      parts.push({ type: 'code', content: token.slice(1, -1) })
    } else if (token.startsWith('***')) {
      parts.push({ type: 'bolditalic', content: token.slice(3, -3) })
    } else if (token.startsWith('**')) {
      parts.push({ type: 'bold', content: token.slice(2, -2) })
    } else if (token.startsWith('*')) {
      parts.push({ type: 'italic', content: token.slice(1, -1) })
    }

    lastIndex = match.index + token.length
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text }]
}
