import { findSearchMatches } from './mailSearch.js'

export default function SearchText({ value, terms }) {
  const matches = findSearchMatches(value, terms)
  if (!matches.length) return value
  const parts = []
  let cursor = 0
  for (const { start, end } of matches) {
    if (start > cursor) parts.push(value.slice(cursor, start))
    parts.push(<mark className="search-highlight" key={start}>{value.slice(start, end)}</mark>)
    cursor = end
  }
  if (cursor < value.length) parts.push(value.slice(cursor))
  return parts
}
