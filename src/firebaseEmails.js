export function parseEmailDocuments(documents) {
  const emails = documents.map((document) => ({ id: document.id, ...document.data() }))
  emails.sort((left, right) => Date.parse(right.date) - Date.parse(left.date))
  if (emails.some((email) => typeof email.title !== 'string'
    || (typeof email.html_body !== 'string' && typeof email.body !== 'string'))) {
    throw new Error('The Firestore email archive has an unexpected format.')
  }
  const savedAt = emails.reduce((latest, email) =>
    typeof email.updated_at === 'string' && email.updated_at > latest ? email.updated_at : latest, '')
  return { emails, saved_at: savedAt }
}

import { collection, getDocs } from 'firebase/firestore'

export async function loadEmailArchive(db) {
  const snapshot = await getDocs(collection(db, import.meta.env.VITE_FIRESTORE_EMAIL_COLLECTION || 'emails'))
  return parseEmailDocuments(snapshot.docs)
}
