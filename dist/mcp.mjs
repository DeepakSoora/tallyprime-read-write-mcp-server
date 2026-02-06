import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import dotenv from 'dotenv';
import { handlePull, handlePush, handleBatchPush, jsonToTSV } from './tally.mjs';
import { parseExcelFile } from './excel.mjs';
import { cacheTable, executeSQL } from './database.mjs';
dotenv.config({ override: true, quiet: true });
export async function registerMcpServer() {
    const mcpServer = new McpServer({
        name: 'Tally Prime MCP Server',
        title: 'Tally Prime',
        version: '1.0.0'
    });
    mcpServer.registerTool('query-database', {
        title: 'Query Database',
        description: `executes sql query on DuckDB in-memory database for querying cached Tally Prime report data in table generated as output by other tools (in tableID property from tool output response). These tables are temporary and will be dropped after 15 minutes automatically. Use this tool to run complex analytical queries to aggregate, filter, sort results. Returns output in tab separated format`,
        inputSchema: {
            sql: z.string().describe('SQL query to execute on DuckDB in-memory database')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        const resp = await executeSQL(args.sql);
        return {
            content: [{ type: 'text', text: resp }]
        };
    });
    mcpServer.registerTool('list-master', {
        title: 'List Masters',
        description: `fetches list of masters from Tally Prime collection e.g. group, ledger, vouchertype, unit, godown, stockgroup, stockitem, costcategory, costcentre, attendancetype, company, currency, gstin, gstclassification returns output in tab separated format`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            collection: z.string(z.enum(['group', 'ledger', 'vouchertype', 'unit', 'godown', 'stockgroup', 'stockitem', 'costcategory', 'costcentre', 'attendancetype', 'company', 'currency', 'gstin', 'gstclassification']))
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['collection', args.collection]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('list-master', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: jsonToTSV(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('chart-of-accounts', {
        title: 'Chart of Accounts',
        description: `fetches chart of accounts or group structure / GL hierarchywith fields group_name, group_parent, bs_pl, dr_cr, affects_gross_profit. the column bs_pl will have values BS = Balance Sheet / PL = Profit Loss. Column dr_cr as value D = Debit / C = Credit. columns group and parent are tree structure represented in flat format. The column affects_gross_profit has values Y = Yes / N = No, it is used to determine if ledger under this group will affect gross profit or not. returns output cached in DuckDB in-memory table (specified in tableID property). Use query-database tool to run SQL queries against that table for further analysis`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map();
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('chart-of-accounts', inputParams);
        const tableId = await cacheTable('chart-of-accounts', resp.data);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: JSON.stringify({ tableID: tableId }) }]
            };
        }
    });
    mcpServer.registerTool('trial-balance', {
        title: 'Trial Balance',
        description: `fetches trial balance with fields ledger_name, group_name, opening_balance, net_debit, net_credit, closing_balance. kindly fetch data from chart-of-accounts tool to pull group hierarchy before calling this tool. returns output cached in DuckDB in-memory table (specified in tableID property). Use query-database tool to run SQL queries against that table for further analysis`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            fromDate: z.string().describe('date in YYYY-MM-DD format'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['fromDate', args.fromDate], ['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('trial-balance', inputParams);
        const tableId = await cacheTable('trial-balance', resp.data);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: JSON.stringify({ tableID: tableId }) }]
            };
        }
    });
    mcpServer.registerTool('profit-loss', {
        title: 'Profit and Loss',
        description: `fetches profit and loss statement with fields like ledger_name, group_name, amount. amount negative is debit or expense and positive is credit or income. kindly fetch data from chart-of-accounts tool to pull group hierarchy before calling this tool. returns output cached in DuckDB in-memory table (specified in tableID property). Use query-database tool to run SQL queries against that table for further analysis`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            fromDate: z.string().describe('date in YYYY-MM-DD format'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['fromDate', args.fromDate], ['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('profit-loss', inputParams);
        const tableId = await cacheTable('profit-loss', resp.data);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: JSON.stringify({ tableID: tableId }) }]
            };
        }
    });
    mcpServer.registerTool('balance-sheet', {
        title: 'Balance Sheet',
        description: `fetches balance sheet with fields like ledger_name, group_name, closing_balance. closing balance negative is debit or asset and positive is credit or liability. kindly fetch data from chart-of-accounts tool to pull group hierarchy before calling this tool. returns output cached in DuckDB in-memory table (specified in tableID property). Use query-database tool to run SQL queries against that table for further analysis`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('balance-sheet', inputParams);
        const tableId = await cacheTable('balance-sheet', resp.data);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: JSON.stringify({ tableID: tableId }) }]
            };
        }
    });
    mcpServer.registerTool('stock-summary', {
        title: 'Stock Summary',
        description: `fetches stock item summary with fields name, parent, opening_quantity, opening_value, inward_quantity, inward_value, outward_quantity, outward_value, closing_quantity, closing_value, returns output cached in DuckDB in-memory table (specified in tableID property). synonyms (name=stock item / parent=stock group) Use query-database tool to run SQL queries against that table for further analysis`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            fromDate: z.string().describe('date in YYYY-MM-DD format'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['fromDate', args.fromDate], ['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('stock-summary', inputParams);
        const tableId = await cacheTable('stock-summary', resp.data);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: JSON.stringify({ tableID: tableId }) }]
            };
        }
    });
    mcpServer.registerTool('ledger-balance', {
        title: 'Ledger Balance',
        description: `fetches ledger closing balance as on date, negative is debit and positive is credit`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            ledgerName: z.string().describe('exact ledger name, validate it using list-master tool with collection as ledger'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['ledgerName', args.ledgerName], ['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('ledger-balance', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: JSON.stringify(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('stock-item-balance', {
        title: 'Stock Item Balance',
        description: `fetches stock item remaining quantity balance as on date`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            itemName: z.string().describe('exact stock item name, validate it using list-master tool with collection as stockitem'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['itemName', args.itemName], ['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('stock-item-balance', inputParams);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: JSON.stringify(resp.data) }]
            };
        }
    });
    mcpServer.registerTool('bills-outstanding', {
        title: 'Bills Outstanding',
        description: `fetches pending overdue outstanding bills receivable or payable as on date with fields bill_date,reference_number,outstanding_amount,party_name,overdue_days. outstanding_amount = Debit is negative and Credit is positive. party_name = ledger_name. returns output cached in DuckDB in-memory table (specified in tableID property). Use query-database tool to run SQL queries against that table for further analysis`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            nature: z.enum(['receivable', 'payable']),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['nature', args.nature], ['toDate', args.toDate]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('bills-outstanding', inputParams);
        const tableId = await cacheTable('bills-outstanding', resp.data);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            return {
                content: [{ type: 'text', text: JSON.stringify({ tableID: tableId }) }]
            };
        }
    });
    mcpServer.registerTool('ledger-account', {
        title: 'Ledger Account',
        description: `fetches GL ledger account statement with voucher level details containing fields date, voucher_type, voucher_number, party_name, amount, narration . amount = debit is negative and credit is positive. party_name = ledger_name. returns output cached in DuckDB in-memory table (specified in tableID property). Use query-database tool to run SQL queries against that table for further analysis`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            ledgerName: z.string().describe('exact ledger name, validate it using list-master tool with collection as ledger'),
            fromDate: z.string().describe('date in YYYY-MM-DD format'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['fromDate', args.fromDate], ['toDate', args.toDate], ['ledgerName', args.ledgerName]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('ledger-account', inputParams);
        const tableId = await cacheTable('ledger-account', resp.data);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            //swap opening balance row to the top since it came at the end from Tally XML response
            if (Array.isArray(resp.data) && resp.data.length > 0) {
                const lastItem = resp.data.pop();
                resp.data.unshift(lastItem);
            }
            return {
                content: [{ type: 'text', text: JSON.stringify({ tableID: tableId }) }]
            };
        }
    });
    mcpServer.registerTool('stock-item-account', {
        title: 'Stock Item Account',
        description: `fetches GL stock item account statement with voucher level details containing fields date, voucher_type, voucher_number, party_name, quantity, amount, narration, tracking_number, voucher_category. party_name = ledger_name. quantity = inward as positive and outward as negative. amount = debit is negative and credit is positive, narration = notes / remarks. for calculating closing balance of quantity, consider rows with tracking_number as empty as it is, but for rows with tracking_number having text value, then duplicate rows need to be removed by preparing intermediate output with aggregation of tracking_number and voucher_category with sum of quantity and then comparing quantity of Receipt Note with Purchase and Delivery Note with Sales to identify and remove the rows with Receipt Note and Delivery Note if they are found to be tracked fully / partially . returns output cached in DuckDB in-memory table (specified in tableID property). Use query-database tool to run SQL queries against that table for further analysis`,
        inputSchema: {
            targetCompany: z.string().optional().describe('optional company name. leave it blank or skip this to choose for default company. validate it using list-master tool with collection as company if specified'),
            itemName: z.string().describe('exact stock item name, validate it using list-master tool with collection as stockitem'),
            fromDate: z.string().describe('date in YYYY-MM-DD format'),
            toDate: z.string().describe('date in YYYY-MM-DD format')
        },
        annotations: {
            readOnlyHint: true,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map([['fromDate', args.fromDate], ['toDate', args.toDate], ['itemName', args.itemName]]);
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePull('stock-item-account', inputParams);
        const tableId = await cacheTable('stock-item-account', resp.data);
        if (resp.error) {
            return {
                isError: true,
                content: [{ type: 'text', text: resp.error }]
            };
        }
        else {
            //swap opening balance row to the top since it came at the end from Tally XML response
            if (Array.isArray(resp.data) && resp.data.length > 0) {
                const lastItem = resp.data.pop();
                resp.data.unshift(lastItem);
            }
            return {
                content: [{ type: 'text', text: JSON.stringify({ tableID: tableId }) }]
            };
        }
    });
    mcpServer.registerTool('create-purchase-entry', {
        title: 'Create Purchase Entry',
        description: `creates a purchase voucher/invoice in Tally Prime. Supports two modes: "accounting" for simple ledger-to-ledger entries (e.g., expense purchases), and "invoice" for purchases with inventory items. For accounting mode, provide totalAmount. For invoice mode, provide inventoryEntries array with stock items. Additional ledger entries can be used for taxes (CGST, SGST, IGST), discounts, and freight charges. IMPORTANT: Validate ledger names using list-master tool before creating entries.`,
        inputSchema: {
            date: z.string().describe('Date in YYYY-MM-DD format'),
            mode: z.enum(['accounting', 'invoice']).describe('"accounting" for simple ledger entries, "invoice" for purchases with inventory items'),
            supplierLedger: z.string().describe('Creditor/supplier ledger name - must exist in Tally under Sundry Creditors group'),
            purchaseLedger: z.string().describe('Purchase account ledger name - must exist in Tally under Purchase Accounts group'),
            totalAmount: z.number().optional().describe('Total amount for accounting mode (required when mode is "accounting")'),
            inventoryEntries: z.array(z.object({
                stockItemName: z.string().describe('Stock item name - must exist in Tally'),
                quantity: z.number().describe('Quantity purchased'),
                rate: z.number().describe('Rate per unit'),
                unit: z.string().describe('Unit of measurement (e.g., "nos", "kg", "pcs")')
            })).optional().describe('Array of inventory items for invoice mode (required when mode is "invoice")'),
            ledgerEntries: z.array(z.object({
                ledgerName: z.string().describe('Ledger name for tax/discount/freight'),
                amount: z.number().describe('Amount (positive value)')
            })).optional().describe('Additional ledger entries for taxes, discounts, freight etc.'),
            narration: z.string().optional().describe('Notes/remarks for the voucher'),
            voucherNumber: z.string().optional().describe('Manual voucher number (auto-generated if blank)'),
            targetCompany: z.string().optional().describe('Company name - uses default if blank')
        },
        annotations: {
            readOnlyHint: false,
            openWorldHint: false
        }
    }, async (args) => {
        // Validate required fields based on mode
        if (args.mode === 'accounting' && (args.totalAmount === undefined || args.totalAmount === null)) {
            return {
                isError: true,
                content: [{ type: 'text', text: 'totalAmount is required for accounting mode' }]
            };
        }
        if (args.mode === 'invoice' && (!args.inventoryEntries || args.inventoryEntries.length === 0)) {
            return {
                isError: true,
                content: [{ type: 'text', text: 'inventoryEntries is required for invoice mode' }]
            };
        }
        // Build input parameters
        let inputParams = new Map();
        // Format date for Tally (d-MMM-yyyy)
        const dateParts = args.date.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const tallyDate = `${parseInt(dateParts[2])}-${months[parseInt(dateParts[1]) - 1]}-${dateParts[0]}`;
        inputParams.set('date', tallyDate);
        inputParams.set('mode', args.mode);
        inputParams.set('supplierLedger', args.supplierLedger);
        inputParams.set('purchaseLedger', args.purchaseLedger);
        if (args.mode === 'accounting') {
            inputParams.set('totalAmount', args.totalAmount);
        }
        if (args.mode === 'invoice') {
            inputParams.set('inventoryEntries', args.inventoryEntries);
            // Calculate invoice total (inventory + ledger entries)
            let inventoryTotal = args.inventoryEntries.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
            let ledgerTotal = args.ledgerEntries?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
            inputParams.set('invoiceTotal', inventoryTotal + ledgerTotal);
        }
        if (args.ledgerEntries && args.ledgerEntries.length > 0) {
            inputParams.set('ledgerEntries', args.ledgerEntries);
        }
        if (args.narration) {
            inputParams.set('narration', args.narration);
        }
        if (args.voucherNumber) {
            inputParams.set('voucherNumber', args.voucherNumber);
        }
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePush('purchase-entry', inputParams);
        if (!resp.success) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to create purchase entry: ${resp.errors?.join(', ') || 'Unknown error'}` }]
            };
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: 'Purchase entry created successfully',
                        created: resp.created,
                        altered: resp.altered,
                        voucherId: resp.lastvchid
                    })
                }]
        };
    });
    mcpServer.registerTool('create-ledger', {
        title: 'Create Ledger',
        description: `creates a ledger master in Tally Prime. Ledgers are the fundamental accounting units (e.g., suppliers, customers, expense accounts, bank accounts). The parent group determines the ledger type (e.g., "Sundry Creditors" for suppliers, "Sundry Debtors" for customers, "Purchase Accounts" for purchases). IMPORTANT: Validate group names using list-master tool with collection "group" before creating ledgers.`,
        inputSchema: {
            name: z.string().describe('Ledger name - must be unique in Tally'),
            group: z.string().describe('Parent group name (e.g., "Sundry Creditors", "Sundry Debtors", "Purchase Accounts", "Bank Accounts")'),
            openingBalance: z.number().optional().describe('Opening balance amount (positive = credit, negative = debit)'),
            mailingName: z.string().optional().describe('Display name for printing on invoices/documents'),
            address: z.string().optional().describe('Street address'),
            state: z.string().optional().describe('State name (e.g., "Karnataka", "Maharashtra")'),
            country: z.string().optional().describe('Country name (default: India)'),
            pincode: z.string().optional().describe('PIN/ZIP code'),
            gstRegistrationType: z.string().optional().describe('GST registration type: "Regular", "Composition", "Consumer", "Unregistered"'),
            gstin: z.string().optional().describe('GST Identification Number (15 characters)'),
            panNumber: z.string().optional().describe('PAN number for income tax'),
            email: z.string().optional().describe('Email address'),
            phone: z.string().optional().describe('Phone/mobile number'),
            bankAccountNumber: z.string().optional().describe('Bank account number (for bank ledgers)'),
            bankAccountHolderName: z.string().optional().describe('Account holder name'),
            ifscCode: z.string().optional().describe('Bank IFSC code'),
            targetCompany: z.string().optional().describe('Company name - uses default if blank')
        },
        annotations: {
            readOnlyHint: false,
            openWorldHint: false
        }
    }, async (args) => {
        // Build input parameters
        let inputParams = new Map();
        // Required fields
        inputParams.set('name', args.name);
        inputParams.set('group', args.group);
        // Optional fields
        if (args.openingBalance !== undefined) {
            inputParams.set('openingBalance', args.openingBalance);
        }
        if (args.mailingName) {
            inputParams.set('mailingName', args.mailingName);
        }
        if (args.address) {
            inputParams.set('address', args.address);
        }
        if (args.state) {
            inputParams.set('state', args.state);
        }
        if (args.country) {
            inputParams.set('country', args.country);
        }
        if (args.pincode) {
            inputParams.set('pincode', args.pincode);
        }
        if (args.gstRegistrationType) {
            inputParams.set('gstRegistrationType', args.gstRegistrationType);
        }
        if (args.gstin) {
            inputParams.set('gstin', args.gstin);
        }
        if (args.panNumber) {
            inputParams.set('panNumber', args.panNumber);
        }
        if (args.email) {
            inputParams.set('email', args.email);
        }
        if (args.phone) {
            inputParams.set('phone', args.phone);
        }
        if (args.bankAccountNumber) {
            inputParams.set('bankAccountNumber', args.bankAccountNumber);
            if (args.bankAccountHolderName) {
                inputParams.set('bankAccountHolderName', args.bankAccountHolderName);
            }
            if (args.ifscCode) {
                inputParams.set('ifscCode', args.ifscCode);
            }
        }
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePush('create-ledger', inputParams);
        if (!resp.success) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to create ledger: ${resp.errors?.join(', ') || 'Unknown error'}` }]
            };
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: `Ledger "${args.name}" created successfully under "${args.group}"`,
                        created: resp.created,
                        altered: resp.altered
                    })
                }]
        };
    });
    mcpServer.registerTool('import-purchase-vouchers-excel', {
        title: 'Import Purchase Vouchers from Excel',
        description: `Imports multiple purchase vouchers from an Excel file into Tally Prime.
Supports two Excel formats (auto-detected based on columns):

**Accounting Mode** (one row per voucher):
Columns: date, supplierLedger, purchaseLedger, totalAmount, narration (optional), voucherNumber (optional)

**Invoice Mode** (multiple rows per voucher, grouped by voucherId):
Columns: voucherId, date, supplierLedger, purchaseLedger, stockItemName, quantity, rate, unit, taxLedger (optional), taxAmount (optional), narration (optional), voucherNumber (optional)

Date format: YYYY-MM-DD (e.g., 2024-01-15)
The tool validates all data before import and returns detailed success/failure report for each voucher.
IMPORTANT: Validate ledger and stock item names using list-master tool before importing.`,
        inputSchema: {
            filePath: z.string().describe('Absolute path to the Excel file (.xlsx, .xls, or .csv)'),
            sheetName: z.string().optional().describe('Sheet name to read (defaults to first sheet)'),
            validateOnly: z.boolean().optional().describe('If true, only validates without creating vouchers'),
            batchSize: z.number().optional().describe('Number of vouchers per Tally request (default: 10, max: 50)'),
            targetCompany: z.string().optional().describe('Company name - uses default if blank')
        },
        annotations: {
            readOnlyHint: false,
            openWorldHint: false
        }
    }, async (args) => {
        // Parse Excel file
        const parseResult = await parseExcelFile(args.filePath, args.sheetName);
        if (!parseResult.success) {
            return {
                isError: true,
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            message: 'Excel parsing failed',
                            errors: parseResult.errors
                        }, null, 2)
                    }]
            };
        }
        // If validate only, return validation results
        if (args.validateOnly) {
            return {
                content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: 'Validation successful',
                            totalVouchers: parseResult.vouchers.length,
                            mode: parseResult.vouchers[0]?.mode || 'unknown',
                            warnings: parseResult.warnings,
                            sampleVoucher: parseResult.vouchers[0]
                        }, null, 2)
                    }]
            };
        }
        // Prepare vouchers for batch processing
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const preparedVouchers = parseResult.vouchers.map(v => {
            // Convert date to Tally format (d-MMM-yyyy)
            const dateParts = v.date.split('-');
            const tallyDate = `${parseInt(dateParts[2])}-${months[parseInt(dateParts[1]) - 1]}-${dateParts[0]}`;
            const prepared = {
                rowNumber: v.rowNumber,
                date: tallyDate,
                mode: v.mode,
                supplierLedger: v.supplierLedger,
                purchaseLedger: v.purchaseLedger,
                narration: v.narration,
                voucherNumber: v.voucherNumber
            };
            if (v.mode === 'accounting') {
                prepared.totalAmount = v.totalAmount;
            }
            else {
                prepared.inventoryEntries = v.inventoryEntries;
                prepared.ledgerEntries = v.ledgerEntries;
                // Calculate invoice total
                const inventoryTotal = v.inventoryEntries?.reduce((sum, item) => sum + (item.quantity * item.rate), 0) || 0;
                const ledgerTotal = v.ledgerEntries?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
                prepared.invoiceTotal = inventoryTotal + ledgerTotal;
            }
            return prepared;
        });
        // Process vouchers in batches
        const batchSize = Math.min(args.batchSize || 10, 50);
        const result = await handleBatchPush('purchase-entry-batch', preparedVouchers, batchSize, args.targetCompany);
        return {
            isError: !result.success,
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: result.success,
                        message: result.success
                            ? `Successfully imported ${result.successCount} of ${result.totalVouchers} vouchers`
                            : `Import completed with errors: ${result.successCount} succeeded, ${result.failureCount} failed`,
                        summary: {
                            total: result.totalVouchers,
                            succeeded: result.successCount,
                            failed: result.failureCount
                        },
                        parseWarnings: parseResult.warnings,
                        results: result.results
                    }, null, 2)
                }]
        };
    });
    // ========== create-contra-entry ==========
    mcpServer.registerTool('create-contra-entry', {
        title: 'Create Contra Entry',
        description: `Creates a contra voucher in Tally Prime for transferring funds between Cash and Bank accounts (e.g., cash deposit to bank, bank withdrawal to cash, or inter-bank transfer). Both ledgers must be under Cash-in-Hand or Bank Accounts groups. IMPORTANT: Validate ledger names using list-master tool before creating entries.`,
        inputSchema: {
            date: z.string().describe('Date in YYYY-MM-DD format'),
            fromLedger: z.string().describe('Source Cash/Bank ledger name (money going out)'),
            toLedger: z.string().describe('Destination Cash/Bank ledger name (money coming in)'),
            amount: z.number().describe('Transfer amount'),
            narration: z.string().optional().describe('Notes/remarks for the voucher'),
            voucherNumber: z.string().optional().describe('Manual voucher number (auto-generated if blank)'),
            targetCompany: z.string().optional().describe('Company name - uses default if blank')
        },
        annotations: {
            readOnlyHint: false,
            openWorldHint: false
        }
    }, async (args) => {
        let inputParams = new Map();
        const dateParts = args.date.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const tallyDate = `${parseInt(dateParts[2])}-${months[parseInt(dateParts[1]) - 1]}-${dateParts[0]}`;
        inputParams.set('date', tallyDate);
        inputParams.set('fromLedger', args.fromLedger);
        inputParams.set('toLedger', args.toLedger);
        inputParams.set('amount', args.amount);
        if (args.narration) {
            inputParams.set('narration', args.narration);
        }
        if (args.voucherNumber) {
            inputParams.set('voucherNumber', args.voucherNumber);
        }
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePush('contra-entry', inputParams);
        if (!resp.success) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to create contra entry: ${resp.errors?.join(', ') || 'Unknown error'}` }]
            };
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: 'Contra entry created successfully',
                        created: resp.created,
                        altered: resp.altered,
                        voucherId: resp.lastvchid
                    })
                }]
        };
    });
    // ========== create-payment-entry ==========
    mcpServer.registerTool('create-payment-entry', {
        title: 'Create Payment Entry',
        description: `Creates a payment voucher in Tally Prime for recording cash/bank payments. Use for paying suppliers, expenses, salaries, etc. Supports paying multiple parties in a single voucher. IMPORTANT: Validate ledger names using list-master tool before creating entries.`,
        inputSchema: {
            date: z.string().describe('Date in YYYY-MM-DD format'),
            cashBankLedger: z.string().describe('Cash or Bank ledger name from which payment is made'),
            debitEntries: z.array(z.object({
                ledgerName: z.string().describe('Party or expense ledger name being paid'),
                amount: z.number().describe('Amount paid (positive value)')
            })).describe('One or more ledger entries to debit (party/expense being paid)'),
            narration: z.string().optional().describe('Notes/remarks for the voucher'),
            voucherNumber: z.string().optional().describe('Manual voucher number (auto-generated if blank)'),
            targetCompany: z.string().optional().describe('Company name - uses default if blank')
        },
        annotations: {
            readOnlyHint: false,
            openWorldHint: false
        }
    }, async (args) => {
        if (!args.debitEntries || args.debitEntries.length === 0) {
            return {
                isError: true,
                content: [{ type: 'text', text: 'At least one debit entry is required' }]
            };
        }
        let inputParams = new Map();
        const dateParts = args.date.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const tallyDate = `${parseInt(dateParts[2])}-${months[parseInt(dateParts[1]) - 1]}-${dateParts[0]}`;
        inputParams.set('date', tallyDate);
        inputParams.set('cashBankLedger', args.cashBankLedger);
        inputParams.set('debitEntries', args.debitEntries);
        const totalAmount = args.debitEntries.reduce((sum, entry) => sum + entry.amount, 0);
        inputParams.set('totalAmount', totalAmount);
        if (args.debitEntries.length === 1) {
            inputParams.set('partyLedger', args.debitEntries[0].ledgerName);
        }
        if (args.narration) {
            inputParams.set('narration', args.narration);
        }
        if (args.voucherNumber) {
            inputParams.set('voucherNumber', args.voucherNumber);
        }
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePush('payment-entry', inputParams);
        if (!resp.success) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to create payment entry: ${resp.errors?.join(', ') || 'Unknown error'}` }]
            };
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: 'Payment entry created successfully',
                        created: resp.created,
                        altered: resp.altered,
                        voucherId: resp.lastvchid
                    })
                }]
        };
    });
    // ========== create-receipt-entry ==========
    mcpServer.registerTool('create-receipt-entry', {
        title: 'Create Receipt Entry',
        description: `Creates a receipt voucher in Tally Prime for recording cash/bank receipts. Use for receiving payments from customers, income, etc. Supports receiving from multiple parties in a single voucher. IMPORTANT: Validate ledger names using list-master tool before creating entries.`,
        inputSchema: {
            date: z.string().describe('Date in YYYY-MM-DD format'),
            cashBankLedger: z.string().describe('Cash or Bank ledger name receiving the payment'),
            creditEntries: z.array(z.object({
                ledgerName: z.string().describe('Party ledger name making the payment'),
                amount: z.number().describe('Amount received (positive value)')
            })).describe('One or more ledger entries to credit (party paying us)'),
            narration: z.string().optional().describe('Notes/remarks for the voucher'),
            voucherNumber: z.string().optional().describe('Manual voucher number (auto-generated if blank)'),
            targetCompany: z.string().optional().describe('Company name - uses default if blank')
        },
        annotations: {
            readOnlyHint: false,
            openWorldHint: false
        }
    }, async (args) => {
        if (!args.creditEntries || args.creditEntries.length === 0) {
            return {
                isError: true,
                content: [{ type: 'text', text: 'At least one credit entry is required' }]
            };
        }
        let inputParams = new Map();
        const dateParts = args.date.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const tallyDate = `${parseInt(dateParts[2])}-${months[parseInt(dateParts[1]) - 1]}-${dateParts[0]}`;
        inputParams.set('date', tallyDate);
        inputParams.set('cashBankLedger', args.cashBankLedger);
        inputParams.set('creditEntries', args.creditEntries);
        const totalAmount = args.creditEntries.reduce((sum, entry) => sum + entry.amount, 0);
        inputParams.set('totalAmount', totalAmount);
        if (args.creditEntries.length === 1) {
            inputParams.set('partyLedger', args.creditEntries[0].ledgerName);
        }
        if (args.narration) {
            inputParams.set('narration', args.narration);
        }
        if (args.voucherNumber) {
            inputParams.set('voucherNumber', args.voucherNumber);
        }
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePush('receipt-entry', inputParams);
        if (!resp.success) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to create receipt entry: ${resp.errors?.join(', ') || 'Unknown error'}` }]
            };
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: 'Receipt entry created successfully',
                        created: resp.created,
                        altered: resp.altered,
                        voucherId: resp.lastvchid
                    })
                }]
        };
    });
    // ========== create-journal-entry ==========
    mcpServer.registerTool('create-journal-entry', {
        title: 'Create Journal Entry',
        description: `Creates a journal voucher in Tally Prime for general-purpose accounting entries. Use for adjustments, provisions, write-offs, inter-account transfers, etc. Total debit amounts must equal total credit amounts. IMPORTANT: Validate ledger names using list-master tool before creating entries.`,
        inputSchema: {
            date: z.string().describe('Date in YYYY-MM-DD format'),
            debitEntries: z.array(z.object({
                ledgerName: z.string().describe('Ledger name to debit'),
                amount: z.number().describe('Amount to debit (positive value)')
            })).describe('One or more ledger entries to debit'),
            creditEntries: z.array(z.object({
                ledgerName: z.string().describe('Ledger name to credit'),
                amount: z.number().describe('Amount to credit (positive value)')
            })).describe('One or more ledger entries to credit'),
            narration: z.string().optional().describe('Notes/remarks for the voucher'),
            voucherNumber: z.string().optional().describe('Manual voucher number (auto-generated if blank)'),
            targetCompany: z.string().optional().describe('Company name - uses default if blank')
        },
        annotations: {
            readOnlyHint: false,
            openWorldHint: false
        }
    }, async (args) => {
        if (!args.debitEntries || args.debitEntries.length === 0) {
            return {
                isError: true,
                content: [{ type: 'text', text: 'At least one debit entry is required' }]
            };
        }
        if (!args.creditEntries || args.creditEntries.length === 0) {
            return {
                isError: true,
                content: [{ type: 'text', text: 'At least one credit entry is required' }]
            };
        }
        const totalDebit = args.debitEntries.reduce((sum, e) => sum + e.amount, 0);
        const totalCredit = args.creditEntries.reduce((sum, e) => sum + e.amount, 0);
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Debit total (${totalDebit}) must equal Credit total (${totalCredit}). Difference: ${Math.abs(totalDebit - totalCredit)}` }]
            };
        }
        let inputParams = new Map();
        const dateParts = args.date.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const tallyDate = `${parseInt(dateParts[2])}-${months[parseInt(dateParts[1]) - 1]}-${dateParts[0]}`;
        inputParams.set('date', tallyDate);
        inputParams.set('debitEntries', args.debitEntries);
        inputParams.set('creditEntries', args.creditEntries);
        if (args.narration) {
            inputParams.set('narration', args.narration);
        }
        if (args.voucherNumber) {
            inputParams.set('voucherNumber', args.voucherNumber);
        }
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePush('journal-entry', inputParams);
        if (!resp.success) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to create journal entry: ${resp.errors?.join(', ') || 'Unknown error'}` }]
            };
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: 'Journal entry created successfully',
                        created: resp.created,
                        altered: resp.altered,
                        voucherId: resp.lastvchid
                    })
                }]
        };
    });
    // ========== create-sales-entry ==========
    mcpServer.registerTool('create-sales-entry', {
        title: 'Create Sales Entry',
        description: `Creates a sales voucher/invoice in Tally Prime. Supports two modes: "accounting" for simple ledger-to-ledger entries (e.g., service sales), and "invoice" for sales with inventory items. For accounting mode, provide totalAmount. For invoice mode, provide inventoryEntries array with stock items. Additional ledger entries can be used for taxes (CGST, SGST, IGST), discounts, and freight charges. IMPORTANT: Validate ledger names using list-master tool before creating entries.`,
        inputSchema: {
            date: z.string().describe('Date in YYYY-MM-DD format'),
            mode: z.enum(['accounting', 'invoice']).describe('"accounting" for simple ledger entries, "invoice" for sales with inventory items'),
            customerLedger: z.string().describe('Customer/debtor ledger name - must exist in Tally under Sundry Debtors group'),
            salesLedger: z.string().describe('Sales account ledger name - must exist in Tally under Sales Accounts group'),
            totalAmount: z.number().optional().describe('Total amount for accounting mode (required when mode is "accounting")'),
            inventoryEntries: z.array(z.object({
                stockItemName: z.string().describe('Stock item name - must exist in Tally'),
                quantity: z.number().describe('Quantity sold'),
                rate: z.number().describe('Rate per unit'),
                unit: z.string().describe('Unit of measurement (e.g., "nos", "kg", "pcs")')
            })).optional().describe('Array of inventory items for invoice mode (required when mode is "invoice")'),
            ledgerEntries: z.array(z.object({
                ledgerName: z.string().describe('Ledger name for tax/discount/freight'),
                amount: z.number().describe('Amount (positive value)')
            })).optional().describe('Additional ledger entries for taxes, discounts, freight etc.'),
            narration: z.string().optional().describe('Notes/remarks for the voucher'),
            voucherNumber: z.string().optional().describe('Manual voucher number (auto-generated if blank)'),
            targetCompany: z.string().optional().describe('Company name - uses default if blank')
        },
        annotations: {
            readOnlyHint: false,
            openWorldHint: false
        }
    }, async (args) => {
        if (args.mode === 'accounting' && (args.totalAmount === undefined || args.totalAmount === null)) {
            return {
                isError: true,
                content: [{ type: 'text', text: 'totalAmount is required for accounting mode' }]
            };
        }
        if (args.mode === 'invoice' && (!args.inventoryEntries || args.inventoryEntries.length === 0)) {
            return {
                isError: true,
                content: [{ type: 'text', text: 'inventoryEntries is required for invoice mode' }]
            };
        }
        let inputParams = new Map();
        const dateParts = args.date.split('-');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const tallyDate = `${parseInt(dateParts[2])}-${months[parseInt(dateParts[1]) - 1]}-${dateParts[0]}`;
        inputParams.set('date', tallyDate);
        inputParams.set('mode', args.mode);
        inputParams.set('customerLedger', args.customerLedger);
        inputParams.set('salesLedger', args.salesLedger);
        if (args.mode === 'accounting') {
            inputParams.set('totalAmount', args.totalAmount);
        }
        if (args.mode === 'invoice') {
            inputParams.set('inventoryEntries', args.inventoryEntries);
            let inventoryTotal = args.inventoryEntries.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
            let ledgerTotal = args.ledgerEntries?.reduce((sum, entry) => sum + entry.amount, 0) || 0;
            inputParams.set('invoiceTotal', inventoryTotal + ledgerTotal);
        }
        if (args.ledgerEntries && args.ledgerEntries.length > 0) {
            inputParams.set('ledgerEntries', args.ledgerEntries);
        }
        if (args.narration) {
            inputParams.set('narration', args.narration);
        }
        if (args.voucherNumber) {
            inputParams.set('voucherNumber', args.voucherNumber);
        }
        if (args.targetCompany) {
            inputParams.set('targetCompany', args.targetCompany);
        }
        const resp = await handlePush('sales-entry', inputParams);
        if (!resp.success) {
            return {
                isError: true,
                content: [{ type: 'text', text: `Failed to create sales entry: ${resp.errors?.join(', ') || 'Unknown error'}` }]
            };
        }
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        message: 'Sales entry created successfully',
                        created: resp.created,
                        altered: resp.altered,
                        voucherId: resp.lastvchid
                    })
                }]
        };
    });
    return mcpServer;
}
//# sourceMappingURL=mcp.mjs.map