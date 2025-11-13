'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Upload, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface DispatchOrder {
  id: string;
  order_number: string;
  customer_name: string;
  destination: string;
  status: string;
  dispatch_date: string | null;
  total_value: number;
  warehouse: { name: string } | null;
}

export default function SalesDispatchPage() {
  const [orders, setOrders] = useState<DispatchOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('dispatch_orders')
        .select('*, warehouse:warehouses(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Failed to fetch dispatch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Sales & Dispatch</h1>
          <p className="mt-1 text-sm text-slate-600">
            Manage dispatch orders and deliveries
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dispatch Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <Truck className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {order.order_number}
                    </h3>
                    <p className="text-sm text-slate-600">{order.customer_name}</p>
                    <p className="text-xs text-slate-500">
                      Destination: {order.destination}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-semibold text-slate-900">
                    ${order.total_value.toLocaleString()}
                  </div>
                  {order.dispatch_date && (
                    <p className="text-xs text-slate-500">
                      {format(new Date(order.dispatch_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                  <span
                    className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      order.status === 'Completed'
                        ? 'bg-green-100 text-green-700'
                        : order.status === 'Dispatched'
                        ? 'bg-blue-100 text-blue-700'
                        : order.status === 'In Transit'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
