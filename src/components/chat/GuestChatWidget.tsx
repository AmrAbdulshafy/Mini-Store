'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageSquare, RefreshCw, Send, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { playChatRingSound, unlockChatNotificationAudio } from '@/lib/chat-notification-sound';
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestAlertPreview, setLatestAlertPreview] = useState<string | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenMsgIdsRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);
  const openRef = useRef(open);
  const pendingForceNewRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Unlock mobile + desktop audio on first touch/click/key
  useEffect(() => {
    const unlock = () => unlockChatNotificationAudio();
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const handleIncomingAdminMessage = useCallback(
    (msg: ChatMessage, notifyIfNew: boolean) => {
      if (!msg?.id || seenMsgIdsRef.current.has(msg.id)) return;
      seenMsgIdsRef.current.add(msg.id);

      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));

      if (!notifyIfNew || msg.sender_type !== 'admin') return;

      playChatRingSound();

      if (!openRef.current) {
        setUnreadCount((c) => c + 1);
        setLatestAlertPreview(msg.body.slice(0, 90));
      }

      if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible' &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted'
      ) {
        const n = new window.Notification(
          lang === 'ar' ? 'رد جديد من إسراء بوتيك' : 'New reply from Esraa Boutique',
          { body: msg.body.slice(0, 140), tag: msg.id, icon: '/icon.svg' }
        );
        n.onclick = () => {
          window.focus();
          setOpen(true);
          setUnreadCount(0);
          setLatestAlertPreview(null);
          n.close();
        };
      }
    },
    [lang]
  );

  const loadSessionAndMessages = useCallback(async (forceNew = false) => {
    const cleanName = guestName.trim();
    const cleanPhone = guestPhone.trim();

    if (cleanName.length < 2) {
      setIdentityError(t.chat.nameRequiredError);
      return;
    }
    if (cleanPhone) {
      const digits = cleanPhone.replace(/\D/g, '');
      if (!/^[+\d\s()-]{7,25}$/.test(cleanPhone) || digits.length < 7 || digits.length > 20) {
        setIdentityError(t.chat.phoneInvalidError);
        return;
      }
    }

    setIdentityError(null);
    setLoading(true);
    setError(null);
    const shouldForceNew = forceNew || pendingForceNewRef.current;
    try {
      const sessionRes = await fetch('/api/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: cleanName,
          guestPhone: cleanPhone || undefined,
          forceNew: shouldForceNew,
        }),
      });
      if (!sessionRes.ok) {
        if (sessionRes.status === 400) {
          const errData = (await sessionRes.json().catch(() => ({}))) as {
            code?: string;
            error?: string;
          };
          if (errData.code === 'NAME_REQUIRED' || /name/i.test(errData.error || '')) {
            setIdentityError(t.chat.nameRequiredError);
          } else if (errData.code === 'PHONE_INVALID' || /phone/i.test(errData.error || '')) {
            setIdentityError(t.chat.phoneInvalidError);
          } else {
            setIdentityError(t.chat.invalidSessionInput);
          }
          return;
        }
        throw new Error('session_error');
      }
      const sessionData = await sessionRes.json();
      pendingForceNewRef.current = false;
      setConversation(sessionData.conversation);

      const msgRes = await fetch('/api/chat/messages', { cache: 'no-store' });
      if (!msgRes.ok) throw new Error('messages_error');
      const msgData = await msgRes.json();
      if (msgData.conversation) setConversation(msgData.conversation);
      const list = Array.isArray(msgData.messages) ? (msgData.messages as ChatMessage[]) : [];
      list.forEach((m) => seenMsgIdsRef.current.add(m.id));
      hydratedRef.current = true;
      setMessages(list);
    } catch {
      setError(t.chat.errorLoad);
    } finally {
      setLoading(false);
    }
  }, [
    guestName,
    guestPhone,
    t.chat.errorLoad,
    t.chat.invalidSessionInput,
    t.chat.nameRequiredError,
    t.chat.phoneInvalidError,
  ]);

  const pollMessages = useCallback(async () => {
    if (pendingForceNewRef.current) return;
    try {
      const res = await fetch('/api/chat/messages', { cache: 'no-store' });
      if (!res.ok || pendingForceNewRef.current) return;
      const data = await res.json();
      if (data.conversation) setConversation(data.conversation);
      if (Array.isArray(data.messages)) {
        const list = data.messages as ChatMessage[];
        if (!hydratedRef.current) {
          list.forEach((m) => seenMsgIdsRef.current.add(m.id));
          hydratedRef.current = true;
          setMessages(list);
        } else {
          list.forEach((m) => handleIncomingAdminMessage(m, true));
        }
      }
    } catch {
      // silent background poll failure
    }
  }, [handleIncomingAdminMessage]);

  // Silent initial hydration if returning guest already has a session cookie
  useEffect(() => {
    if (pathname?.startsWith('/admin') || !settings.enable_guest_chat) return;
    const timer = setTimeout(() => {
      void pollMessages();
    }, 0);
    return () => clearTimeout(timer);
  }, [pathname, settings.enable_guest_chat, pollMessages]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setUnreadCount(0);
      setLatestAlertPreview(null);
      if (conversation) {
        void pollMessages();
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [open, conversation, pollMessages]);

  // Real-time instant sync via Supabase Broadcast for this conversation (works open or closed)
  useEffect(() => {
    const convId = conversation?.id;
    if (!convId || pathname?.startsWith('/admin') || !settings.enable_guest_chat) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`guest-conv-${convId}`)
      .on('broadcast', { event: 'admin_reply' }, ({ payload }) => {
        if (payload && typeof payload === 'object') {
          handleIncomingAdminMessage(payload as ChatMessage, true);
        }
      })
      .on('broadcast', { event: 'status_change' }, ({ payload }) => {
        const nextStatus = (payload as { status?: 'open' | 'closed' })?.status;
        if (nextStatus === 'open' || nextStatus === 'closed') {
          setConversation((prev) => (prev ? { ...prev, status: nextStatus } : prev));
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversation?.id, pathname, settings.enable_guest_chat, handleIncomingAdminMessage]);

  // Lightweight fallback poll (8s while open, 15s while closed with active conversation)
  useEffect(() => {
    if (!conversation?.id) return;
    const interval = setInterval(pollMessages, open ? 8000 : 15000);
    return () => clearInterval(interval);
  }, [open, conversation?.id, pollMessages]);

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
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError(t.chat.errorSend);
      return;
    }

    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
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
        seenMsgIdsRef.current.add(data.message.id);
        setMessages((prev) => (prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]));
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
        <div
          className="flex h-[480px] w-[340px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-xl border bg-white/95 shadow-2xl backdrop-blur-2xl sm:w-[370px] dark:bg-[#24171F]/95"
          style={{ borderColor: 'var(--border-glass)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-[#141210] px-4 py-3.5 text-[#F6F3EE] dark:bg-[#221F1D]">
            <div>
              <h3 className="text-sm font-semibold">{t.chat.title}</h3>
              <p className="text-[11px] opacity-80">
                {conversation?.status === 'closed' ? t.chat.closedStatus : t.chat.openStatus}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-white/10 p-1.5 transition-colors hover:bg-white/20"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!conversation ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void loadSessionAndMessages(false);
              }}
              className="flex flex-1 flex-col justify-center gap-3 p-5"
            >
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                {t.chat.startChatPrompt}
              </p>
              <input
                type="text"
                required
                minLength={2}
                maxLength={60}
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder={t.chat.namePlaceholder}
                className="w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-xs outline-none focus:border-[var(--accent)]"
                style={{ borderColor: 'var(--border-glass)' }}
              />
              <input
                type="tel"
                maxLength={25}
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder={t.chat.phonePlaceholder}
                className="w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-xs outline-none focus:border-[var(--accent)]"
                style={{ borderColor: 'var(--border-glass)' }}
              />
              {(identityError || error) && (
                <p className="text-[11px] font-medium text-rose-500">{identityError || error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="cta-luxury mt-1 rounded-full py-2.5 text-xs font-semibold disabled:opacity-50"
              >
                {loading ? t.chat.loading : t.chat.startChatBtn}
              </button>
            </form>
          ) : (
            <>
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
                onClick={() => {
                  pendingForceNewRef.current = true;
                  setConversation(null);
                  setMessages([]);
                  seenMsgIdsRef.current.clear();
                  hydratedRef.current = false;
                  setError(null);
                  setIdentityError(null);
                }}
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
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-end gap-2">
          {latestAlertPreview && (
            <button
              type="button"
              onClick={() => {
                setOpen(true);
                setUnreadCount(0);
                setLatestAlertPreview(null);
              }}
              className="glass-card max-w-[240px] rounded-2xl border px-3.5 py-2 text-start text-xs shadow-xl transition-transform hover:scale-[1.02]"
              style={{ borderColor: 'var(--border-glass)' }}
            >
              <span className="block text-[10px] font-bold text-[var(--accent-strong)]">
                {lang === 'ar' ? 'رد جديد' : 'New reply'}
              </span>
              <span className="line-clamp-2 text-[11px] opacity-85">{latestAlertPreview}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              unlockChatNotificationAudio();
              setOpen(true);
              setUnreadCount(0);
              setLatestAlertPreview(null);
            }}
            className="cta-luxury relative flex items-center gap-2.5 rounded-md px-4 py-3 text-xs font-semibold tracking-wider uppercase shadow-lg"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">{t.chat.title}</span>
            {unreadCount > 0 && (
              <span className="absolute -top-2 -end-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white shadow">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
