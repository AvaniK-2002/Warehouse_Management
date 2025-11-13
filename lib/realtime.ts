import { supabase } from './supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export function subscribeToInventoryUpdates(callback: (payload: any) => void): RealtimeChannel {
  const channel = supabase
    .channel('inventory-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_items',
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToTransactionUpdates(callback: (payload: any) => void): RealtimeChannel {
  const channel = supabase
    .channel('transaction-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToWarehouseUpdates(callback: (payload: any) => void): RealtimeChannel {
  const channel = supabase
    .channel('warehouse-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'warehouses',
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return channel;
}

export function subscribeToDispatchUpdates(callback: (payload: any) => void): RealtimeChannel {
  const channel = supabase
    .channel('dispatch-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'dispatch_orders',
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return channel;
}

export function unsubscribe(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}
