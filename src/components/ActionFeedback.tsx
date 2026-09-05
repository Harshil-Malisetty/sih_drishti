import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, CircleMinus, Info, X } from 'lucide-react';

export type FeedbackTone = 'success' | 'neutral' | 'info' | 'error';
export type ActionFeedbackInput = string | { message: string; tone?: FeedbackTone };
type Feedback = { id: number; message: string; tone: FeedbackTone };
export const ACTION_FEEDBACK_EVENT = 'drishti:action-feedback';
let nextId = 0;

/** Available outside React too. Mount ActionFeedbackProvider once at the app root. */
export function notifyAction(message: string, tone: FeedbackTone = 'success'): void {
  if (!message.trim() || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<Feedback>(ACTION_FEEDBACK_EVENT, {
    detail: { id: ++nextId, message, tone },
  }));
}

const FeedbackContext = createContext({
  notify: notifyAction,
  dismiss: (_id: number) => {},
});

/** notify(message, tone?) defaults to success; dismiss(id) closes a rendered toast. */
export function useFeedback() {
  return useContext(FeedbackContext);
}

export function ActionFeedbackProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Feedback[]>([]);
  const dismiss = useCallback((id: number) => setItems(current => current.filter(item => item.id !== id)), []);
  useEffect(() => {
    const receive = (event: Event) => {
      const item = (event as CustomEvent<Feedback>).detail;
      if (!item || typeof item.message !== 'string' || !item.message.trim()) return;
      setItems([item]);
    };
    window.addEventListener(ACTION_FEEDBACK_EVENT, receive);
    return () => window.removeEventListener(ACTION_FEEDBACK_EVENT, receive);
  }, []);
  return <FeedbackContext.Provider value={{ notify: notifyAction, dismiss }}>
    {children}
    <div className="action-feedback-region" role="status" aria-live="polite" aria-atomic="false" aria-relevant="additions text">
      <ol className="action-feedback-list" aria-label="Action feedback">
        {items.map(item => <FeedbackToast key={item.id} item={item} dismiss={dismiss} />)}
      </ol>
    </div>
  </FeedbackContext.Provider>;
}

function FeedbackToast({ item, dismiss }: { item: Feedback; dismiss: (id: number) => void }) {
  const remaining = useRef(6000);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  useEffect(() => {
    if (paused) return;
    const started = performance.now();
    const timer = window.setTimeout(() => dismiss(item.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [item.id, dismiss, paused]);
  const Icon = item.tone === 'success' ? CheckCircle2 : item.tone === 'info' ? Info : CircleMinus;
  return <li className={`action-feedback action-feedback--${item.tone}`}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <Icon aria-hidden="true" />
    <p>{item.message}</p>
    <button type="button" onClick={() => dismiss(item.id)} aria-label={`Dismiss notification: ${item.message}`}><X aria-hidden="true" /></button>
  </li>;
}