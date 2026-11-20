'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type {
  Inquiry,
  Language,
  Order,
  OrderSource,
  OrderStatus,
  PaymentStatus,
  Product,
} from '@/types/database';
import { formatPrice } from '@/lib/i18n';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface DraftOrderItem {
  product_id: string | null;
  product_name: string;
  color_hex: string;
  size_label: string;
  quantity: number;
  unit_price: number;
}

function generateInvoiceNumber(): string {
  const d = new Date();
  const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `INV-${ym}-${rand}`;
}

export function AdminOrdersPanel({
  lang,
  currency,
  orders,
  setOrders,
  products,
  prefillInquiry,
  onClearPrefill,
  onNotify,
  perms = { create: true, edit: true, delete: true },
}: {
  lang: Language;
  currency: string;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  products: Product[];
  prefillInquiry?: Inquiry | null;
  onClearPrefill?: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
  perms?: { create: boolean; edit: boolean; delete: boolean };
}) {
  const isAr = lang === 'ar';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [printOrder, setPrintOrder] = useState<Order | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    invoice_number: '',
    inquiry_id: null as string | null,
    customer_name: '',
    customer_phone: '',
    customer_address: '',
    order_source: 'whatsapp' as OrderSource,
    status: 'pending' as OrderStatus,
    payment_status: 'unpaid' as PaymentStatus,
    discount_amount: '0',
    shipping_fee: '0',
    paid_amount: '0',
    notes: '',
  });
  const [items, setItems] = useState<DraftOrderItem[]>([
    { product_id: null, product_name: '', color_hex: '', size_label: '', quantity: 1, unit_price: 0 },
  ]);

  const openCreateModal = useCallback((inquiry?: Inquiry | null) => {
    setEditingOrder(null);
    const linkedProd = inquiry?.product_id
      ? products.find((p) => p.id === inquiry.product_id) || null
      : null;
    setForm({
      invoice_number: generateInvoiceNumber(),
      inquiry_id: inquiry?.id || null,
      customer_name: inquiry?.customer_name || '',
      customer_phone: inquiry?.customer_phone || '',
      customer_address: '',
      order_source:
        inquiry?.channel === 'phone'
          ? 'phone'
          : inquiry?.channel === 'contact_form'
            ? 'website_chat'
            : 'whatsapp',
      status: 'pending',
      payment_status: 'unpaid',
      discount_amount: '0',
      shipping_fee: '0',
      paid_amount: '0',
      notes: inquiry?.message || '',
    });
    setItems([
      linkedProd
        ? {
            product_id: linkedProd.id,
            product_name: isAr ? linkedProd.name_ar : linkedProd.name_en,
            color_hex: linkedProd.colors?.[0] || '',
            size_label: linkedProd.sizes?.[0] || '',
            quantity: 1,
            unit_price: Number(linkedProd.price || 0),
          }
        : { product_id: null, product_name: '', color_hex: '', size_label: '', quantity: 1, unit_price: 0 },
    ]);
    setModalOpen(true);
  }, [isAr, products]);

  useEffect(() => {
    if (!prefillInquiry) return;
    const timer = setTimeout(() => {
      openCreateModal(prefillInquiry);
      onClearPrefill?.();
    }, 0);
    return () => clearTimeout(timer);
  }, [prefillInquiry, openCreateModal, onClearPrefill]);

  const openEditModal = (o: Order) => {
    setEditingOrder(o);
    setForm({
      invoice_number: o.invoice_number,
      inquiry_id: o.inquiry_id,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone || '',
      customer_address: o.customer_address || '',
      order_source: o.order_source,
      status: o.status,
      payment_status: o.payment_status,
      discount_amount: String(o.discount_amount ?? 0),
      shipping_fee: String(o.shipping_fee ?? 0),
      paid_amount: String(o.paid_amount ?? 0),
      notes: o.notes || '',
    });
    setItems(
      o.order_items && o.order_items.length > 0
        ? o.order_items.map((it) => ({
            product_id: it.product_id,
            product_name: it.product_name,
            color_hex: it.color_hex || '',
            size_label: it.size_label || '',
            quantity: it.quantity,
            unit_price: Number(it.unit_price),
          }))
        : [{ product_id: null, product_name: '', color_hex: '', size_label: '', quantity: 1, unit_price: 0 }]
    );
    setModalOpen(true);
  };

  const subtotal = items.reduce(
    (sum, it) => sum + Math.max(1, Number(it.quantity) || 1) * Math.max(0, Number(it.unit_price) || 0),
    0
  );
  const discount = Math.max(0, Number(form.discount_amount) || 0);
  const shipping = Math.max(0, Number(form.shipping_fee) || 0);
  const totalAmount = Math.max(0, subtotal - discount + shipping);
  const paidAmount = Math.max(0, Number(form.paid_amount) || 0);
  const remainingBalance = Math.max(0, totalAmount - paidAmount);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((it) => it.product_name.trim().length > 0);
    if (!form.customer_name.trim() || validItems.length === 0) {
      onNotify(
        isAr ? 'يرجى إدخال اسم العميل وإضافة منتج واحد على الأقل' : 'Customer name and at least one item are required',
        true
      );
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const orderPayload = {
        invoice_number: form.invoice_number.trim() || generateInvoiceNumber(),
        inquiry_id: form.inquiry_id,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        customer_address: form.customer_address.trim() || null,
        order_source: form.order_source,
        status: form.status,
        payment_status: form.payment_status,
        subtotal,
        discount_amount: discount,
        shipping_fee: shipping,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        currency,
        notes: form.notes.trim() || null,
      };

      let orderId = editingOrder?.id;
      if (editingOrder) {
        const { error } = await supabase.from('orders').update(orderPayload).eq('id', editingOrder.id);
        if (error) throw error;
        await supabase.from('order_items').delete().eq('order_id', editingOrder.id);
      } else {
        const { data, error } = await supabase.from('orders').insert(orderPayload).select('id').single();
        if (error || !data) throw error;
        orderId = data.id;
      }

      const itemRows = validItems.map((it) => ({
        order_id: orderId!,
        product_id: it.product_id || null,
        product_name: it.product_name.trim(),
        color_hex: it.color_hex || null,
        size_label: it.size_label || null,
        quantity: Math.max(1, Number(it.quantity) || 1),
        unit_price: Math.max(0, Number(it.unit_price) || 0),
        line_total:
          Math.max(1, Number(it.quantity) || 1) * Math.max(0, Number(it.unit_price) || 0),
      }));

      const { error: itemsErr } = await supabase.from('order_items').insert(itemRows);
      if (itemsErr) throw itemsErr;

      const { data: fullOrder, error: fetchErr } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId!)
        .single();
      if (fetchErr || !fullOrder) throw fetchErr;

      setOrders((prev) =>
        editingOrder
          ? prev.map((x) => (x.id === fullOrder.id ? (fullOrder as Order) : x))
          : [fullOrder as Order, ...prev]
      );
      setModalOpen(false);
      onNotify(isAr ? 'تم حفظ الفاتورة بنجاح' : 'Invoice saved');
    } catch (err) {
      onNotify(err instanceof Error ? err.message : isAr ? 'تعذر حفظ الفاتورة' : 'Failed to save invoice', true);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const supabase = createClient();
    const { error } = await supabase.from('orders').delete().eq('id', deleteTarget.id);
    if (error) {
      onNotify(error.message, true);
    } else {
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      onNotify(isAr ? 'تم حذف الفاتورة' : 'Invoice deleted');
    }
    setDeleteTarget(null);
  };

  const statusLabels: Record<OrderStatus, { ar: string; en: string }> = {
    pending: { ar: 'قيد الانتظار', en: 'Pending' },
    confirmed: { ar: 'مؤكد', en: 'Confirmed' },
    shipped: { ar: 'تم الشحن', en: 'Shipped' },
    delivered: { ar: 'تم التسليم', en: 'Delivered' },
    cancelled: { ar: 'ملغي', en: 'Cancelled' },
  };

  const paymentLabels: Record<PaymentStatus, { ar: string; en: string }> = {
    unpaid: { ar: 'غير مدفوع', en: 'Unpaid' },
    partial: { ar: 'مدفوع جزئياً', en: 'Partial' },
    paid: { ar: 'مدفوع', en: 'Paid' },
    refunded: { ar: 'مسترد', en: 'Refunded' },
  };

  const sourceLabels: Record<OrderSource, { ar: string; en: string }> = {
    whatsapp: { ar: 'واتساب', en: 'WhatsApp' },
    phone: { ar: 'هاتف', en: 'Phone' },
    instagram: { ar: 'إنستغرام', en: 'Instagram' },
    in_store: { ar: 'في البوتيك', en: 'In Store' },
    website_chat: { ar: 'محادثة الموقع', en: 'Website Chat' },
  };

  const filtered = orders.filter((o) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      o.invoice_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      (o.customer_phone || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchPay = paymentFilter === 'all' || o.payment_status === paymentFilter;
    return matchSearch && matchStatus && matchPay;
  });

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 opacity-50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? 'ابحث برقم الفاتورة أو العميل...' : 'Search invoice # or customer...'}
              className="w-full rounded-xl border bg-[var(--bg-card)] py-2 ps-9 pe-3 text-xs outline-none"
              style={{ borderColor: 'var(--border-glass)' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border bg-[var(--bg-page)] px-3 py-2 text-xs"
            style={{ borderColor: 'var(--border-glass)' }}
          >
            <option value="all">{isAr ? 'كل الحالات' : 'All Statuses'}</option>
            {(Object.keys(statusLabels) as OrderStatus[]).map((k) => (
              <option key={k} value={k}>
                {isAr ? statusLabels[k].ar : statusLabels[k].en}
              </option>
            ))}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="rounded-xl border bg-[var(--bg-page)] px-3 py-2 text-xs"
            style={{ borderColor: 'var(--border-glass)' }}
          >
            <option value="all">{isAr ? 'كل حالات الدفع' : 'All Payments'}</option>
            {(Object.keys(paymentLabels) as PaymentStatus[]).map((k) => (
              <option key={k} value={k}>
                {isAr ? paymentLabels[k].ar : paymentLabels[k].en}
              </option>
            ))}
          </select>
        </div>

        {perms.create && (
          <button
            type="button"
            onClick={() => openCreateModal(null)}
            className="cta-luxury inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
          >
            <Plus className="h-4 w-4" />
            <span>{isAr ? 'إنشاء فاتورة جديدة' : 'Create Invoice'}</span>
          </button>
        )}
      </div>

      {/* Invoices List */}
      <div className="glass-card divide-y rounded-3xl" style={{ borderColor: 'var(--border-glass)' }}>
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-xs opacity-65">
            {isAr ? 'لا توجد فواتير مطابقة.' : 'No matching invoices found.'}
          </p>
        ) : (
          filtered.map((o) => {
            const bal = Math.max(0, Number(o.total_amount) - Number(o.paid_amount));
            return (
              <div key={o.id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-xs">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-[var(--accent-strong)]">
                      {o.invoice_number}
                    </span>
                    <span className="font-semibold">{o.customer_name}</span>
                    {o.customer_phone && (
                      <span className="opacity-70" dir="ltr">
                        • {o.customer_phone}
                      </span>
                    )}
                    <span className="rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[10px]">
                      {isAr ? sourceLabels[o.order_source].ar : sourceLabels[o.order_source].en}
                    </span>
                  </div>
                  <p className="text-[11px] opacity-75">
                    {o.order_items?.length || 0} {isAr ? 'أصناف' : 'items'} •{' '}
                    {isAr ? 'الإجمالي:' : 'Total:'}{' '}
                    <strong>{formatPrice(Number(o.total_amount), o.currency || currency, lang)}</strong> •{' '}
                    {isAr ? 'المدفوع:' : 'Paid:'}{' '}
                    <span className="text-emerald-500">
                      {formatPrice(Number(o.paid_amount), o.currency || currency, lang)}
                    </span>
                    {bal > 0 && (
                      <>
                        {' '}
                        • {isAr ? 'المتبقي:' : 'Due:'}{' '}
                        <span className="text-amber-500">
                          {formatPrice(bal, o.currency || currency, lang)}
                        </span>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[10px] font-semibold">
                    {isAr ? statusLabels[o.status].ar : statusLabels[o.status].en}
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-500">
                    {isAr ? paymentLabels[o.payment_status].ar : paymentLabels[o.payment_status].en}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPrintOrder(o)}
                    className="rounded-xl border p-2 hover:bg-[var(--bg-subtle)]"
                    style={{ borderColor: 'var(--border-glass)' }}
                    title={isAr ? 'معاينة وطباعة الفاتورة' : 'Print Invoice'}
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </button>
                  {perms.edit && (
                    <button
                      type="button"
                      onClick={() => openEditModal(o)}
                      className="rounded-xl border p-2 hover:bg-[var(--bg-subtle)]"
                      style={{ borderColor: 'var(--border-glass)' }}
                      title={isAr ? 'تعديل' : 'Edit'}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {perms.delete && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(o)}
                      className="rounded-xl border p-2 text-rose-500 hover:bg-rose-500/10"
                      style={{ borderColor: 'var(--border-glass)' }}
                      title={isAr ? 'حذف' : 'Delete'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Invoice Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidthClass="max-w-3xl"
        title={
          editingOrder
            ? isAr
              ? `تعديل الفاتورة ${editingOrder.invoice_number}`
              : `Edit Invoice ${editingOrder.invoice_number}`
            : isAr
              ? 'إنشاء فاتورة مالية جديدة'
              : 'Create Financial Invoice'
        }
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block font-semibold opacity-75">
                {isAr ? 'رقم الفاتورة' : 'Invoice #'}
              </label>
              <input
                value={form.invoice_number}
                onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                required
                className="w-full rounded-xl border bg-transparent px-3 py-2 font-mono"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold opacity-75">
                {isAr ? 'اسم العميل *' : 'Customer Name *'}
              </label>
              <input
                value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                required
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold opacity-75">
                {isAr ? 'هاتف العميل' : 'Customer Phone'}
              </label>
              <input
                value={form.customer_phone}
                onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block font-semibold opacity-75">
                {isAr ? 'العنوان / المدينة' : 'Address / City'}
              </label>
              <input
                value={form.customer_address}
                onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold opacity-75">
                {isAr ? 'المصدر' : 'Source'}
              </label>
              <select
                value={form.order_source}
                onChange={(e) => setForm({ ...form, order_source: e.target.value as OrderSource })}
                className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              >
                {(Object.keys(sourceLabels) as OrderSource[]).map((k) => (
                  <option key={k} value={k}>
                    {isAr ? sourceLabels[k].ar : sourceLabels[k].en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold opacity-75">
                {isAr ? 'حالة الطلب' : 'Order Status'}
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as OrderStatus })}
                className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              >
                {(Object.keys(statusLabels) as OrderStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {isAr ? statusLabels[k].ar : statusLabels[k].en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-2 rounded-2xl border p-3" style={{ borderColor: 'var(--border-glass)' }}>
            <div className="flex items-center justify-between">
              <span className="font-bold">{isAr ? 'بنود الفاتورة' : 'Invoice Line Items'}</span>
              <button
                type="button"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    { product_id: null, product_name: '', color_hex: '', size_label: '', quantity: 1, unit_price: 0 },
                  ])
                }
                className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 font-semibold text-[var(--accent-strong)]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{isAr ? 'إضافة صنف' : 'Add Item'}</span>
              </button>
            </div>

            {items.map((it, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-xl bg-[var(--bg-subtle)] p-2.5 sm:grid-cols-12"
              >
                <select
                  value={it.product_id || ''}
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === e.target.value);
                    setItems((prev) =>
                      prev.map((row, rIdx) =>
                        rIdx !== idx
                          ? row
                          : prod
                            ? {
                                ...row,
                                product_id: prod.id,
                                product_name: isAr ? prod.name_ar : prod.name_en,
                                unit_price: Number(prod.price || 0),
                                color_hex: prod.colors?.[0] || '',
                                size_label: prod.sizes?.[0] || '',
                              }
                            : { ...row, product_id: null }
                      )
                    );
                  }}
                  className="rounded-lg border bg-[var(--bg-page)] px-2 py-1.5 sm:col-span-4"
                  style={{ borderColor: 'var(--border-glass)' }}
                >
                  <option value="">{isAr ? '-- منتج مخصص / اختر --' : '-- Custom / Pick Product --'}</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {isAr ? p.name_ar : p.name_en} ({p.price})
                    </option>
                  ))}
                </select>
                <input
                  value={it.product_name}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((r, rIdx) => (rIdx === idx ? { ...r, product_name: e.target.value } : r))
                    )
                  }
                  placeholder={isAr ? 'اسم الصنف *' : 'Item Name *'}
                  className="rounded-lg border bg-transparent px-2 py-1.5 sm:col-span-3"
                  style={{ borderColor: 'var(--border-glass)' }}
                />
                <input
                  value={it.size_label}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((r, rIdx) => (rIdx === idx ? { ...r, size_label: e.target.value } : r))
                    )
                  }
                  placeholder={isAr ? 'المقاس' : 'Size'}
                  className="rounded-lg border bg-transparent px-2 py-1.5 sm:col-span-2"
                  style={{ borderColor: 'var(--border-glass)' }}
                />
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((r, rIdx) => (rIdx === idx ? { ...r, quantity: Number(e.target.value) } : r))
                    )
                  }
                  className="rounded-lg border bg-transparent px-2 py-1.5 sm:col-span-1"
                  style={{ borderColor: 'var(--border-glass)' }}
                />
                <div className="flex items-center gap-1 sm:col-span-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={it.unit_price}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((r, rIdx) => (rIdx === idx ? { ...r, unit_price: Number(e.target.value) } : r))
                      )
                    }
                    className="w-full rounded-lg border bg-transparent px-2 py-1.5"
                    style={{ borderColor: 'var(--border-glass)' }}
                  />
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, rIdx) => rIdx !== idx))}
                      className="p-1 text-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Financial Totals */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <label className="mb-1 block font-semibold opacity-75">{isAr ? 'الخصم' : 'Discount'}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.discount_amount}
                onChange={(e) => setForm({ ...form, discount_amount: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold opacity-75">{isAr ? 'الشحن' : 'Shipping'}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.shipping_fee}
                onChange={(e) => setForm({ ...form, shipping_fee: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
            <div>
              <label className="mb-1 block font-semibold opacity-75">{isAr ? 'حالة الدفع' : 'Payment'}</label>
              <select
                value={form.payment_status}
                onChange={(e) => setForm({ ...form, payment_status: e.target.value as PaymentStatus })}
                className="w-full rounded-xl border bg-[var(--bg-page)] px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              >
                {(Object.keys(paymentLabels) as PaymentStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {isAr ? paymentLabels[k].ar : paymentLabels[k].en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block font-semibold opacity-75">{isAr ? 'المبلغ المدفوع' : 'Paid Amount'}</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.paid_amount}
                onChange={(e) => setForm({ ...form, paid_amount: e.target.value })}
                className="w-full rounded-xl border bg-transparent px-3 py-2"
                style={{ borderColor: 'var(--border-glass)' }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--bg-subtle)] p-3 font-semibold">
            <span>
              {isAr ? 'المجموع الفرعي:' : 'Subtotal:'} {formatPrice(subtotal, currency, lang)}
            </span>
            <span className="text-sm text-[var(--accent-strong)]">
              {isAr ? 'الإجمالي النهائي:' : 'Grand Total:'} {formatPrice(totalAmount, currency, lang)}
            </span>
            <span className="text-amber-500">
              {isAr ? 'المتبقي:' : 'Balance Due:'} {formatPrice(remainingBalance, currency, lang)}
            </span>
          </div>

          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder={isAr ? 'ملاحظات الفاتورة...' : 'Invoice notes...'}
            className="w-full rounded-xl border bg-transparent px-3 py-2"
            style={{ borderColor: 'var(--border-glass)' }}
          />

          <button type="submit" disabled={saving} className="cta-luxury w-full rounded-2xl py-3 font-semibold">
            {saving
              ? isAr
                ? 'جاري الحفظ...'
                : 'Saving...'
              : isAr
                ? 'حفظ الفاتورة'
                : 'Save Invoice'}
          </button>
        </form>
      </Modal>

      {/* Printable Invoice Modal */}
      <Modal
        open={Boolean(printOrder)}
        onClose={() => setPrintOrder(null)}
        maxWidthClass="max-w-xl"
        title={isAr ? 'معاينة الفاتورة' : 'Invoice Preview'}
      >
        {printOrder && (
          <div className="space-y-4 text-xs">
            <div className="flex items-start justify-between border-b pb-3" style={{ borderColor: 'var(--border-glass)' }}>
              <div>
                <h3 className="flex items-center gap-1.5 font-display text-lg font-bold">
                  <FileText className="h-4 w-4 text-[var(--accent)]" />
                  <span>{isAr ? 'إسراء بوتيك' : 'Esraa Boutique'}</span>
                </h3>
                <p className="opacity-70">{new Date(printOrder.created_at).toLocaleString()}</p>
              </div>
              <div className="text-end">
                <p className="font-mono text-sm font-bold">{printOrder.invoice_number}</p>
                <p className="opacity-75">
                  {isAr ? paymentLabels[printOrder.payment_status].ar : paymentLabels[printOrder.payment_status].en}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <p>
                <strong>{isAr ? 'العميل:' : 'Customer:'}</strong> {printOrder.customer_name}
              </p>
              {printOrder.customer_phone && (
                <p>
                  <strong>{isAr ? 'الهاتف:' : 'Phone:'}</strong> {printOrder.customer_phone}
                </p>
              )}
              {printOrder.customer_address && (
                <p>
                  <strong>{isAr ? 'العنوان:' : 'Address:'}</strong> {printOrder.customer_address}
                </p>
              )}
            </div>

            <table className="w-full border-y text-start" style={{ borderColor: 'var(--border-glass)' }}>
              <thead>
                <tr className="border-b opacity-70" style={{ borderColor: 'var(--border-glass)' }}>
                  <th className="py-2 text-start">{isAr ? 'الصنف' : 'Item'}</th>
                  <th className="py-2 text-center">{isAr ? 'الكمية' : 'Qty'}</th>
                  <th className="py-2 text-end">{isAr ? 'السعر' : 'Price'}</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-glass)' }}>
                {(printOrder.order_items || []).map((it) => (
                  <tr key={it.id}>
                    <td className="py-2">
                      {it.product_name} {it.size_label ? `(${it.size_label})` : ''}
                    </td>
                    <td className="py-2 text-center">{it.quantity}</td>
                    <td className="py-2 text-end">
                      {formatPrice(Number(it.line_total), printOrder.currency || currency, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 text-end">
              <p>
                {isAr ? 'المجموع الفرعي:' : 'Subtotal:'}{' '}
                {formatPrice(Number(printOrder.subtotal), printOrder.currency || currency, lang)}
              </p>
              {Number(printOrder.discount_amount) > 0 && (
                <p className="text-rose-500">
                  {isAr ? 'الخصم:' : 'Discount:'} -
                  {formatPrice(Number(printOrder.discount_amount), printOrder.currency || currency, lang)}
                </p>
              )}
              {Number(printOrder.shipping_fee) > 0 && (
                <p>
                  {isAr ? 'الشحن:' : 'Shipping:'}{' '}
                  {formatPrice(Number(printOrder.shipping_fee), printOrder.currency || currency, lang)}
                </p>
              )}
              <p className="text-sm font-bold text-[var(--accent-strong)]">
                {isAr ? 'الإجمالي:' : 'Total:'}{' '}
                {formatPrice(Number(printOrder.total_amount), printOrder.currency || currency, lang)}
              </p>
              <p className="text-emerald-500">
                {isAr ? 'المدفوع:' : 'Paid:'}{' '}
                {formatPrice(Number(printOrder.paid_amount), printOrder.currency || currency, lang)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="cta-luxury flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 font-semibold"
            >
              <Printer className="h-4 w-4" />
              <span>{isAr ? 'طباعة الفاتورة' : 'Print Invoice'}</span>
            </button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={isAr ? 'حذف الفاتورة' : 'Delete Invoice'}
        message={
          isAr
            ? `هل أنت متأكد من حذف الفاتورة ${deleteTarget?.invoice_number || ''}؟`
            : `Delete invoice ${deleteTarget?.invoice_number || ''}?`
        }
        confirmLabel={isAr ? 'حذف' : 'Delete'}
        cancelLabel={isAr ? 'إلغاء' : 'Cancel'}
        danger
      />
    </div>
  );
}
