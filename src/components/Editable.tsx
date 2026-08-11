import { useRef } from 'react'

interface EditableProps {
  value: string
  onSave: (value: string) => void
  className?: string
  as?: 'div' | 'span'
  disabled?: boolean
  placeholder?: string
}

export function Editable({ value, onSave, className, as = 'div', disabled, placeholder }: EditableProps) {
  const ref = useRef<HTMLDivElement>(null)
  const Tag = as

  function handleBlur() {
    const text = ref.current?.textContent?.trim() ?? ''
    if (text !== value) onSave(text)
  }

  return (
    <Tag
      ref={ref as never}
      className={`editable ${className ?? ''} ${disabled ? 'editable-disabled' : ''}`}
      contentEditable={!disabled}
      suppressContentEditableWarning
      spellCheck={false}
      data-placeholder={placeholder}
      onBlur={disabled ? undefined : handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && as === 'span') {
          e.preventDefault()
          ;(e.target as HTMLElement).blur()
        }
      }}
    >
      {value}
    </Tag>
  )
}
