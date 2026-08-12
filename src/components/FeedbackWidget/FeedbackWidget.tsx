import { useEffect, useState } from 'react'
import { submitFeedback } from '../../services/feedbackService'

function FeedbackWidgetContent() {
  const [isOpen, setIsOpen] = useState(false)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSubmitted, setJustSubmitted] = useState(false)

  const closeModal = () => {
    if (isSubmitting) return
    setIsOpen(false)
    setNote('')
    setError(null)
  }

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isSubmitting])

  const handleSend = async () => {
    setIsSubmitting(true)
    setError(null)

    const result = await submitFeedback(note)

    if (!result.ok) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(false)
    setJustSubmitted(true)
    window.setTimeout(() => {
      setIsOpen(false)
      setNote('')
      setJustSubmitted(false)
    }, 1200)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Invia una segnalazione"
        className="fixed bottom-4 right-4 z-[60] flex items-center justify-center h-11 w-11 bg-primary text-background rounded-full shadow-medium transition-all duration-150 cursor-pointer hover:opacity-90 hover:scale-105 active:scale-95">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 px-4 py-4" onClick={closeModal}>
          <div
            className="animate-fade-in w-full max-w-[24rem] bg-background border border-border rounded-lg shadow-medium p-4 flex flex-col gap-3"
            onClick={(event) => event.stopPropagation()}>
            {justSubmitted ? (
              <p className="text-caption text-foreground">Grazie per la segnalazione!</p>
            ) : (
              <>
                <label htmlFor="feedback-note" className="text-caption font-semibold text-foreground">
                  Cosa non va?
                </label>
                <textarea
                  id="feedback-note"
                  autoFocus
                  rows={4}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Descrivi il problema (opzionale)"
                  className="text-caption text-foreground bg-surface border border-border rounded-md px-2 py-1.5 focus:outline-none focus:border-accent transition-colors duration-150 resize-none"
                />
                {error && <p className="text-caption text-destructive">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isSubmitting}
                    className="text-caption font-medium text-muted border border-border rounded-md px-3 py-1.5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:border-accent enabled:hover:text-accent enabled:hover:scale-105 enabled:active:scale-95">
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={isSubmitting}
                    className="text-caption font-semibold bg-primary text-background px-4 py-2 rounded-md transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:opacity-90 enabled:hover:scale-[1.03] enabled:active:scale-95">
                    {isSubmitting ? 'Invio...' : 'Invia'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function FeedbackWidget() {
  if (!import.meta.env.VITE_ENABLE_FEEDBACK) return null
  return <FeedbackWidgetContent />
}

export default FeedbackWidget
