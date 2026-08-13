const PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

export function generatePassword(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[Math.floor(Math.random() * PASSWORD_CHARS.length)]
  }
  return out
}

export function suggestEmail(slug: string): string {
  return `${slug}@cronograma.local`
}
