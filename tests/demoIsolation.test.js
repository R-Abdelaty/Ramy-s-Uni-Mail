import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { emailDocument } from '../src/mailPresentation.js'
import { DEMO_EMAILS } from '../src/demoData.js'

test('the demo entry point cannot reach Firebase or the private archive helpers', () => {
  const visited = new Set()
  function inspect(url) {
    if (visited.has(url.href)) return
    visited.add(url.href)
    const source = readFileSync(url, 'utf8')
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]([^'"]+)['"]/gu)) {
      const dependency = match[1]
      assert.doesNotMatch(dependency, /firebase|firestore/iu, `${url.pathname} imports ${dependency}`)
      if (dependency.startsWith('.') && /\.[cm]?jsx?$/u.test(dependency)) inspect(new URL(dependency, url))
    }
  }
  inspect(new URL('../src/main.jsx', import.meta.url))
})

test('the page and HTML sample messages do not request external resources', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const documents = [html, ...DEMO_EMAILS.filter((email) => email.html_body).map(emailDocument)]
  for (const document of documents) {
    assert.doesNotMatch(document, /(?:src|href)\s*=\s*['"](?:https?:)?\/\//iu)
    assert.doesNotMatch(document, /url\(\s*['"]?(?:https?:)?\/\//iu)
  }
})
