// Prefer the mail provider's ID, while recognizing keys from older snapshots.
export function emailVisibilityKeys(email) {
  const fallback = `message:${JSON.stringify([email.date || '', email.title || ''])}`
  return typeof email.id === 'string' && email.id.trim()
    ? [`id:${email.id}`, fallback]
    : [fallback]
}

export function isEmailHidden(email, hiddenKeys) {
  return emailVisibilityKeys(email).some((key) => hiddenKeys.has(key))
}

export function parseVisibilityState(state) {
  if (!state || state.version !== 1 || !Array.isArray(state.hidden_email_keys)
    || state.hidden_email_keys.some((key) => typeof key !== 'string')) {
    throw new Error('The saved email visibility has an unexpected format.')
  }
  return new Set(state.hidden_email_keys)
}

export function loadVisibility(storage, uid) {
  const value = storage.getItem(`guc-mail-hidden:${uid}`)
  return parseVisibilityState(value ? JSON.parse(value) : { version: 1, hidden_email_keys: [] })
}

export function saveVisibility(storage, uid, hiddenKeys) {
  storage.setItem(`guc-mail-hidden:${uid}`, JSON.stringify({
    version: 1,
    hidden_email_keys: [...hiddenKeys],
  }))
}
