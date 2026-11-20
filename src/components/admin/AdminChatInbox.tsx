'use client';

import React from 'react';
import { Eye, Pencil, Phone, Trash2 } from 'lucide-react';
import type { Conversation, Language } from '@/types/database';

/**
 * Preserves the Admin Conversations List layout with View / Edit / Delete actions.
 * Clicking any conversation or View opens the on-demand AdminChatBubble popup.
 */
export function AdminChatInbox({
  lang,
  conversations,
  selectedId,
  onSelectId,
  onEditConversation,
  onDeleteConversation,
}: {
  lang: Language;
  conversations: Conversation[];
  selectedId: string | null;
  onSelectId: (id: string) => void;
  onEditConversation?: (conv: Conversation) => void;
  onDeleteConversation?: (conv: Conversation) => void;
}) {
  return (
    <div className="glass-card space-y-2 rounded-3xl p-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-sm font-bold">
          {lang === 'ar' ? 'المحادثات' : 'Conversations'} ({conversations.length})
        </h3>
        <span className="text-[11px] opacity-65">
          {lang === 'ar' ? 'اضغطي على أي محادثة لفتح نافذة الرد' : 'Click any conversation to open chat'}
        </span>
      </div>

      {conversations.length === 0 ? (
        <p className="p-4 text-xs opacity-65">
          {lang === 'ar' ? 'لا توجد محادثات بعد.' : 'No conversations yet.'}
        </p>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`flex items-center justify-between gap-2 rounded-2xl p-3 transition-colors ${
                selectedId === c.id ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectId(c.id)}
                className="min-w-0 flex-1 text-start"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-xs font-bold">
                      {c.guest_name || (lang === 'ar' ? 'زائر' : 'Guest')}
                    </span>
                    {c.guest_phone && (
                      <span className="hidden items-center gap-1 text-[11px] opacity-65 sm:inline-flex" dir="ltr">
                        <Phone className="h-3 w-3" />
                        {c.guest_phone}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
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
                      {c.status === 'open' ? (lang === 'ar' ? 'مفتوحة' : 'open') : (lang === 'ar' ? 'مغلقة' : 'closed')}
                    </span>
                  </div>
                </div>
                <p className="mt-1 line-clamp-1 text-[11px] opacity-70">
                  {c.last_message_preview || '...'}
                </p>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onSelectId(c.id)}
                  className="rounded-xl p-1.5 hover:bg-[var(--bg-page)]"
                  title={lang === 'ar' ? 'عرض المحادثة' : 'View Chat'}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                {onEditConversation && (
                  <button
                    type="button"
                    onClick={() => onEditConversation(c)}
                    className="rounded-xl p-1.5 hover:bg-[var(--accent-soft)]"
                    title={lang === 'ar' ? 'تعديل بيانات العميل' : 'Edit Customer'}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
                {onDeleteConversation && (
                  <button
                    type="button"
                    onClick={() => onDeleteConversation(c)}
                    className="rounded-xl p-1.5 text-rose-500 hover:bg-rose-500/10"
                    title={lang === 'ar' ? 'حذف المحادثة' : 'Delete Chat'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
