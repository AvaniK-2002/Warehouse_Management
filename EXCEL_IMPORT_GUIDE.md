# Excel Import Guide

This guide explains how to prepare Excel files for importing data into the Warehouse Management System.

## General Guidelines

- File formats: `.xlsx` or `.xls`
- Column headers must be in the first row
- Column names can match exactly or will be auto-mapped during import
- Required fields must have values (cannot be empty)
- Dates should be in format: `YYYY-MM-DD` or `MM/DD/YYYY`

## Import Templates

### 1. Warehouses Import

**Required Columns:**
- `name` - Warehouse name (unique, required)
- `district` - Geographic district (required)

**Optional Columns:**
- `address` - Physical address
- `manager` - Manager name
- `contact_email` - Contact email
- `contact_phone` - Contact phone number

**Example:**
```
name              | district | address                    | manager      | contact_email           | contact_phone
Main Warehouse    | North    | 123 Industrial Dr, NYC     | John Smith   | john@example.com        | 555-0100
Central Hub       | South    | 456 Commerce St, Dallas    | Jane Doe     | jane@example.com        | 555-0200
```

### 2. Inventory Import

**Required Columns:**
- `sku` - Stock keeping unit (unique identifier, required)
- `name` - Item name (required)
- `warehouse_id` - UUID of warehouse (required)

**Optional Columns:**
- `category_id` - UUID of category (optional, defaults to uncategorized)
- `qty` - Quantity (defaults to 0)
- `unit_price` - Price per unit (defaults to 0)
- `reorder_threshold` - Minimum quantity before reorder alert (defaults to 10)

**Example:**
```
sku       | name                  | category_id                          | warehouse_id                         | qty  | unit_price | reorder_threshold
SKU-001   | Hydraulic Pump        | uuid-of-hydraulic-parts-category    | uuid-of-warehouse                    | 50   | 249.99     | 10
SKU-002   | Engine Filter         | uuid-of-engine-parts-category       | uuid-of-warehouse                    | 200  | 15.99      | 20
```

**Note:** To get warehouse_id and category_id values:
1. Go to Settings page to view categories
2. Go to Warehouses page to view warehouses
3. Use the browser developer tools or API to get UUID values
4. Or create warehouses/categories first, then import inventory

### 3. Transactions Import

**Required Columns:**
- `warehouse_id` - UUID of warehouse (required)
- `type` - Transaction type (required): `Spare In`, `Spare Out`, `Spare Transfer`, or `Spare Return`
- `source_destination` - Origin or destination (required)
- `qty` - Quantity moved (required)

**Optional Columns:**
- `date` - Transaction date (defaults to current date)
- `sku` - Item SKU reference (optional)
- `status` - Status (defaults to `Pending`): `Pending`, `Completed`, `In Transit`, or `Cancelled`
- `notes` - Additional notes

**Example:**
```
date       | warehouse_id              | type         | source_destination | sku     | qty | status    | notes
2024-01-15 | uuid-of-warehouse        | Spare In     | Supplier ABC       | SKU-001 | 100 | Completed | Initial stock
2024-01-16 | uuid-of-warehouse        | Spare Out    | Customer XYZ       | SKU-001 | 10  | Completed | Order #12345
```

### 4. Spare Parts Import

**Required Columns:**
- `part_number` - Unique part number (required)
- `name` - Part name (required)

**Optional Columns:**
- `description` - Part description
- `category_id` - UUID of category
- `compatibility` - Compatible equipment/models
- `reorder_threshold` - Minimum stock level (defaults to 5)

**Example:**
```
part_number | name                    | description                      | category_id              | compatibility      | reorder_threshold
HYD-001     | Hydraulic Seal Kit      | Complete seal replacement kit    | uuid-of-category        | Model X100, X200   | 5
ENG-001     | Oil Filter              | High-efficiency oil filter       | uuid-of-category        | All diesel models  | 20
```

### 5. Tasks Import

**Required Columns:**
- `title` - Task title (required)

**Optional Columns:**
- `description` - Task description
- `assignee` - Person assigned to task
- `due_date` - Due date (format: YYYY-MM-DD)
- `status` - Status (defaults to `Pending`): `Pending`, `In Progress`, `Completed`, or `Cancelled`
- `priority` - Priority (defaults to `Medium`): `Low`, `Medium`, or `High`

**Example:**
```
title                        | description                          | assignee      | due_date   | status      | priority
Inventory Count - Warehouse A| Complete physical inventory count    | John Smith    | 2024-02-01 | Pending     | High
Repair Forklift #3           | Hydraulic system maintenance         | Mike Johnson  | 2024-01-25 | In Progress | Medium
```

## Import Process

1. **Prepare Your File**
   - Use the templates above
   - Ensure required fields have values
   - Save as `.xlsx` or `.xls`

2. **Import in Application**
   - Navigate to the relevant page (Warehouses, Inventory, etc.)
   - Click "Import XLSX" button
   - Select your file

3. **Column Mapping**
   - The system will auto-detect and suggest column mappings
   - Review and adjust mappings if needed
   - Mark unused columns as "Skip"

4. **Preview**
   - Review the first 5 rows
   - Verify data looks correct
   - Click "Upload" to proceed

5. **Review Results**
   - View count of inserted/updated records
   - Check for any errors
   - Errors show row number and issue

## Common Issues

### Issue: "Missing required fields"
**Solution:** Ensure all required columns have values. Check that column names match expected fields.

### Issue: "Invalid warehouse_id"
**Solution:**
- Create the warehouse first using the Warehouses page
- Get the UUID from the database or API
- Or import warehouses first, then inventory

### Issue: "Duplicate SKU"
**Solution:**
- SKUs must be unique
- Existing SKUs will be updated with new values
- To update, include the SKU and new values

### Issue: "Invalid date format"
**Solution:** Use format `YYYY-MM-DD` (e.g., `2024-01-15`) or `MM/DD/YYYY` (e.g., `01/15/2024`)

### Issue: "Type must be one of..."
**Solution:** Use exact values from the allowed list. For transactions: `Spare In`, `Spare Out`, `Spare Transfer`, or `Spare Return`

## Tips for Successful Import

1. **Start Small**: Test with 5-10 rows first
2. **Check Foreign Keys**: Ensure referenced IDs (warehouse_id, category_id) exist
3. **Use Excel Formulas**: Generate UUIDs or calculate values in Excel before import
4. **Clean Data**: Remove extra spaces, check for special characters
5. **Backup First**: Export existing data before large imports
6. **Incremental Import**: Import in batches rather than all at once

## Getting UUIDs for Foreign Keys

### Option 1: API
```bash
# Get warehouses
curl http://localhost:3000/api/warehouses

# Get categories (use browser dev tools on Settings page)
```

### Option 2: Database
```sql
-- Get warehouse IDs
SELECT id, name FROM warehouses;

-- Get category IDs
SELECT id, name FROM categories;
```

### Option 3: Create First
1. Import warehouses and categories first
2. Use the application to create these records
3. Then export to get UUIDs for inventory import

## Sample Files

Sample Excel files are available in the `/samples` directory:
- `sample_warehouses.xlsx`
- `sample_inventory.xlsx`
- `sample_transactions.xlsx`
- `sample_spare_parts.xlsx`
- `sample_tasks.xlsx`

Download these templates and fill with your data for quick imports.
