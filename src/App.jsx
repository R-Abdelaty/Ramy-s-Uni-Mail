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
import { emailDocument, emailTitle, initials, language, messageColor, senderName } from './mailPresentation.js'
import { emailVisibilityKeys, isEmailHidden } from './emailVisibility.js'
import { matchCourses, validateCourseRows } from './courseMappings.js'
import { DEMO_EMAILS, DEMO_COURSES, DEMO_BOOT_MS } from './demoData.js'
import { annotateCourseDocument } from './annotateCourses.js'
import courseBookIcon from './assets/course-book.svg'
import { buildSearchIndex, searchEmails, parseSearchTerms, highlightSearchDocument } from './mailSearch.js'
import SearchText from './SearchText.jsx'

function CourseText({ value, mappings, onShow, onHide, searchTerms = [] }) {
  if (typeof value !== 'string') return value
  const matches = matchCourses(value, mappings)
  if (!matches.length) return <SearchText value={value} terms={searchTerms} />
  const parts = []
  let cursor = 0
  for (const match of matches) {
    if (match.start > cursor) parts.push(<SearchText key={`text-${cursor}`} value={value.slice(cursor, match.start)} terms={searchTerms} />)
    parts.push(<span className="course-code" role="button" tabIndex={0} key={`${match.start}-${match.code}`}
      aria-label={`${match.code}: ${match.name}`}
      onMouseEnter={(event) => onShow(match.code, event.currentTarget)}
      onMouseLeave={onHide}
      onFocus={(event) => onShow(match.code, event.currentTarget)}
      onBlur={onHide}
      onClick={(event) => { event.stopPropagation(); onShow(match.code, event.currentTarget) }}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onShow(match.code, event.currentTarget) } }}>
      <SearchText value={match.text} terms={searchTerms} />
    </span>)
    cursor = match.end
  }
  if (cursor < value.length) parts.push(<SearchText key={`text-${cursor}`} value={value.slice(cursor)} terms={searchTerms} />)
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
  const emails = DEMO_EMAILS
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [readerOpen, setReaderOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hiddenKeys, setHiddenKeys] = useState(() => new Set())
  const [visibilityStatus, setVisibilityStatus] = useState('')
  const [courseMappings, setCourseMappings] = useState(DEMO_COURSES)
  const [courseRows, setCourseRows] = useState(() => Object.entries(DEMO_COURSES).map(([code, name]) => ({ id: crypto.randomUUID(), code, name })))
  const [coursesDirty, setCoursesDirty] = useState(false)
  const [coursesError, setCoursesError] = useState('')
  const [coursesStatus, setCoursesStatus] = useState('')
  const [coursePopover, setCoursePopover] = useState(null)
  const [coursesOpen, setCoursesOpen] = useState(false)
  const coursesButtonRef = useRef(null)
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
    const timer = window.setTimeout(() => setLoading(false), DEMO_BOOT_MS)
    return () => window.clearTimeout(timer)
  }, [])

  function editCourseRows(rows) {
    setCourseRows(rows)
    setCoursesDirty(true)
    setCoursesError('')
    setCoursesStatus('Unsaved changes')
  }

  function resetCourseRows() {
    setCourseRows(rowsFromMappings(courseMappings))
    setCoursesDirty(false)
    setCoursesError('')
    setCoursesStatus('')
  }

  function saveCourseRows() {
    setCoursesError('')
    let mappings
    try { mappings = validateCourseRows(courseRows) } catch (error) { setCoursesError(error.message); return }
    setCoursesDirty(false)
    setCourseRows(rowsFromMappings(mappings))
    setCourseMappings(mappings)
    setCoursesStatus('Course names saved for this demo session.')
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

  function resetDemo() {
    setHiddenKeys(new Set())
    setSelectedIndex(0)
    setQuery('')
    setReaderOpen(false)
    setCourseMappings(DEMO_COURSES)
    setCourseRows(rowsFromMappings(DEMO_COURSES))
    setCoursesDirty(false)
    setCoursesError('')
    setCoursesStatus('')
    setCoursesOpen(false)
    hideCoursePopover()
    setVisibilityStatus('Demo reset. All sample messages are visible.')
  }

  function toggleVisibility(email) {
    const hidden = !isEmailHidden(email, hiddenKeys)
    setHiddenKeys((current) => {
      const updated = new Set(current)
      for (const key of emailVisibilityKeys(email)) {
        if (hidden) updated.add(key)
        else updated.delete(key)
      }
      return updated
    })
    setVisibilityStatus(hidden ? 'Email hidden.' : 'Email shown.')
  }

  const searchTerms = useMemo(() => parseSearchTerms(query, courseMappings), [query, courseMappings])
  const searchIndex = useMemo(() => buildSearchIndex(emails), [emails])
  const visibleEmails = useMemo(() => searchEmails(searchIndex, searchTerms), [searchIndex, searchTerms])
  const selected = visibleEmails.find(({ index }) => index === selectedIndex) || visibleEmails[0]
  const selectedEmail = selected?.email
  const selectedDocument = useMemo(() => selectedEmail?.html_body ? emailDocument(selectedEmail) : '', [selectedEmail])

  useEffect(() => {
    const frame = frameRef.current
    const document = frame?.contentDocument
    if (!document?.body) return
    const scrollTop = document.scrollingElement?.scrollTop || 0
    annotateCourseDocument(document, courseMappings)
    highlightSearchDocument(document, searchTerms)
    if (document.scrollingElement) document.scrollingElement.scrollTop = scrollTop
    revealFrameMatch(document)
  }, [courseMappings, selectedDocument, searchTerms])

  useEffect(() => {
    const container = document.querySelector('.plain-body-scroll')
    const marker = container?.querySelector('.search-highlight')
    if (marker) container.scrollTop += marker.getBoundingClientRect().top - container.getBoundingClientRect().top - 32
  }, [selectedEmail, searchTerms, readerOpen])

  function revealFrameMatch(document) {
    const marker = document.querySelector('.search-highlight')
    if (marker && document.scrollingElement) document.scrollingElement.scrollTop += marker.getBoundingClientRect().top - 32
  }

  useEffect(() => {
    const syncFrameWeight = () => {
      const frame = frameRef.current
      const root = frame?.contentDocument?.documentElement
      if (root) root.style.fontWeight = window.getComputedStyle(frame).fontWeight
    }
    window.addEventListener('resize', syncFrameWeight)
    return () => window.removeEventListener('resize', syncFrameWeight)
  }, [])

  function setupCourseFrame(event) {
    frameCleanupRef.current?.()
    const frame = event.currentTarget
    const document = frame.contentDocument
    if (!document?.body) return
    document.documentElement.style.fontWeight = window.getComputedStyle(frame).fontWeight
    annotateCourseDocument(document, courseMappings)
    highlightSearchDocument(document, searchTerms)
    revealFrameMatch(document)
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

  if (loading) return <main className="sign-in-screen"><Spinner label="Loading inbox" /></main>

  return (
    <main className="page-shell">
      <div className="mail-layout">
      <div className="mail-window">
        <header className="window-toolbar">
          <div className="toolbar-actions">
            <span className="snapshot-time">Demo inbox · Sample emails</span>
            <Button appearance="subtle" icon={<ArrowSync20Regular />} className="refresh-button"
              aria-label="Reset demo" title="Reset demo" onClick={resetDemo} />
          </div>
        </header>

        <span className="sr-only" role="status">{visibilityStatus}</span>

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
            ) : visibleEmails.length === 0 ? (
              <div className="state-panel">
                <span className="state-icon" aria-hidden="true"><Search20Regular /></span>
                <h3>No matching messages</h3>
                <p>Try another subject, sender, or keyword.</p>
                <Button appearance="secondary" onClick={() => { setQuery(''); searchRef.current?.focus() }}>Clear search</Button>
              </div>
            ) : (
              <ul className="message-list" aria-label="Latest messages">
                {visibleEmails.map(({ email, index, snippet }) => (
                  <li className="message-item" key={emailVisibilityKeys(email)[0]}>
                    <div className={`message-row${index === selected?.index ? ' is-selected' : ''}${isEmailHidden(email, hiddenKeys) ? ' is-hidden' : ''}${searchTerms.length ? ' is-search-result' : ''}`}
                      style={{ '--message-color': messageColor(email) }}>
                      <button type="button" className="message-open" aria-pressed={index === selected?.index}
                        aria-label={`${isEmailHidden(email, hiddenKeys) ? 'Hidden email: ' : ''}${emailTitle(email)}`}
                        onClick={() => { setSelectedIndex(index); setReaderOpen(true) }} />
                      <Avatar email={email} />
                      <span className="message-summary">
                        <span className="message-row-top">
                          <span className="message-subject" dir="auto" lang={language(emailTitle(email))}><CourseText value={emailTitle(email)} mappings={courseMappings} searchTerms={searchTerms} onShow={showCoursePopover} onHide={hideCoursePopover} /></span>
                          <span className="message-date" title={formatDate(email.date)}>{formatDate(email.date, true)}</span>
                        </span>
                        <span className="message-preview" dir="auto" lang={language(snippet)}>
                          <CourseText value={snippet} mappings={courseMappings} searchTerms={searchTerms} onShow={showCoursePopover} onHide={hideCoursePopover} />
                        </span>
                      </span>
                    </div>
                    <Button className="visibility-toggle" appearance="subtle" size="small"
                      icon={isEmailHidden(email, hiddenKeys) ? <Eye20Regular /> : <EyeOff20Regular />}
                      title={isEmailHidden(email, hiddenKeys) ? 'Show email' : 'Hide email'}
                      aria-label={`${isEmailHidden(email, hiddenKeys) ? 'Show' : 'Hide'} email: ${emailTitle(email)}`}
                      aria-pressed={isEmailHidden(email, hiddenKeys)}
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
                      aria-label={isEmailHidden(selectedEmail, hiddenKeys) ? 'Show email' : 'Hide email'}
                      title={isEmailHidden(selectedEmail, hiddenKeys) ? 'Show email' : 'Hide email'}
                      aria-pressed={isEmailHidden(selectedEmail, hiddenKeys)}
                      onClick={() => toggleVisibility(selectedEmail)} />
                  </div>
                </div>
                <header className="reading-header">
                  <h2 ref={readingTitleRef} tabIndex={-1} className="reading-title" dir="auto" lang={language(emailTitle(selectedEmail))}>
                    <CourseText value={emailTitle(selectedEmail)} mappings={courseMappings} searchTerms={searchTerms} onShow={showCoursePopover} onHide={hideCoursePopover} />
                  </h2>
                  <div className="reading-sender">
                    <Avatar email={selectedEmail} />
                    {(senderName(selectedEmail) || (typeof selectedEmail.to === 'string' && selectedEmail.to.trim())) && (
                      <div className="sender-details">
                        {senderName(selectedEmail) && <span dir="auto" lang={language(senderName(selectedEmail))}><CourseText value={senderName(selectedEmail)} mappings={courseMappings} searchTerms={searchTerms} onShow={showCoursePopover} onHide={hideCoursePopover} /></span>}
                        {typeof selectedEmail.to === 'string' && selectedEmail.to.trim() && (
                          <span className="recipient-detail">to <CourseText value={selectedEmail.to} mappings={courseMappings} searchTerms={searchTerms} onShow={showCoursePopover} onHide={hideCoursePopover} /></span>
                        )}
                      </div>
                    )}
                    <span className="reading-date">{formatDate(selectedEmail.date)}</span>
                  </div>
                </header>
                <section className="body-section" aria-label="Full email body" key={`${selectedEmail.date || ''}-${selected.index}`}>
                  {selectedDocument ? (
                    <iframe className="mail-body-frame" title={emailTitle(selectedEmail)}
                      ref={frameRef} sandbox="allow-same-origin" referrerPolicy="no-referrer" srcDoc={selectedDocument} onLoad={setupCourseFrame} />
                  ) : (
                    <div className="plain-body-scroll">
                      <pre className="mail-body" dir="auto" lang={language(selectedEmail.body)}><CourseText value={selectedEmail.body || 'This message has no body.'} mappings={courseMappings} searchTerms={searchTerms} onShow={showCoursePopover} onHide={hideCoursePopover} /></pre>
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
          loading={false} saving={false} dirty={coursesDirty} error={coursesError} conflict={false} status={coursesStatus} />
      </div>}
      {coursePopover && courseMappings[coursePopover.code] && createPortal(<div className="course-popover" role="tooltip" style={{
        left: Math.max(8, Math.min(window.innerWidth - Math.min(280, window.innerWidth - 16) - 8, (coursePopover.rect.left + coursePopover.rect.right) / 2 - 140)),
        top: coursePopover.rect.top >= 72 ? coursePopover.rect.top - 8 : coursePopover.rect.bottom + 8,
        transform: coursePopover.rect.top >= 72 ? 'translateY(-100%)' : undefined,
      }}>{courseMappings[coursePopover.code]}</div>, document.body)}
    </main>
  )
}
