'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, RefreshCw, Send, X } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import type { ChatMessage, Conversation } from '@/types/database';

export function GuestChatWidget() {
  const { lang, settings, t } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [guestName, setGuestName] = useState('');
  const [body, setBody] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadSessionAndMessages = useCallback(async (forceNew = false) => {
    setLoading(true);
    setError(null);
    try {
      const sessionRes = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestName: guestName || undefined, forceNew }),
      });
      if (!sessionRes.ok) throw new Error('session_error');
      const sessionData = await sessionRes.json();
      setConversation(sessionData.conversation);

      const msgRes = await fetch('/api/chat/messages', { cache: 'no-store' });
      if (!msgRes.ok) throw new Error('messages_error');
      const msgData = await msgRes.json();
      if (msgData.conversation) setConversation(msgData.conversation);
      setMessages(Array.isArray(msgData.messages) ? msgData.messages : []);
    } catch {
      setError(t.chat.errorLoad);
    } finally {
      setLoading(false);
    }
  }, [guestName, t.chat.errorLoad]);

  const pollMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/messages', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.conversation) setConversation(data.conversation);
      if (Array.isArray(data.messages)) setMessages(data.messages);
    } catch {
      // silent background poll failure
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      void loadSessionAndMessages(false);
    }, 0);
    return () => clearTimeout(timer);
  }, [open, loadSessionAndMessages]);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(pollMessages, 4500);
    return () => clearInterval(interval);
  }, [open, pollMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  if (pathname?.startsWith('/admin') || !settings.enable_guest_chat) {
    return null;
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending || conversation?.status === 'closed') return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed, guestName: guestName || undefined }),
      });

      if (res.status === 429) {
        setError(t.chat.rateLimit);
        return;
      }
      if (!res.ok) {
        setError(t.chat.errorSend);
        return;
      }

      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
      setBody('');
    } catch {
      setError(t.chat.errorSend);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 end-5 z-50">
      {open ? (
        <div className="glass-card flex h-[480px] w-[340px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-3xl shadow-2xl sm:w-[370px]">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3.5 text-white"
            style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
          >
            <div>
              <h3 className="text-sm font-bold">{t.chat.title}</h3>
              <p className="text-[11px] opacity-90">
                {conversation?.status === 'closed' ? t.chat.closedStatus : t.chat.openStatus}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-white/20 p-1.5 transition-colors hover:bg-white/30"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Optional Guest Name */}
          <div
            className="border-b px-3.5 py-2"
            style={{ borderColor: 'var(--border-glass)', background: 'var(--bg-subtle)' }}
          >
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={t.chat.namePlaceholder}
              maxLength={60}
              className="w-full rounded-xl bg-transparent px-2 py-1 text-xs outline-none placeholder:opacity-60"
            />
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {loading && messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-xs opacity-70">
                {t.chat.loading}
              </div>
            ) : error && messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs">
                <p className="text-rose-500">{error}</p>
                <button
                  type="button"
                  onClick={() => loadSessionAndMessages(false)}
                  className="flex items-center gap-1 rounded-full bg-[var(--accent)] px-3 py-1.5 text-white"
                >
                  <RefreshCw className="h-3 w-3" />
                  {t.chat.retry}
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-[var(--bg-subtle)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {t.chat.welcome}
                </div>
                {messages.map((m) => {
                  const isGuest = m.sender_type === 'guest';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isGuest ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          isGuest
                            ? 'text-white'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                        }`}
                        style={isGuest ? { backgroundColor: 'var(--accent)' } : undefined}
                      >
                        {m.body}
                      </div>
                      <span className="mt-1 px-1 text-[10px] opacity-55">
                        {new Date(m.created_at).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Error banner */}
          {error && messages.length > 0 && (
            <div className="bg-rose-500/15 px-3 py-1.5 text-center text-[11px] text-rose-600 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Footer / Input */}
          {conversation?.status === 'closed' ? (
            <div className="border-t p-3 text-center" style={{ borderColor: 'var(--border-glass)' }}>
              <button
                type="button"
                onClick={() => loadSessionAndMessages(true)}
                className="w-full rounded-2xl py-2.5 text-xs font-semibold text-white"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {t.chat.startNew}
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2 border-t p-3"
              style={{ borderColor: 'var(--border-glass)' }}
            >
              <input
                type="text"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t.chat.messagePlaceholder}
                maxLength={1000}
                className="flex-1 rounded-2xl border bg-transparent px-3.5 py-2 text-xs outline-none focus:border-[var(--accent)]"
                style={{ borderColor: 'var(--border-glass)' }}
              />
              <button
                type="submit"
                disabled={sending || !body.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-2xl text-white transition-opacity disabled:opacity-45"
                style={{ backgroundColor: 'var(--accent)' }}
                aria-label={t.chat.send}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2.5 rounded-full px-5 py-3.5 text-sm font-semibold text-white shadow-xl transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-secondary))' }}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="hidden sm:inline">{t.chat.title}</span>
        </button>
      )}
    </div>
  );
}
