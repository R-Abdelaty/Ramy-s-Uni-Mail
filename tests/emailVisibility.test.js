import test from 'node:test'
import assert from 'node:assert/strict'
import { emailVisibilityKeys, isEmailHidden, loadVisibility, saveVisibility } from '../src/emailVisibility.js'

function memoryStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
}

test('visibility follows message identity and recognizes older snapshots', () => {
  const oldEmail = { date: '2026-09-27T10:00:00Z', title: 'Quiz details' }
  const email = { ...oldEmail, id: 'provider-123' }
  const hidden = new Set(emailVisibilityKeys(oldEmail))
  assert.equal(isEmailHidden(email, hidden), true)
  assert.equal(isEmailHidden({ ...oldEmail, date: '2026-09-28T10:00:00Z' }, hidden), false)
})

test('visibility preferences persist in browser storage per signed-in account', () => {
  const storage = memoryStorage()
  saveVisibility(storage, 'google-uid-1', new Set(['id:123']))
  assert.deepEqual([...loadVisibility(storage, 'google-uid-1')], ['id:123'])
  assert.deepEqual([...loadVisibility(storage, 'google-uid-2')], [])
})

test('corrupt browser preference data is rejected instead of silently reset', () => {
  const storage = memoryStorage()
  storage.setItem('guc-mail-hidden:google-uid-1', '{broken-json')
  assert.throws(() => loadVisibility(storage, 'google-uid-1'))
})
