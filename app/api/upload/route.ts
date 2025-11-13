import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { UploadRequest, UploadResponse } from '@/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body: UploadRequest = await request.json();
    const { scope, data } = body;

    let inserted = 0;
    let updated = 0;
    const errors: UploadResponse['errors'] = [];

    switch (scope) {
      case 'warehouses':
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          try {
            const { data: existing } = await supabase
              .from('warehouses')
              .select('id')
              .eq('name', row.name)
              .maybeSingle();

            if (existing) {
              const { error } = await supabase
                .from('warehouses')
                .update({
                  district: row.district,
                  address: row.address,
                  manager: row.manager,
                  contact_email: row.contact_email,
                  contact_phone: row.contact_phone,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);

              if (error) throw error;
              updated++;
            } else {
              const { error } = await supabase
                .from('warehouses')
                .insert({
                  name: row.name,
                  district: row.district,
                  address: row.address,
                  manager: row.manager,
                  contact_email: row.contact_email,
                  contact_phone: row.contact_phone,
                });

              if (error) throw error;
              inserted++;
            }
          } catch (err: any) {
            errors.push({ row: i + 1, field: 'general', message: err.message });
          }
        }
        break;

      case 'inventory':
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          try {
            if (!row.sku || !row.name || !row.warehouse_id) {
              throw new Error('Missing required fields: sku, name, warehouse_id');
            }

            const { data: existing } = await supabase
              .from('inventory_items')
              .select('sku')
              .eq('sku', row.sku)
              .maybeSingle();

            if (existing) {
              const { error } = await supabase
                .from('inventory_items')
                .update({
                  name: row.name,
                  category_id: row.category_id,
                  warehouse_id: row.warehouse_id,
                  qty: parseInt(row.qty) || 0,
                  unit_price: parseFloat(row.unit_price) || 0,
                  reorder_threshold: parseInt(row.reorder_threshold) || 10,
                  updated_at: new Date().toISOString(),
                })
                .eq('sku', row.sku);

              if (error) throw error;
              updated++;
            } else {
              const { error } = await supabase
                .from('inventory_items')
                .insert({
                  sku: row.sku,
                  name: row.name,
                  category_id: row.category_id,
                  warehouse_id: row.warehouse_id,
                  qty: parseInt(row.qty) || 0,
                  unit_price: parseFloat(row.unit_price) || 0,
                  reorder_threshold: parseInt(row.reorder_threshold) || 10,
                });

              if (error) throw error;
              inserted++;
            }
          } catch (err: any) {
            errors.push({ row: i + 1, field: 'general', message: err.message });
          }
        }
        break;

      case 'transactions':
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          try {
            if (!row.warehouse_id || !row.type || !row.source_destination || !row.qty) {
              throw new Error('Missing required fields');
            }

            const { error } = await supabase
              .from('transactions')
              .insert({
                date: row.date || new Date().toISOString(),
                warehouse_id: row.warehouse_id,
                type: row.type,
                source_destination: row.source_destination,
                sku: row.sku,
                qty: parseInt(row.qty),
                status: row.status || 'Pending',
                notes: row.notes,
              });

            if (error) throw error;
            inserted++;
          } catch (err: any) {
            errors.push({ row: i + 1, field: 'general', message: err.message });
          }
        }
        break;

      case 'spare_parts':
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          try {
            const { data: existing } = await supabase
              .from('spare_parts')
              .select('id')
              .eq('part_number', row.part_number)
              .maybeSingle();

            if (existing) {
              const { error } = await supabase
                .from('spare_parts')
                .update({
                  name: row.name,
                  description: row.description,
                  category_id: row.category_id,
                  compatibility: row.compatibility,
                  reorder_threshold: parseInt(row.reorder_threshold) || 5,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id);

              if (error) throw error;
              updated++;
            } else {
              const { error } = await supabase
                .from('spare_parts')
                .insert({
                  part_number: row.part_number,
                  name: row.name,
                  description: row.description,
                  category_id: row.category_id,
                  compatibility: row.compatibility,
                  reorder_threshold: parseInt(row.reorder_threshold) || 5,
                });

              if (error) throw error;
              inserted++;
            }
          } catch (err: any) {
            errors.push({ row: i + 1, field: 'general', message: err.message });
          }
        }
        break;

      case 'tasks':
        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          try {
            const { error } = await supabase
              .from('tasks')
              .insert({
                title: row.title,
                description: row.description,
                assignee: row.assignee,
                due_date: row.due_date,
                status: row.status || 'Pending',
                priority: row.priority || 'Medium',
              });

            if (error) throw error;
            inserted++;
          } catch (err: any) {
            errors.push({ row: i + 1, field: 'general', message: err.message });
          }
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    }

    return NextResponse.json({ inserted, updated, errors });
  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
