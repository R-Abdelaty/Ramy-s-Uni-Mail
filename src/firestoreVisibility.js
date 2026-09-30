import { arrayRemove, arrayUnion, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { loadVisibility } from './emailVisibility.js'

function preferenceDocument(db) {
  return doc(db, 'userPreferences', 'shared')
}

function readHiddenKeys(data) {
  const keys = data?.hidden_email_keys ?? []
  if (!Array.isArray(keys) || keys.some((key) => typeof key !== 'string')) {
    throw new Error('Saved email visibility has an unexpected format in Firestore.')
  }
  return new Set(keys)
}

export async function loadFirestoreVisibility(db, legacyUid, storage) {
  const reference = preferenceDocument(db)
  const snapshot = await getDoc(reference)
  const hiddenKeys = snapshot.exists() ? readHiddenKeys(snapshot.data()) : new Set()
  const legacyStorageKey = `guc-mail-hidden:${legacyUid}`
  const hasLegacyValue = storage.getItem(legacyStorageKey) !== null

  if (hasLegacyValue) {
    try {
      for (const key of loadVisibility(storage, legacyUid)) hiddenKeys.add(key)
    } catch (error) {
      if (!snapshot.exists()) throw error
      console.warn('Ignoring an invalid legacy email visibility preference.', error)
    }
  }

  if (!snapshot.exists() || hasLegacyValue) {
    await setDoc(reference, {
      hidden_email_keys: hiddenKeys.size ? arrayUnion(...hiddenKeys) : [],
      updated_at: serverTimestamp(),
    }, { merge: true })
    if (hasLegacyValue) storage.removeItem(legacyStorageKey)
  }
  return hiddenKeys
}

export async function updateFirestoreVisibility(db, emailKeys, hidden) {
  await setDoc(preferenceDocument(db), {
    hidden_email_keys: (hidden ? arrayUnion : arrayRemove)(...emailKeys),
    updated_at: serverTimestamp(),
  }, { merge: true })
}
