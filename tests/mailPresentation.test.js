import assert from 'node:assert/strict'
import test from 'node:test'
import { emailTitle, initials, language } from '../src/mailPresentation.js'
import { emailVisibilityKeys } from '../src/emailVisibility.js'

test('notification titles omit transport boilerplate while preserving replies and subject content', () => {
  assert.equal(emailTitle({ title: '[EXTERNAL EMAIL] - Notification System: Discrete Math Updates' }), 'Discrete Math Updates')
  assert.equal(emailTitle({ title: 'RE: [external email] – Notification System: CSEN 701' }), 'RE: CSEN 701')
  assert.equal(emailTitle({ title: '[EXTERNAL EMAIL]—Notification System: جدول المحاضرات' }), 'جدول المحاضرات')
  assert.equal(emailTitle({ title: '[EXTERNAL EMAIL] - A personal message' }), '[EXTERNAL EMAIL] - A personal message')
  assert.equal(emailTitle({ title: 'Notification System: Maintenance' }), 'Notification System: Maintenance')
  assert.equal(emailTitle({ title: '[EXTERNAL EMAIL] - Notification System:' }), 'Untitled message')
  assert.equal(emailTitle({}), 'Untitled message')
})

test('clean display titles preserve message identity and produce readable fallback avatars and language', () => {
  const title = '[EXTERNAL EMAIL] - Notification System: جدول المحاضرات'
  const email = Object.freeze({ title, date: '2026-10-11' })
  const keys = emailVisibilityKeys(email)
  assert.equal(language(emailTitle(email)), 'ar')
  assert.equal(initials(email), 'جا')
  assert.equal(email.title, title)
  assert.deepEqual(emailVisibilityKeys(email), keys)
})
