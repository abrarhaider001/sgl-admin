import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { database } from '@/lib/database';

// DELETE /api/upload/[filename] - Delete an uploaded image
export async function DELETE(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    // Find image record in database
    const images = database.findWhere('images', img => img.filename === filename);
    
    if (images.length === 0) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    const imageRecord = images[0];

    // Delete file from disk
    try {
      const filePath = join(process.cwd(), 'public', 'images', 'uploads', filename);
      await unlink(filePath);
    } catch (error) {
      console.warn('File may not exist on disk:', error);
      // Continue with database cleanup even if file doesn't exist
    }

    // Remove from database
    const deleted = database.delete('images', imageRecord.id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to remove image record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Image deleted successfully' 
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}