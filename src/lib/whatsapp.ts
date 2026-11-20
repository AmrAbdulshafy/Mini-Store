import type { Language, Product } from '@/types/database';

export function sanitizePhoneForWhatsApp(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export interface WhatsAppProductOptions {
  color?: string | null;
  size?: string | null;
  quantity?: number;
}

export function buildWhatsAppProductUrl(
  whatsappNumber: string,
  product: Pick<
    Product,
    'id' | 'sku' | 'name_ar' | 'name_en' | 'price' | 'currency' | 'slug' | 'width_cm' | 'dimensions'
  >,
  lang: Language,
  origin?: string,
  options?: WhatsAppProductOptions
): string {
  const cleanNumber = sanitizePhoneForWhatsApp(whatsappNumber);
  const baseUrl = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  const productUrl = `${baseUrl}/products/${product.slug}`;
  const productName = lang === 'ar' ? product.name_ar : product.name_en;
  const productRef = product.sku || product.id.slice(0, 8).toUpperCase();
  const qty = options?.quantity && options.quantity > 0 ? options.quantity : 1;
  const widthInfo = product.width_cm || product.dimensions;

  const extraAr = [
    options?.color ? `• اللون: ${options.color}` : null,
    options?.size ? `• المقاس: ${options.size}` : null,
    widthInfo ? `• العرض/الأبعاد: ${widthInfo}` : null,
    `• الكمية: ${qty}`,
  ]
    .filter(Boolean)
    .join('\n');

  const extraEn = [
    options?.color ? `• Color: ${options.color}` : null,
    options?.size ? `• Size: ${options.size}` : null,
    widthInfo ? `• Width/Dimensions: ${widthInfo}` : null,
    `• Quantity: ${qty}`,
  ]
    .filter(Boolean)
    .join('\n');

  const message =
    lang === 'ar'
      ? `مرحباً، أود الاستفسار / الطلب للمنتج التالي:\n• الاسم: ${productName}\n• الكود: ${productRef}\n• السعر: ${product.price} ${product.currency}\n${extraAr}\n• الرابط: ${productUrl}`
      : `Hello! I would like to inquire / order this item:\n• Product: ${productName}\n• ID: ${productRef}\n• Price: ${product.price} ${product.currency}\n${extraEn}\n• Link: ${productUrl}`;

  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppGeneralUrl(whatsappNumber: string, message: string): string {
  const cleanNumber = sanitizePhoneForWhatsApp(whatsappNumber);
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}
