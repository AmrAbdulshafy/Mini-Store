'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Lock, LockOpen, Minus, Phone, RefreshCw, Send, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { ChatMessage, Conversation, Language } from '@/types/database';

/**
 * On-demand responsive Admin Chat Modal.
 * Opens ONLY when an admin selects a conversation from the list or clicks a notification.
 * Renders nothing when closed or minimized (no persistent floating launcher).
 */
export function AdminChatBubble({
  lang,
  adminId,
  conversationId,
  conversation,
  isOpen,
  isMinimized,
  latestIncomingMessage,
  setConversations,
  onNotify,
  onMinimize,
  onClose,
}: {
  lang: Language;
  adminId: string;
  conversationId: string | null;
  conversation: Conversation | null;
  isOpen: boolean;
  isMinimized: boolean;
  latestIncomingMessage?: ChatMessage | null;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  onNotify: (msg: string, isError?: boolean) => void;
  onMinimize: () => void;
  onClose: () => void;
}) {
  const [messagesByConvId, setMessagesByConvId] = useState<Record<string, ChatMessage[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftsByConvId, setDraftsByConvId] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const activeConvId = conversation?.id ?? conversationId ?? null;
  const isVisibleModal = isOpen && !isMinimized && Boolean(activeConvId);
  const messages = useMemo(
    () => (activeConvId ? messagesByConvId[activeConvId] ?? [] : []),
    [activeConvId, messagesByConvId]
  );
  const reply = activeConvId ? draftsByConvId[activeConvId] ?? '' : '';

  const setReplyForActive = useCallback(
    (value: string) => {
      if (!activeConvId) return;
      setDraftsByConvId((prev) => ({ ...prev, [activeConvId]: value }));
    },
    [activeConvId]
  );

  // If opened via notification deep-link for a conversation not yet in local state, fetch it as admin
  useEffect(() => {
    if (!isVisibleModal || !activeConvId || conversation) return;
    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from('conversations')
      .select('*')
      .eq('id', activeConvId)
      .single()
      .then(({ data }) => {
        if (cancelled || !data) return;
        const fetched = data as Conversation;
        setConversations((prev) =>
          prev.some((c) => c.id === fetched.id) ? prev : [fetched, ...prev]
        );
      });
    return () => {
      cancelled = true;
    };
  }, [isVisibleModal, activeConvId, conversation, setConversations]);

  const loadMessages = useCallback(
    async (targetId: string) => {
      const seq = ++requestSeqRef.current;
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error: fetchErr } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', targetId)
          .order('created_at', { ascending: true });

        if (seq !== requestSeqRef.current) return;
        if (fetchErr) throw fetchErr;
        if (data) {
          setMessagesByConvId((prev) => ({ ...prev, [targetId]: data as ChatMessage[] }));
        }

        await supabase.from('conversations').update({ unread_by_admin: 0 }).eq('id', targetId);
        if (seq !== requestSeqRef.current) return;
        setConversations((prev) =>
          prev.map((c) => (c.id === targetId ? { ...c, unread_by_admin: 0 } : c))
        );
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    },
    [setConversations]
  );

  // Load fresh thread when modal opens or conversation changes
  useEffect(() => {
    if (!activeConvId || !isVisibleModal) return;
    const timer = setTimeout(() => {
      void loadMessages(activeConvId);
    }, 0);
    return () => clearTimeout(timer);
  }, [activeConvId, isVisibleModal, loadMessages]);

  // Refresh open modal immediately when Realtime delivers a message for this conversation
  useEffect(() => {
    if (!latestIncomingMessage || latestIncomingMessage.conversation_id !== activeConvId) return;
    if (!isVisibleModal || !activeConvId) return;
    const timer = setTimeout(() => {
      void loadMessages(activeConvId);
    }, 0);
    return () => clearTimeout(timer);
  }, [latestIncomingMessage, activeConvId, isVisibleModal, loadMessages]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current && isVisibleModal) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isVisibleModal]);

  // Body scroll lock, Escape key close, and focus management/restoration
  useEffect(() => {
    if (!isVisibleModal) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollY = window.scrollY;
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    const focusTimer = setTimeout(() => {
      if (inputRef.current && !inputRef.current.disabled) {
        inputRef.current.focus();
      } else {
        dialogRef.current?.focus();
      }
    }, 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.getClientRects().length > 0);

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (!active || !dialogRef.current.contains(active)) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        } else if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      window.scrollTo(0, scrollY);
      previousFocusRef.current?.focus?.();
    };
  }, [isVisibleModal]);

  if (!isVisibleModal || !activeConvId) {
    return null;
  }

  const displayName = conversation?.guest_name || (lang === 'ar' ? 'زائر' : 'Guest');
  const convStatus = conversation?.status ?? 'open';

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = reply.trim();
    if (!text || sending || convStatus === 'closed') return;
    setSending(true);
    try {
      const supabase = createClient();
      const { data, error: sendErr } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: activeConvId,
          sender_type: 'admin',
          sender_admin_id: adminId,
          body: text,
        })
        .select('*')
        .single();
      if (sendErr || !data) throw sendErr;

      await supabase
        .from('conversations')
        .update({
          last_message_at: data.created_at,
          last_message_preview: text.slice(0, 120),
          unread_by_guest: (conversation?.unread_by_guest || 0) + 1,
        })
        .eq('id', activeConvId);

      setMessagesByConvId((prev) => {
        const list = prev[activeConvId] ?? [];
        if (list.some((m) => m.id === data.id)) return prev;
        return { ...prev, [activeConvId]: [...list, data as ChatMessage] };
      });
      setReplyForActive('');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to send reply', true);
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    const nextStatus = convStatus === 'open' ? 'closed' : 'open';
    const supabase = createClient();
    const { error: statusErr } = await supabase
      .from('conversations')
      .update({ status: nextStatus })
      .eq('id', activeConvId);
    if (statusErr) {
      onNotify(statusErr.message, true);
      return;
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConvId ? { ...c, status: nextStatus } : c))
    );
    onNotify(
      nextStatus === 'closed'
        ? lang === 'ar'
          ? 'تم إغلاق المحادثة'
          : 'Conversation closed'
        : lang === 'ar'
          ? 'تم إعادة فتح المحادثة'
          : 'Conversation reopened'
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4 md:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-white/98 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none sm:h-[min(86dvh,680px)] sm:max-w-[460px] sm:rounded-2xl sm:border sm:pt-0 sm:pb-0 sm:backdrop-blur-2xl dark:bg-[#24171F]/98"
        style={{ borderColor: 'var(--border-glass)' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={displayName}
      >
        {/* Header matching GuestChatWidget */}
        <div className="flex shrink-0 items-center justify-between gap-2 bg-[#141210] px-4 py-3.5 text-[#F6F3EE] dark:bg-[#221F1D]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{displayName}</h3>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  convStatus === 'open'
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-zinc-500/30 text-zinc-300'
                }`}
              >
                {convStatus}
              </span>
            </div>
            {conversation?.guest_phone && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] opacity-80" dir="ltr">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate">{conversation.guest_phone}</span>
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => void toggleStatus()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              title={
                convStatus === 'open'
                  ? lang === 'ar'
                    ? 'إغلاق المحادثة'
                    : 'Close conversation'
                  : lang === 'ar'
                    ? 'إعادة فتح المحادثة'
                    : 'Reopen conversation'
              }
              aria-label={
                convStatus === 'open'
                  ? lang === 'ar'
                    ? 'إغلاق المحادثة'
                    : 'Close conversation'
                  : lang === 'ar'
                    ? 'إعادة فتح المحادثة'
                    : 'Reopen conversation'
              }
            >
              {convStatus === 'open' ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <LockOpen className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={onMinimize}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              title={lang === 'ar' ? 'تصغير' : 'Minimize'}
              aria-label={lang === 'ar' ? 'تصغير' : 'Minimize'}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              title={lang === 'ar' ? 'إغلاق' : 'Close'}
              aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Message Thread */}
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-4 text-xs">
          {loading && messages.length === 0 ? (
            <div className="flex h-full items-center justify-center gap-2 opacity-60">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
            </div>
          ) : error && messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <p className="text-rose-500">{error}</p>
              <button
                type="button"
                onClick={() => void loadMessages(activeConvId)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-1.5 text-xs font-semibold text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
              </button>
            </div>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center opacity-60">
              {lang === 'ar' ? 'لا توجد رسائل بعد.' : 'No messages yet.'}
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2 leading-relaxed ${
                    m.sender_type === 'admin'
                      ? 'bg-[#141210] text-[#F6F3EE] dark:bg-[var(--accent)] dark:text-[#141210]'
                      : 'bg-[var(--bg-subtle)] text-[var(--text-primary)]'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <span className="mt-1 block text-[9px] opacity-60">
                    {new Date(m.created_at).toLocaleTimeString(
                      lang === 'ar' ? 'ar-EG' : 'en-US',
                      { hour: '2-digit', minute: '2-digit' }
                    )}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={handleSendReply}
          className="flex shrink-0 items-center gap-2 border-t p-3"
          style={{ borderColor: 'var(--border-glass)' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={reply}
            onChange={(e) => setReplyForActive(e.target.value)}
            disabled={sending || convStatus === 'closed'}
            placeholder={
              convStatus === 'closed'
                ? lang === 'ar'
                  ? 'المحادثة مغلقة'
                  : 'Conversation is closed'
                : lang === 'ar'
                  ? 'اكتبي ردك للعميل...'
                  : 'Type your reply...'
            }
            maxLength={1500}
            className="min-w-0 flex-1 rounded-full border bg-transparent px-4 py-2.5 text-xs outline-none focus:border-[var(--accent)] disabled:opacity-50"
            style={{ borderColor: 'var(--border-glass)' }}
          />
          <button
            type="submit"
            disabled={sending || !reply.trim() || convStatus === 'closed'}
            className="cta-luxury flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40"
            aria-label={lang === 'ar' ? 'إرسال' : 'Send'}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
