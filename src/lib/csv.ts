import type { FeedPost } from './types'

function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function feedToCsv(feed: FeedPost[]): string {
  const header = ['Data', 'Dia da semana', 'Formato', 'Pilar', 'Tema', 'Legenda', 'Status']
  const rows = [...feed]
    .sort((a, b) => a.post_date.localeCompare(b.post_date))
    .map((p) => [p.post_date, p.weekday, p.format, p.pillar, p.tema, p.legenda, p.status])
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
