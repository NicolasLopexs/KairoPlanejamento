export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty-state fade-in">
      <svg className="empty-icon" viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 24 14 8h20l6 16" />
        <path d="M8 24v12a2 2 0 0 0 2 2h28a2 2 0 0 0 2-2V24" />
        <path d="M8 24h9l2 4h10l2-4h9" />
      </svg>
      <p className="empty-title">{title}</p>
      {hint && <p className="empty-hint">{hint}</p>}
    </div>
  )
}
