'use client';

import React from 'react';
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Inbox,
  Layers,
  MessageSquare,
  Package,
  Printer,
  TrendingUp,
} from 'lucide-react';
import type {
  Category,
  Collection,
  Conversation,
  Inquiry,
  Language,
  Order,
  Product,
} from '@/types/database';
import { formatPrice } from '@/lib/i18n';

export function AdminReportsOverview({
  lang,
  currency,
  products,
  categories,
  collections,
  inquiries,
  conversations,
  orders,
  onNavigate,
}: {
  lang: Language;
  currency: string;
  products: Product[];
  categories: Category[];
  collections: Collection[];
  inquiries: Inquiry[];
  conversations: Conversation[];
  orders: Order[];
  onNavigate: (section: 'products' | 'collections' | 'inquiries' | 'chat' | 'orders') => void;
}) {
  const isAr = lang === 'ar';

  // Financial calculations (excluding cancelled orders from revenue)
  const activeOrders = orders.filter((o) => o.status !== 'cancelled');
  const totalInvoiced = activeOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
  const totalCollected = activeOrders.reduce((s, o) => s + Number(o.paid_amount || 0), 0);
  const outstandingBalance = Math.max(0, totalInvoiced - totalCollected);
  const totalDiscounts = activeOrders.reduce((s, o) => s + Number(o.discount_amount || 0), 0);
  const totalShipping = activeOrders.reduce((s, o) => s + Number(o.shipping_fee || 0), 0);
  const avgOrderValue = activeOrders.length > 0 ? totalInvoiced / activeOrders.length : 0;

  const paidOrdersCount = orders.filter((o) => o.payment_status === 'paid').length;
  const partialOrdersCount = orders.filter((o) => o.payment_status === 'partial').length;
  const unpaidOrdersCount = orders.filter((o) => o.payment_status === 'unpaid').length;
  const cancelledOrdersCount = orders.filter((o) => o.status === 'cancelled').length;

  // Catalog & Inventory calculations
  const activeProducts = products.filter((p) => !p.is_archived);
  const visibleProducts = activeProducts.filter((p) => p.is_visible);
  const featuredCount = activeProducts.filter((p) => p.is_featured).length;
  const specialOfferCount = activeProducts.filter((p) => p.is_special_offer).length;
  const totalStockUnits = activeProducts.reduce((s, p) => s + (p.stock_quantity ?? 0), 0);
  const totalInventoryValue = activeProducts.reduce(
    (s, p) => s + Number(p.price || 0) * (p.stock_quantity ?? 0),
    0
  );

  const lowStockProducts = activeProducts.filter(
    (p) =>
      p.availability_status === 'low_stock' ||
      p.availability_status === 'out_of_stock' ||
      (typeof p.stock_quantity === 'number' && p.stock_quantity <= 3)
  );

  // Inquiries & Chat
  const unreadChats = conversations.reduce((s, c) => s + (c.unread_by_admin || 0), 0);
  const openChats = conversations.filter((c) => c.status === 'open').length;
  const newInquiries = inquiries.filter((i) => i.status === 'new').length;
  const resolvedInquiries = inquiries.filter((i) => i.status === 'resolved').length;

  const exportCsvReport = () => {
    const rows = [
      ['Invoice Number', 'Customer', 'Phone', 'Source', 'Status', 'Payment', 'Subtotal', 'Discount', 'Shipping', 'Total', 'Paid', 'Date'],
      ...orders.map((o) => [
        o.invoice_number,
        o.customer_name,
        o.customer_phone || '',
        o.order_source,
        o.status,
        o.payment_status,
        String(o.subtotal),
        String(o.discount_amount),
        String(o.shipping_fee),
        String(o.total_amount),
        String(o.paid_amount),
        o.created_at,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `esraa-financial-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">
            {isAr ? 'لوحة التقارير والأداء المالي' : 'Business & Financial Reports'}
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {isAr
              ? 'ملخص شامل للمبيعات الخارجية والفواتير والمخزون والتشكيلات والعملاء'
              : 'Complete overview of external invoices, inventory health, collections, and customer activity'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsvReport}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ borderColor: 'var(--border-glass)' }}
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isAr ? 'تصدير CSV' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors hover:bg-[var(--bg-subtle)]"
            style={{ borderColor: 'var(--border-glass)' }}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{isAr ? 'طباعة التقرير' : 'Print Report'}</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="cta-luxury inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>{isAr ? 'إدارة الفواتير' : 'Manage Invoices'}</span>
          </button>
        </div>
      </div>

      {/* Primary Financial & Store KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>{isAr ? 'إجمالي المبيعات (الفواتير)' : 'Total Invoiced Revenue'}</span>
            <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-[var(--accent-strong)]">
            {formatPrice(totalInvoiced, currency, lang)}
          </p>
          <p className="mt-1 text-[11px] opacity-70">
            {activeOrders.length} {isAr ? 'فاتورة نشطة' : 'active invoices'} •{' '}
            {isAr ? 'متوسط الفاتورة:' : 'Avg:'} {formatPrice(avgOrderValue, currency, lang)}
          </p>
        </div>

        <div className="glass-card rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>{isAr ? 'المبلغ المحصل فعلياً' : 'Collected Payments'}</span>
            <Banknote className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-emerald-500">
            {formatPrice(totalCollected, currency, lang)}
          </p>
          <p className="mt-1 text-[11px] opacity-70">
            {isAr ? 'المتبقي للتحصيل:' : 'Outstanding:'}{' '}
            <span className="font-semibold text-amber-500">
              {formatPrice(outstandingBalance, currency, lang)}
            </span>
          </p>
        </div>

        <div className="glass-card rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>{isAr ? 'المنتجات والمخزون' : 'Products & Inventory'}</span>
            <Package className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold">
            {visibleProducts.length} / {products.length}
          </p>
          <p className="mt-1 text-[11px] opacity-70">
            {totalStockUnits} {isAr ? 'قطعة' : 'units'} •{' '}
            {formatPrice(totalInventoryValue, currency, lang)}
          </p>
        </div>

        <div className="glass-card rounded-3xl p-5">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>{isAr ? 'العملاء والمحادثات' : 'Chats & Inquiries'}</span>
            <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold">
            {unreadChats + newInquiries}
          </p>
          <p className="mt-1 text-[11px] opacity-70">
            {unreadChats} {isAr ? 'رسائل غير مقروءة' : 'unread chats'} • {newInquiries}{' '}
            {isAr ? 'استفسارات جديدة' : 'new inquiries'}
          </p>
        </div>
      </div>

      {/* Detailed Breakdown Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Financial Payment Breakdown */}
        <div className="glass-card space-y-3 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <BarChart3 className="h-4 w-4 text-[var(--accent)]" />
              <span>{isAr ? 'تقرير التحصيل والخصومات' : 'Payment & Cost Breakdown'}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
            >
              {isAr ? 'عرض الكل' : 'View all'}
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between rounded-xl bg-[var(--bg-subtle)] px-3 py-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {isAr ? 'فواتير مدفوعة بالكامل' : 'Paid Invoices'}
              </span>
              <span className="font-bold">{paidOrdersCount}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-[var(--bg-subtle)] px-3 py-2">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                {isAr ? 'مدفوعة جزئياً / غير مدفوعة' : 'Partial / Unpaid'}
              </span>
              <span className="font-bold">
                {partialOrdersCount} / {unpaidOrdersCount}
              </span>
            </div>
            <div className="flex justify-between rounded-xl bg-[var(--bg-subtle)] px-3 py-2">
              <span>{isAr ? 'إجمالي الخصومات الممنوحة' : 'Total Discounts Given'}</span>
              <span className="font-bold text-rose-500">
                -{formatPrice(totalDiscounts, currency, lang)}
              </span>
            </div>
            <div className="flex justify-between rounded-xl bg-[var(--bg-subtle)] px-3 py-2">
              <span>{isAr ? 'إجمالي مصاريف الشحن' : 'Total Shipping Fees'}</span>
              <span className="font-bold">{formatPrice(totalShipping, currency, lang)}</span>
            </div>
            <div className="flex justify-between rounded-xl bg-[var(--bg-subtle)] px-3 py-2">
              <span>{isAr ? 'فواتير ملغاة' : 'Cancelled Invoices'}</span>
              <span className="font-bold opacity-70">{cancelledOrdersCount}</span>
            </div>
          </div>
        </div>

        {/* Collections & Categories Report */}
        <div className="glass-card space-y-3 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <Layers className="h-4 w-4 text-[var(--accent)]" />
              <span>{isAr ? 'توزيع التشكيلات والفئات' : 'Collections & Catalog'}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('collections')}
              className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
            >
              {isAr ? 'التشكيلات' : 'Collections'}
            </button>
          </div>
          <div className="space-y-2 text-xs">
            {collections.map((c) => {
              const count = activeProducts.filter((p) => p.collection_id === c.id).length;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between rounded-xl bg-[var(--bg-subtle)] px-3 py-2"
                >
                  <span className="truncate font-medium">
                    {isAr ? c.name_ar : c.name_en}
                    {!c.is_active && (
                      <span className="ms-1.5 text-[10px] text-rose-500">
                        ({isAr ? 'غير مفعل' : 'Inactive'})
                      </span>
                    )}
                  </span>
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--accent-strong)]">
                    {count} {isAr ? 'منتج' : 'items'}
                  </span>
                </div>
              );
            })}
            <div className="flex justify-between pt-1 text-[11px] opacity-75">
              <span>
                {isAr ? 'الفئات:' : 'Categories:'} {categories.length}
              </span>
              <span>
                {isAr ? 'مميزة:' : 'Featured:'} {featuredCount} •{' '}
                {isAr ? 'عروض:' : 'Offers:'} {specialOfferCount}
              </span>
            </div>
          </div>
        </div>

        {/* Customer Engagement & Low Stock */}
        <div className="glass-card space-y-3 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>{isAr ? 'تنبيهات المخزون والعملاء' : 'Stock & Customer Alerts'}</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('products')}
              className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
            >
              {isAr ? 'المنتجات' : 'Products'}
            </button>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between rounded-xl bg-[var(--bg-subtle)] px-3 py-2">
              <span className="flex items-center gap-1.5">
                <Inbox className="h-3.5 w-3.5 text-[var(--accent)]" />
                {isAr ? 'إجمالي الاستفسارات (تم الحل)' : 'Total Inquiries (Resolved)'}
              </span>
              <span className="font-bold">
                {inquiries.length} ({resolvedInquiries})
              </span>
            </div>
            <div className="flex justify-between rounded-xl bg-[var(--bg-subtle)] px-3 py-2">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-[var(--accent)]" />
                {isAr ? 'المحادثات المفتوحة' : 'Open Live Chats'}
              </span>
              <span className="font-bold">
                {openChats} / {conversations.length}
              </span>
            </div>
            <div className="rounded-xl bg-[var(--bg-subtle)] p-3">
              <p className="mb-1.5 font-semibold text-amber-500">
                {isAr ? 'منتجات مخزونها منخفض أو نفد:' : 'Low / Out of Stock Products:'}{' '}
                ({lowStockProducts.length})
              </p>
              {lowStockProducts.length === 0 ? (
                <p className="text-[11px] opacity-65">
                  {isAr ? 'جميع المنتجات متوفرة بكمية جيدة.' : 'All products are well stocked.'}
                </p>
              ) : (
                <ul className="space-y-1 text-[11px]">
                  {lowStockProducts.slice(0, 4).map((p) => (
                    <li key={p.id} className="flex justify-between gap-2">
                      <span className="truncate">{isAr ? p.name_ar : p.name_en}</span>
                      <span className="shrink-0 font-bold text-rose-500">
                        {p.stock_quantity ?? 0}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="glass-card rounded-3xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold">
            {isAr ? 'أحدث الفواتير المسجلة' : 'Recent Invoices'}
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('orders')}
            className="text-xs font-semibold text-[var(--accent)] hover:underline"
          >
            {isAr ? '+ فاتورة جديدة' : '+ New Invoice'}
          </button>
        </div>
        {orders.length === 0 ? (
          <p className="py-6 text-center text-xs opacity-65">
            {isAr
              ? 'لا توجد فواتير مسجلة بعد. أضف أول فاتورة لمتابعة المبيعات خارج الموقع.'
              : 'No invoices recorded yet. Create your first invoice to track off-site financials.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead>
                <tr className="border-b opacity-70" style={{ borderColor: 'var(--border-glass)' }}>
                  <th className="py-2 text-start">{isAr ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="py-2 text-start">{isAr ? 'العميل' : 'Customer'}</th>
                  <th className="py-2 text-start">{isAr ? 'المصدر' : 'Source'}</th>
                  <th className="py-2 text-start">{isAr ? 'الإجمالي' : 'Total'}</th>
                  <th className="py-2 text-start">{isAr ? 'المدفوع' : 'Paid'}</th>
                  <th className="py-2 text-start">{isAr ? 'الحالة' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-glass)' }}>
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id}>
                    <td className="py-2.5 font-mono font-semibold">{o.invoice_number}</td>
                    <td className="py-2.5">{o.customer_name}</td>
                    <td className="py-2.5 capitalize">{o.order_source.replace('_', ' ')}</td>
                    <td className="py-2.5 font-bold">
                      {formatPrice(Number(o.total_amount), o.currency || currency, lang)}
                    </td>
                    <td className="py-2.5 text-emerald-500">
                      {formatPrice(Number(o.paid_amount), o.currency || currency, lang)}
                    </td>
                    <td className="py-2.5">
                      <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[10px] font-semibold">
                        {o.payment_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
