import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore'
import { DEFAULT_COURSES, courseRevision, parseCourseMappings } from './courseMappings.js'

const sharedDocument = (db) => doc(db, 'userPreferences', 'shared')

export function subscribeCourses(db, onValue, onError) {
  return onSnapshot(sharedDocument(db), async (snapshot) => {
    try {
      const data = snapshot.data()
      let mappings = parseCourseMappings(data)
      if (mappings === null) {
        await runTransaction(db, async (transaction) => {
          const reference = sharedDocument(db)
          const current = await transaction.get(reference)
          if (parseCourseMappings(current.data()) === null) transaction.set(reference, {
            course_mappings: DEFAULT_COURSES,
            course_mappings_revision: 1,
            course_mappings_updated_at: serverTimestamp(),
          }, { merge: true })
        })
        return
      }
      onValue(mappings, courseRevision(data))
    } catch (error) { onError(error) }
  }, onError)
}

export function courseSaveData(currentData, mappings, expectedRevision) {
  const currentRevision = courseRevision(currentData)
  if (currentRevision !== expectedRevision) {
    const error = new Error('Courses changed on another device. Reload the saved table before saving.')
    error.code = 'course-conflict'
    throw error
  }
  return { course_mappings: mappings, course_mappings_revision: currentRevision + 1 }
}

export async function saveCourses(db, mappings, expectedRevision) {
  return runTransaction(db, async (transaction) => {
    const reference = sharedDocument(db)
    const snapshot = await transaction.get(reference)
    const next = courseSaveData(snapshot.data(), mappings, expectedRevision)
    transaction.set(reference, {
      ...next,
      course_mappings_updated_at: serverTimestamp(),
    }, { merge: true })
    return next.course_mappings_revision
  })
}
