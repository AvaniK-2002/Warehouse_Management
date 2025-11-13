'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Save } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure application preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select defaultValue="USD">
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select defaultValue="UTC">
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="EST">Eastern Time</SelectItem>
                  <SelectItem value="PST">Pacific Time</SelectItem>
                  <SelectItem value="CST">Central Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="items-per-page">Items Per Page</Label>
              <Input
                id="items-per-page"
                type="number"
                defaultValue="20"
                min="10"
                max="100"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Heavy Equipment</span>
                <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                  Equipment
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Light Equipment</span>
                <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700">
                  Equipment
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Engine Parts</span>
                <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                  Spare Parts
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">Hydraulic Parts</span>
                <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                  Spare Parts
                </span>
              </div>
            </div>
            <Button variant="outline" className="mt-4 w-full">
              Add Category
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="maps-api">Maps API Key</Label>
              <Input
                id="maps-api"
                type="password"
                placeholder="Enter API key"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
