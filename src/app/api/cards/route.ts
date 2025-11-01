import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { Card } from '@/types';

// GET /api/cards - Get all cards with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const albumId = searchParams.get('albumId');
    const rarity = searchParams.get('rarity');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let cards = database.findAll('cards');

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      cards = cards.filter(card => 
        card.name.toLowerCase().includes(searchLower) ||
        card.description.toLowerCase().includes(searchLower) ||
        card.cardId.toLowerCase().includes(searchLower)
      );
    }

    if (albumId) {
      cards = cards.filter(card => card.albumId === albumId);
    }

    if (rarity) {
      cards = cards.filter(card => card.rarity === rarity);
    }

    if (status) {
      cards = cards.filter(card => card.status === status);
    }

    // Apply sorting
    cards.sort((a, b) => {
      let aValue = a[sortBy as keyof Card];
      let bValue = b[sortBy as keyof Card];
      
      if (aValue instanceof Date) aValue = aValue.getTime();
      if (bValue instanceof Date) bValue = bValue.getTime();
      
      if (sortOrder === 'desc') {
        return bValue > aValue ? 1 : -1;
      }
      return aValue > bValue ? 1 : -1;
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCards = cards.slice(startIndex, endIndex);

    return NextResponse.json({
      cards: paginatedCards,
      pagination: {
        page,
        limit,
        total: cards.length,
        totalPages: Math.ceil(cards.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cards' },
      { status: 500 }
    );
  }
}

// POST /api/cards - Create a new card
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { cardId, name, description, points, rarity, albumId, image } = body;

    // Auto-generate CardID if not provided
    if (!cardId) {
      cardId = `CARD_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    }

    // Validation
    if (!name || !description || !points || !rarity || !albumId) {
      return NextResponse.json(
        { error: 'All fields are required: name, description, points, rarity, albumId' },
        { status: 400 }
      );
    }

    if (points < 0 || points > 1000) {
      return NextResponse.json(
        { error: 'Points must be between 0 and 1000' },
        { status: 400 }
      );
    }

    const validRarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    if (!validRarities.includes(rarity)) {
      return NextResponse.json(
        { error: 'Invalid rarity. Must be one of: ' + validRarities.join(', ') },
        { status: 400 }
      );
    }

    // Check if album exists
    const album = database.findById('albums', albumId);
    if (!album) {
      return NextResponse.json(
        { error: 'Album not found' },
        { status: 404 }
      );
    }

    // Check album capacity
    const existingCards = database.findWhere('cards', card => card.albumId === albumId);
    if (existingCards.length >= album.capacity) {
      return NextResponse.json(
        { error: 'Album has reached maximum capacity' },
        { status: 400 }
      );
    }

    // Check for duplicate cardId
    const existingCard = database.findWhere('cards', card => 
      card.cardId.toLowerCase() === cardId.toLowerCase()
    );
    
    if (existingCard.length > 0) {
      return NextResponse.json(
        { error: 'Card with this ID already exists' },
        { status: 409 }
      );
    }

    // Create new card
    const newCard: Card = {
      id: database['generateId'](),
      cardId,
      name,
      description,
      points: parseInt(points),
      rarity,
      albumId,
      image: image || '/images/placeholder-card.svg',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    const createdCard = database.create('cards', newCard);

    // Update album's current count
    database.update('albums', albumId, { 
      updatedAt: new Date() 
    });

    return NextResponse.json(createdCard, { status: 201 });
  } catch (error) {
    console.error('Error creating card:', error);
    return NextResponse.json(
      { error: 'Failed to create card' },
      { status: 500 }
    );
  }
}