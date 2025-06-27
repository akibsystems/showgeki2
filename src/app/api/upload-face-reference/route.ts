import { NextRequest, NextResponse } from 'next/server';
import { uploadFaceReferenceToStorage } from '@/lib/supabase';

// ================================================================
// Face Reference Image Upload API
// ================================================================

export async function POST(request: NextRequest) {
  try {
    // Get UID from headers
    const uid = request.headers.get('X-User-UID');
    if (!uid) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const imageName = formData.get('imageName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!imageName) {
      return NextResponse.json(
        { error: 'Image name is required' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are supported.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate ASCII-safe filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop() || 'jpg';
    
    // Convert Japanese characters to ASCII-safe format
    const asciiSafeName = imageName
      .normalize('NFD') // Unicode正規化
      .replace(/[\u0300-\u036f]/g, '') // アクセント記号除去
      .replace(/[^\w\s-]/g, '') // 英数字、スペース、ハイフン以外を除去
      .replace(/\s+/g, '_') // スペースをアンダースコアに
      .toLowerCase() // 小文字に統一
      .substring(0, 20) // 長さ制限
      || 'character'; // フォールバック
    
    const fileName = `${asciiSafeName}_${timestamp}.${fileExtension}`;

    // Upload to Supabase Storage
    const { url, path } = await uploadFaceReferenceToStorage(
      buffer,
      fileName,
      file.type,
      uid
    );

    return NextResponse.json({
      success: true,
      url,
      path,
      imageName,
      originalFileName: file.name,
      size: file.size,
      contentType: file.type,
    });

  } catch (error) {
    console.error('Face reference upload error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to upload face reference image' 
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-User-UID',
    },
  });
}