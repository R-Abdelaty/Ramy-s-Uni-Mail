import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Spinner } from '@fluentui/react-components'
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
import { emailVisibilityKeys, isEmailHidden, loadVisibility as loadStoredVisibility, saveVisibility } from './emailVisibility.js'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { firebaseSetupError, getFirebaseServices } from './firebaseClient.js'
import { loadEmailArchive } from './firebaseEmails.js'

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
  const readingTitleRef = useRef(null)
  const inboxRef = useRef(null)
  const searchRef = useRef(null)

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
      await signInWithPopup(auth, provider)
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
    setVisibilityError('')
    try {
      if (!user) {
        setHiddenKeys(new Set())
        setVisibilityReady(false)
        return
      }
      setHiddenKeys(loadStoredVisibility(localStorage, user.uid))
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
      if (hidden) updated.add(emailKeys[0])
      else emailKeys.forEach((key) => updated.delete(key))
      saveVisibility(localStorage, user.uid, updated)
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
    if (readerOpen) readingTitleRef.current?.focus({ preventScroll: true })
  }, [readerOpen, selectedEmail])

  useEffect(() => {
    if (!selectedEmail && !loading) setReaderOpen(false)
  }, [selectedEmail, loading])

  function backToInbox() {
    setReaderOpen(false)
    requestAnimationFrame(() => {
      const selectedRow = inboxRef.current?.querySelector('.message-row[aria-pressed="true"]')
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
                    <button type="button" className={`message-row${index === selected?.index ? ' is-selected' : ''}${isEmailHidden(email, hiddenKeys) ? ' is-hidden' : ''}`}
                      style={{ '--message-color': messageColor(email) }} aria-pressed={index === selected?.index}
                      aria-label={`${isEmailHidden(email, hiddenKeys) ? 'Hidden email: ' : ''}${email.title || 'Untitled message'}`}
                      onClick={() => { setSelectedIndex(index); setReaderOpen(true) }}>
                      <Avatar email={email} />
                      <span className="message-summary">
                        <span className="message-row-top">
                          <span className="message-subject" dir="auto" lang={language(email.title)}>{email.title || 'Untitled message'}</span>
                          <span className="message-date" title={formatDate(email.date)}>{formatDate(email.date, true)}</span>
                        </span>
                        <span className="message-preview" dir="auto" lang={language(email.preview || email.body)}>
                          {email.preview || email.body || 'Open to read this message.'}
                        </span>
                      </span>
                    </button>
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
                    {selectedEmail.title || 'Untitled message'}
                  </h2>
                  <div className="reading-sender">
                    <Avatar email={selectedEmail} />
                    {(senderName(selectedEmail) || (typeof selectedEmail.to === 'string' && selectedEmail.to.trim())) && (
                      <div className="sender-details">
                        {senderName(selectedEmail) && <span dir="auto" lang={language(senderName(selectedEmail))}>{senderName(selectedEmail)}</span>}
                        {typeof selectedEmail.to === 'string' && selectedEmail.to.trim() && (
                          <span className="recipient-detail">to {selectedEmail.to}</span>
                        )}
                      </div>
                    )}
                    <span className="reading-date">{formatDate(selectedEmail.date)}</span>
                  </div>
                </header>
                <section className="body-section" aria-label="Full email body" key={`${selectedEmail.date || ''}-${selected.index}`}>
                  {selectedDocument ? (
                    <iframe className="mail-body-frame" title={selectedEmail.title || 'Email content'}
                      sandbox="" referrerPolicy="no-referrer" srcDoc={selectedDocument} />
                  ) : (
                    <div className="plain-body-scroll">
                      <pre className="mail-body" dir="auto" lang={language(selectedEmail.body)}>{selectedEmail.body || 'This message has no body.'}</pre>
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
    </main>
  )
}
