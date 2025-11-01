import { NextRequest, NextResponse } from 'next/server';
import { Stock, StockStats } from '@/types/stock';

// Mock data for stocks - In production, this would connect to a real database
const stocks: Stock[] = [
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

// GET - Fetch stock statistics
export async function GET(request: NextRequest) {
  try {
    // Calculate statistics
    const totalStocks = stocks.length;
    
    const totalValue = stocks.reduce((sum, stock) => sum + stock.price, 0);
    const averagePrice = totalStocks > 0 ? totalValue / totalStocks : 0;

    // Calculate inventory statistics
    const totalQuantity = stocks.reduce((sum, stock) => sum + stock.quantity, 0);
    const totalAvailableQuantity = stocks.reduce((sum, stock) => sum + stock.availableQuantity, 0);
    const totalReservedQuantity = stocks.reduce((sum, stock) => sum + stock.reservedQuantity, 0);
    
    const lowStockItems = stocks.filter(stock => stock.quantity <= stock.lowStockThreshold && stock.quantity > 0).length;
    const outOfStockItems = stocks.filter(stock => stock.quantity === 0).length;
    
    const stockUtilization = totalQuantity > 0 ? (totalReservedQuantity / totalQuantity) * 100 : 0;
    const inventoryValue = stocks.reduce((sum, stock) => sum + (stock.quantity * stock.price), 0);
    const lowStockAlerts = stocks.filter(stock => stock.quantity <= stock.lowStockThreshold);

    // Calculate stocks by rarity
    const stocksByRarity = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    };

    stocks.forEach(stock => {
      stocksByRarity[stock.rarity]++;
    });

    // Get recently added stocks (last 5)
    const recentlyAdded = stocks
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const stats: StockStats = {
      totalStocks,
      totalValue,
      averagePrice,
      stocksByRarity,
      recentlyAdded,
      totalQuantity,
      totalAvailableQuantity,
      totalReservedQuantity,
      lowStockItems,
      outOfStockItems,
      stockUtilization,
      inventoryValue,
      lowStockAlerts
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Error fetching stock statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stock statistics' },
      { status: 500 }
    );
  }
}