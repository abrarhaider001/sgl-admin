import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { database } from '@/lib/database';

// POST /api/upload - Handle image uploads
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const entityType = formData.get('entityType') as string;
    const entityId = formData.get('entityId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported formats: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 10MB' },
        { status: 400 }
      );
    }

    // Validate minimum file size (1KB)
    if (file.size < 1024) {
      return NextResponse.json(
        { error: 'File too small. Minimum size: 1KB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}_${randomId}.${extension}`;

    // Create upload directory if it doesn't exist
    const uploadDir = join(process.cwd(), 'public', 'images', 'uploads');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }

    // Save file to disk
    const filePath = join(uploadDir, filename);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // Generate public URL
    const publicUrl = `/images/uploads/${filename}`;

    // Get image dimensions (simplified - in production you'd use a proper image library)
    let width, height;
    try {
      // For now, we'll set default dimensions
      // In production, use sharp or similar library to get actual dimensions
      width = 800;
      height = 600;
    } catch (error) {
      console.warn('Could not determine image dimensions:', error);
    }

    // Save image record to database
    const imageRecord = database.saveImage({
      filename,
      originalName: file.name,
      path: filePath,
      url: publicUrl,
      size: file.size,
      type: file.type,
      width,
      height,
      entityType: entityType as any,
      entityId
    });

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      originalName: file.name,
      size: file.size,
      type: file.type,
      width,
      height,
      id: imageRecord.id
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// GET /api/upload - Get uploaded images for an entity
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    const images = database.findImagesByEntity(entityType, entityId);

    return NextResponse.json({
      images: images.map(img => ({
        id: img.id,
        url: img.url,
        filename: img.filename,
        originalName: img.originalName,
        size: img.size,
        type: img.type,
        width: img.width,
        height: img.height,
        uploadedAt: img.uploadedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}