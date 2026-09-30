import assert from 'node:assert/strict'
import test from 'node:test'
import { parseEmailDocuments } from '../src/firebaseEmails.js'

test('parses Firestore email docs, sorts newest first, and exposes update time', () => {
  const docs = [
    { id: 'old', data: () => ({ title: 'Older', date: '2026-09-26T12:00:00+03:00', body: 'Old', updated_at: '2026-09-27T10:00:00Z' }) },
    { id: 'new', data: () => ({ title: 'Newer', date: '2026-09-27T12:00:01+03:00', html_body: '<p>New</p>', updated_at: '2026-09-27T11:00:00Z' }) },
  ]
  const result = parseEmailDocuments(docs)
  assert.deepEqual(result.emails.map((email) => email.title), ['Newer', 'Older'])
  assert.equal(result.emails[0].id, 'new')
  assert.equal(result.saved_at, '2026-09-27T11:00:00Z')
})

test('rejects malformed Firestore documents', () => {
  assert.throws(() => parseEmailDocuments([{ id: 'bad', data: () => ({ title: 2, body: null }) }]), /unexpected format/)
})
