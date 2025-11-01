import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { Album } from '@/types';

// GET /api/albums - Get all albums with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let albums = database.findAll('albums');

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      albums = albums.filter(album => 
        album.name.toLowerCase().includes(searchLower) ||
        album.description.toLowerCase().includes(searchLower)
      );
    }

    if (status) {
      albums = albums.filter(album => album.status === status);
    }

    // Apply sorting
    albums.sort((a, b) => {
      let aValue = a[sortBy as keyof Album];
      let bValue = b[sortBy as keyof Album];
      
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
    const paginatedAlbums = albums.slice(startIndex, endIndex);

    // Update current count for each album
    paginatedAlbums.forEach(album => {
      const cards = database.findWhere('cards', card => card.albumId === album.id);
      album.currentCount = cards.length;
    });

    return NextResponse.json({
      albums: paginatedAlbums,
      pagination: {
        page,
        limit,
        total: albums.length,
        totalPages: Math.ceil(albums.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching albums:', error);
    return NextResponse.json(
      { error: 'Failed to fetch albums' },
      { status: 500 }
    );
  }
}

// POST /api/albums - Create a new album
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, capacity, image } = body;

    // Validation
    if (!name || !description || !capacity) {
      return NextResponse.json(
        { error: 'Name, description, and capacity are required' },
        { status: 400 }
      );
    }

    if (capacity < 1 || capacity > 1000) {
      return NextResponse.json(
        { error: 'Capacity must be between 1 and 1000' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingAlbum = database.findWhere('albums', album => 
      album.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingAlbum.length > 0) {
      return NextResponse.json(
        { error: 'Album with this name already exists' },
        { status: 409 }
      );
    }

    // Create new album
    const newAlbum: Album = {
      id: database['generateId'](),
      name,
      description,
      capacity: parseInt(capacity),
      currentCount: 0,
      image: image || '/images/placeholder-album.svg',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };

    const createdAlbum = database.create('albums', newAlbum);

    return NextResponse.json(createdAlbum, { status: 201 });
  } catch (error) {
    console.error('Error creating album:', error);
    return NextResponse.json(
      { error: 'Failed to create album' },
      { status: 500 }
    );
  }
}