import type { Language, Product } from '@/types/database';

export function sanitizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export function buildWhatsAppProductUrl(
  whatsappNumber: string,
  product: Pick<Product, 'id' | 'sku' | 'name_ar' | 'name_en' | 'price' | 'currency' | 'slug'>,
  lang: Language,
  origin?: string
): string {
  const cleanNumber = sanitizePhoneForWhatsApp(whatsappNumber);
  const baseUrl = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const productUrl = `${baseUrl}/products/${product.slug}`;
  const productName = lang === 'ar' ? product.name_ar : product.name_en;
  const productRef = product.sku || product.id.slice(0, 8).toUpperCase();

  const message =
    lang === 'ar'
      ? `مرحباً، أود الاستفسار / الطلب للمنتج التالي:\n• الاسم: ${productName}\n• الكود: ${productRef}\n• السعر: ${product.price} ${product.currency}\n• الرابط: ${productUrl}`
      : `Hello! I would like to inquire / order this item:\n• Product: ${productName}\n• ID: ${productRef}\n• Price: ${product.price} ${product.currency}\n• Link: ${productUrl}`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppGeneralUrl(whatsappNumber: string, message: string): string {
  const cleanNumber = sanitizePhoneForWhatsApp(whatsappNumber);
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}
