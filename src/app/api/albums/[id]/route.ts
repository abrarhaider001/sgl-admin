import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';

// GET /api/albums/[id] - Get a specific album
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const album = database.findById('albums', id);
    
    if (!album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      );
    }

    // Get cards for this album
    const cards = database.findWhere('cards', card => card.albumId === id);
    album.currentCount = cards.length;

    return NextResponse.json({
      album,
      cards: cards.map(card => ({
        ...card,
        createdAt: card.createdAt.toISOString(),
        updatedAt: card.updatedAt.toISOString()
      }))
    });
  } catch (error) {
    console.error('Error fetching album:', error);
    return NextResponse.json(
      { error: 'Failed to fetch album' },
      { status: 500 }
    );
  }
}

// PUT /api/albums/[id] - Update an album
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, capacity, image, status } = body;

    const existingAlbum = database.findById('albums', id);
    if (!existingAlbum) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      );
    }

    // Validation
    if (capacity && (capacity < 1 || capacity > 1000)) {
      return NextResponse.json(
        { error: 'Capacity must be between 1 and 1000' },
        { status: 400 }
      );
    }

    // Check for duplicate name (excluding current album)
    if (name && name !== existingAlbum.name) {
      const duplicateAlbum = database.findWhere('albums', album => 
        album.name.toLowerCase() === name.toLowerCase() && album.id !== id
      );
      
      if (duplicateAlbum.length > 0) {
        return NextResponse.json(
          { error: 'Album with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Check capacity constraint
    if (capacity) {
      const currentCards = database.findWhere('cards', card => card.albumId === id);
      if (currentCards.length > capacity) {
        return NextResponse.json(
          { error: `Cannot reduce capacity below current card count (${currentCards.length})` },
          { status: 400 }
        );
      }
    }

    // Update album
    const updates = {
      ...(name && { name }),
      ...(description && { description }),
      ...(capacity && { capacity: parseInt(capacity) }),
      ...(image && { image }),
      ...(status && { status }),
      updatedAt: new Date()
    };

    const updatedAlbum = database.update('albums', id, updates);

    return NextResponse.json(updatedAlbum);
  } catch (error) {
    console.error('Error updating album:', error);
    return NextResponse.json(
      { error: 'Failed to update album' },
      { status: 500 }
    );
  }
}

// DELETE /api/albums/[id] - Delete an album
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const album = database.findById('albums', id);
    if (!album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      );
    }

    // Cascade delete: remove cards associated with this album
    const cards = database.findWhere('cards', card => card.albumId === id);
    let cardsDeleted = 0;
    for (const card of cards) {
      const ok = database.delete('cards', card.id);
      if (ok) cardsDeleted++;
    }

    // Delete album
    const deleted = database.delete('albums', id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete album' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Album and associated cards deleted successfully', cardsDeleted });
  } catch (error) {
    console.error('Error deleting album:', error);
    return NextResponse.json(
      { error: 'Failed to delete album' },
      { status: 500 }
    );
  }
}