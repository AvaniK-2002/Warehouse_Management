import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const district = searchParams.get('district');

    let query = supabase
      .from('warehouses')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
    }

    if (district) {
      query = query.eq('district', district);
    }

    const { data, error, count } = await query
      .order('name')
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Warehouses API error:', error);
    return NextResponse.json({ error: 'Failed to fetch warehouses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { data, error } = await supabase
      .from('warehouses')
      .insert(body)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Create warehouse error:', error);
    return NextResponse.json({ error: 'Failed to create warehouse' }, { status: 500 });
  }
}
