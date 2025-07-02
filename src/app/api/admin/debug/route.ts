import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase';

// ================================================================
// GET /api/admin/debug
// Debug endpoint to check admin status
// ================================================================

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        authenticated: false,
        error: authError?.message || 'Not authenticated',
      });
    }
    
    // Check admin status using service role client
    const adminSupabase = createAdminClient();
    const { data: admin, error: adminError } = await adminSupabase
      .from('admins')
      .select('*')
      .eq('id', user.id)
      .single();
    
    // Also check all admins (for debugging)
    const { data: allAdmins, error: allAdminsError } = await adminSupabase
      .from('admins')
      .select('id, is_active, created_at');
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      adminCheck: {
        isAdmin: !!admin && !adminError,
        admin: admin,
        error: adminError?.message,
      },
      allAdmins: {
        count: allAdmins?.length || 0,
        data: allAdmins,
        error: allAdminsError?.message,
      },
    });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}