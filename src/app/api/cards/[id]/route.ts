import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';

// GET /api/cards/[id] - Get a specific card
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const card = database.findById('cards', id);
    
    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Get album information
    const album = database.findById('albums', card.albumId);

    return NextResponse.json({
      card,
      album: album ? {
        id: album.id,
        name: album.name,
        description: album.description
      } : null
    });
  } catch (error) {
    console.error('Error fetching card:', error);
    return NextResponse.json(
      { error: 'Failed to fetch card' },
      { status: 500 }
    );
  }
}

// PUT /api/cards/[id] - Update a card
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { cardId, name, description, points, rarity, albumId, image, status } = body;

    const existingCard = database.findById('cards', id);
    if (!existingCard) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Validation
    if (points && (points < 0 || points > 1000)) {
      return NextResponse.json(
        { error: 'Points must be between 0 and 1000' },
        { status: 400 }
      );
    }

    if (rarity) {
      const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
      if (!validRarities.includes(rarity)) {
        return NextResponse.json(
          { error: 'Invalid rarity. Must be one of: ' + validRarities.join(', ') },
          { status: 400 }
        );
      }
    }

    // Check for duplicate cardId (excluding current card)
    if (cardId && cardId !== existingCard.cardId) {
      const duplicateCard = database.findWhere('cards', card => 
        card.cardId.toLowerCase() === cardId.toLowerCase() && card.id !== id
      );
      
      if (duplicateCard.length > 0) {
        return NextResponse.json(
          { error: 'Card with this ID already exists' },
          { status: 409 }
        );
      }
    }

    // If changing album, check new album capacity
    if (albumId && albumId !== existingCard.albumId) {
      const newAlbum = database.findById('albums', albumId);
      if (!newAlbum) {
        return NextResponse.json(
          { error: 'Target album not found' },
          { status: 404 }
        );
      }

      const cardsInNewAlbum = database.findWhere('cards', card => card.albumId === albumId);
      if (cardsInNewAlbum.length >= newAlbum.capacity) {
        return NextResponse.json(
          { error: 'Target album has reached maximum capacity' },
          { status: 400 }
        );
      }
    }

    // Update card
    const updates = {
      ...(cardId && { cardId }),
      ...(name && { name }),
      ...(description && { description }),
      ...(points && { points: parseInt(points) }),
      ...(rarity && { rarity }),
      ...(albumId && { albumId }),
      ...(image && { image }),
      ...(status && { status }),
      updatedAt: new Date()
    };

    const updatedCard = database.update('cards', id, updates);

    // Update album timestamps
    if (albumId && albumId !== existingCard.albumId) {
      // Update both old and new albums
      database.update('albums', existingCard.albumId, { updatedAt: new Date() });
      database.update('albums', albumId, { updatedAt: new Date() });
    } else {
      database.update('albums', existingCard.albumId, { updatedAt: new Date() });
    }

    return NextResponse.json(updatedCard);
  } catch (error) {
    console.error('Error updating card:', error);
    return NextResponse.json(
      { error: 'Failed to update card' },
      { status: 500 }
    );
  }
}

// DELETE /api/cards/[id] - Delete a card
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const card = database.findById('cards', id);
    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
      );
    }

    // Delete card
    const deleted = database.delete('cards', id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete card' },
        { status: 500 }
      );
    }

    // Update album timestamp
    database.update('albums', card.albumId, { updatedAt: new Date() });

    return NextResponse.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Error deleting card:', error);
    return NextResponse.json(
      { error: 'Failed to delete card' },
      { status: 500 }
    );
  }
}