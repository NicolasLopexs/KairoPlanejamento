export function weekdayFromDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const label = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' }).format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function formatDatePT(isoDate: string): string {
  const [, m, d] = isoDate.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

/** Chave + rótulo da semana (segunda a domingo) que contém a data informada. */
export function weekOf(isoDate: string): { key: string; label: string } {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const day = date.getUTCDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const start = new Date(date)
  start.setUTCDate(date.getUTCDate() + diffToMonday)
  const end = new Date(start)
  end.setUTCDate(start.getUTCDate() + 6)

  const key = start.toISOString().slice(0, 10)
  const label = `${formatDatePT(start.toISOString().slice(0, 10))} – ${formatDatePT(end.toISOString().slice(0, 10))}`
  return { key, label }
}
