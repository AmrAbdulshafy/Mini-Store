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
  isChatSectionOpen,
  activeConversationId,
  onOpenConversation,
}: {
  lang: Language;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  isChatSectionOpen: boolean;
  activeConversationId: string | null;
  onOpenConversation: (conversationId: string) => void;
}) {
  const [notifications, setNotifications] = useState<AdminChatNotificationItem[]>([]);
  const [latestGuestMessage, setLatestGuestMessage] = useState<ChatMessage | null>(null);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return window.Notification.permission;
  });

  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const isChatOpenRef = useRef(isChatSectionOpen);
  const activeConvIdRef = useRef(activeConversationId);
  const conversationsRef = useRef(conversations);
  const langRef = useRef(lang);
  const onOpenRef = useRef(onOpenConversation);

  useEffect(() => {
    isChatOpenRef.current = isChatSectionOpen;
  }, [isChatSectionOpen]);

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

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
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
          const msg = payload.new as ChatMessage | undefined;
          const convId = msg?.conversation_id;
          if (!msg || !msg.id || !convId || msg.sender_type !== 'guest') return;

          // Deduplicate strictly by message.id
          if (seenMessageIdsRef.current.has(msg.id)) return;
          seenMessageIdsRef.current.add(msg.id);
          if (seenMessageIdsRef.current.size > 500) {
            const first = seenMessageIdsRef.current.values().next().value;
            if (first) seenMessageIdsRef.current.delete(first);
          }

          setLatestGuestMessage(msg);

          const conv = conversationsRef.current.find((c) => c.id === convId);
          const guestName = conv?.guest_name ?? null;

          const isViewingThisConversation =
            isChatOpenRef.current &&
            activeConvIdRef.current === convId &&
            typeof document !== 'undefined' &&
            document.visibilityState === 'visible';

          // Always play ring sound for incoming customer messages (deduplicated by msg.id above)
          playChatRingSound();

          if (isViewingThisConversation) {
            // Avoid duplicate unread bell notification when the exact conversation is already open & visible
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

          // Fire mobile-safe Browser Notification when admin dashboard is in the background
          if (
            typeof document !== 'undefined' &&
            document.visibilityState !== 'visible' &&
            typeof window !== 'undefined' &&
            'Notification' in window &&
            window.Notification.permission === 'granted'
          ) {
            const isAr = langRef.current === 'ar';
            const title = guestName
              ? isAr
                ? `رسالة جديدة من ${guestName}`
                : `New message from ${guestName}`
              : isAr
                ? 'رسالة عميل جديدة — إسراء بوتيك'
                : 'New customer message — Esraa Boutique';
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
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [setConversations]);

  return {
    notifications,
    latestGuestMessage,
    browserPermission,
    requestBrowserPermission,
    dismissConversationNotifications,
    clearAllNotifications,
  };
}
