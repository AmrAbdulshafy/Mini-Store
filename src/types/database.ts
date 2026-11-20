export type Language = 'ar' | 'en';
export type ThemeMode = 'light' | 'dark';
export type CollectionSlug = 'women' | 'men' | 'handmade';
export type AvailabilityStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'made_to_order';

export interface Collection {
  id: string;
  slug: CollectionSlug | string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  theme_key: CollectionSlug;
  hero_image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  collection_id: string | null;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  storage_path: string | null;
  alt_ar: string | null;
  alt_en: string | null;
  color_hex?: string | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  sku: string | null;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  price: number;
  previous_price: number | null;
  currency: string;
  category_id: string | null;
  collection_id: string | null;
  availability_status: AvailabilityStatus;
  stock_quantity?: number;
  colors?: string[];
  sizes?: string[];
  width_cm?: string | null;
  dimensions?: string | null;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_special_offer: boolean;
  is_visible: boolean;
  is_archived: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  product_images?: ProductImage[];
  categories?: Category | null;
  collections?: Collection | null;
}

export interface StoreSettings {
  id: number;
  store_name_ar: string;
  store_name_en: string;
  tagline_ar: string;
  tagline_en: string;
  whatsapp_number: string;
  phone_number: string;
  email: string;
  address_ar: string;
  address_en: string;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  default_language: Language;
  default_theme: ThemeMode;
  default_collection_theme: CollectionSlug;
  currency: string;
  enable_guest_chat: boolean;
  updated_at: string;
}

export interface HomepageBanner {
  id: string;
  placement: 'hero' | 'promo' | 'offer' | 'video_ad';
  collection_id: string | null;
  title_ar: string;
  title_en: string;
  subtitle_ar: string | null;
  subtitle_en: string | null;
  cta_text_ar: string | null;
  cta_text_en: string | null;
  cta_link: string | null;
  image_url: string | null;
  video_url?: string | null;
  media_type?: 'image' | 'video';
  is_active: boolean;
  sort_order: number;
  glass_enabled?: boolean;
  glass_blur_px?: number;
  glass_opacity?: number;
  created_at: string;
  updated_at: string;
}

export interface Inquiry {
  id: string;
  product_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  channel: 'whatsapp' | 'phone' | 'contact_form';
  message: string | null;
  status: 'new' | 'contacted' | 'resolved' | 'archived';
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  products?: { id: string; name_ar: string; name_en: string; slug: string } | null;
}

export interface Conversation {
  id: string;
  guest_name: string | null;
  guest_phone?: string | null;
  status: 'open' | 'closed';
  unread_by_admin: number;
  unread_by_guest: number;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id?: string;
  sender_type: 'guest' | 'admin';
  sender_admin_id?: string | null;
  body: string;
  created_at: string;
  commit_seq?: number;
}

export type OrderSource = 'whatsapp' | 'phone' | 'instagram' | 'in_store' | 'website_chat';
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  color_hex: string | null;
  size_label: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  created_at: string;
}

export interface Order {
  id: string;
  invoice_number: string;
  inquiry_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  order_source: OrderSource;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  paid_amount: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
}

export type RbacResource =
  | 'overview'
  | 'orders'
  | 'products'
  | 'categories'
  | 'collections'
  | 'inquiries'
  | 'chat'
  | 'media'
  | 'homepage'
  | 'appearance'
  | 'settings'
  | 'users';

export type RbacAction = 'view' | 'create' | 'edit' | 'delete';

export type RbacPermissionsMap = Partial<Record<RbacResource, Partial<Record<RbacAction, boolean>>>>;

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'super_admin' | 'admin' | 'editor';
  is_active: boolean;
  permissions?: RbacPermissionsMap | null;
  created_at: string;
  updated_at: string;
}
