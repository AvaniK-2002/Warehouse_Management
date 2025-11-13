// app/warehouses/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';

/**
 * Warehouses page:
 * - Parses workbook sheets into separate localStorage keys
 * - Real-time sync across tabs via BroadcastChannel (with storage fallback)
 * - Add / Import / Delete (per-item) functionality
 *
 * Install: npm install xlsx
 */

/** -------------------------
 * Types
 * ------------------------- */
type Warehouse = {
  id: string;
  name: string;
  district?: string;
  address?: string;
  manager?: string;
  contact_phone?: string;
  createdAt?: string;
};

type InventoryItem = {
  sku: string;
  name: string;
  category?: string;
  warehouseId?: string;
  rackId?: string;
  qty?: number;
  reorderThreshold?: number;
  unitPrice?: number;
};

type Rack = {
  id: string;
  warehouseId?: string;
  name?: string;
  itemName?: string;
  capacity?: number;
};

type SparePart = {
  id: string;
  name?: string;
  description?: string;
  rate?: number;
  mrp?: number;
  warehouseId?: string;
};

/** -------------------------
 * Storage keys
 * ------------------------- */
const KEY_WAREHOUSES = 'wms:warehouses:v1';
const KEY_INVENTORY = 'wms:inventory:v1';
const KEY_RACKS = 'wms:racks:v1';
const KEY_SPAREPARTS = 'wms:spareparts:v1';

/** -------------------------
 * Realtime channel
 * ------------------------- */
const CHANNEL_NAME = 'wms_channel_v1';
type ChannelMessage =
  | { type: 'reload' }
  | { type: 'imported'; payload?: { warehouses?: number; inventory?: number; racks?: number; spareParts?: number } }
  | { type: 'added'; payload?: { entity: 'warehouse' | 'inventory' | 'rack' | 'spare'; id: string } }
  | { type: 'deleted'; payload?: { entity: 'warehouse' | 'inventory' | 'rack' | 'spare'; id: string } };

function createBroadcaster() {
  if (typeof window === 'undefined') return null;
  try {
    const bc = new BroadcastChannel(CHANNEL_NAME);
    return {
      post: (m: ChannelMessage) => bc.postMessage(m),
      subscribe: (fn: (m: ChannelMessage) => void) => {
        const listener = (ev: MessageEvent) => fn(ev.data);
        bc.addEventListener('message', listener);
        return () => bc.removeEventListener('message', listener);
      }
    };
  } catch {
    // BroadcastChannel not supported - fallback to localStorage events
    return {
      post: (m: ChannelMessage) => {
        try {
          localStorage.setItem(`__${CHANNEL_NAME}`, JSON.stringify({ m, t: Date.now() }));
        } catch {}
      },
      subscribe: (fn: (m: ChannelMessage) => void) => {
        const listener = (ev: StorageEvent) => {
          if (ev.key === `__${CHANNEL_NAME}` && ev.newValue) {
            try {
              const parsed = JSON.parse(ev.newValue);
              fn(parsed.m);
            } catch {}
          }
        };
        window.addEventListener('storage', listener);
        return () => window.removeEventListener('storage', listener);
      }
    };
  }
}

const broadcaster = typeof window !== 'undefined' ? createBroadcaster() : null;

/** -------------------------
 * Helpers: storage read/write
 * ------------------------- */
function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}
function write<T>(key: string, rows: T[]) {
  localStorage.setItem(key, JSON.stringify(rows));
  // broadcast change
  try {
    broadcaster?.post({ type: 'reload' });
  } catch {}
}

/** -------------------------
 * FileUploader
 * ------------------------- */
function FileUploader({ onImported }: { onImported?: () => void }) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, any[]> | null>(null);
  const [loading, setLoading] = useState(false);

  const tolerant = (k: string) => k?.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');

  const mapWarehouseRow = (row: Record<string, any>): Warehouse => {
    const mapped: Record<string, any> = {};
    for (const k of Object.keys(row)) mapped[tolerant(k)] = row[k];
    const id = (mapped['warehouseid'] || mapped['id'] || uid('W')).toString();
    return {
      id,
      name: (mapped['warehousename'] || mapped['name'] || mapped['warehouse'] || '').toString(),
      district: (mapped['location'] || mapped['district'] || '').toString(),
      address: (mapped['address'] || '').toString(),
      manager: (mapped['manager'] || '').toString(),
      contact_phone: (mapped['contact_phone'] || mapped['phone'] || '').toString(),
      createdAt: new Date().toISOString()
    };
  };

  const mapInventoryRow = (row: Record<string, any>): InventoryItem => {
    const mapped: Record<string, any> = {};
    for (const k of Object.keys(row)) mapped[tolerant(k)] = row[k];
    const qty = Number(mapped['stockonhand'] ?? mapped['qty'] ?? mapped['quantity'] ?? 0) || 0;
    const unitPrice = Number(mapped['unitcost'] ?? mapped['rate'] ?? mapped['unitprice'] ?? 0) || 0;
    return {
      sku: (mapped['item_id'] || mapped['itemid'] || mapped['sku'] || uid('sku')).toString(),
      name: (mapped['item_name'] || mapped['name'] || mapped['itemname'] || '').toString(),
      category: (mapped['category'] || '').toString(),
      warehouseId: (mapped['warehouseid'] || mapped['warehouse_id'] || mapped['warehouse'] || '').toString() || undefined,
      rackId: (mapped['rackid'] || mapped['rack_id'] || mapped['rack'] || '').toString() || undefined,
      qty,
      reorderThreshold: Number(mapped['reorderlevel'] ?? mapped['reorder_threshold'] ?? 0) || 0,
      unitPrice
    };
  };

  const mapRackRow = (row: Record<string, any>): Rack => {
    const mapped: Record<string, any> = {};
    for (const k of Object.keys(row)) mapped[tolerant(k)] = row[k];
    return {
      id: (mapped['rackid'] || mapped['rack_id'] || mapped['id'] || uid('rack')).toString(),
      warehouseId: (mapped['warehouseid'] || mapped['warehouse_id'] || mapped['warehouse'] || '').toString() || undefined,
      name: (mapped['rackname'] || mapped['name'] || '').toString(),
      itemName: (mapped['itemname'] || mapped['item_name'] || '').toString(),
      capacity: Number(mapped['capacity'] ?? 0) || undefined
    };
  };

  const mapSpareRow = (row: Record<string, any>): SparePart => {
    const mapped: Record<string, any> = {};
    for (const k of Object.keys(row)) mapped[tolerant(k)] = row[k];
    const rate = Number(mapped['rate'] || mapped['rate₹'] || mapped['rateinr'] || 0) || 0;
    const mrp = Number(mapped['mrp'] || mapped['mrp₹'] || 0) || 0;
    return {
      id: (mapped['spareparts_id'] || mapped['id'] || uid('sp')).toString(),
      name: (mapped['item_name'] || mapped['name'] || '').toString(),
      description: (mapped['description'] || '').toString(),
      rate,
      mrp,
      warehouseId: (mapped['warehouseid'] || mapped['warehouse_id'] || '').toString() || undefined
    };
  };

  const handleFile = async (file?: File) => {
    setMessage(null);
    setErrors(null);
    setPreview(null);
    if (!file) return;
    setFileName(file.name);
    setLoading(true);

    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: 'array' });

      const warehouses: Warehouse[] = [];
      const inventory: InventoryItem[] = [];
      const racks: Rack[] = [];
      const spareParts: SparePart[] = [];
      const previewObj: Record<string, any[]> = {};

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
        previewObj[sheetName] = json.slice(0, 10);

        const key = sheetName.trim().toLowerCase();
        if (key.includes('warehouse')) {
          for (const r of json) warehouses.push(mapWarehouseRow(r));
        } else if (key.includes('inventory')) {
          for (const r of json) inventory.push(mapInventoryRow(r));
        } else if (key.includes('rack')) {
          for (const r of json) racks.push(mapRackRow(r));
        } else if (key.includes('spare')) {
          for (const r of json) spareParts.push(mapSpareRow(r));
        } else {
          // guess by first row columns
          const cols = Object.keys(json[0] || {}).map((c) => tolerant(c));
          if (cols.includes('warehouseid') && cols.includes('warehousename')) {
            for (const r of json) warehouses.push(mapWarehouseRow(r));
          } else if (cols.includes('stockonhand') || cols.includes('unitcost')) {
            for (const r of json) inventory.push(mapInventoryRow(r));
          } else if (cols.includes('rackid')) {
            for (const r of json) racks.push(mapRackRow(r));
          } else if (cols.includes('spareparts_id') || cols.includes('rate')) {
            for (const r of json) spareParts.push(mapSpareRow(r));
          }
        }
      }

      // Merge with existing localStorage

      if (warehouses.length) {
        const existing = read<Warehouse>(KEY_WAREHOUSES);
        const byId = new Map(existing.map((e) => [e.id, e]));
        for (const w of warehouses) byId.set(w.id, { ...byId.get(w.id), ...w });
        write(KEY_WAREHOUSES, Array.from(byId.values()));
      }

      if (inventory.length) {
        const existing = read<InventoryItem>(KEY_INVENTORY);
        // keying by sku + warehouseId for uniqueness
        const byKey = new Map(existing.map((e) => [`${e.sku}::${e.warehouseId||''}`, e]));
        for (const it of inventory) {
          const k = `${it.sku}::${it.warehouseId||''}`;
          const prev = byKey.get(k);
          if (prev) byKey.set(k, { ...prev, ...it });
          else byKey.set(k, it);
        }
        write(KEY_INVENTORY, Array.from(byKey.values()));
      }

      if (racks.length) {
        const existing = read<Rack>(KEY_RACKS);
        const byId = new Map(existing.map((e) => [e.id, e]));
        for (const r of racks) byId.set(r.id, { ...byId.get(r.id), ...r });
        write(KEY_RACKS, Array.from(byId.values()));
      }

      if (spareParts.length) {
        const existing = read<SparePart>(KEY_SPAREPARTS);
        const byId = new Map(existing.map((e) => [e.id, e]));
        for (const s of spareParts) byId.set(s.id, { ...byId.get(s.id), ...s });
        write(KEY_SPAREPARTS, Array.from(byId.values()));
      }

      setPreview(previewObj);
      setMessage(
        `Imported: ${warehouses.length} warehouses, ${inventory.length} inventory rows, ${racks.length} racks, ${spareParts.length} spare parts.`
      );

      // broadcast import event
      try {
        broadcaster?.post({ type: 'imported', payload: { warehouses: warehouses.length, inventory: inventory.length, racks: racks.length, spareParts: spareParts.length } });
      } catch {}
      onImported?.();
    } catch (err: any) {
      console.error(err);
      setErrors('Failed to parse workbook. Ensure it is a valid .xlsx file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex items-start gap-3">
      <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <button className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-slate-50" onClick={() => fileRef.current?.click()}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
          <path d="M12 3v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3" y="15" width="18" height="6" rx="2" stroke="currentColor" strokeWidth="1.2" />
        </svg>
        {loading ? 'Importing...' : 'Import Workbook'}
      </button>

      {fileName && <span className="text-xs text-slate-500 ml-2 hidden sm:inline">{fileName}</span>}
      {message && <div className="text-xs text-green-700 ml-3 hidden md:inline">{message}</div>}
      {errors && <div className="text-xs text-red-600 ml-3">{errors}</div>}

      {preview && (
        <div className="mt-2 w-full space-y-2 rounded border p-2 bg-white shadow-sm">
          <div className="text-xs text-slate-600 mb-1">Preview (first 10 rows per sheet)</div>
          {Object.entries(preview).map(([sheet, rows]) => (
            <details key={sheet} className="text-xs">
              <summary className="cursor-pointer font-medium">{sheet} — {rows.length} rows</summary>
              <div className="overflow-auto max-h-40 mt-2 text-[12px]">
                <table className="w-full table-auto border-collapse text-left">
                  <thead>
                    <tr>
                      {Object.keys(rows[0] || {}).map((c) => (
                        <th key={c} className="pr-3 pb-1 text-[11px] text-slate-600">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="odd:bg-slate-50">
                        {Object.values(r).map((v, j) => (
                          <td key={j} className="pr-3 py-1 text-[12px]">{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

/** -------------------------
 * AddWarehouseModal
 * ------------------------- */
function AddWarehouseModal({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', district: '', address: '', manager: '', contact_phone: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!form.name || !form.district) {
      setError('Name and district are required');
      return;
    }
    setLoading(true);
    try {
      const newWh: Warehouse = {
        id: uid('W'),
        name: form.name,
        district: form.district,
        address: form.address || undefined,
        manager: form.manager || undefined,
        contact_phone: form.contact_phone || undefined,
        createdAt: new Date().toISOString()
      };
      const existing = read<Warehouse>(KEY_WAREHOUSES);
      existing.unshift(newWh);
      write(KEY_WAREHOUSES, existing);

      // broadcast added
      try {
        broadcaster?.post({ type: 'added', payload: { entity: 'warehouse', id: newWh.id } });
      } catch {}

      setForm({ name: '', district: '', address: '', manager: '', contact_phone: '' });
      setOpen(false);
      onAdded?.();
    } catch (err) {
      setError('Failed to add');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M12 5v14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        Add Warehouse
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded bg-white p-4 sm:p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Add Warehouse</h3>
            <form className="mt-4 space-y-3" onSubmit={submit}>
              <div>
                <label className="text-sm">Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" placeholder="Warehouse name" />
              </div>
              <div>
                <label className="text-sm">District / Location</label>
                <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" placeholder="District or Location" />
              </div>
              <div>
                <label className="text-sm">Address</label>
                <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" placeholder="Address (optional)" />
              </div>
              <div>
                <label className="text-sm">Manager</label>
                <input value={form.manager} onChange={(e) => setForm({ ...form, manager: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" placeholder="Manager (optional)" />
              </div>
              <div>
                <label className="text-sm">Phone</label>
                <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="mt-1 w-full rounded border px-3 py-2 text-sm" placeholder="Phone (optional)" />
              </div>

              {error && <div className="text-sm text-red-600">{error}</div>}

              <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="rounded border px-3 py-2 text-sm">Cancel</button>
                <button type="submit" disabled={loading} className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-60">{loading ? 'Adding...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/** -------------------------
 * Main component with delete and realtime
 * ------------------------- */
export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [spareparts, setSpareparts] = useState<SparePart[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAll = () => {
    setLoading(true);
    setWarehouses(read<Warehouse>(KEY_WAREHOUSES));
    setInventory(read<InventoryItem>(KEY_INVENTORY));
    setRacks(read<Rack>(KEY_RACKS));
    setSpareparts(read<SparePart>(KEY_SPAREPARTS));
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    // subscribe to broadcast channel or storage fallback
    const unsub = broadcaster?.subscribe?.((msg: ChannelMessage) => {
      if (!msg) return;
      if (msg.type === 'reload' || msg.type === 'imported' || msg.type === 'added' || msg.type === 'deleted') {
        loadAll();
      }
    });
    // return cleanup
    return () => {
      try {
        unsub?.();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImported = () => loadAll();
  const handleAdded = () => loadAll();

  // delete helpers (per-item)
  const deleteWarehouse = (id: string) => {
    if (!confirm('Delete this warehouse and its related inventory/racks/spare parts?')) return;
    const whs = read<Warehouse>(KEY_WAREHOUSES).filter((w) => w.id !== id);
    write(KEY_WAREHOUSES, whs);

    // remove related inventory/racks/spares
    const inv = read<InventoryItem>(KEY_INVENTORY).filter((it) => it.warehouseId !== id);
    write(KEY_INVENTORY, inv);
    const rks = read<Rack>(KEY_RACKS).filter((r) => r.warehouseId !== id);
    write(KEY_RACKS, rks);
    const sps = read<SparePart>(KEY_SPAREPARTS).filter((s) => s.warehouseId !== id);
    write(KEY_SPAREPARTS, sps);

    try {
      broadcaster?.post({ type: 'deleted', payload: { entity: 'warehouse', id } });
    } catch {}
    loadAll();
  };

  const deleteInventoryItem = (sku: string) => {
    if (!confirm('Delete this inventory item?')) return;
    const inv = read<InventoryItem>(KEY_INVENTORY).filter((it) => it.sku !== sku);
    write(KEY_INVENTORY, inv);
    try {
      broadcaster?.post({ type: 'deleted', payload: { entity: 'inventory', id: sku } });
    } catch {}
    loadAll();
  };

  const deleteRack = (id: string) => {
    if (!confirm('Delete this rack?')) return;
    const rks = read<Rack>(KEY_RACKS).filter((r) => r.id !== id);
    write(KEY_RACKS, rks);
    try {
      broadcaster?.post({ type: 'deleted', payload: { entity: 'rack', id } });
    } catch {}
    loadAll();
  };

  const deleteSpare = (id: string) => {
    if (!confirm('Delete this spare part?')) return;
    const sps = read<SparePart>(KEY_SPAREPARTS).filter((s) => s.id !== id);
    write(KEY_SPAREPARTS, sps);
    try {
      broadcaster?.post({ type: 'deleted', payload: { entity: 'spare', id } });
    } catch {}
    loadAll();
  };

  // Compute per-warehouse stats
  const statsByWarehouse = (w: Warehouse) => {
    const wid = w.id;
    const items = inventory.filter((it) => it.warehouseId === wid);
    const distinctItems = new Set(items.map((i) => i.sku)).size;
    const totalQty = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
    const totalValue = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unitPrice) || 0), 0);
    const racksForW = racks.filter((r) => r.warehouseId === wid).length;
    const spareForW = spareparts.filter((s) => s.warehouseId === wid).length;
    return { distinctItems, totalQty, totalValue, racksForW, spareForW };
  };

  const filtered = warehouses.filter((w) =>
    (w.name + ' ' + (w.district || '') + ' ' + (w.address || '')).toLowerCase().includes(search.toLowerCase())
  );

  const clearAll = () => {
    if (!confirm('Delete ALL data?')) return;
    write<Warehouse>(KEY_WAREHOUSES, []);
    write<InventoryItem>(KEY_INVENTORY, []);
    write<Rack>(KEY_RACKS, []);
    write<SparePart>(KEY_SPAREPARTS, []);
    try {
      broadcaster?.post({ type: 'reload' });
    } catch {}
    loadAll();
  };

  // show warehouse details modal (inventory/racks/spares) for management and deletion
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Warehouses</h1>
          <p className="mt-1 text-sm text-slate-600">Manage warehouse locations and overview</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <FileUploader onImported={handleImported} />
          <AddWarehouseModal onAdded={handleAdded} />
          <button onClick={clearAll} className="rounded border px-3 py-2 text-sm text-red-600 hover:bg-red-50">Clear all data</button>
        </div>
      </div>

      <div>
        <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <h2 className="text-lg font-medium">All Warehouses</h2>
          <div className="relative w-full sm:w-64">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <input className="w-full rounded border px-3 py-2 pl-10 text-sm" placeholder="Search warehouses..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="mt-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <div className="col-span-full py-8 text-center text-slate-500">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-500">No warehouses found.</div>
            ) : (
              filtered.map((w) => {
                const s = statsByWarehouse(w);
                return (
                  <div key={w.id} className="rounded border bg-white p-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900 truncate">{w.name}</div>
                            <div className="text-sm text-slate-600">{w.district || '—'}</div>
                            {w.address && <div className="mt-2 text-xs text-slate-500 line-clamp-2">{w.address}</div>}
                          </div>
                          <div className="text-left sm:text-right">
                            <div className="text-xs text-slate-500">Racks: {s.racksForW}</div>
                            <div className="text-xs text-slate-500">SpareParts: {s.spareForW}</div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <div className="rounded border p-2 text-xs">
                            <div className="text-[13px] font-medium">{s.distinctItems}</div>
                            <div className="text-[12px] text-slate-500">Items</div>
                          </div>
                          <div className="rounded border p-2 text-xs">
                            <div className="text-[13px] font-medium">{s.totalQty}</div>
                            <div className="text-[12px] text-slate-500">Total Qty</div>
                          </div>
                          <div className="rounded border p-2 text-xs">
                            <div className="text-[13px] font-medium">₹{s.totalValue.toFixed(2)}</div>
                            <div className="text-[12px] text-slate-500">Stock Value</div>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-500">
                          <div>Manager: {w.manager || '—'}</div>
                          <div>Phone: {w.contact_phone || '—'}</div>
                        </div>
                      </div>

                      <div className="mt-4 sm:mt-0 sm:ml-4 flex sm:flex-col items-center sm:items-start gap-2">
                        <div className="flex gap-2">
                          <button title="Open in Google Maps" onClick={() => {
                            const q = encodeURIComponent(w.address || `${w.name} ${w.district}`);
                            window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
                          }} className="rounded bg-slate-50 px-2 py-1 text-sm">
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z" stroke="currentColor" strokeWidth="1.2"/></svg>
                          </button>
                          <button title="View details" onClick={() => setSelectedWarehouse(w)} className="rounded bg-slate-50 px-2 py-1 text-sm">Details</button>
                        </div>
                        <button title="Delete warehouse" onClick={() => deleteWarehouse(w.id)} className="rounded border px-2 py-1 text-sm text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Warehouse Details Modal */}
      {selectedWarehouse && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-auto">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedWarehouse(null)} />
          <div className="relative z-10 w-full max-w-4xl rounded bg-white p-4 sm:p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">{selectedWarehouse.name}</h3>
                <div className="text-sm text-slate-500">{selectedWarehouse.district}</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button onClick={() => setSelectedWarehouse(null)} className="rounded border px-3 py-1 text-sm">Close</button>
                <button onClick={() => deleteWarehouse(selectedWarehouse.id)} className="rounded border px-3 py-1 text-sm text-red-600">Delete Warehouse</button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">Inventory</h4>
                <div className="mt-2 space-y-2 max-h-64 overflow-auto">
                  {inventory.filter((it) => it.warehouseId === selectedWarehouse.id).length === 0 ? (
                    <div className="text-xs text-slate-500">No inventory for this warehouse.</div>
                  ) : (
                    inventory.filter((it) => it.warehouseId === selectedWarehouse.id).map((it) => (
                      <div key={it.sku} className="flex items-center justify-between rounded border p-2 text-xs">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{it.name} <span className="text-[11px] text-slate-500">({it.sku})</span></div>
                          <div className="text-[11px] text-slate-500">Qty: {it.qty || 0} • ₹{(it.unitPrice || 0).toFixed(2)}</div>
                        </div>
                        <div className="flex gap-2 ml-2">
                          <button onClick={() => deleteInventoryItem(it.sku)} className="rounded border px-2 py-1 text-[11px] text-red-600">Delete</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium">Racks</h4>
                <div className="mt-2 space-y-2 max-h-64 overflow-auto">
                  {racks.filter((r) => r.warehouseId === selectedWarehouse.id).length === 0 ? (
                    <div className="text-xs text-slate-500">No racks for this warehouse.</div>
                  ) : (
                    racks.filter((r) => r.warehouseId === selectedWarehouse.id).map((r) => (
                      <div key={r.id} className="flex items-center justify-between rounded border p-2 text-xs">
                        <div>
                          <div className="font-medium">{r.name || r.id}</div>
                          <div className="text-[11px] text-slate-500">Capacity: {r.capacity ?? '—'}</div>
                        </div>
                        <div>
                          <button onClick={() => deleteRack(r.id)} className="rounded border px-2 py-1 text-[11px] text-red-600">Delete</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <h4 className="font-medium mt-4">Spare Parts</h4>
                <div className="mt-2 space-y-2 max-h-52 overflow-auto">
                  {spareparts.filter((s) => s.warehouseId === selectedWarehouse.id).length === 0 ? (
                    <div className="text-xs text-slate-500">No spare parts for this warehouse.</div>
                  ) : (
                    spareparts.filter((s) => s.warehouseId === selectedWarehouse.id).map((s) => (
                      <div key={s.id} className="flex items-center justify-between rounded border p-2 text-xs">
                        <div>
                          <div className="font-medium">{s.name || s.id}</div>
                          <div className="text-[11px] text-slate-500">₹{(s.rate || 0).toFixed(2)}</div>
                        </div>
                        <div>
                          <button onClick={() => deleteSpare(s.id)} className="rounded border px-2 py-1 text-[11px] text-red-600">Delete</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
