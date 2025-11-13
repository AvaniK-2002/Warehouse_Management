'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * SparePartsPage - full updated version with robust Excel import and realtime
 *
 * Requirements:
 *  - npm i xlsx
 *  - supabase client exported from '@/lib/supabase'
 *  - DB tables: spare_parts (id, part_number, name, description, compatibility, reorder_threshold, category_id, rack_id)
 *    and categories (id, name), racks (id, name)
 *
 * If your DB uses different table/column names, update the table names
 * or column mapping accordingly. The import has a "missing column recovery" helper that will attempt to remove unknown
 * columns from the payload and retry automatically.
 */

// Tiny modal primitive used for examples — replace with your modal components if you have them
function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: React.ReactNode; title?: string; }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded bg-white p-4 sm:p-6 shadow-lg">
        {title && <h3 className="mb-4 text-lg font-semibold">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

interface SparePart {
  id?: string;
  part_number?: string;
  name?: string;
  description?: string | null;
  category?: { name?: string } | null;
  category_id?: string | null;
  rack_id?: string | null;
  compatibility?: string | null;
  reorder_threshold?: number | null;
}

export default function SparePartsPage() {
  const [parts, setParts] = useState<SparePart[]>([]);
  const [loading, setLoading] = useState(true);

  // file import states
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const workbookRef = useRef<any | null>(null); // persist workbook across hot reloads
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [sheetPreview, setSheetPreview] = useState<any[]>([]);
  const [mappingPreviewHeaders, setMappingPreviewHeaders] = useState<string[]>([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // add part
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newPart, setNewPart] = useState<SparePart>({ name: '', part_number: '', description: '', compatibility: '', reorder_threshold: 0, category: { name: '' } });

  // categories cache
  const categoriesCacheRef = useRef<Record<string, string>>({}); // name(lower) -> id

  useEffect(() => {
    fetchCategoriesCache();
    fetchSpareParts();
    const unsub = setupRealtime();
    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch categories and build cache
  async function fetchCategoriesCache() {
    try {
      const { data, error } = await supabase.from('categories').select('id, name');
      if (error) {
        console.warn('Could not load categories cache', error);
        return;
      }
      const cache: Record<string, string> = {};
      (data || []).forEach((c: any) => {
        if (c.name && c.id) cache[c.name.toLowerCase()] = c.id;
      });
      categoriesCacheRef.current = cache;
    } catch (err) {
      console.error('fetchCategoriesCache error', err);
    }
  }

  // Fetch spare parts (with category join); normalizes both aliases
  async function fetchSpareParts() {
    setLoading(true);
    try {
      // Try first select alias `category:categories(name)` then fallback to `categories:categories(name)`
      const primary = await supabase.from('spare_parts').select('*, category:categories(name)').order('name');
      if (!primary.error) {
        setParts((primary.data || []).map((r: any) => {
          if (r.categories) {
            r.category = r.categories;
            delete r.categories;
          }
          return r;
        }));
        return;
      }
      // fallback
      const alt = await supabase.from('spare_parts').select('*, categories:categories(name)').order('name');
      if (!alt.error) {
        setParts((alt.data || []).map((r: any) => {
          if (r.categories) {
            r.category = r.categories;
            delete r.categories;
          }
          return r;
        }));
        return;
      }
      // If both failed, throw first error
      throw primary.error || alt.error;
    } catch (err) {
      console.error('Failed to fetch spare parts:', err);
      setParts([]);
    } finally {
      setLoading(false);
    }
  }

  // Realtime subscription (works for Supabase v2 and v1)
  function setupRealtime() {
    try {
      // @ts-ignore
      if (supabase.channel) {
        // Supabase JS v2
        // @ts-ignore
        const channel = supabase.channel('public:spare_parts_changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'spare_parts' }, () => {
            fetchSpareParts();
          })
          .subscribe();
        return () => { channel.unsubscribe(); };
      } else if ((supabase as any).from) {
        // Supabase JS v1
        const sub = (supabase as any)
          .from('spare_parts')
          .on('*', () => {
            fetchSpareParts();
          })
          .subscribe();
        return () => { (supabase as any).removeSubscription(sub); };
      }
    } catch (e) {
      console.warn('Realtime setup failed, using polling fallback', e);
      const id = setInterval(fetchSpareParts, 10000);
      return () => clearInterval(id);
    }
  }

  // ----- File input & workbook handling -----
  const onClickImport = () => {
    if (!fileInputRef.current) {
      fileInputRef.current = document.createElement('input');
      fileInputRef.current.type = 'file';
      fileInputRef.current.accept = '.xlsx,.xls,.csv';
      fileInputRef.current.onchange = handleFileInput;
    }
    fileInputRef.current.click();
  };

  async function handleFileInput(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      // Import XLSX library
      const XLSX = await import('xlsx');
      if (!XLSX || !XLSX.read) {
        throw new Error('XLSX library not available');
      }
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      workbookRef.current = workbook; // persist workbook
      const names = workbook?.SheetNames || [];
      setSheetNames(names);
      setSelectedSheet(null);
      setSheetPreview([]);
      setMappingPreviewHeaders([]);
      setImportModalOpen(true);
    } catch (err) {
      console.error('Failed to parse workbook', err);
      setImportError('Failed to parse Excel file. Check browser console for details.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // When user chooses a sheet, preview it
  async function onChooseSheet(name: string) {
    setImportError(null);
    setSelectedSheet(name);
    try {
      const workbook = workbookRef.current;
      if (!workbook) {
        setSheetPreview([]);
        setMappingPreviewHeaders([]);
        setImportError('Workbook not found. Re-upload the file and try again.');
        return;
      }
      const XLSX = await import('xlsx');
      const sheet = workbook.Sheets[name];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
      setSheetPreview(json.slice(0, 20));
      setMappingPreviewHeaders(json.length > 0 ? Object.keys(json[0] || {}) : []);
    } catch (err) {
      console.error('onChooseSheet error', err);
      setSheetPreview([]);
      setMappingPreviewHeaders([]);
      setImportError('Failed to generate sheet preview.');
    }
  }

  // ----- Header auto-map helpers -----
  const expectedHeaders: Record<string, string[]> = {
    part_number: ['part_number', 'part no', 'partno', 'part no.','sku','partno.'],
    name: ['name', 'part name', 'item_name', 'item name'],
    description: ['description', 'desc', 'details'],
    category: ['category', 'cat'],
    compatibility: ['compatibility', 'compatible', 'fits'],
    reorder_threshold: ['reorder_level', 'reorder_threshold', 'reorder', 'reorder level', 'reorder_threshold']
  };

  function findHeaderForField(headers: string[], field: string) {
    const candidates = expectedHeaders[field] || [];
    const lower = headers.map(h => (h || '').toString().toLowerCase().trim());
    for (const cand of candidates) {
      const idx = lower.indexOf(cand.toLowerCase());
      if (idx >= 0) return headers[idx];
    }
    // fallback: exact match
    if (headers.includes(field)) return field;
    // fallback: substring match
    for (let i = 0; i < lower.length; i++) {
      if (lower[i].includes(field.replace(/_/g, ' '))) return headers[i];
    }
    return null;
  }

  // ----- Helpers to convert snake<->camel (used for missing-column recovery) -----
  function camelToSnake(s: string) {
    return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  function snakeToCamel(s: string) {
    return s.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
  }

  // Try insert and, if Supabase complains about a missing column, remove it and retry
  async function tryInsertWithMissingColumnRecovery(table: string, batch: any[]) {
    const resp = await supabase.from(table).insert(batch);
    if (!resp.error) return resp;

    const msg = resp.error.message || '';
    const missingMatch = msg.match(/column\s+"?([^"\s]+)"?\s+of\s+relation/i);
    if (missingMatch && missingMatch[1]) {
      const missingCol = missingMatch[1];
      console.warn('Detected missing column from DB:', missingCol, '— removing it from payload and retrying');
      const cleaned = batch.map((r) => {
        const copy: any = { ...r };
        delete copy[missingCol];
        delete copy[camelToSnake(missingCol)];
        delete copy[snakeToCamel(missingCol)];
        return copy;
      });
      const resp2 = await supabase.from(table).insert(cleaned);
      return resp2;
    }
    return resp;
  }

  // ----- Core import function (batch + category creation + robust error reporting) -----
  async function doImportSelectedSheet() {
    setImportError(null);
    if (!selectedSheet) {
      setImportError('No sheet selected.');
      return;
    }
    setImporting(true);
    try {
      const workbook = workbookRef.current;
      if (!workbook) {
        throw new Error('Workbook not available (possibly due to hot reload). Please re-upload the file and try again.');
      }
      const XLSX = await import('xlsx');
      const rawRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[selectedSheet], { defval: null, raw: false });
      if (!rawRows || rawRows.length === 0) {
        setImportError('Selected sheet is empty.');
        return;
      }

      const headers = Object.keys(rawRows[0] || {});
      if (headers.length === 0) {
        setImportError('Could not detect headers in the selected sheet.');
        return;
      }

      const mapHeader = (field: string) => {
        const h = findHeaderForField(headers, field);
        if (h) return h;
        const frag = field.split('_').join(' ').toLowerCase();
        for (const hh of headers) {
          if ((hh || '').toString().toLowerCase().includes(frag)) return hh;
        }
        return null;
      };

      // prepare insert payloads
      const toInsert: any[] = [];
      for (const r of rawRows) {
        const get = (f: string) => {
          const h = mapHeader(f);
          return h ? (r[h] ?? null) : null;
        };

        const categoryRaw = (get('category') ?? r['category'] ?? r['Category'] ?? null);
        const categoryName = categoryRaw !== null && categoryRaw !== undefined ? String(categoryRaw).trim() : null;

        const rowObj: any = {
          part_number: (get('part_number') ?? r['part_number'] ?? null) || null,
          name: (get('name') ?? r['name'] ?? null) || null,
          description: (get('description') ?? r['description'] ?? null) || null,
          compatibility: (get('compatibility') ?? r['compatibility'] ?? null) || null,
          reorder_threshold: (() => {
            const v = (get('reorder_threshold') ?? r['reorder_threshold'] ?? r['Reorder Level'] ?? null);
            if (v === null || v === '') return null;
            const n = Number(String(v).replace(/[^0-9.-]/g, ''));
            return Number.isFinite(n) ? n : null;
          })(),
          // category_id and rack_id set below
        };

        // create category if provided
        if (categoryName) {
          const key = categoryName.toLowerCase();
          let catId = categoriesCacheRef.current[key];
          if (!catId) {
            const { data: createdCat, error: createErr } = await supabase.from('categories').insert({ name: categoryName }).select('id').single();
            if (createErr) {
              console.error('Category creation error for', categoryName, createErr);
            } else if (createdCat?.id) {
              catId = createdCat.id;
              if (catId) {
                categoriesCacheRef.current[key] = catId;
              }
            }
          }
          if (catId) rowObj.category_id = catId;
        }

        toInsert.push(rowObj);
      }

      if (toInsert.length === 0) {
        setImportError('No valid rows prepared for insert.');
        return;
      }

      // insert in batches to avoid timeouts
      const BATCH_SIZE = 200;
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const batch = toInsert.slice(i, i + BATCH_SIZE);
        const resp = await tryInsertWithMissingColumnRecovery('spare_parts', batch);
        if (resp.error) {
          const errMsg = resp.error.message || JSON.stringify(resp.error);
          const errDetails = (resp.error as any).details || '';
          console.error('Supabase insert error', resp.error, 'example payload', batch[0]);
          setImportError(`Supabase insert failed: ${errMsg} ${errDetails}`);
          return;
        }
      }

      // success
      await fetchCategoriesCache();
      await fetchSpareParts();
      setImportModalOpen(false);
      setSheetNames([]);
      setSheetPreview([]);
      setSelectedSheet(null);
      alert(`Imported ${toInsert.length} rows successfully.`);
    } catch (err: any) {
      console.error('Import exception', err);
      setImportError(err?.message || String(err));
    } finally {
      setImporting(false);
    }
  }

  // ----- Add single part -----
  async function createNewPart() {
    try {
      let category_id: string | null = null;
      const catName = (newPart.category?.name || '').trim();
      if (catName) {
        const key = catName.toLowerCase();
        category_id = categoriesCacheRef.current[key];
        if (!category_id) {
          const { data, error } = await supabase.from('categories').insert({ name: catName }).select('id').single();
          if (!error && data?.id) {
            category_id = data.id;
            if (category_id) {
              categoriesCacheRef.current[key] = category_id;
            }
          } else {
            console.error('Category create error', error);
          }
        }
      }

      const payload: any = {
        part_number: newPart.part_number || '',
        name: newPart.name || '',
        description: newPart.description || null,
        compatibility: newPart.compatibility || null,
        reorder_threshold: newPart.reorder_threshold ?? 0,
        category_id: category_id ?? null,
        rack_id: newPart.rack_id || null,
      };

      const { error } = await supabase.from('spare_parts').insert([payload]);
      if (error) throw error;

      setAddModalOpen(false);
      setNewPart({ name: '', part_number: '', description: '', compatibility: '', reorder_threshold: 0, category: { name: '' } });
      fetchSpareParts();
    } catch (err) {
      console.error('Failed to add part', err);
      alert('Failed to add part. See console for details.');
    }
  }

  // ----- UI -----
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Spare Parts</h1>
          <p className="mt-1 text-sm text-slate-600">Catalog of spare parts and components (realtime)</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm" onClick={onClickImport}>
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>

          <Button size="sm" onClick={() => setAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Part
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading parts...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {parts.map((part: any) => (
            <Card key={part.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-slate-100">
                  <span className="text-4xl text-slate-400">📦</span>
                </div>
                <h3 className="font-semibold text-slate-900 truncate">{part.name}</h3>
                <p className="mt-1 text-sm font-mono text-slate-600 truncate">{part.part_number}</p>
                {part.description && <p className="mt-2 text-xs text-slate-500 line-clamp-2">{part.description}</p>}
                {part.compatibility && <p className="mt-2 text-xs text-slate-500 line-clamp-2">Compatible: {part.compatibility}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Reorder: {part.reorder_threshold ?? '-'}</span>
                  <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                    {part.category?.name || part.categories?.name || 'Uncategorized'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Import Modal */}
      <Modal open={importModalOpen} onClose={() => setImportModalOpen(false)} title="Import Excel - choose sheet">
        <div className="mb-4">
          <p className="text-sm text-slate-600">Choose a sheet to preview and import. We attempt to auto-map columns to DB fields.</p>
        </div>

        <div className="mb-4 flex gap-2 flex-wrap">
          {sheetNames.map((sn) => (
            <button
              key={sn}
              className={`rounded px-3 py-1 border text-sm ${selectedSheet === sn ? 'bg-sky-100 border-sky-400' : 'bg-white'}`}
              onClick={() => onChooseSheet(sn)}
            >
              {sn}
            </button>
          ))}
        </div>

        {selectedSheet && (
          <>
            <div className="mb-2">
              <strong>Selected sheet:</strong> {selectedSheet}
            </div>
            <div className="mb-2">
              <strong>Detected headers:</strong> {mappingPreviewHeaders.join(', ') || '—'}
            </div>

            {importError && (
              <div className="mb-2 rounded border-l-4 border-red-400 bg-red-50 p-3 text-sm text-red-700">
                <strong>Import error:</strong> {importError}
              </div>
            )}

            <div className="mb-4 max-h-56 overflow-auto border rounded p-2">
              {sheetPreview.length === 0 ? (
                <div className="text-sm text-slate-500">No preview available (sheet empty or no rows)</div>
              ) : (
                <table className="w-full table-auto text-xs">
                  <thead>
                    <tr>
                      {Object.keys(sheetPreview[0] || {}).map((h) => (
                        <th key={h} className="border px-2 py-1 text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetPreview.map((r, i) => (
                      <tr key={i}>
                        {Object.keys(r).map((k) => (
                          <td key={k} className="border px-2 py-1 align-top">{String(r[k] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setImportModalOpen(false); setSheetNames([]); setSelectedSheet(null); setImportError(null); }}>
                Cancel
              </Button>
              <Button size="sm" onClick={doImportSelectedSheet} disabled={importing}>
                {importing ? 'Importing...' : 'Import Sheet'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Add Part Modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add Spare Part">
        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm">
            Part number
            <Input value={newPart.part_number} onChange={(e) => setNewPart(p => ({ ...p, part_number: e.target.value }))} />
          </label>

          <label className="text-sm">
            Name
            <Input value={newPart.name} onChange={(e) => setNewPart(p => ({ ...p, name: e.target.value }))} />
          </label>

          <label className="text-sm">
            Description
            <Input value={newPart.description || ''} onChange={(e) => setNewPart(p => ({ ...p, description: e.target.value }))} />
          </label>

          <label className="text-sm">
            Category
            <Input value={newPart.category?.name || ''} onChange={(e) => setNewPart(p => ({ ...p, category: { name: e.target.value } }))} />
          </label>

          <label className="text-sm">
            Compatibility
            <Input value={newPart.compatibility || ''} onChange={(e) => setNewPart(p => ({ ...p, compatibility: e.target.value }))} />
          </label>

          <label className="text-sm">
            Reorder threshold
            <Input type="number" value={String(newPart.reorder_threshold ?? 0)} onChange={(e) => setNewPart(p => ({ ...p, reorder_threshold: Number(e.target.value) }))} />
          </label>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAddModalOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={createNewPart}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
