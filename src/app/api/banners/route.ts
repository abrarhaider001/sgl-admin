import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { Banner } from '@/types';

// GET /api/banners - Get all banners with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let banners = database.findAll('banners');

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      banners = banners.filter(banner => 
        banner.title.toLowerCase().includes(searchLower) ||
        banner.description.toLowerCase().includes(searchLower)
      );
    }

    if (isActive !== null) {
      const activeFilter = isActive === 'true';
      banners = banners.filter(banner => banner.isActive === activeFilter);
    }

    // Apply sorting
    banners.sort((a, b) => {
      let aValue = a[sortBy as keyof Banner];
      let bValue = b[sortBy as keyof Banner];
      
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
    const paginatedBanners = banners.slice(startIndex, endIndex);

    // Map database fields to frontend expected fields
    const mappedBanners = paginatedBanners.map(banner => ({
      ...banner,
      imageUrl: banner.image,
      linkUrl: banner.link
    }));

    return NextResponse.json({
      banners: mappedBanners,
      pagination: {
        page,
        limit,
        total: banners.length,
        totalPages: Math.ceil(banners.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching banners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banners' },
      { status: 500 }
    );
  }
}

// POST /api/banners - Create a new banner
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, image, link, isActive, startDate, endDate } = body;

    // Validation
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : null;

    if (end && start >= end) {
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
    }

    // Check for duplicate title
    const existingBanner = database.findWhere('banners', banner => 
      banner.title.toLowerCase() === title.toLowerCase()
    );
    
    if (existingBanner.length > 0) {
      return NextResponse.json(
        { error: 'Banner with this title already exists' },
        { status: 409 }
      );
    }

    // Create new banner
    const newBanner: Banner = {
      id: database['generateId'](),
      title,
      description,
      image: image || '/images/placeholder-banner.svg',
      link: link || '#',
      isActive: isActive !== undefined ? isActive : true,
      startDate: start,
      endDate: end,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const createdBanner = database.create('banners', newBanner);

    // Map database fields to frontend expected fields
    const mappedBanner = {
      ...createdBanner,
      imageUrl: createdBanner.image,
      linkUrl: createdBanner.link
    };

    return NextResponse.json(mappedBanner, { status: 201 });
  } catch (error) {
    console.error('Error creating banner:', error);
    return NextResponse.json(
      { error: 'Failed to create banner' },
      { status: 500 }
    );
  }
}