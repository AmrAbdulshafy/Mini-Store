import type { AdminUser, RbacAction, RbacPermissionsMap, RbacResource } from '@/types/database';

export const RBAC_RESOURCES: { id: RbacResource; labelAr: string; labelEn: string }[] = [
  { id: 'overview', labelAr: 'التقارير ونظرة عامة', labelEn: 'Reports & Overview' },
  { id: 'orders', labelAr: 'الفواتير والحسابات', labelEn: 'Invoices & Finance' },
  { id: 'products', labelAr: 'المنتجات', labelEn: 'Products' },
  { id: 'categories', labelAr: 'الفئات', labelEn: 'Categories' },
  { id: 'collections', labelAr: 'التشكيلات', labelEn: 'Collections' },
  { id: 'inquiries', labelAr: 'الاستفسارات', labelEn: 'Inquiries' },
  { id: 'chat', labelAr: 'محادثات العملاء', labelEn: 'Customer Chat' },
  { id: 'media', labelAr: 'الوسائط', labelEn: 'Media' },
  { id: 'homepage', labelAr: 'محتوى الرئيسية والإعلانات', labelEn: 'Homepage & Ads' },
  { id: 'appearance', labelAr: 'المظهر', labelEn: 'Appearance' },
  { id: 'settings', labelAr: 'إعدادات المتجر', labelEn: 'Store Settings' },
  { id: 'users', labelAr: 'المسؤولون والصلاحيات', labelEn: 'Admin Users & RBAC' },
];

export const RBAC_ACTIONS: { id: RbacAction; labelAr: string; labelEn: string }[] = [
  { id: 'view', labelAr: 'عرض', labelEn: 'View' },
  { id: 'create', labelAr: 'إضافة', labelEn: 'Add' },
  { id: 'edit', labelAr: 'تعديل', labelEn: 'Edit' },
  { id: 'delete', labelAr: 'حذف', labelEn: 'Delete' },
];

const FULL_CRUD = { view: true, create: true, edit: true, delete: true };
const VIEW_ONLY = { view: true, create: false, edit: false, delete: false };
const NONE = { view: false, create: false, edit: false, delete: false };

export const ROLE_DEFAULT_PERMISSIONS: Record<AdminUser['role'], RbacPermissionsMap> = {
  super_admin: {
    overview: { ...FULL_CRUD },
    orders: { ...FULL_CRUD },
    products: { ...FULL_CRUD },
    categories: { ...FULL_CRUD },
    collections: { ...FULL_CRUD },
    inquiries: { ...FULL_CRUD },
    chat: { ...FULL_CRUD },
    media: { ...FULL_CRUD },
    homepage: { ...FULL_CRUD },
    appearance: { ...FULL_CRUD },
    settings: { ...FULL_CRUD },
    users: { ...FULL_CRUD },
  },
  admin: {
    overview: { ...FULL_CRUD },
    orders: { ...FULL_CRUD },
    products: { ...FULL_CRUD },
    categories: { ...FULL_CRUD },
    collections: { ...FULL_CRUD },
    inquiries: { ...FULL_CRUD },
    chat: { ...FULL_CRUD },
    media: { ...FULL_CRUD },
    homepage: { ...FULL_CRUD },
    appearance: { ...FULL_CRUD },
    settings: { ...FULL_CRUD },
    users: { ...NONE },
  },
  editor: {
    overview: { ...VIEW_ONLY },
    orders: { ...NONE },
    products: { view: true, create: true, edit: true, delete: false },
    categories: { view: true, create: true, edit: true, delete: false },
    collections: { ...VIEW_ONLY },
    inquiries: { view: true, create: false, edit: true, delete: false },
    chat: { view: true, create: false, edit: true, delete: false },
    media: { view: true, create: true, edit: true, delete: false },
    homepage: { view: true, create: true, edit: true, delete: false },
    appearance: { ...NONE },
    settings: { ...NONE },
    users: { ...NONE },
  },
};

export function resolveUserPermissions(admin: Pick<AdminUser, 'role' | 'permissions'>): RbacPermissionsMap {
  const defaults = ROLE_DEFAULT_PERMISSIONS[admin.role] || ROLE_DEFAULT_PERMISSIONS.editor;
  const overrides = admin.permissions || {};
  const merged = {} as RbacPermissionsMap;
  for (const res of RBAC_RESOURCES) {
    merged[res.id] = {
      ...defaults[res.id],
      ...(overrides[res.id] || {}),
    };
  }
  return merged;
}

export function can(
  admin: Pick<AdminUser, 'role' | 'permissions' | 'is_active'>,
  resource: RbacResource,
  action: RbacAction
): boolean {
  if (!admin.is_active) return false;
  if (admin.role === 'super_admin') return true;
  const defaults = ROLE_DEFAULT_PERMISSIONS[admin.role] || ROLE_DEFAULT_PERMISSIONS.editor;
  const override = admin.permissions?.[resource]?.[action];
  if (typeof override === 'boolean') return override;
  return Boolean(defaults[resource]?.[action]);
}
