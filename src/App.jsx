import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Spinner } from '@fluentui/react-components'
import { createPortal } from 'react-dom'
import {
  ArrowLeft20Regular,
  ArrowSync20Regular,
  Dismiss16Regular,
  Eye20Regular,
  EyeOff20Regular,
  Mail24Regular,
  Search20Regular,
} from '@fluentui/react-icons'
import { emailDocument, initials, language, messageColor, senderName } from './mailPresentation.js'
import { emailVisibilityKeys, isEmailHidden } from './emailVisibility.js'
import { onAuthStateChanged, signInWithRedirect, signOut } from 'firebase/auth'
import { firebaseSetupError, getFirebaseServices } from './firebaseClient.js'
import { loadEmailArchive } from './firebaseEmails.js'
import { loadFirestoreVisibility, updateFirestoreVisibility } from './firestoreVisibility.js'
import { matchCourses, validateCourseRows } from './courseMappings.js'
import { saveCourses, subscribeCourses } from './firestoreCourses.js'
import { annotateCourseDocument } from './annotateCourses.js'
import courseBookIcon from './assets/course-book.svg'

function CourseText({ value, mappings, onShow, onHide }) {
  if (typeof value !== 'string') return value
  const matches = matchCourses(value, mappings)
  if (!matches.length) return value
  const parts = []
  let cursor = 0
  for (const match of matches) {
    if (match.start > cursor) parts.push(value.slice(cursor, match.start))
    parts.push(<span className="course-code" role="button" tabIndex={0} key={`${match.start}-${match.code}`}
      aria-label={`${match.code}: ${match.name}`}
      onMouseEnter={(event) => onShow(match.code, event.currentTarget)}
      onMouseLeave={onHide}
      onFocus={(event) => onShow(match.code, event.currentTarget)}
      onBlur={onHide}
      onClick={(event) => { event.stopPropagation(); onShow(match.code, event.currentTarget) }}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onShow(match.code, event.currentTarget) } }}>
      {match.text}
    </span>)
    cursor = match.end
  }
  if (cursor < value.length) parts.push(value.slice(cursor))
  return parts
}

function CourseTable({ rows, onRows, onSave, onCancel, onReload, onClose, loading, saving, dirty, error, conflict, status }) {
  const change = (index, field, value) => onRows(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row))
  return <aside id="course-names-panel" className="courses-sidebar" role="dialog" aria-labelledby="course-names-title" onClick={(event) => event.stopPropagation()}>
    <div className="courses-heading"><div><h2 id="course-names-title">Course names</h2><p>Edit the names shown in emails.</p></div>
      <Button autoFocus appearance="subtle" size="small" icon={<Dismiss16Regular />} aria-label="Close course names" onClick={onClose} />
    </div>
    {loading ? <div className="courses-state" role="status"><Spinner size="small" label="Loading courses" /></div> : <>
      <div className="courses-scroll"><table className="courses-table"><thead><tr><th>Course code</th><th>Subject name</th><th><span className="sr-only">Delete</span></th></tr></thead>
        <tbody>{rows.map((row, index) => <tr key={row.id}>
          <td><input aria-label={`Course code row ${index + 1}`} value={row.code} onChange={(event) => change(index, 'code', event.target.value)} /></td>
          <td><input aria-label={`Subject name row ${index + 1}`} value={row.name} onChange={(event) => change(index, 'name', event.target.value)} /></td>
          <td><button type="button" className="course-delete" aria-label={`Delete course row ${index + 1}`} title="Delete row" onClick={() => onRows(rows.filter((_, rowIndex) => rowIndex !== index))}>×</button></td>
        </tr>)}</tbody></table>
        {rows.length === 0 && <p className="courses-empty">No courses saved. Add a row to begin.</p>}
      </div>
      <div className="courses-actions">
        <Button appearance="subtle" size="small" onClick={() => onRows([...rows, { id: crypto.randomUUID(), code: '', name: '' }])}>Add row</Button>
        <div><Button appearance="subtle" size="small" disabled={!dirty || saving} onClick={onCancel}>Cancel</Button><Button appearance="primary" size="small" disabled={!dirty || saving} onClick={onSave}>{saving ? 'Saving…' : 'Save'}</Button></div>
      </div>
      {(error || status) && <p className={`courses-status${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'}>{error || status}</p>}
      {conflict && <Button appearance="secondary" size="small" onClick={onReload}>Reload saved table</Button>}
    </>}
  </aside>
}

function formatDate(value, compact = false) {
  if (!value) return 'Date unavailable'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  if (compact) {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (parsed.toDateString() === today.toDateString()) {
      return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(parsed)
    }
    if (parsed.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return new Intl.DateTimeFormat(undefined, {
      month: 'short', day: 'numeric',
      ...(parsed.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}),
    }).format(parsed)
  }
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
}

function Avatar({ email, className = '' }) {
  return (
    <span className={`sender-avatar ${className}`} style={{ '--message-color': messageColor(email) }} aria-hidden="true">
      {initials(email)}
    </span>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState(firebaseSetupError)
  const [authBusy, setAuthBusy] = useState(false)
  const [emails, setEmails] = useState([])
  const [savedAt, setSavedAt] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [readerOpen, setReaderOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [hiddenKeys, setHiddenKeys] = useState(() => new Set())
  const [visibilityReady, setVisibilityReady] = useState(false)
  const [visibilityLoading, setVisibilityLoading] = useState(true)
  const [visibilityError, setVisibilityError] = useState('')
  const [savingKey, setSavingKey] = useState('')
  const [visibilityStatus, setVisibilityStatus] = useState('')
  const [courseMappings, setCourseMappings] = useState({})
  const [courseRows, setCourseRows] = useState([])
  const [courseRevision, setCourseRevision] = useState(0)
  const [courseDraftRevision, setCourseDraftRevision] = useState(0)
  const [coursesLoading, setCoursesLoading] = useState(true)
  const [coursesSaving, setCoursesSaving] = useState(false)
  const [coursesDirty, setCoursesDirty] = useState(false)
  const [coursesError, setCoursesError] = useState('')
  const [coursesConflict, setCoursesConflict] = useState(false)
  const [coursesStatus, setCoursesStatus] = useState('')
  const [coursePopover, setCoursePopover] = useState(null)
  const [coursesOpen, setCoursesOpen] = useState(false)
  const coursesButtonRef = useRef(null)
  const courseDraftDirtyRef = useRef(false)
  const frameRef = useRef(null)
  const frameCleanupRef = useRef(null)
  const readingTitleRef = useRef(null)
  const inboxRef = useRef(null)
  const searchRef = useRef(null)

  const rowsFromMappings = useCallback((mappings) => Object.entries(mappings).map(([code, name]) => ({ id: crypto.randomUUID(), code, name })), [])

  const closeCourses = useCallback(() => {
    setCoursesOpen(false)
    coursesButtonRef.current?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (!coursesOpen) return undefined
    const escape = (event) => { if (event.key === 'Escape') { event.preventDefault(); closeCourses() } }
    const resize = () => { if (window.innerWidth <= 768) setCoursesOpen(false) }
    document.addEventListener('keydown', escape)
    window.addEventListener('resize', resize)
    return () => { document.removeEventListener('keydown', escape); window.removeEventListener('resize', resize) }
  }, [coursesOpen, closeCourses])

  useEffect(() => {
    if (!user) {
      setCourseMappings({})
      setCourseRows([])
      setCoursePopover(null)
      setCoursesOpen(false)
      setCoursesLoading(false)
      courseDraftDirtyRef.current = false
      return undefined
    }
    setCoursesLoading(true)
    setCoursesError('')
    const unsubscribe = subscribeCourses(getFirebaseServices().db, (mappings, revision) => {
      setCourseMappings(mappings)
      setCourseRevision(revision)
      if (!courseDraftDirtyRef.current) {
        setCourseRows(rowsFromMappings(mappings))
        setCourseDraftRevision(revision)
      }
      setCoursesLoading(false)
    }, (loadError) => {
      setCoursesError(loadError instanceof Error ? loadError.message : 'Course names could not be loaded.')
      setCoursesLoading(false)
    })
    return () => unsubscribe()
  }, [user, rowsFromMappings])

  function editCourseRows(rows) {
    setCourseRows(rows)
    setCoursesDirty(true)
    courseDraftDirtyRef.current = true
    setCoursesError('')
    setCoursesStatus('Unsaved changes')
  }

  function resetCourseRows() {
    setCourseRows(rowsFromMappings(courseMappings))
    setCourseDraftRevision(courseRevision)
    setCoursesDirty(false)
    courseDraftDirtyRef.current = false
    setCoursesError('')
    setCoursesConflict(false)
    setCoursesStatus('')
  }

  async function saveCourseRows() {
    setCoursesError('')
    setCoursesConflict(false)
    let mappings
    try { mappings = validateCourseRows(courseRows) } catch (error) { setCoursesError(error.message); return }
    setCoursesSaving(true)
    setCoursesStatus('Saving courses…')
    try {
      const revision = await saveCourses(getFirebaseServices().db, mappings, courseDraftRevision)
      courseDraftDirtyRef.current = false
      setCoursesDirty(false)
      setCourseRows(rowsFromMappings(mappings))
      setCourseDraftRevision(revision)
      setCourseMappings(mappings)
      setCoursesStatus('Courses saved across devices.')
    } catch (saveError) {
      setCoursesError(saveError instanceof Error ? saveError.message : 'Courses could not be saved.')
      setCoursesConflict(saveError?.code === 'course-conflict')
      setCoursesStatus('')
    } finally { setCoursesSaving(false) }
  }

  const hideCoursePopover = useCallback(() => setCoursePopover(null), [])
  const showCoursePopover = useCallback((code, target, frame = null) => {
    const rect = target.getBoundingClientRect()
    const frameRect = frame?.getBoundingClientRect()
    setCoursePopover({ code, rect: {
      left: rect.left + (frameRect?.left || 0),
      right: rect.right + (frameRect?.left || 0),
      top: rect.top + (frameRect?.top || 0),
      bottom: rect.bottom + (frameRect?.top || 0),
    } })
  }, [])

  useEffect(() => {
    if (!coursePopover) return undefined
    const dismiss = (event) => { if (!event.target.closest?.('.course-code, .course-popover')) hideCoursePopover() }
    const escape = (event) => { if (event.key === 'Escape') hideCoursePopover() }
    document.addEventListener('pointerdown', dismiss, true)
    document.addEventListener('keydown', escape)
    window.addEventListener('scroll', hideCoursePopover, true)
    window.addEventListener('resize', hideCoursePopover)
    return () => {
      document.removeEventListener('pointerdown', dismiss, true)
      document.removeEventListener('keydown', escape)
      window.removeEventListener('scroll', hideCoursePopover, true)
      window.removeEventListener('resize', hideCoursePopover)
    }
  }, [coursePopover, hideCoursePopover])

  useEffect(() => {
    if (firebaseSetupError) {
      setAuthLoading(false)
      return undefined
    }
    try {
      const { auth } = getFirebaseServices()
      return onAuthStateChanged(auth, (signedInUser) => {
        setUser(signedInUser)
        setAuthError('')
        setAuthLoading(false)
      }, (error) => {
        setAuthError(error.message || 'Could not check your Google sign-in.')
        setAuthLoading(false)
      })
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Firebase setup is incomplete.')
      setAuthLoading(false)
      return undefined
    }
  }, [])

  async function handleGoogleSignIn() {
    setAuthBusy(true)
    setAuthError('')
    try {
      const { auth, provider } = getFirebaseServices()
      await signInWithRedirect(auth, provider)
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Google sign-in failed.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSignOut() {
    setAuthBusy(true)
    try {
      await signOut(getFirebaseServices().auth)
      setEmails([])
      setSavedAt('')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign-out failed.')
    } finally {
      setAuthBusy(false)
    }
  }

  const loadSnapshot = useCallback(async ({ quiet = false } = {}) => {
    if (!user) {
      setEmails([])
      setLoading(false)
      return
    }
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const snapshot = await loadEmailArchive(getFirebaseServices().db)
      setEmails(snapshot.emails)
      setSavedAt(typeof snapshot.saved_at === 'string' ? snapshot.saved_at : '')
      setSelectedIndex((current) => snapshot.emails.length ? Math.min(current, snapshot.emails.length - 1) : 0)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'The Firestore archive could not be loaded.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => { loadSnapshot() }, [loadSnapshot])

  const loadVisibility = useCallback(async () => {
    setVisibilityLoading(true)
    setVisibilityReady(false)
    setVisibilityError('')
    try {
      if (!user) {
        setHiddenKeys(new Set())
        setVisibilityReady(false)
        return
      }
      setHiddenKeys(await loadFirestoreVisibility(getFirebaseServices().db, user.uid, localStorage))
      setVisibilityReady(true)
    } catch (loadError) {
      setVisibilityError(loadError instanceof Error ? loadError.message : 'Saved email visibility could not be loaded.')
    } finally {
      setVisibilityLoading(false)
    }
  }, [user])

  useEffect(() => { loadVisibility() }, [loadVisibility])

  async function toggleVisibility(email) {
    const emailKeys = emailVisibilityKeys(email)
    const hidden = !isEmailHidden(email, hiddenKeys)
    setSavingKey(emailKeys[0])
    setVisibilityError('')
    setVisibilityStatus('Saving email visibility…')
    try {
      if (!user) throw new Error('Sign in to save email visibility.')
      const updated = new Set(hiddenKeys)
      if (hidden) emailKeys.forEach((key) => updated.add(key))
      else emailKeys.forEach((key) => updated.delete(key))
      await updateFirestoreVisibility(getFirebaseServices().db, emailKeys, hidden)
      setHiddenKeys(updated)
      setVisibilityStatus(hidden ? 'Email hidden and saved.' : 'Email shown and saved.')
    } catch (saveError) {
      setVisibilityError(saveError instanceof Error ? saveError.message : 'Email visibility could not be saved.')
      setVisibilityStatus('Email visibility was not changed.')
    } finally {
      setSavingKey('')
    }
  }

  const visibilityDisabled = !user || !visibilityReady || visibilityLoading || Boolean(savingKey)

  const visibleEmails = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    return emails.map((email, index) => ({ email, index })).filter(({ email }) =>
      !term || [email.title, email.preview, senderName(email), email.body]
        .filter((value) => typeof value === 'string').join(' ').toLocaleLowerCase().includes(term))
  }, [emails, query])
  const selected = visibleEmails.find(({ index }) => index === selectedIndex) || visibleEmails[0]
  const selectedEmail = selected?.email
  const selectedDocument = useMemo(() => selectedEmail?.html_body ? emailDocument(selectedEmail) : '', [selectedEmail])

  useEffect(() => {
    const frame = frameRef.current
    const document = frame?.contentDocument
    if (!document?.body) return
    const scrollTop = document.scrollingElement?.scrollTop || 0
    annotateCourseDocument(document, courseMappings)
    if (document.scrollingElement) document.scrollingElement.scrollTop = scrollTop
  }, [courseMappings, selectedDocument])

  function setupCourseFrame(event) {
    frameCleanupRef.current?.()
    const frame = event.currentTarget
    const document = frame.contentDocument
    if (!document?.body) return
    annotateCourseDocument(document, courseMappings)
    const marker = (target) => target?.closest?.('.course-code')
    const mouseOver = (event) => { const found = marker(event.target); if (found) showCoursePopover(found.dataset.courseCode, found, frame) }
    const mouseOut = (event) => { const found = marker(event.target); if (found && !found.contains(event.relatedTarget)) hideCoursePopover() }
    const focusIn = (event) => { const found = marker(event.target); if (found) showCoursePopover(found.dataset.courseCode, found, frame) }
    const focusOut = (event) => { if (marker(event.target)) hideCoursePopover() }
    const click = (event) => { const found = marker(event.target); if (found) { event.preventDefault(); event.stopPropagation(); showCoursePopover(found.dataset.courseCode, found, frame) } else hideCoursePopover() }
    const keyDown = (event) => { const found = marker(event.target); if (found && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); showCoursePopover(found.dataset.courseCode, found, frame) } else if (event.key === 'Escape') hideCoursePopover() }
    document.addEventListener('mouseover', mouseOver)
    document.addEventListener('mouseout', mouseOut)
    document.addEventListener('focusin', focusIn)
    document.addEventListener('focusout', focusOut)
    document.addEventListener('click', click)
    document.addEventListener('keydown', keyDown)
    document.addEventListener('scroll', hideCoursePopover, true)
    frameCleanupRef.current = () => {
      document.removeEventListener('mouseover', mouseOver)
      document.removeEventListener('mouseout', mouseOut)
      document.removeEventListener('focusin', focusIn)
      document.removeEventListener('focusout', focusOut)
      document.removeEventListener('click', click)
      document.removeEventListener('keydown', keyDown)
      document.removeEventListener('scroll', hideCoursePopover, true)
    }
  }

  useEffect(() => { hideCoursePopover() }, [selectedIndex, readerOpen, query, hideCoursePopover])
  useEffect(() => () => frameCleanupRef.current?.(), [])

  useEffect(() => {
    if (readerOpen) readingTitleRef.current?.focus({ preventScroll: true })
  }, [readerOpen, selectedEmail])

  useEffect(() => {
    if (!selectedEmail && !loading) setReaderOpen(false)
  }, [selectedEmail, loading])

  function backToInbox() {
    setReaderOpen(false)
    requestAnimationFrame(() => {
      const selectedRow = inboxRef.current?.querySelector('.message-open[aria-pressed="true"]')
      if (selectedRow) selectedRow.focus()
      else searchRef.current?.focus()
    })
  }

  if (authLoading) return <main className="sign-in-screen"><Spinner label="Checking sign-in" /></main>
  if (!user) return (
    <main className="sign-in-screen">
      <section className="sign-in-card">
        <h1 className="brand-title" aria-label="RAMYS UNI MAIL"><strong>RAMYS</strong> <span>UNI MAIL</span></h1>
        <p>Sign in with your Google account to read your private email archive.</p>
        {authError && <p className="sign-in-error" role="alert">{authError}</p>}
        <Button appearance="primary" onClick={handleGoogleSignIn} disabled={authBusy || Boolean(firebaseSetupError)}>
          {authBusy ? 'Signing in…' : 'Continue with Google'}
        </Button>
        {firebaseSetupError && <p className="setup-help">Set the Firebase web app settings in <code>.env.local</code> or the hosting build environment, then rebuild.</p>}
      </section>
    </main>
  )

  return (
    <main className="page-shell">
      <div className="mail-layout">
      <div className="mail-window">
        <header className="window-toolbar">
          <div className="toolbar-actions">
            <span className="signed-in-account" title={user.email || ''}>{user.email}</span>
            <Button appearance="subtle" onClick={handleSignOut} disabled={authBusy}>Sign out</Button>
            <span className="snapshot-time" title={savedAt ? formatDate(savedAt) : undefined}>
              {savedAt ? `Updated ${formatDate(savedAt)}` : 'Firestore archive'}
            </span>
            <Button appearance="subtle" icon={<ArrowSync20Regular />} className="refresh-button"
              onClick={() => loadSnapshot({ quiet: true })} disabled={loading || refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh inbox'}
            </Button>
          </div>
        </header>

        {error && emails.length > 0 && (
          <div className="inline-error" role="status">
            <span>{error} Showing the last loaded messages.</span>
            <Button appearance="subtle" onClick={() => loadSnapshot({ quiet: true })} disabled={refreshing}>Try again</Button>
          </div>
        )}

        <span className="sr-only" role="status">{visibilityStatus}</span>
        {visibilityError && (
          <div className="inline-error" role="alert">
            <span>{visibilityError}</span>
            <Button appearance="subtle" onClick={loadVisibility} disabled={visibilityLoading || Boolean(savingKey)}>Try again</Button>
          </div>
        )}

        <section className={`mail-workspace${readerOpen ? ' reader-is-open' : ''}`} aria-label="Inbox and message reader">
          <aside className="inbox-panel" ref={inboxRef} aria-label="Inbox">
            <div className="inbox-header">
              <h1 className="brand-title" aria-label="RAMYS UNI MAIL"><strong>RAMYS</strong> <span>UNI MAIL</span></h1>
              <div className="search-field">
                <Search20Regular aria-hidden="true" />
                <input ref={searchRef} type="search" placeholder="Search emails…" aria-label="Search emails"
                  value={query} onChange={(event) => setQuery(event.target.value)} />
                {query && <Button appearance="subtle" size="small" icon={<Dismiss16Regular />}
                  aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus() }} />}
              </div>
              <div className="inbox-heading">
                <h2>Inbox</h2>
                <span role="status" aria-live="polite">
                  {query.trim() ? `${visibleEmails.length} of ${emails.length}` : emails.length} {emails.length === 1 ? 'message' : 'messages'}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="state-panel compact-state" role="status"><Spinner size="small" label="Loading inbox" /></div>
            ) : error && emails.length === 0 ? (
              <div className="state-panel">
                <span className="state-icon" aria-hidden="true"><Mail24Regular /></span>
                <h3>Firestore archive unavailable</h3>
                <p>{error}</p>
                <p>Check the Firestore rules for your signed-in account, then try again.</p>
                <Button appearance="secondary" onClick={() => loadSnapshot({ quiet: true })} disabled={refreshing}>Try again</Button>
              </div>
            ) : emails.length === 0 ? (
              <div className="state-panel">
                <span className="state-icon" aria-hidden="true"><Mail24Regular /></span>
                <h3>Your inbox is empty</h3>
                <p>No messages were found in the Firestore archive.</p>
              </div>
            ) : visibleEmails.length === 0 ? (
              <div className="state-panel">
                <span className="state-icon" aria-hidden="true"><Search20Regular /></span>
                <h3>No matching messages</h3>
                <p>Try another subject, sender, or keyword.</p>
                <Button appearance="secondary" onClick={() => { setQuery(''); searchRef.current?.focus() }}>Clear search</Button>
              </div>
            ) : (
              <ul className="message-list" aria-label="Latest messages">
                {visibleEmails.map(({ email, index }) => (
                  <li className="message-item" key={emailVisibilityKeys(email)[0]}>
                    <div className={`message-row${index === selected?.index ? ' is-selected' : ''}${isEmailHidden(email, hiddenKeys) ? ' is-hidden' : ''}`}
                      style={{ '--message-color': messageColor(email) }}>
                      <button type="button" className="message-open" aria-pressed={index === selected?.index}
                        aria-label={`${isEmailHidden(email, hiddenKeys) ? 'Hidden email: ' : ''}${email.title || 'Untitled message'}`}
                        onClick={() => { setSelectedIndex(index); setReaderOpen(true) }} />
                      <Avatar email={email} />
                      <span className="message-summary">
                        <span className="message-row-top">
                          <span className="message-subject" dir="auto" lang={language(email.title)}><CourseText value={email.title || 'Untitled message'} mappings={courseMappings} onShow={showCoursePopover} onHide={hideCoursePopover} /></span>
                          <span className="message-date" title={formatDate(email.date)}>{formatDate(email.date, true)}</span>
                        </span>
                        <span className="message-preview" dir="auto" lang={language(email.preview || email.body)}>
                          <CourseText value={email.preview || email.body || 'Open to read this message.'} mappings={courseMappings} onShow={showCoursePopover} onHide={hideCoursePopover} />
                        </span>
                      </span>
                    </div>
                    <Button className="visibility-toggle" appearance="subtle" size="small"
                      icon={isEmailHidden(email, hiddenKeys) ? <Eye20Regular /> : <EyeOff20Regular />}
                      title={isEmailHidden(email, hiddenKeys) ? 'Show email' : 'Hide email'}
                      aria-label={`${isEmailHidden(email, hiddenKeys) ? 'Show' : 'Hide'} email: ${email.title || 'Untitled message'}`}
                      aria-pressed={isEmailHidden(email, hiddenKeys)} disabled={visibilityDisabled}
                      onClick={() => toggleVisibility(email)} />
                  </li>
                ))}
              </ul>
            )}
          </aside>

          <article className="reading-panel" aria-label="Selected message">
            {loading ? (
              <div className="reader-placeholder" role="status"><Spinner label="Loading message" /></div>
            ) : selectedEmail ? (
              <>
                <div className="reader-toolbar">
                  <Button className="back-button" appearance="subtle" icon={<ArrowLeft20Regular />} onClick={backToInbox}>Inbox</Button>
                  <div className="reader-message-actions">
                    <Button appearance="subtle" size="small" className="reader-visibility-toggle"
                      icon={isEmailHidden(selectedEmail, hiddenKeys) ? <Eye20Regular /> : <EyeOff20Regular />}
                      aria-pressed={isEmailHidden(selectedEmail, hiddenKeys)} disabled={visibilityDisabled}
                      onClick={() => toggleVisibility(selectedEmail)}>
                      {savingKey === emailVisibilityKeys(selectedEmail)[0] ? 'Saving…' : isEmailHidden(selectedEmail, hiddenKeys) ? 'Show email' : 'Hide email'}
                    </Button>
                    <span className="reader-position">{visibleEmails.findIndex(({ index }) => index === selected.index) + 1} / {visibleEmails.length}</span>
                  </div>
                </div>
                <header className="reading-header">
                  <h2 ref={readingTitleRef} tabIndex={-1} className="reading-title" dir="auto" lang={language(selectedEmail.title)}>
                    <CourseText value={selectedEmail.title || 'Untitled message'} mappings={courseMappings} onShow={showCoursePopover} onHide={hideCoursePopover} />
                  </h2>
                  <div className="reading-sender">
                    <Avatar email={selectedEmail} />
                    {(senderName(selectedEmail) || (typeof selectedEmail.to === 'string' && selectedEmail.to.trim())) && (
                      <div className="sender-details">
                        {senderName(selectedEmail) && <span dir="auto" lang={language(senderName(selectedEmail))}><CourseText value={senderName(selectedEmail)} mappings={courseMappings} onShow={showCoursePopover} onHide={hideCoursePopover} /></span>}
                        {typeof selectedEmail.to === 'string' && selectedEmail.to.trim() && (
                          <span className="recipient-detail">to <CourseText value={selectedEmail.to} mappings={courseMappings} onShow={showCoursePopover} onHide={hideCoursePopover} /></span>
                        )}
                      </div>
                    )}
                    <span className="reading-date">{formatDate(selectedEmail.date)}</span>
                  </div>
                </header>
                <section className="body-section" aria-label="Full email body" key={`${selectedEmail.date || ''}-${selected.index}`}>
                  {selectedDocument ? (
                    <iframe className="mail-body-frame" title={selectedEmail.title || 'Email content'}
                      ref={frameRef} sandbox="allow-same-origin" referrerPolicy="no-referrer" srcDoc={selectedDocument} onLoad={setupCourseFrame} />
                  ) : (
                    <div className="plain-body-scroll">
                      <pre className="mail-body" dir="auto" lang={language(selectedEmail.body)}><CourseText value={selectedEmail.body || 'This message has no body.'} mappings={courseMappings} onShow={showCoursePopover} onHide={hideCoursePopover} /></pre>
                    </div>
                  )}
                </section>
              </>
            ) : (
              <div className="reader-placeholder empty-reader">
                <span className="empty-mail-icon" aria-hidden="true"><Mail24Regular /></span>
                <h2>{query.trim() ? 'No matching messages' : 'Choose a message'}</h2>
                <p>{query.trim() ? 'Clear your search to return to the inbox.' : 'Select an email from the inbox to read it here.'}</p>
              </div>
            )}
          </article>
        </section>
      </div>
      </div>
      <button ref={coursesButtonRef} type="button" className={`courses-toggle${coursesOpen ? ' is-open' : ''}`}
        aria-label="Course names" title="Course names" aria-expanded={coursesOpen} aria-controls="course-names-panel"
        onClick={() => { hideCoursePopover(); setCoursesOpen((open) => !open) }}>
        <img src={courseBookIcon} width="24" height="24" alt="" aria-hidden="true" />
      </button>
      {coursesOpen && <div className="courses-overlay" onClick={closeCourses}>
        <CourseTable rows={courseRows} onRows={editCourseRows} onSave={saveCourseRows} onCancel={resetCourseRows} onReload={resetCourseRows} onClose={closeCourses}
          loading={coursesLoading} saving={coursesSaving} dirty={coursesDirty} error={coursesError} conflict={coursesConflict} status={coursesStatus} />
      </div>}
      {coursePopover && courseMappings[coursePopover.code] && createPortal(<div className="course-popover" role="tooltip" style={{
        left: Math.max(8, Math.min(window.innerWidth - Math.min(280, window.innerWidth - 16) - 8, (coursePopover.rect.left + coursePopover.rect.right) / 2 - 140)),
        top: coursePopover.rect.top >= 72 ? coursePopover.rect.top - 8 : coursePopover.rect.bottom + 8,
        transform: coursePopover.rect.top >= 72 ? 'translateY(-100%)' : undefined,
      }}>{courseMappings[coursePopover.code]}</div>, document.body)}
    </main>
  )
}
