import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase';
import { createAuthErrorResponse } from '@/lib/auth';
import { ErrorType } from '@/types';

// ================================================================
// Types
// ================================================================

export interface AdminContext {
  adminId: string;
  adminEmail?: string;
  isAdmin: true;
}

export interface AdminAuthResult {
  success: boolean;
  adminId?: string;
  adminEmail?: string;
  error?: string;
}

// ================================================================
// Admin Authentication Functions
// ================================================================

/**
 * Check if a user is an active admin
 */
export async function checkAdminStatus(userId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, is_active')
      .eq('id', userId)
      .eq('is_active', true)
      .single();
    
    if (error || !admin) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Admin authentication middleware
 */
export async function adminAuthMiddleware(
  request: NextRequest
): Promise<AdminAuthResult> {
  try {
    // First check Supabase Auth
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required. Please sign in.',
      };
    }
    
    // Check if user is an admin
    const isAdmin = await checkAdminStatus(user.id);
    
    if (!isAdmin) {
      return {
        success: false,
        error: 'Admin access required.',
      };
    }
    
    return {
      success: true,
      adminId: user.id,
      adminEmail: user.email,
    };
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return {
      success: false,
      error: 'Authentication failed due to server error.',
    };
  }
}

/**
 * Create admin error response
 */
export function createAdminErrorResponse(
  error: string,
  statusCode: number = 403
): NextResponse {
  return NextResponse.json(
    {
      error,
      type: ErrorType.AUTHORIZATION,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

/**
 * Admin-only API route handler wrapper
 */
export function withAdminAuth<T extends any[]>(
  handler: (request: NextRequest, context: AdminContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const authResult = await adminAuthMiddleware(request);
    
    if (!authResult.success) {
      const statusCode = authResult.error === 'Authentication required. Please sign in.' ? 401 : 403;
      return createAdminErrorResponse(authResult.error!, statusCode);
    }
    
    const adminContext: AdminContext = {
      adminId: authResult.adminId!,
      adminEmail: authResult.adminEmail,
      isAdmin: true,
    };
    
    try {
      // Log admin activity
      await logAdminActivity(request, adminContext);
      
      return await handler(request, adminContext, ...args);
    } catch (error) {
      console.error('Admin handler error:', error);
      return NextResponse.json(
        {
          error: 'Internal server error',
          type: ErrorType.INTERNAL,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  };
}

// ================================================================
// Admin Activity Logging
// ================================================================

/**
 * Log admin activity
 */
async function logAdminActivity(
  request: NextRequest,
  context: AdminContext
): Promise<void> {
  try {
    const supabase = createAdminClient();
    
    // Extract activity details from request
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = request.method;
    const resourceType = pathParts[2] || 'admin'; // e.g., /api/admin/videos -> 'videos'
    
    // Get IP and user agent
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Log the activity using service role client
    const { error } = await supabase
      .from('admin_activity_logs')
      .insert({
        admin_id: context.adminId,
        action: `${action} ${url.pathname}`,
        resource_type: resourceType,
        metadata: {
          method: action,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams.entries()),
        },
        ip_address: ip,
        user_agent: userAgent,
      });
    
    if (error) {
      console.error('Failed to log admin activity:', error);
    }
  } catch (error) {
    // Don't throw - logging should not break the request
    console.error('Error logging admin activity:', error);
  }
}

// ================================================================
// Admin Utilities
// ================================================================

/**
 * Get list of all admins
 */
export async function getAdminList(): Promise<Array<{ id: string; email?: string; created_at: string }>> {
  try {
    const supabase = await createClient();
    
    const { data: admins, error } = await supabase
      .from('admins')
      .select(`
        id,
        created_at,
        profiles!inner(email)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching admin list:', error);
      return [];
    }
    
    return admins.map(admin => ({
      id: admin.id,
      email: admin.profiles?.email,
      created_at: admin.created_at,
    }));
  } catch (error) {
    console.error('Error in getAdminList:', error);
    return [];
  }
}

/**
 * Check if current user is admin (for client-side usage)
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    return await checkAdminStatus(user.id);
  } catch (error) {
    console.error('Error checking current user admin status:', error);
    return false;
  }
}