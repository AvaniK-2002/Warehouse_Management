import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sku, warehouseId, delta, reason } = body;

    if (!sku || !warehouseId || delta === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: item, error: fetchError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('sku', sku)
      .eq('warehouse_id', warehouseId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const newQty = item.qty + delta;
    if (newQty < 0) {
      return NextResponse.json({ error: 'Insufficient stock' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('inventory_items')
      .update({
        qty: newQty,
        updated_at: new Date().toISOString(),
      })
      .eq('sku', sku)
      .eq('warehouse_id', warehouseId)
      .select()
      .single();

    if (updateError) throw updateError;

    const transactionType = delta > 0 ? 'Spare In' : 'Spare Out';
    await supabase.from('transactions').insert({
      warehouse_id: warehouseId,
      type: transactionType,
      source_destination: reason || 'Manual adjustment',
      sku,
      qty: Math.abs(delta),
      status: 'Completed',
      notes: reason,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Inventory adjust error:', error);
    return NextResponse.json({ error: 'Failed to adjust inventory' }, { status: 500 });
  }
}
