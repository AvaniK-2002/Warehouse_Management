import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const district = searchParams.get('district');
    const warehouseId = searchParams.get('warehouse');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let inventoryQuery = supabase
      .from('inventory_items')
      .select('*, warehouse:warehouses(*), category:categories(*)');

    if (warehouseId) {
      inventoryQuery = inventoryQuery.eq('warehouse_id', warehouseId);
    }

    if (district) {
      inventoryQuery = inventoryQuery.eq('warehouse.district', district);
    }

    const { data: inventory, error: invError } = await inventoryQuery;

    if (invError) throw invError;

    const totalStockQty = inventory?.reduce((sum, item) => sum + item.qty, 0) || 0;
    const totalStockValue = inventory?.reduce((sum, item) => sum + (item.qty * item.unit_price), 0) || 0;
    const reorderItems = inventory?.filter(item => item.qty <= item.reorder_threshold).length || 0;

    const warehouseMap = new Map<string, number>();
    inventory?.forEach(item => {
      const warehouseName = item.warehouse?.name || 'Unknown';
      warehouseMap.set(warehouseName, (warehouseMap.get(warehouseName) || 0) + item.qty);
    });

    const categoryMap = new Map<string, number>();
    inventory?.forEach(item => {
      const categoryName = item.category?.name || 'Unknown';
      categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + (item.qty * item.unit_price));
    });

    let transactionsQuery = supabase
      .from('transactions')
      .select('*, warehouse:warehouses(name)')
      .order('date', { ascending: false })
      .limit(10);

    if (warehouseId) {
      transactionsQuery = transactionsQuery.eq('warehouse_id', warehouseId);
    }

    if (from) {
      transactionsQuery = transactionsQuery.gte('date', from);
    }

    if (to) {
      transactionsQuery = transactionsQuery.lte('date', to);
    }

    const { data: transactions, error: txError } = await transactionsQuery;

    if (txError) throw txError;

    return NextResponse.json({
      totals: {
        totalStockQty,
        totalStockValue,
        reorderItems,
      },
      chartData: {
        stockByWarehouse: Array.from(warehouseMap.entries()).map(([name, value]) => ({ name, value })),
        categoryBreakdown: Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value })),
      },
      recentTransactions: transactions,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({
      totals: {
        totalStockQty: 0,
        totalStockValue: 0,
        reorderItems: 0,
      },
      chartData: {
        stockByWarehouse: [],
        categoryBreakdown: [],
      },
      recentTransactions: [],
      error: 'Failed to fetch dashboard data'
    }, { status: 500 });
  }
}
