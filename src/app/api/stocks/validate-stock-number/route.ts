import { NextRequest, NextResponse } from 'next/server';
import { Stock } from '@/types/stock';

// Mock data for stocks - In production, this would connect to a real database
const stocks: Stock[] = [
  {
    id: '1',
    stockNumber: 'STK001',
    name: 'Legendary Heroes Pack',
    description: 'A premium pack containing rare and legendary hero cards',
    rarity: 'legendary',
    price: 49.99,
    image: '/images/stock/legendary-pack.jpg',
    cards: [
      { cardId: '1', quantity: 2 },
      { cardId: '2', quantity: 1 },
      { cardId: '3', quantity: 3 }
    ],
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    createdBy: 'admin'
  },
  {
    id: '2',
    stockNumber: 'STK002',
    name: 'Epic Warriors Bundle',
    description: 'Collection of epic warrior cards for battle enthusiasts',
    rarity: 'epic',
    price: 29.99,
    image: '/images/stock/epic-bundle.jpg',
    cards: [
      { cardId: '4', quantity: 3 },
      { cardId: '5', quantity: 2 },
      { cardId: '6', quantity: 4 }
    ],
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    createdBy: 'admin'
  },
  {
    id: '3',
    stockNumber: 'STK003',
    name: 'Rare Spells Collection',
    description: 'Mystical spell cards with powerful abilities',
    rarity: 'rare',
    price: 19.99,
    image: '/images/stock/rare-spells.jpg',
    cards: [
      { cardId: '7', quantity: 5 },
      { cardId: '8', quantity: 3 },
      { cardId: '9', quantity: 2 }
    ],
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    createdBy: 'admin'
  },
  {
    id: '4',
    stockNumber: 'STK004',
    name: 'Common Starter Pack',
    description: 'Perfect starter pack for new players',
    rarity: 'common',
    price: 9.99,
    image: '/images/stock/starter-pack.jpg',
    cards: [
      { cardId: '10', quantity: 8 },
      { cardId: '11', quantity: 6 },
      { cardId: '12', quantity: 4 }
    ],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'admin'
  }
];

// GET - Validate stock number uniqueness
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockNumber = searchParams.get('stockNumber');
    const excludeId = searchParams.get('excludeId');

    if (!stockNumber) {
      return NextResponse.json(
        { success: false, error: 'Stock number is required' },
        { status: 400 }
      );
    }

    // Check if stock number exists
    const existingStock = stocks.find(stock => 
      stock.stockNumber === stockNumber && stock.id !== excludeId
    );

    const isValid = !existingStock;

    return NextResponse.json({
      success: true,
      isValid,
      message: isValid ? 'Stock number is available' : 'Stock number already exists'
    });

  } catch (error) {
    console.error('Error validating stock number:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate stock number' },
      { status: 500 }
    );
  }
}