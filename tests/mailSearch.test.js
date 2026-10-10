import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSearchIndex, findSearchMatches, parseSearchTerms, searchEmails, searchSnippet } from '../src/mailSearch.js'

const matches = (value, query) => findSearchMatches(value, parseSearchTerms(query, { CSEN701: 'Software Engineering' })).map(({ start, end }) => value.slice(start, end))

test('search matches whole words without returning unofficial or office for official', () => {
  assert.deepEqual(matches('Official holiday. unofficial; OFFICIAL! office officially', 'official'), ['Official', 'OFFICIAL'])
  assert.deepEqual(matches('جدول المحاضرات ومحاضرات أخرى', 'المحاضرات'), ['المحاضرات'])
})

test('search treats punctuation literally and handles case, repeated terms, and spaced course codes', () => {
  assert.deepEqual(matches('C++ class; C+ class. a.b and axb', 'c++ a.b'), ['C++', 'a.b'])
  assert.deepEqual(matches('CSEN 701, csen701; XCSEN701 CSEN701B', 'CSEN701'), ['CSEN 701', 'csen701'])
  assert.deepEqual(parseSearchTerms('  CSEN   701   official OFFICIAL  ', { CSEN701: 'Software Engineering' }), ['csen701', 'official'])
  assert.deepEqual(matches('CSEN701 CSEN 701', 'csen 701'), ['CSEN701', 'CSEN 701'])
})

test('all query terms are required and subject matches rank ahead of sender and body matches', () => {
  const entries = buildSearchIndex([
    { title: 'Unrelated title', body: 'Official holiday next week.' },
    { title: 'Official holiday', body: 'Campus is closed.' },
    { title: 'Holiday information', sender_name: 'Official Office', body: 'Campus news.' },
    { title: 'Official memo', body: 'No matching second term.' },
    { title: 'Unofficial holiday', body: 'No official announcement.' },
  ])
  assert.deepEqual(searchEmails(entries, parseSearchTerms('holiday official')).map(entry => entry.index), [1, 2, 4, 0])
  assert.deepEqual(searchEmails(entries, []).map(entry => entry.index), [0, 1, 2, 3, 4])
  assert.equal(searchEmails(entries, parseSearchTerms('official impossible')).length, 0)
})

test('stale previews and unrelated archive metadata cannot create results', () => {
  const entries = buildSearchIndex([{ title: 'Campus news', body: 'Welcome back.', preview: 'Official notice', id: 'official', link: 'https://official.example' }])
  assert.equal(searchEmails(entries, parseSearchTerms('official')).length, 0)
})

test('body matches show context even when the match is far beyond the original preview', () => {
  const body = `${'Earlier details. '.repeat(40)}The official holiday begins tomorrow. ${'Later details. '.repeat(20)}`
  const entry = searchEmails(buildSearchIndex([{ title: 'Campus news', body, preview: 'Earlier details.' }]), parseSearchTerms('official'))[0]
  assert.match(entry.snippet, /official holiday/)
  assert.ok(entry.snippet.startsWith('…'))
  assert.ok(entry.snippet.length < 160)
  assert.deepEqual(matches(entry.snippet, 'official'), ['official'])
  assert.equal(searchSnippet('Short text.', []), 'Short text.')
})

test('sender and recipient matches explain why an otherwise unrelated subject was returned', () => {
  const entries = buildSearchIndex([{ title: 'Campus news', sender_name: 'Official Office', to: 'student@example.com', body: 'Welcome.' }])
  assert.equal(searchEmails(entries, parseSearchTerms('official'))[0].snippet, 'From: Official Office')
  assert.equal(searchEmails(entries, parseSearchTerms('student@example.com'))[0].snippet, 'To: student@example.com')
})

test('ordinary word-and-number queries remain separate requirements across fields', () => {
  const terms = parseSearchTerms('official 2026')
  assert.deepEqual(terms, ['official', '2026'])
  const entries = buildSearchIndex([{ title: 'Official holiday', body: 'The campus closes in October 2026.' }])
  assert.equal(searchEmails(entries, terms).length, 1)
})

test('long inbox previews stay bounded while the full body remains searchable', () => {
  const body = 'Earlier details. '.repeat(200) + 'A final official announcement.'
  const entries = buildSearchIndex([{ title: 'Campus news', body }])
  assert.ok(entries[0].snippet.length < 160)
  assert.match(searchEmails(entries, parseSearchTerms('official'))[0].snippet, /official announcement/)
})

test('notification boilerplate does not create invisible title matches and message identity remains intact', () => {
  const email = Object.freeze({ title: '[EXTERNAL EMAIL] - Notification System: Discrete Math Updates', body: 'Lecture details.' })
  const entries = buildSearchIndex([email, { title: 'Campus news', body: 'The notification system is being upgraded.' }])
  assert.equal(entries[0].email, email)
  assert.deepEqual(searchEmails(entries, parseSearchTerms('notification system')).map(entry => entry.index), [1])
  assert.deepEqual(searchEmails(entries, parseSearchTerms('discrete math')).map(entry => entry.index), [0])
  assert.equal(searchEmails(entries, parseSearchTerms('external')).length, 0)
})
