import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase';
import { AdminLayoutClient } from './AdminLayoutClient';

// ================================================================
// Admin Layout Component
// ================================================================

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log('[AdminLayout] No authenticated user, redirecting to login');
      redirect('/auth/login?redirect=/admin');
    }
    
    // Check admin status using service role client
    const adminSupabase = createAdminClient();
    const { data: admin, error: adminError } = await adminSupabase
      .from('admins')
      .select('id, is_active')
      .eq('id', user.id)
      .eq('is_active', true)
      .single();
    
    if (adminError || !admin) {
      console.log('[AdminLayout] User is not admin:', adminError);
      redirect('/unauthorized');
    }
    
    return (
      <AdminLayoutClient userEmail={user.email}>
        {children}
      </AdminLayoutClient>
    );
  } catch (error) {
    console.error('[AdminLayout] Unexpected error:', error);
    redirect('/unauthorized');
  }
}