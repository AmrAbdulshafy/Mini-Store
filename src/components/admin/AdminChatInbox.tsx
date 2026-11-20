'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Lock, LockOpen, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { ChatMessage, Conversation, Language } from '@/types/database';

export function AdminChatInbox({
  lang,
  adminId,
  conversations,
  setConversations,
  onNotify,
}: {
  lang: Language;
  adminId: string;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  onNotify: (msg: string, isError?: boolean) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(conversations[0]?.id || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const selectedConv = conversations.find((c) => c.id === selectedId) || null;

  const loadMessages = useCallback(async (convId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as ChatMessage[]);

    await supabase.from('conversations').update({ unread_by_admin: 0 }).eq('id', convId);
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread_by_admin: 0 } : c))
    );
  }, [setConversations]);

  useEffect(() => {
    if (!selectedId) return;
    const timer = setTimeout(() => {
      void loadMessages(selectedId);
    }, 0);
    const interval = setInterval(() => void loadMessages(selectedId), 4500);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [selectedId, loadMessages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = reply.trim();
    if (!text || !selectedConv || sending) return;
    setSending(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: selectedConv.id,
          sender_type: 'admin',
          sender_admin_id: adminId,
          body: text,
        })
        .select('*')
        .single();
      if (error || !data) throw error;

      await supabase
        .from('conversations')
        .update({
          last_message_at: data.created_at,
          last_message_preview: text.slice(0, 120),
          unread_by_guest: (selectedConv.unread_by_guest || 0) + 1,
        })
        .eq('id', selectedConv.id);

      setMessages((prev) => [...prev, data as ChatMessage]);
      setReply('');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'Failed to send reply', true);
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!selectedConv) return;
    const nextStatus = selectedConv.status === 'open' ? 'closed' : 'open';
    const supabase = createClient();
    const { error } = await supabase
      .from('conversations')
      .update({ status: nextStatus })
      .eq('id', selectedConv.id);
    if (error) {
      onNotify(error.message, true);
      return;
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === selectedConv.id ? { ...c, status: nextStatus } : c))
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
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Conversation List */}
      <div className="glass-card space-y-2 rounded-3xl p-4 lg:col-span-4">
        <h3 className="px-2 text-sm font-bold">
          {lang === 'ar' ? 'المحادثات' : 'Conversations'} ({conversations.length})
        </h3>
        {conversations.length === 0 ? (
          <p className="p-4 text-xs opacity-65">
            {lang === 'ar' ? 'لا توجد محادثات بعد.' : 'No conversations yet.'}
          </p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`w-full rounded-2xl p-3 text-start transition-colors ${
                selectedId === c.id ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold">
                  {c.guest_name || (lang === 'ar' ? 'زائر' : 'Guest')}
                </span>
                <div className="flex items-center gap-1.5">
                  {c.unread_by_admin > 0 && (
                    <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      {c.unread_by_admin}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      c.status === 'open'
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-zinc-500/20 text-zinc-500'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
              <p className="mt-1 line-clamp-1 text-[11px] opacity-70">
                {c.last_message_preview || '...'}
              </p>
            </button>
          ))
        )}
      </div>

      {/* Thread */}
      <div className="glass-card flex h-[500px] flex-col rounded-3xl lg:col-span-8">
        {selectedConv ? (
          <>
            <div
              className="flex items-center justify-between border-b px-5 py-3.5"
              style={{ borderColor: 'var(--border-glass)' }}
            >
              <div>
                <h4 className="text-sm font-bold">
                  {selectedConv.guest_name || (lang === 'ar' ? 'زائر' : 'Guest')}
                </h4>
                <span className="text-[11px] opacity-65">{selectedConv.status}</span>
              </div>
              <button
                type="button"
                onClick={toggleStatus}
                className="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold hover:bg-[var(--accent-soft)]"
                style={{ borderColor: 'var(--border-glass)' }}
              >
                {selectedConv.status === 'open' ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    <span>{lang === 'ar' ? 'إغلاق' : 'Close'}</span>
                  </>
                ) : (
                  <>
                    <LockOpen className="h-3.5 w-3.5" />
                    <span>{lang === 'ar' ? 'إعادة فتح' : 'Reopen'}</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {messages.map((m) => {
                const isAdmin = m.sender_type === 'admin';
                return (
                  <div key={m.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                        isAdmin ? 'text-white' : 'bg-[var(--bg-subtle)]'
                      }`}
                      style={isAdmin ? { backgroundColor: 'var(--accent)' } : undefined}
                    >
                      {m.body}
                    </div>
                    <span className="mt-1 text-[10px] opacity-55">
                      {new Date(m.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleSendReply}
              className="flex items-center gap-2 border-t p-4"
              style={{ borderColor: 'var(--border-glass)' }}
            >
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder={lang === 'ar' ? 'اكتب ردك هنا...' : 'Write your reply...'}
                className="flex-1 rounded-2xl border bg-transparent px-4 py-2.5 text-xs outline-none focus:border-[var(--accent)]"
                style={{ borderColor: 'var(--border-glass)' }}
              />
              <button
                type="submit"
                disabled={sending || !reply.trim()}
                className="inline-flex items-center gap-1.5 rounded-2xl px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Send className="h-3.5 w-3.5" />
                <span>{lang === 'ar' ? 'إرسال' : 'Reply'}</span>
              </button>
            </form>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs opacity-65">
            {lang === 'ar' ? 'اختر محادثة لعرضها' : 'Select a conversation'}
          </div>
        )}
      </div>
    </div>
  );
}
