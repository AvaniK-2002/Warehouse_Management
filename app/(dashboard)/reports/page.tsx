'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar } from 'lucide-react';

const reportTypes = [
  {
    id: 'inventory',
    name: 'Inventory Summary',
    description: 'Complete inventory across all warehouses',
    icon: '📦',
  },
  {
    id: 'movements',
    name: 'Movement Logs',
    description: 'Track all inventory movements',
    icon: '🔄',
  },
  {
    id: 'valuation',
    name: 'Stock Valuation',
    description: 'Current value of all inventory',
    icon: '💰',
  },
  {
    id: 'low-stock',
    name: 'Low Stock Alert',
    description: 'Items below reorder threshold',
    icon: '⚠️',
  },
  {
    id: 'dispatch',
    name: 'Dispatch Report',
    description: 'All dispatch orders and status',
    icon: '🚚',
  },
  {
    id: 'transactions',
    name: 'Transaction History',
    description: 'Complete transaction history',
    icon: '📊',
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-600">
            Generate and export reports
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card key={report.id}>
            <CardContent className="p-6">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-3xl">
                {report.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{report.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{report.description}</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Calendar className="mr-2 h-4 w-4" />
                  Configure
                </Button>
                <Button size="sm" className="flex-1">
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-slate-500 py-8">
            No reports generated yet. Configure and export a report to get started.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
