'use client';

import { Search, Bell, User } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-3 sm:px-4 lg:px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-full max-w-xs sm:max-w-md md:max-w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            placeholder="Search inventory, warehouses, orders..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button className="relative rounded-full p-2 hover:bg-slate-100">
          <Bell className="h-5 w-5 text-slate-600" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500"></span>
        </button>

        <button className="flex items-center gap-2 rounded-full bg-slate-100 py-2 pl-3 pr-4 hover:bg-slate-200">
          <User className="h-5 w-5 text-slate-600" />
          <span className="text-sm font-medium text-slate-700">Admin</span>
        </button>
      </div>
    </header>
  );
}
