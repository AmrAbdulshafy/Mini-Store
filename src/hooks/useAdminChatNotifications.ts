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

  // Unlock audio context on first user interaction
  useEffect(() => {
    const unlock = () => unlockChatNotificationAudio();
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
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

          if (isViewingThisConversation) {
            // Avoid duplicate unread notification when the exact conversation is already open & visible
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

          playChatRingSound();

          // Fire Browser Notification when admin dashboard is in the background
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

            const n = new window.Notification(title, {
              body: msg.body.slice(0, 140),
              tag: msg.id,
              icon: '/icon.svg',
            });
            n.onclick = () => {
              window.focus();
              onOpenRef.current(convId);
              n.close();
            };
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
