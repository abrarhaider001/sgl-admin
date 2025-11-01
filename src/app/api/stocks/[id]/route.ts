import { NextRequest, NextResponse } from 'next/server';
import { Stock, UpdateStockRequest } from '@/types/stock';

// Mock data for stocks - In production, this would connect to a real database
let stocks: Stock[] = [
  {
    id: '1',
    stockNumber: 'STK-2024-001',
    name: 'Legendary Heroes Pack',
    description: 'A premium pack containing rare and legendary hero cards with exclusive artwork and enhanced abilities',
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
    stockNumber: 'STK-2024-002',
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
    stockNumber: 'STK-2024-003',
    name: 'Rare Spells Collection',
    description: 'Mystical spell cards with powerful abilities and enchanting visual effects',
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
    stockNumber: 'STK-2024-004',
    name: 'Common Starter Pack',
    description: 'Perfect starter pack for new players with essential cards and beginner-friendly gameplay',
    rarity: 'common',
    price: 9.99,
    currency: 'USD',
    image: '/images/stock/starter-pack.jpg',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'admin'
  }
];

// GET - Fetch a specific stock by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const stock = stocks.find(s => s.id === id);
    
    if (!stock) {
      return NextResponse.json(
        { success: false, error: 'Stock not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      stock
    });

  } catch (error) {
    console.error('Error fetching stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock' },
      { status: 500 }
    );
  }
}

// PUT - Update a stock
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateStockRequest = await request.json();

    const stockIndex = stocks.findIndex(s => s.id === id);
    
    if (stockIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Stock not found' },
        { status: 404 }
      );
    }

    // Check if stock number is being changed and if it already exists
    if (body.stockNumber && body.stockNumber !== stocks[stockIndex].stockNumber) {
      const existingStock = stocks.find(stock => stock.stockNumber === body.stockNumber);
      if (existingStock) {
        return NextResponse.json(
          { success: false, error: 'Stock number already exists' },
          { status: 400 }
        );
      }
    }

    // Update the stock
    const updatedStock: Stock = {
      ...stocks[stockIndex],
      ...body,
      updatedAt: new Date()
    };

    stocks[stockIndex] = updatedStock;

    return NextResponse.json({
      success: true,
      stock: updatedStock,
      message: 'Stock updated successfully'
    });

  } catch (error) {
    console.error('Error updating stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update stock' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a stock
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const stockIndex = stocks.findIndex(s => s.id === id);
    
    if (stockIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Stock not found' },
        { status: 404 }
      );
    }

    // Remove the stock
    stocks.splice(stockIndex, 1);

    return NextResponse.json({
      success: true,
      message: 'Stock deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting stock:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete stock' },
      { status: 500 }
    );
  }
}