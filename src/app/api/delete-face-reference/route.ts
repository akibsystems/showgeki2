import { NextRequest, NextResponse } from 'next/server';
import { deleteFaceReferenceFromStorage } from '@/lib/supabase';

// ================================================================
// Face Reference Image Delete API
// ================================================================

export async function DELETE(request: NextRequest) {
  try {
    // Get UID from headers
    const uid = request.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Parse request body
    const { filePath } = await request.json();

    if (!filePath) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Verify that the file belongs to the user
    if (!filePath.startsWith(`${uid}/`)) {
      return NextResponse.json(
        { error: 'Unauthorized access to file' },
        { status: 403 }
      );
    }

    // Delete from Supabase Storage
    await deleteFaceReferenceFromStorage(filePath);

    return NextResponse.json({
      success: true,
      message: 'Face reference image deleted successfully',
    });

  } catch (error) {
    console.error('Face reference delete error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to delete face reference image' 
      },
      { status: 500 }
    );
  }
}

// ================================================================
// CORS and Options
// ================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-UID',
    },
  });
}