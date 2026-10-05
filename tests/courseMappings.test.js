import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_COURSES, matchCourses, parseCourseMappings, validateCourseRows } from '../src/courseMappings.js'
import { courseSaveData } from '../src/firestoreCourses.js'

test('matches saved codes across case and spacing without swallowing adjacent text', () => {
  const mappings = { CSEN605: 'Digital System Design' }
  const value = 'CSEN605, csen 605; CSEN   605. XCSEN605 CSEN605B CSEN606 CSEN605!'
  assert.deepEqual(matchCourses(value, mappings).map(({ text }) => text), ['CSEN605', 'csen 605', 'CSEN   605', 'CSEN605'])
})

test('draft validation normalizes edits and rejects invalid, duplicate, or nameless rows', () => {
  assert.deepEqual(validateCourseRows([{ code: 'csen 605', name: '  Digital System Design  ' }]), { CSEN605: 'Digital System Design' })
  assert.throws(() => validateCourseRows([{ code: 'CSEN605', name: 'One' }, { code: 'csen 605', name: 'Two' }]), /more than once/)
  assert.throws(() => validateCourseRows([{ code: 'CSEN605', name: ' ' }]), /subject name/)
  assert.throws(() => validateCourseRows([{ code: '605CSEN', name: 'Wrong' }]), /letters followed by numbers/)
})

test('missing mappings seed once while an intentionally empty table stays empty', () => {
  assert.equal(parseCourseMappings({ hidden_email_keys: ['id:a'] }), null)
  assert.deepEqual(parseCourseMappings({ course_mappings: {} }), {})
  assert.equal(Object.keys(DEFAULT_COURSES).length, 6)
})

test('save payload changes only course fields and refuses a stale revision', () => {
  const existing = { hidden_email_keys: ['id:a'], course_mappings: { CSEN605: 'Old' }, course_mappings_revision: 4 }
  const next = courseSaveData(existing, { CSEN605: 'Digital System Design' }, 4)
  assert.deepEqual(next, { course_mappings: { CSEN605: 'Digital System Design' }, course_mappings_revision: 5 })
  assert.deepEqual({ ...existing, ...next }.hidden_email_keys, ['id:a'])
  assert.throws(() => courseSaveData(existing, {}, 3), { code: 'course-conflict' })
})
