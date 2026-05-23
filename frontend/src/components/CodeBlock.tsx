/**
 * CodeBlock - shared code block renderer used by both LiteMarkdown
 * (streaming agent messages) and ReactMarkdown (final summary view).
 *
 * Features:
 *  - Copy-to-clipboard button on hover
 *  - Mermaid diagram rendering when language is "mermaid"
 *  - Language label header
 */
import { useEffect, useRef, useState } from 'react'
import { Copy, Check, AlertTriangle } from 'lucide-react'
import mermaid from 'mermaid'

interface Props {
  code: string
  lang?: string
}

// Initialize mermaid once for the whole app
let mermaidInitialized = false
function ensureMermaidInit() {
  if (mermaidInitialized) return
  mermaidInitialized = true
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'inherit',
    themeVariables: {
      darkMode: true,
      background: '#0b0e1a',
      primaryColor: '#312e81',
      primaryTextColor: '#e5e7eb',
      primaryBorderColor: '#6366f1',
      lineColor: '#6b7280',
      secondaryColor: '#1f2937',
      tertiaryColor: '#111827',
    },
  })
}

let mermaidIdSeq = 0

export function CodeBlock({ code, lang }: Props) {
  const [copied, setCopied] = useState(false)
  const language = (lang || '').trim().toLowerCase()
  const isMermaid = language === 'mermaid'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API may be unavailable in non-secure contexts
    }
  }

  if (isMermaid) {
    return <MermaidDiagram code={code} onCopy={handleCopy} copied={copied} />
  }

  return (
    <div className="group relative rounded-lg bg-black/30 border border-white/5 overflow-hidden my-2">
      {(language || true) && (
        <div className="flex items-center justify-between px-3 py-1 text-[10px] text-gray-500 border-b border-white/5 bg-white/[0.02]">
          <span className="font-mono">{language || 'text'}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-gray-200"
            title="复制"
          >
            {copied ? (
              <>
                <Check size={11} className="text-green-400" />
                <span className="text-green-400">已复制</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>复制</span>
              </>
            )}
          </button>
        </div>
      )}
      <pre className="px-3 py-2 text-xs text-gray-300 overflow-x-auto font-mono">
        <code>{code}</code>
      </pre>
    </div>
  )
}

interface MermaidProps {
  code: string
  onCopy: () => void
  copied: boolean
}

function MermaidDiagram({ code, onCopy, copied }: MermaidProps) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const idRef = useRef(`mermaid-${++mermaidIdSeq}`)

  useEffect(() => {
    let cancelled = false
    ensureMermaidInit()
    setError(null)
    // mermaid.render is async since v10
    mermaid
      .render(idRef.current, code)
      .then(({ svg }) => {
        if (!cancelled) setSvg(svg)
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e))
        }
      })
    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <div className="group relative rounded-lg bg-black/30 border border-purple-500/20 overflow-hidden my-2">
      <div className="flex items-center justify-between px-3 py-1 text-[10px] text-purple-400 border-b border-white/5 bg-purple-500/[0.05]">
        <span className="font-mono">{'mermaid'}</span>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-gray-200"
          title="复制源码"
        >
          {copied ? (
            <>
              <Check size={11} className="text-green-400" />
              <span className="text-green-400">已复制</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>复制源码</span>
            </>
          )}
        </button>
      </div>
      {error ? (
        <div className="p-3 text-xs">
          <div className="flex items-center gap-2 text-amber-400 mb-2">
            <AlertTriangle size={12} />
            <span>Mermaid 渲染失败</span>
          </div>
          <p className="text-[10px] text-amber-400/70 mb-2 font-mono">{error}</p>
          <pre className="text-[10px] text-gray-400 overflow-x-auto font-mono whitespace-pre-wrap">
            <code>{code}</code>
          </pre>
        </div>
      ) : svg ? (
        // mermaid SVG is sanitized by mermaid itself (securityLevel: loose still escapes scripts)
        // eslint-disable-next-line react/no-danger
        <div className="p-3 flex justify-center [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <div className="p-3 text-xs text-gray-500">正在渲染...</div>
      )}
    </div>
  )
}
