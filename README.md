# Tally Prime MCP Server - AI Integration for Tally ERP
**Connect Tally Prime to ChatGPT, Claude AI & other LLMs using MCP (Model Context Protocol)**

Automate your Tally workflows with AI. Read financial reports, create vouchers, bulk import from Excel, and ask natural language questions about your Tally data - all through a simple chat interface. No coding required.

Whether you're a CA, accountant, or business owner - this tool lets you talk to your Tally data using AI platforms like **Claude AI** and **ChatGPT**.


## What Can You Do With This?

Here's what becomes possible when you connect Tally Prime to AI:

- **Fetch financial reports instantly** - Ask AI to pull your Balance Sheet, Profit & Loss, Trial Balance, or Stock Summary from Tally in seconds
- **Reconcile ledger mismatches** - Compare supplier ledger vs purchase ledger to spot discrepancies and mismatched entries
- **Detect duplicate vouchers** - Let AI scan your vouchers to find double entries or suspicious duplicates
- **Create vouchers from invoice photos** - Upload a photo/image of a purchase or sales invoice, and AI will read it and create the voucher in Tally automatically
- **Create masters via chat** - Add new ledgers, suppliers, customers, expense accounts, and bank accounts just by chatting with AI
- **Bulk import from Excel/CSV** - Import hundreds of purchase vouchers from Excel or CSV files into Tally in one go
- **Track outstanding receivables & payables** - Check who owes you money, what you owe others, and which bills are overdue
- **Query stock balances & movement** - Ask about current stock levels, inward/outward movement, and item-wise details for any period
- **Ask anything in plain English** - "What were my total sales last month?", "Show me all payments to XYZ supplier", "Which invoices are overdue by more than 30 days?"


## Available Tools

|Tool|Mode|Description|
|--|--|--|
|query-database|Read|Run SQL queries on cached Tally report data using DuckDB|
|list-master|Read|Fetch list of ledgers, groups, stock items, voucher types and other masters|
|chart-of-accounts|Read|Get the complete group hierarchy for Balance Sheet and P&L|
|trial-balance|Read|Extract Trial Balance with opening, debit, credit and closing balances|
|balance-sheet|Read|Pull Balance Sheet as on any date|
|profit-loss|Read|Pull Profit & Loss statement for any period|
|ledger-balance|Read|Get closing balance of any ledger as on a specific date|
|ledger-account|Read|View detailed ledger account with all voucher entries for a period|
|stock-item-balance|Read|Check available quantity of any stock item as on a date|
|stock-item-account|Read|View stock item movement with voucher-level details|
|stock-summary|Read|Get stock summary with opening, inward, outward and closing quantities|
|bills-outstanding|Read|Fetch outstanding receivables or payables with overdue days|
|create-ledger|Write|Create new ledger masters (suppliers, customers, expense accounts, banks)|
|create-purchase-entry|Write|Create purchase vouchers in accounting or invoice mode with tax support|
|create-sales-entry|Write|Create sales vouchers in accounting or invoice mode with tax support|
|create-payment-entry|Write|Record cash/bank payments to suppliers, expenses, salaries|
|create-receipt-entry|Write|Record cash/bank receipts from customers and other income|
|create-contra-entry|Write|Transfer funds between cash and bank accounts|
|create-journal-entry|Write|Create journal entries for adjustments, provisions, write-offs|
|import-purchase-vouchers-excel|Batch Import|Bulk import purchase vouchers from Excel/CSV files|


## Supported Platform
Implementation was tested on below AI platform

|Platform|Local|Remote|
|--|--|--|
|Claude AI| :heavy_check_mark: | :heavy_check_mark: |
|ChatGPT|| :heavy_check_mark: |


## Prerequisites
* Tally Prime (Silver / Gold)
* Node JS

Ensure below things are pre-installed and setup:
* Ensure to [download & install Node JS](https://nodejs.org/en) from official website
* XML Port of Tally Prime must be enabled (F1 &gt; Settings &gt; Connectivity &gt; Client/Server configuration) with below settings
```
TallyPrime acts as = Server
Port = 9000
```

*Note: Kindly avoid using Educational version of Tally Prime, which has limitations of date range. It will result in invalid / partial data being fed to LLM, leading to highly degraded &amp; incorrect responses.*

## Download
Avoid cloning repository directly. Utility is available for download (with required dependencies) on below link <br>
[https://excelkida.com/resource/tally-mcp-server-v6.zip](https://excelkida.com/resource/tally-mcp-server-v6.zip)

## Setup (Local)
This mode of setup is to be used when MCP Client (like Claude Desktop, Perplexity etc.) and Tally Prime both exists in local PC. MCP Client software itself runs the MCP Server internally in such scenario.

Simply download &amp; extract zip file somewhere on the disk.  Assuming that we downloaded &amp; extracted zip file on below path (folder)
```
D:\Software\Tally MCP Server
```

<image src="https://excelkida.com/image/github/explorer-tally-mcp-server.png" height="265" width="766" />

A sample setup for few popular tools is demonstrated.

### Claude Desktop
Desktop version of Claude AI supports loading of local MCP server. Ensure you have Pro / Team / Max / Enterprise subscription of Claude, which supports higher limit compared to Free. MCP makes multiple calls to Tally for validation and inference, which might exhaust free limits quickly. Download Claude Desktop from following link
[claude.ai/download](https://claude.ai/download)

Go to menu &gt; File &gt; Settings &gt; Developer

<image src="https://excelkida.com/image/github/claude-desktop-developer-setting.png" height="751" width="1045" />

This will open My Computer window. Right click and edit **claude_desktop_config.json** file (via Notepad) with as below JSON
```json
{
  "mcpServers": {
	  "Tally Prime": {
		  "command": "node",
		  "args": ["D:\\Software\\Tally MCP Server\\dist\\index.mjs"]
	  }
  }
}
```
*Note: single slash in folder path needs to be substituted with double slash*

Save the file. Close Claude Desktop (menu &gt; File &gt; Exit) and again re-launch it.

Verify by clicking on Tools button and check if Tally Prime appears in the list (screenshot below)

<image src="https://excelkida.com/image/github/claude-desktop-tally-mcp-server-tool-display.png" height="595" width="722" />

### Perplexity Desktop
Perplexity Desktop version for MacOS supports connecting to local MCP server. Configuration file (JSON format) is same as demonstrated for Claude Desktop. In absense of MacBook, documentation with screenshot could not be written. Kindly refer to below blog on perplexity website, which explains the steps.

[Perplexity Desktop MCP Connectivity](https://www.perplexity.ai/help-center/en/articles/11502712-local-and-remote-mcps-for-perplexity)

## Setup (Cloud)
This mode of setup is to be used, when using browser-based MCP client like ChatGPT, Claude AI, Copilot, OR mobile-based app for these LLM which cannot access Tally Prime running inside local PC. In this scenario, MCP Server needs to run as web-server, internally connected to Tally securely. Setup is quite complicated, and is covered in detail in **docs** folder of this project.
* [Linux-based Server](docs/server-setup-linux.md)
* Windows Server (exploration in-progress)

## Contact
Project developed & maintained by: **Deepak Soora**

Email: **deepu.soora@gmail.com** <br>
LInkedIn: **https://www.linkedin.com/in/deepaksoora/**