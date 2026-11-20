# Lamsa Boutique (لمسة بوتيك)

A bilingual (Arabic RTL / English LTR), multi-collection boutique storefront built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase.

## Features
- **3 Coordinated Collection Identities**: Women (blush, champagne, rose gold, lavender), Men (charcoal, deep navy, olive, beige), Handmade (warm white, sand, sage, terracotta)
- **Light & Dark Modes** with custom-crafted dark surfaces
- **Arabic (RTL) & English (LTR)** with persisted language preference and EGP currency
- **Direct WhatsApp Ordering** with prefilled product name, ID, price, and URL from `store_settings`
- **Local Favorites** via `localStorage` (no customer account required)
- **Secure Guest-to-Admin Chat** using server-side `HttpOnly`, `SameSite=Lax` guest session tokens + SHA-256 HMAC hashing + strict RLS
- **Protected Admin Dashboard** (`/admin`) with 11 management sections and Supabase Storage multi-image uploads

## Initial Admin Setup Procedure
1. Create an administrator user in **Supabase Dashboard → Authentication → Users → Add User** (e.g., `admin@lamsaboutique.eg` with a strong password).
2. Copy the created user's `UUID` (`id`) and run the following SQL in the **Supabase SQL Editor**:
   ```sql
   insert into public.admin_users (id, email, full_name, role, is_active)
   values ('<AUTH_USER_UUID>', 'admin@lamsaboutique.eg', 'Store Owner', 'super_admin', true)
   on conflict (id) do update set is_active = true, role = 'super_admin';
   ```
3. Sign in at `/admin/login`.
