export type Role = 'staff' | 'client'

export type Pillar = 'Jogo' | 'Lifestyle' | 'Bastidores' | 'Engajamento' | 'Inspiração'

export const PILLARS: Pillar[] = ['Jogo', 'Lifestyle', 'Bastidores', 'Engajamento', 'Inspiração']

export const PILLAR_CLASS: Record<Pillar, string> = {
  Jogo: 'jogo',
  Lifestyle: 'lifestyle',
  Bastidores: 'bastidores',
  Engajamento: 'engajamento',
  Inspiração: 'inspiracao',
}

export type PostStatus = 'planejado' | 'gravado' | 'editado' | 'postado'

export const STATUSES: { value: PostStatus; label: string }[] = [
  { value: 'planejado', label: 'Planejado' },
  { value: 'gravado', label: 'Gravado' },
  { value: 'editado', label: 'Editado' },
  { value: 'postado', label: 'Postado' },
]

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export interface ClientRow {
  id: string
  name: string
  slug: string
  archived_at: string | null
  contact_email: string | null
  created_at: string
}

export interface Profile {
  id: string
  role: Role
  full_name: string | null
  client_id: string | null
  clients: { slug: string; name: string } | null
}

export interface FeedPost {
  id: string
  client_id: string
  post_date: string
  weekday: string
  week_label: string
  format: string
  pillar: Pillar
  tema: string
  legenda: string
  status: PostStatus
  created_at: string
  updated_at: string
}

export interface StoryItem {
  id: string
  client_id: string
  weekday: string
  tipo: string
  ideia: string
  sort_order: number
}

export interface CaptureItem {
  id: string
  client_id: string
  momento: string
  detalhe: string
  sort_order: number
}
