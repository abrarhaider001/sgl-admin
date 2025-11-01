import { NextRequest, NextResponse } from 'next/server';
import { Stock, CreateStockRequest } from '@/types/stock';

// Generate UUID for stock number
const generateStockNumber = () => {
  return 'STK-' + Math.random().toString(36).substr(2, 9).toUpperCase();
};

// Mock data for stocks - In production, this would connect to a real database
let stocks: Stock[] = [
  {
    id: '1',
    stockNumber: 'STK-A1B2C3D4E',
    name: 'Legendary Heroes Pack',
    description: 'A premium pack containing rare and legendary hero cards with exclusive artwork and special abilities',
    rarity: 'legendary',
    price: 49.99,
    currency: 'USD',
    image: '/images/stock/legendary-pack.jpg',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    createdBy: 'admin'
  },
  {
    id: '2',
    stockNumber: 'STK-F5G6H7I8J',
    name: 'Epic Warriors Bundle',
    description: 'Collection of epic warrior cards for battle enthusiasts featuring powerful combat abilities',
    rarity: 'epic',
    price: 29.99,
    currency: 'USD',
    image: '/images/stock/epic-bundle.jpg',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    createdBy: 'admin'
  },
  {
    id: '3',
    stockNumber: 'STK-K9L0M1N2O',
    name: 'Rare Spells Collection',
    description: 'Mystical spell cards with powerful magical abilities and enchantments',
    rarity: 'rare',
    price: 19.99,
    currency: 'USD',
    image: '/images/stock/rare-spells.jpg',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    createdBy: 'admin'
  },
  {
    id: '4',
    stockNumber: 'STK-P3Q4R5S6T',
    name: 'Common Starter Pack',
    description: 'Perfect starter pack for new players with essential cards and beginner-friendly abilities',
    rarity: 'common',
    price: 9.99,
    currency: 'USD',
    image: '/images/stock/starter-pack.jpg',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'admin'
  }
];

// GET - Fetch stocks with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search');
    const rarity = searchParams.get('rarity');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    let filteredStocks = [...stocks];

    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      filteredStocks = filteredStocks.filter(stock =>
        stock.name.toLowerCase().includes(searchLower) ||
        stock.description.toLowerCase().includes(searchLower) ||
        stock.stockNumber.toLowerCase().includes(searchLower)
      );
    }

    if (rarity) {
      filteredStocks = filteredStocks.filter(stock => stock.rarity === rarity);
    }

    if (minPrice) {
      filteredStocks = filteredStocks.filter(stock => stock.price >= parseFloat(minPrice));
    }

    if (maxPrice) {
      filteredStocks = filteredStocks.filter(stock => stock.price <= parseFloat(maxPrice));
    }

    // Apply sorting
    filteredStocks.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Stock];
      let bValue: any = b[sortBy as keyof Stock];

      if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const total = filteredStocks.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStocks = filteredStocks.slice(startIndex, endIndex);

    return NextResponse.json({
      success: true,
      stocks: paginatedStocks,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    console.error('Error fetching stocks:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stocks' },
      { status: 500 }
    );
  }
}

// POST - Create a new stock
export async function POST(request: NextRequest) {
  try {
    const body: CreateStockRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.description || !body.rarity || body.price === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate stock number if not provided
    const stockNumber = body.stockNumber || generateStockNumber();

    // Check if stock number already exists
    const existingStock = stocks.find(stock => stock.stockNumber === stockNumber);
    if (existingStock) {
      return NextResponse.json(
        { success: false, error: 'Stock number already exists' },
        { status: 400 }
      );
    }

    // Create new stock
    const newStock: Stock = {
      id: (stocks.length + 1).toString(),
      stockNumber,
      name: body.name,
      description: body.description,
      rarity: body.rarity,
      price: body.price,
      currency: body.currency || 'USD',
      image: body.image,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin'
    };

    stocks.push(newStock);

    return NextResponse.json({
      success: true,
      stock: newStock,
      message: 'Stock created successfully'
    });

  } catch (error) {
    console.error('Error creating stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create stock' },
      { status: 500 }
    );
  }
}