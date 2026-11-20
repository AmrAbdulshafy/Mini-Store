import { createClient } from '@/lib/supabase/server';
import type { AdminUser } from '@/types/database';

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: adminUser, error: adminError } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (adminError || !adminUser) {
    return null;
  }

  return adminUser as AdminUser;
}
