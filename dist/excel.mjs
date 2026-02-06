import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
// Required columns for each mode
const ACCOUNTING_REQUIRED_COLS = ['date', 'supplierLedger', 'purchaseLedger', 'totalAmount'];
const INVOICE_REQUIRED_COLS = ['voucherId', 'date', 'supplierLedger', 'purchaseLedger', 'stockItemName', 'quantity', 'rate', 'unit'];
/**
 * Detects the Excel format based on column headers
 */
export function detectExcelFormat(headers) {
    const headerSet = new Set(headers.map(h => h?.toLowerCase?.() || ''));
    // If stockItemName exists, it's invoice mode
    if (headerSet.has('stockitemname') || headerSet.has('stock_item_name') || headerSet.has('stock item name')) {
        return 'invoice';
    }
    return 'accounting';
}
/**
 * Normalizes column header names to expected format
 */
function normalizeHeader(header) {
    if (!header)
        return '';
    const normalized = header.toLowerCase().replace(/[_\s]+/g, '');
    const mappings = {
        'date': 'date',
        'voucherid': 'voucherId',
        'voucher_id': 'voucherId',
        'supplierledger': 'supplierLedger',
        'supplier_ledger': 'supplierLedger',
        'supplier': 'supplierLedger',
        'partyname': 'supplierLedger',
        'party_name': 'supplierLedger',
        'purchaseledger': 'purchaseLedger',
        'purchase_ledger': 'purchaseLedger',
        'purchaseaccount': 'purchaseLedger',
        'purchase_account': 'purchaseLedger',
        'totalamount': 'totalAmount',
        'total_amount': 'totalAmount',
        'amount': 'totalAmount',
        'stockitemname': 'stockItemName',
        'stock_item_name': 'stockItemName',
        'itemname': 'stockItemName',
        'item_name': 'stockItemName',
        'item': 'stockItemName',
        'quantity': 'quantity',
        'qty': 'quantity',
        'rate': 'rate',
        'price': 'rate',
        'unit': 'unit',
        'uom': 'unit',
        'taxledger': 'taxLedger',
        'tax_ledger': 'taxLedger',
        'taxamount': 'taxAmount',
        'tax_amount': 'taxAmount',
        'tax': 'taxAmount',
        'narration': 'narration',
        'remarks': 'narration',
        'notes': 'narration',
        'vouchernumber': 'voucherNumber',
        'voucher_number': 'voucherNumber',
        'vchno': 'voucherNumber',
    };
    return mappings[normalized] || header;
}
/**
 * Validates date format (YYYY-MM-DD)
 */
function validateDateFormat(dateStr) {
    if (!dateStr)
        return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr))
        return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
}
/**
 * Parses a date value from Excel (could be Date object or string)
 */
function parseDateValue(value) {
    if (!value)
        return null;
    // If it's already a Date object from Excel
    if (value instanceof Date) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    // If it's a number (Excel serial date)
    if (typeof value === 'number') {
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
            const year = date.y;
            const month = String(date.m).padStart(2, '0');
            const day = String(date.d).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
    }
    // If it's a string
    if (typeof value === 'string') {
        // Try parsing YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }
        // Try parsing DD-MM-YYYY or DD/MM/YYYY
        const dmyMatch = value.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
        if (dmyMatch) {
            return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
        }
        // Try parsing MM-DD-YYYY or MM/DD/YYYY
        const mdyMatch = value.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
        if (mdyMatch) {
            return `${mdyMatch[3]}-${mdyMatch[1].padStart(2, '0')}-${mdyMatch[2].padStart(2, '0')}`;
        }
    }
    return null;
}
/**
 * Validates a single row of data
 */
function validateRow(row, rowNum, format) {
    const errors = [];
    const requiredCols = format === 'accounting' ? ACCOUNTING_REQUIRED_COLS : INVOICE_REQUIRED_COLS;
    // Check required fields
    for (const col of requiredCols) {
        if (row[col] === undefined || row[col] === null || row[col] === '') {
            errors.push({
                row: rowNum,
                column: col,
                message: `Missing required field: ${col}`
            });
        }
    }
    // Validate date
    if (row.date) {
        const parsedDate = parseDateValue(row.date);
        if (!parsedDate) {
            errors.push({
                row: rowNum,
                column: 'date',
                message: `Invalid date format. Expected YYYY-MM-DD, got: ${row.date}`
            });
        }
    }
    // Validate numeric fields
    if (format === 'accounting') {
        if (row.totalAmount !== undefined && (isNaN(Number(row.totalAmount)) || Number(row.totalAmount) <= 0)) {
            errors.push({
                row: rowNum,
                column: 'totalAmount',
                message: `Invalid totalAmount: must be a positive number`
            });
        }
    }
    else {
        if (row.quantity !== undefined && (isNaN(Number(row.quantity)) || Number(row.quantity) <= 0)) {
            errors.push({
                row: rowNum,
                column: 'quantity',
                message: `Invalid quantity: must be a positive number`
            });
        }
        if (row.rate !== undefined && (isNaN(Number(row.rate)) || Number(row.rate) < 0)) {
            errors.push({
                row: rowNum,
                column: 'rate',
                message: `Invalid rate: must be a non-negative number`
            });
        }
        if (row.taxAmount !== undefined && row.taxAmount !== '' && isNaN(Number(row.taxAmount))) {
            errors.push({
                row: rowNum,
                column: 'taxAmount',
                message: `Invalid taxAmount: must be a number`
            });
        }
    }
    return errors;
}
/**
 * Groups invoice mode rows by voucherId
 */
function groupByVoucherId(rows) {
    const groups = new Map();
    for (const row of rows) {
        const voucherId = String(row.voucherId || '');
        if (!groups.has(voucherId)) {
            groups.set(voucherId, []);
        }
        groups.get(voucherId).push(row);
    }
    return groups;
}
/**
 * Transforms raw rows to PurchaseVoucherData for accounting mode
 */
function transformAccountingRows(rows) {
    return rows.map((row, index) => ({
        rowNumber: row._rowNumber || (index + 2), // +2 because Excel is 1-indexed and has header row
        date: parseDateValue(row.date) || row.date,
        mode: 'accounting',
        supplierLedger: String(row.supplierLedger || '').trim(),
        purchaseLedger: String(row.purchaseLedger || '').trim(),
        totalAmount: Number(row.totalAmount),
        narration: row.narration ? String(row.narration).trim() : undefined,
        voucherNumber: row.voucherNumber ? String(row.voucherNumber).trim() : undefined,
    }));
}
/**
 * Transforms grouped rows to PurchaseVoucherData for invoice mode
 */
function transformInvoiceGroups(groups) {
    const vouchers = [];
    for (const [voucherId, rows] of groups) {
        if (rows.length === 0)
            continue;
        const firstRow = rows[0];
        const inventoryEntries = [];
        const ledgerEntries = [];
        for (const row of rows) {
            // Add inventory entry
            inventoryEntries.push({
                stockItemName: String(row.stockItemName || '').trim(),
                quantity: Number(row.quantity),
                rate: Number(row.rate),
                unit: String(row.unit || '').trim(),
            });
            // Add tax ledger entry if present
            if (row.taxLedger && row.taxAmount) {
                ledgerEntries.push({
                    ledgerName: String(row.taxLedger).trim(),
                    amount: Number(row.taxAmount),
                });
            }
        }
        vouchers.push({
            rowNumber: firstRow._rowNumber || 2,
            date: parseDateValue(firstRow.date) || firstRow.date,
            mode: 'invoice',
            supplierLedger: String(firstRow.supplierLedger || '').trim(),
            purchaseLedger: String(firstRow.purchaseLedger || '').trim(),
            inventoryEntries,
            ledgerEntries: ledgerEntries.length > 0 ? ledgerEntries : undefined,
            narration: firstRow.narration ? String(firstRow.narration).trim() : undefined,
            voucherNumber: firstRow.voucherNumber ? String(firstRow.voucherNumber).trim() : undefined,
        });
    }
    return vouchers;
}
/**
 * Main function to parse Excel file for purchase vouchers
 */
export async function parseExcelFile(filePath, sheetName) {
    const errors = [];
    const warnings = [];
    // Validate file exists
    if (!fs.existsSync(filePath)) {
        return {
            success: false,
            vouchers: [],
            errors: [{ row: 0, message: `File not found: ${filePath}` }],
            warnings: []
        };
    }
    // Validate file extension
    const ext = path.extname(filePath).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
        return {
            success: false,
            vouchers: [],
            errors: [{ row: 0, message: `Unsupported file format: ${ext}. Supported: .xlsx, .xls, .csv` }],
            warnings: []
        };
    }
    try {
        // Read workbook
        const workbook = XLSX.readFile(filePath, { cellDates: true });
        // Get sheet
        const targetSheet = sheetName || workbook.SheetNames[0];
        if (!workbook.SheetNames.includes(targetSheet)) {
            return {
                success: false,
                vouchers: [],
                errors: [{ row: 0, message: `Sheet "${targetSheet}" not found. Available: ${workbook.SheetNames.join(', ')}` }],
                warnings: []
            };
        }
        const sheet = workbook.Sheets[targetSheet];
        // Convert to JSON with headers
        const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (rawData.length === 0) {
            return {
                success: false,
                vouchers: [],
                errors: [{ row: 0, message: 'Excel file is empty or has no data rows' }],
                warnings: []
            };
        }
        // Get and normalize headers
        const originalHeaders = Object.keys(rawData[0]);
        const headerMap = new Map();
        for (const header of originalHeaders) {
            headerMap.set(header, normalizeHeader(header));
        }
        // Transform rows with normalized headers
        const normalizedData = rawData.map((row, index) => {
            const normalized = { _rowNumber: index + 2 };
            for (const [original, normalizedKey] of headerMap) {
                normalized[normalizedKey] = row[original];
            }
            return normalized;
        });
        // Detect format
        const normalizedHeaders = Array.from(headerMap.values());
        const format = detectExcelFormat(normalizedHeaders);
        // Validate all rows
        for (const row of normalizedData) {
            const rowErrors = validateRow(row, row._rowNumber, format);
            errors.push(...rowErrors);
        }
        // If there are validation errors, return early
        if (errors.length > 0) {
            return {
                success: false,
                vouchers: [],
                errors,
                warnings
            };
        }
        // Transform to vouchers based on format
        let vouchers;
        if (format === 'accounting') {
            vouchers = transformAccountingRows(normalizedData);
            warnings.push(`Detected accounting mode: ${vouchers.length} vouchers`);
        }
        else {
            const groups = groupByVoucherId(normalizedData);
            vouchers = transformInvoiceGroups(groups);
            warnings.push(`Detected invoice mode: ${vouchers.length} vouchers from ${normalizedData.length} rows`);
        }
        return {
            success: true,
            vouchers,
            errors: [],
            warnings
        };
    }
    catch (err) {
        return {
            success: false,
            vouchers: [],
            errors: [{ row: 0, message: `Error reading Excel file: ${err instanceof Error ? err.message : String(err)}` }],
            warnings: []
        };
    }
}
//# sourceMappingURL=excel.mjs.map