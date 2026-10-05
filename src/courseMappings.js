export const DEFAULT_COURSES = Object.freeze({
  CSEN503: 'Introduction to Communication Networks',
  DMET501: 'Introduction to Media Engineering',
  CSEN501: 'Data Base I',
  MATH501: 'Mathematics V (Discrete Math)',
  CSEN605: 'Digital System Design',
  CSEN502: 'Theory of Computation',
})

export function normalizeCourseCode(value) {
  return String(value).replace(/\s+/gu, '').toUpperCase()
}

export function validateCourseRows(rows) {
  const mappings = {}
  for (const row of rows) {
    const code = normalizeCourseCode(row.code)
    const name = row.name.trim()
    if (!/^[A-Z]+[0-9]+$/u.test(code)) throw new Error('Course codes need letters followed by numbers.')
    if (!name) throw new Error(`Enter a subject name for ${code}.`)
    if (Object.hasOwn(mappings, code)) throw new Error(`${code} appears more than once.`)
    mappings[code] = name
  }
  return mappings
}

export function parseCourseMappings(data) {
  const raw = data?.course_mappings
  if (raw === undefined) return null
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Saved course mappings have an unexpected format.')
  const rows = Object.entries(raw).map(([code, name]) => {
    if (typeof name !== 'string') throw new Error('Saved course mappings have an unexpected format.')
    return { code, name }
  })
  try { return validateCourseRows(rows) } catch { throw new Error('Saved course mappings have an unexpected format.') }
}

export function courseRevision(data) {
  const revision = data?.course_mappings_revision ?? 0
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error('Saved course revision has an unexpected format.')
  return revision
}

export function matchCourses(value, mappings) {
  if (typeof value !== 'string' || !Object.keys(mappings).length) return []
  const matches = []
  const pattern = /[A-Za-z]+\s*[0-9]+/gu
  for (const match of value.matchAll(pattern)) {
    const start = match.index
    const end = start + match[0].length
    if (start && /[\p{L}\p{N}_]/u.test(value[start - 1])) continue
    if (end < value.length && /[\p{L}\p{N}_]/u.test(value[end])) continue
    const code = normalizeCourseCode(match[0])
    if (Object.hasOwn(mappings, code)) matches.push({ start, end, code, text: match[0], name: mappings[code] })
  }
  return matches
}
