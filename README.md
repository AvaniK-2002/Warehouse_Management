# Warehouse Management System (WMS)

A production-ready, full-featured Warehouse Management System built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Dashboard**: Real-time KPI cards, charts, and recent transactions
- **Warehouses**: Multi-warehouse management with location tracking
- **Inventory**: Stock management across warehouses with reorder alerts
- **Spare Parts**: Comprehensive spare parts catalog
- **Sales & Dispatch**: Order management and dispatch tracking
- **Reports**: Generate and export various operational reports
- **Task Manager**: Track warehouse tasks and assignments
- **Settings**: System configuration and category management
- **Excel Import**: Bulk data import with intelligent column mapping
- **Real-time Updates**: Live data synchronization using Supabase Realtime

## Tech Stack

- **Frontend**: Next.js 13 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Charts**: Recharts
- **Database**: PostgreSQL (Supabase)
- **Real-time**: Supabase Realtime
- **File Upload**: SheetJS (xlsx)
- **Date Handling**: date-fns
- **Authentication**: Supabase Auth (ready for implementation)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd warehouse-management-system
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project settings: `Settings > API`

### Database Setup

The database schema has already been created via migration. The following tables are set up:

- `warehouses` - Warehouse locations and details
- `categories` - Item categories (Equipment, Spare Parts, Accessories)
- `inventory_items` - Stock items across warehouses
- `transactions` - Movement and transaction history
- `spare_parts` - Spare parts catalog
- `dispatch_orders` - Sales and dispatch orders
- `dispatch_items` - Line items for dispatch orders
- `tasks` - Task management
- `settings` - System configuration

All tables have Row Level Security (RLS) enabled. For development, policies are set to allow all operations for authenticated users.

### Running the Application

Development mode:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## Excel Import Feature

### Supported Import Types

1. **Warehouses**: Import warehouse locations and contact information
2. **Inventory**: Bulk update inventory levels and add new items
3. **Transactions**: Import historical transaction data
4. **Spare Parts**: Add spare parts to the catalog
5. **Tasks**: Import task lists

### Excel File Format

#### Warehouses
Columns: `name`, `district`, `address`, `manager`, `contact_email`, `contact_phone`

#### Inventory
Columns: `sku`, `name`, `category_id`, `warehouse_id`, `qty`, `unit_price`, `reorder_threshold`

#### Transactions
Columns: `date`, `warehouse_id`, `type`, `source_destination`, `sku`, `qty`, `status`

#### Spare Parts
Columns: `part_number`, `name`, `description`, `category_id`, `compatibility`, `reorder_threshold`

#### Tasks
Columns: `title`, `description`, `assignee`, `due_date`, `status`, `priority`

### Import Process

1. Click "Import XLSX" button on any page
2. Select an Excel file (.xlsx or .xls)
3. Map Excel columns to application fields
4. Preview first 5 rows
5. Upload data
6. View results (inserted/updated/errors)

## API Endpoints

### Dashboard
- `GET /api/dashboard?district=&warehouse=&from=&to=`
  - Returns: `{ totals, chartData, recentTransactions }`

### Warehouses
- `GET /api/warehouses?page=1&limit=20&search=&district=`
  - Returns: `{ data, pagination }`
- `POST /api/warehouses`
  - Body: Warehouse object
  - Returns: Created warehouse

### Inventory
- `POST /api/inventory/adjust`
  - Body: `{ sku, warehouseId, delta, reason }`
  - Returns: Updated inventory item

### Upload
- `POST /api/upload`
  - Body: `{ scope, data, mapping? }`
  - Returns: `{ inserted, updated, errors }`

## Real-time Features

The application uses Supabase Realtime to broadcast changes:

- Inventory updates trigger real-time notifications
- Transaction events are broadcast immediately
- Warehouse and dispatch changes sync across clients

To use real-time features:

```typescript
import { subscribeToInventoryUpdates } from '@/lib/realtime';

// Subscribe to inventory changes
const channel = subscribeToInventoryUpdates((payload) => {
  console.log('Inventory updated:', payload);
  // Refresh data
});

// Clean up on unmount
return () => {
  unsubscribe(channel);
};
```

## Database Schema

### Key Tables

**warehouses**
- Stores warehouse locations, districts, and contact information
- One-to-many with inventory_items

**inventory_items**
- Tracks stock levels per SKU per warehouse
- Includes pricing, quantities, and reorder thresholds
- Links to categories and warehouses

**transactions**
- Audit trail of all inventory movements
- Types: Spare In, Spare Out, Spare Transfer, Spare Return
- Tracks source/destination and status

**dispatch_orders**
- Sales and dispatch order management
- Links to warehouses and contains line items

**tasks**
- Task management with priority, status, and assignments

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Security Considerations

### Row Level Security (RLS)

All tables have RLS enabled. For production:

1. Implement proper authentication using Supabase Auth
2. Create role-based policies (admin, manager, viewer)
3. Restrict data access based on user roles and warehouse assignments

Example policy:
```sql
CREATE POLICY "Users can only view their warehouse inventory"
  ON inventory_items
  FOR SELECT
  TO authenticated
  USING (
    warehouse_id IN (
      SELECT warehouse_id FROM user_warehouses
      WHERE user_id = auth.uid()
    )
  );
```

### API Security

- All API routes should validate authentication
- Implement rate limiting for production
- Validate and sanitize all user inputs
- Use parameterized queries (Supabase client does this automatically)

## Testing

Run tests:
```bash
npm test
```

Run type checking:
```bash
npm run typecheck
```

## Performance Optimization

- Implemented server-side rendering for dynamic pages
- Static generation for public pages
- Optimistic UI updates for better UX
- Efficient database queries with proper indexes
- Real-time subscriptions only for active pages

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please open a GitHub issue or contact the development team.
