import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';

// GET /api/banners/[id] - Get a specific banner
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const banner = database.findById('banners', id);
    
    if (!banner) {
      return NextResponse.json(
        { error: 'Banner not found' },
        { status: 404 }
      );
    }

    // Map database fields to frontend expected fields
    const mappedBanner = {
      ...banner,
      imageUrl: banner.image,
      linkUrl: banner.link
    };

    return NextResponse.json(mappedBanner);
  } catch (error) {
    console.error('Error fetching banner:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banner' },
      { status: 500 }
    );
  }
}

// PUT /api/banners/[id] - Update a banner
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, image, link, isActive, startDate, endDate } = body;

    const existingBanner = database.findById('banners', id);
    if (!existingBanner) {
      return NextResponse.json(
        { error: 'Banner not found' },
        { status: 404 }
      );
    }

    // Validate dates if provided
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : existingBanner.startDate;
      const end = endDate ? new Date(endDate) : existingBanner.endDate;

      if (end && start >= end) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    // Check for duplicate title (excluding current banner)
    if (title && title !== existingBanner.title) {
      const duplicateBanner = database.findWhere('banners', banner => 
        banner.title.toLowerCase() === title.toLowerCase() && banner.id !== id
      );
      
      if (duplicateBanner.length > 0) {
        return NextResponse.json(
          { error: 'Banner with this title already exists' },
          { status: 409 }
        );
      }
    }

    // Update banner
    const updates = {
      ...(title && { title }),
      ...(description && { description }),
      ...(image && { image }),
      ...(link !== undefined && { link }),
      ...(isActive !== undefined && { isActive }),
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      updatedAt: new Date()
    };

    const updatedBanner = database.update('banners', id, updates);

    // Map database fields to frontend expected fields
    const mappedBanner = {
      ...updatedBanner,
      imageUrl: updatedBanner.image,
      linkUrl: updatedBanner.link
    };

    return NextResponse.json(mappedBanner);
  } catch (error) {
    console.error('Error updating banner:', error);
    return NextResponse.json(
      { error: 'Failed to update banner' },
      { status: 500 }
    );
  }
}

// DELETE /api/banners/[id] - Delete a banner
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const banner = database.findById('banners', id);
    if (!banner) {
      return NextResponse.json(
        { error: 'Banner not found' },
        { status: 404 }
      );
    }

    // Delete banner
    const deleted = database.delete('banners', id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete banner' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Banner deleted successfully' });
  } catch (error) {
    console.error('Error deleting banner:', error);
    return NextResponse.json(
      { error: 'Failed to delete banner' },
      { status: 500 }
    );
  }
}