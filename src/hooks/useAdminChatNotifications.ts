'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { playChatRingSound, unlockChatNotificationAudio } from '@/lib/chat-notification-sound';
import type { ChatMessage, Conversation, Language } from '@/types/database';

export interface AdminChatNotificationItem {
  id: string; // message.id (used for deduplication)
  conversationId: string;
  guestName: string | null;
  preview: string;
  createdAt: string;
}

export function useAdminChatNotifications({
  lang,
  conversations,
  setConversations,
  isBubbleOpen,
  isBubbleMinimized,
  activeConversationId,
  onOpenConversation,
}: {
  lang: Language;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  isBubbleOpen: boolean;
  isBubbleMinimized: boolean;
  activeConversationId: string | null;
  onOpenConversation: (conversationId: string) => void;
}) {
  const [notifications, setNotifications] = useState<AdminChatNotificationItem[]>([]);
  const [latestGuestMessage, setLatestGuestMessage] = useState<ChatMessage | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<string>('INIT');
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return window.Notification.permission;
  });

  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const cursorSeqRef = useRef<number>(0);
  const baselineReadyRef = useRef(false);
  const reconcilingRef = useRef(false);
  const pendingReconcileRef = useRef(false);
  const isBubbleOpenRef = useRef(isBubbleOpen);
  const isBubbleMinimizedRef = useRef(isBubbleMinimized);
  const activeConvIdRef = useRef(activeConversationId);
  const conversationsRef = useRef(conversations);
  const langRef = useRef(lang);
  const onOpenRef = useRef(onOpenConversation);

  useEffect(() => {
    isBubbleOpenRef.current = isBubbleOpen;
  }, [isBubbleOpen]);

  useEffect(() => {
    isBubbleMinimizedRef.current = isBubbleMinimized;
  }, [isBubbleMinimized]);

  useEffect(() => {
    activeConvIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    onOpenRef.current = onOpenConversation;
  }, [onOpenConversation]);

  // Unlock audio context & HTMLAudioElement on first user interaction (mobile + desktop)
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

  // Handle Service Worker notification click messages
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; conversationId?: string } | null;
      if (data?.type === 'OPEN_CHAT_CONVERSATION' && data.conversationId) {
        onOpenRef.current(data.conversationId);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPermission('unsupported');
      return;
    }
    const perm = await window.Notification.requestPermission();
    setBrowserPermission(perm);
  }, []);

  const dismissConversationNotifications = useCallback((conversationId: string) => {
    setNotifications((prev) => prev.filter((n) => n.conversationId !== conversationId));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const processIncomingGuestMessage = useCallback(
    async (msg: ChatMessage) => {
      const convId = msg?.conversation_id;
      if (!msg || !msg.id || !convId || msg.sender_type !== 'guest') return;
      if (!baselineReadyRef.current) return;

      // Strict message-ID deduplication; never reject a valid Realtime message by timestamp
      if (seenMessageIdsRef.current.has(msg.id)) return;

      // Resolve customer name reliably BEFORE marking seen so failed fetches can retry
      let conv = conversationsRef.current.find((c) => c.id === convId);
      if (!conv) {
        const supabase = createClient();
        const { data: fetchedConv, error: convErr } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', convId)
          .single();
        if (convErr) {
          throw convErr;
        }
        if (fetchedConv) {
          conv = fetchedConv as Conversation;
          setConversations((prev) =>
            prev.some((c) => c.id === conv!.id) ? prev : [conv!, ...prev]
          );
        }
      }

      // Mark seen only after processing succeeds; advance commit_seq cursor ONLY if contiguous
      // so a dropped Realtime event at an earlier commit_seq is never skipped by reconciliation.
      seenMessageIdsRef.current.add(msg.id);
      if (seenMessageIdsRef.current.size > 2000) {
        const first = seenMessageIdsRef.current.values().next().value;
        if (first) seenMessageIdsRef.current.delete(first);
      }
      if (typeof msg.commit_seq === 'number' && msg.commit_seq === cursorSeqRef.current + 1) {
        cursorSeqRef.current = msg.commit_seq;
      }

      setLatestGuestMessage(msg);

      const guestName = conv?.guest_name ?? null;

      const isViewingThisBubble =
        isBubbleOpenRef.current &&
        !isBubbleMinimizedRef.current &&
        activeConvIdRef.current === convId &&
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible';

      // Always play ring sound for incoming customer messages (deduplicated by msg.id)
      playChatRingSound();

      if (isViewingThisBubble) {
        // Avoid duplicate unread bell item when the exact conversation bubble is open & visible
        return;
      }

      setNotifications((prev) => {
        if (prev.some((n) => n.id === msg.id)) return prev;
        const item: AdminChatNotificationItem = {
          id: msg.id,
          conversationId: convId,
          guestName,
          preview: msg.body.slice(0, 120),
          createdAt: msg.created_at,
        };
        return [item, ...prev].slice(0, 25);
      });

      // Fire mobile-safe WhatsApp-style Browser Notification when dashboard is in background
      if (
        typeof document !== 'undefined' &&
        document.visibilityState !== 'visible' &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        window.Notification.permission === 'granted'
      ) {
        const isAr = langRef.current === 'ar';
        const title = guestName || (isAr ? 'عميل جديد — إسراء بوتيك' : 'New Customer — Esraa Boutique');
        const body = msg.body.slice(0, 140);

        if ('serviceWorker' in navigator) {
          void navigator.serviceWorker
            .getRegistration('/')
            .then((reg) => {
              if (reg) {
                return reg.showNotification(title, {
                  body,
                  tag: msg.id,
                  icon: '/icons/icon-192.png',
                  badge: '/icons/icon-192.png',
                  data: { conversationId: convId },
                });
              }
              const n = new window.Notification(title, {
                body,
                tag: msg.id,
                icon: '/icons/icon-192.png',
              });
              n.onclick = () => {
                window.focus();
                onOpenRef.current(convId);
                n.close();
              };
              return undefined;
            })
            .catch(() => {});
        } else {
          const n = new window.Notification(title, {
            body,
            tag: msg.id,
            icon: '/icons/icon-192.png',
          });
          n.onclick = () => {
            window.focus();
            onOpenRef.current(convId);
            n.close();
          };
        }
      }
    },
    [setConversations]
  );

  // DB-authoritative, commit_seq-ordered paginated reconciliation used on visibility return,
  // Realtime SUBSCRIBED catch-up, and periodic background reconciliation.
  const reconcileMissedMessages = useCallback(async () => {
    if (!baselineReadyRef.current) return;
    if (reconcilingRef.current) {
      pendingReconcileRef.current = true;
      return;
    }

    reconcilingRef.current = true;
    try {
      const supabase = createClient();
      const PAGE_SIZE = 50;
      const MAX_PAGES = 100;

      let afterSeq = cursorSeqRef.current;
      let contiguousFailed = false;

      for (let page = 0; page < MAX_PAGES; page++) {
        const query = supabase
          .from('chat_messages')
          .select('*')
          .eq('sender_type', 'guest')
          .gt('commit_seq', afterSeq)
          .order('commit_seq', { ascending: true })
          .limit(PAGE_SIZE);

        let batch: unknown[] | null = null;
        let batchErr: unknown = null;

        if (page === 0) {
          const [{ data: convs }, msgRes] = await Promise.all([
            supabase
              .from('conversations')
              .select('*')
              .order('last_message_at', { ascending: false })
              .limit(50),
            query,
          ]);
          if (convs) {
            setConversations(convs as Conversation[]);
          }
          batch = msgRes.data;
          batchErr = msgRes.error;
        } else {
          const msgRes = await query;
          batch = msgRes.data;
          batchErr = msgRes.error;
        }

        if (batchErr || !batch || batch.length === 0) {
          break;
        }

        for (const m of batch as ChatMessage[]) {
          try {
            await processIncomingGuestMessage(m);
            if (!contiguousFailed && typeof m.commit_seq === 'number' && m.commit_seq > cursorSeqRef.current) {
              cursorSeqRef.current = m.commit_seq;
            }
          } catch {
            // Stop advancing cursorSeqRef on failure so the next reconciliation cycle retries safely
            contiguousFailed = true;
          }
        }

        if (batch.length < PAGE_SIZE) {
          break;
        }
        const last = batch[batch.length - 1] as ChatMessage;
        if (typeof last.commit_seq !== 'number' || last.commit_seq <= afterSeq) {
          break;
        }
        afterSeq = last.commit_seq;
      }
    } finally {
      reconcilingRef.current = false;
      if (pendingReconcileRef.current) {
        pendingReconcileRef.current = false;
        void reconcileMissedMessages();
      }
    }
  }, [processIncomingGuestMessage, setConversations]);

  // Authenticated Supabase Realtime subscription with explicit setAuth + auth refresh
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;
      if (session?.access_token) {
        await supabase.realtime.setAuth(session.access_token);
      }

      // Establish DB-server commit_seq baseline snapshot BEFORE subscribing so historical messages never alert
      const { data: seedMsgs, error: seedErr } = await supabase
        .from('chat_messages')
        .select('id, commit_seq')
        .eq('sender_type', 'guest')
        .order('commit_seq', { ascending: false })
        .limit(50);

      if (!active || seedErr) return;
      if (seedMsgs && seedMsgs.length > 0) {
        for (const m of seedMsgs) {
          seenMessageIdsRef.current.add(m.id);
        }
        cursorSeqRef.current = typeof seedMsgs[0].commit_seq === 'number' ? seedMsgs[0].commit_seq : 0;
      } else {
        // No guest messages exist yet: commit_seq 0 captures all future committed guest messages
        // without relying on the browser clock.
        cursorSeqRef.current = 0;
      }
      baselineReadyRef.current = true;

      channel = supabase
        .channel('esraa-admin-guest-chat-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: 'sender_type=eq.guest',
          },
          (payload) => {
            void processIncomingGuestMessage(payload.new as ChatMessage);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const added = payload.new as Conversation;
              setConversations((prev) =>
                prev.some((c) => c.id === added.id) ? prev : [added, ...prev]
              );
            } else if (payload.eventType === 'UPDATE') {
              const updated = payload.new as Conversation;
              setConversations((prev) => {
                const exists = prev.some((c) => c.id === updated.id);
                const next = exists
                  ? prev.map((c) => (c.id === updated.id ? updated : c))
                  : [updated, ...prev];
                return [...next].sort(
                  (a, b) =>
                    new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
                );
              });
            }
          }
        )
        .subscribe((status, err) => {
          if (!active) return;
          setRealtimeStatus(status);
          if (status === 'SUBSCRIBED') {
            void reconcileMissedMessages();
          }
          if (err) {
            console.warn('[admin-realtime] channel status:', status, err.message);
          }
        });
    };

    void setupRealtime();

    const {
      data: { subscription: authSub },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        void supabase.realtime.setAuth(session.access_token);
      }
    });

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void reconcileMissedMessages();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      authSub.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [processIncomingGuestMessage, reconcileMissedMessages, setConversations]);

  // Periodic reconciliation even while Realtime reports SUBSCRIBED (30s),
  // accelerating to 10s when Realtime is unhealthy.
  useEffect(() => {
    const intervalMs = realtimeStatus === 'SUBSCRIBED' ? 30000 : 10000;
    const interval = setInterval(() => {
      void reconcileMissedMessages();
    }, intervalMs);
    return () => clearInterval(interval);
  }, [realtimeStatus, reconcileMissedMessages]);

  return {
    notifications,
    latestGuestMessage,
    realtimeStatus,
    browserPermission,
    requestBrowserPermission,
    dismissConversationNotifications,
    clearAllNotifications,
  };
}
