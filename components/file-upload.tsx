'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FileUploadProps {
  scope: 'warehouses' | 'inventory' | 'transactions' | 'spare_parts' | 'dispatch' | 'tasks';
  onComplete?: () => void;
}

interface ColumnMapping {
  [key: string]: string;
}

const scopeFields: Record<string, string[]> = {
  warehouses: ['name', 'district', 'address', 'manager', 'contact_email', 'contact_phone'],
  inventory: ['sku', 'name', 'category_id', 'warehouse_id', 'qty', 'unit_price', 'reorder_threshold'],
  transactions: ['date', 'warehouse_id', 'type', 'source_destination', 'sku', 'qty', 'status'],
  spare_parts: ['part_number', 'name', 'description', 'category_id', 'compatibility', 'reorder_threshold'],
  dispatch: ['order_number', 'warehouse_id', 'customer_name', 'destination', 'status'],
  tasks: ['title', 'description', 'assignee', 'due_date', 'status', 'priority'],
};

export function FileUpload({ scope, onComplete }: FileUploadProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: any[] } | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length > 0) {
          const cols = Object.keys(jsonData[0] as object);
          setColumns(cols);
          setParsedData(jsonData);
          setStep('mapping');

          const autoMapping: ColumnMapping = {};
          cols.forEach((col) => {
            const normalizedCol = col.toLowerCase().replace(/\s+/g, '_');
            const matchingField = scopeFields[scope].find(
              (field) => field.toLowerCase() === normalizedCol
            );
            if (matchingField) {
              autoMapping[col] = matchingField;
            }
          });
          setMapping(autoMapping);
        }
      } catch (error) {
        console.error('Error parsing file:', error);
        alert('Failed to parse file. Please ensure it is a valid Excel file.');
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  }, [scope]);

  const handleMappingChange = (excelColumn: string, field: string) => {
    setMapping((prev) => ({ ...prev, [excelColumn]: field }));
  };

  const handlePreview = () => {
    setStep('preview');
  };

  const handleUpload = async () => {
    setUploading(true);

    const mappedData = parsedData.map((row) => {
      const mappedRow: any = {};
      Object.entries(mapping).forEach(([excelCol, field]) => {
        if (field && field !== 'skip') {
          mappedRow[field] = row[excelCol];
        }
      });
      return mappedRow;
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          data: mappedData,
        }),
      });

      const result = await response.json();
      setResult(result);
      setStep('result');

      if (onComplete && result.errors.length === 0) {
        setTimeout(() => {
          onComplete();
          handleClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setFile(null);
    setParsedData([]);
    setColumns([]);
    setMapping({});
    setStep('upload');
    setResult(null);
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <Upload className="mr-2 h-4 w-4" />
        Import XLSX
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import Data from Excel</DialogTitle>
          </DialogHeader>

          {step === 'upload' && (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
                <Upload className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-2 text-sm text-slate-600">
                  Click to select an Excel file (.xlsx, .xls)
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="mt-4"
                />
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Map Excel columns to application fields:
              </p>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {columns.map((col) => (
                  <div key={col} className="flex items-center gap-4">
                    <div className="w-1/2 rounded bg-slate-100 px-3 py-2 text-sm">
                      {col}
                    </div>
                    <span>→</span>
                    <Select
                      value={mapping[col] || ''}
                      onValueChange={(value) => handleMappingChange(col, value)}
                    >
                      <SelectTrigger className="w-1/2">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">Skip</SelectItem>
                        {scopeFields[scope].map((field) => (
                          <SelectItem key={field} value={field}>
                            {field}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button onClick={handlePreview}>Preview</Button>
              </DialogFooter>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Preview (first 5 rows):
              </p>
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      {Object.values(mapping)
                        .filter((f) => f && f !== 'skip')
                        .map((field) => (
                          <th key={field} className="px-2 py-1 text-left">
                            {field}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b">
                        {Object.entries(mapping)
                          .filter(([_, field]) => field && field !== 'skip')
                          .map(([excelCol, field]) => (
                            <td key={field} className="px-2 py-1">
                              {String(row[excelCol] || '')}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setStep('mapping')}>
                  Back
                </Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Uploading...' : `Upload ${parsedData.length} rows`}
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 'result' && result && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>{result.inserted} rows inserted</span>
                </div>
                <div className="flex items-center gap-2 text-blue-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>{result.updated} rows updated</span>
                </div>
                {result.errors.length > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-5 w-5" />
                    <span>{result.errors.length} errors</span>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="max-h-48 overflow-auto rounded border bg-red-50 p-4">
                  {result.errors.map((error, idx) => (
                    <div key={idx} className="text-xs text-red-700">
                      Row {error.row}: {error.message}
                    </div>
                  ))}
                </div>
              )}

              <DialogFooter>
                <Button onClick={handleClose}>Close</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
