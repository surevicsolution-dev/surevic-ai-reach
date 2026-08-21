# Surevic AI ERP (66)

# Role & Goal

You are an expert full-stack engineer and enterprise ERP architect. Build "Surevic ERP + AI", a full-featured, multi-tenant Cloud ERP with an embedded natural language AI Copilot designed for Indian businesses (specifically industrial automation, trading, and manufacturing).



# Tech Stack

- Frontend: Next.js (App Router), React 19, TypeScript, Tailwind CSS, Lucide React, Shadcn UI / Radix primitives.

- Backend/State: Server Actions / Next.js API Routes, Prisma ORM or Supabase PostgreSQL client.

- Charts & PDFs: Recharts, HTML-to-Print / Tailwind Print stylesheet for A4 GST Tax Invoices.

- AI Layer: OpenAI tool-calling structure (mocked/wired for live DB interaction).



---



# Core Modules & Architecture



### 1. Multi-Tenant Foundation & RBAC

- Tenant Isolation: Every DB model includes `companyId`.

- Roles: `ADMIN`, `SALES`, `ACCOUNTS`, `WAREHOUSE`.

- Company Profile: Name, Logo, GSTIN, PAN, State & State Code, Bank Details (Bank Name, A/C, IFSC, UPI ID), Invoice Prefix (e.g., "SV-INV-").



### 2. Master Data Management

- Customers & Suppliers: Name, Type (Customer/Supplier/Both), GSTIN, PAN, State, State Code, Billing & Shipping Address, Phone, Email, Credit Limit, Opening Balance.

- Product Inventory: Name, SKU, Brand (e.g. SICK, Siemens, Omron), HSN Code, Cost Price, Selling Price, GST Tax Rate (0%, 5%, 12%, 18%, 28%), Current Stock, Reorder Min-Qty.



### 3. Sales & GST Engine (Indian Tax Rules)

- Quotations & Tax Invoices: Convert Quotation -> Invoice with 1 click.

- Automatic GST Engine:

  * Compare `Company.stateCode` with `Party.stateCode`.

  * If same: calculate `CGST = TaxRate / 2` and `SGST = TaxRate / 2`.

  * If different: calculate `IGST = TaxRate`.

  * Calculate Taxable Amount, Tax Subtotals, and Round-off Grand Total.

- Stock Control: Invoicing automatically decrements product stock and prevents negative stock unless overridden.



### 4. Payments & Double-Entry Ledgers

- Payments & Receipts: Record payment against specific invoices with mode (Bank Transfer, Cheque, UPI, Cash) and reference number.

- Customer/Supplier Ledger: Running balance statement (Debit, Credit, Closing Balance, Overdue Aging: 0-30, 31-60, 60+ days).

- Payment Follow-up Tracker: Schedule follow-up dates and view "Today's Follow-ups".



### 5. Document Print & PDF Engine

- Pixel-perfect A4 printable GST Invoice & Quotation layout with:

  * Company header with GSTIN and State Code

  * Bill-to and Ship-to details

  * Itemized table with HSN, Qty, Rate, Taxable Value, Tax %, Total

  * Bank details for RTGS/NEFT + UPI QR placeholder

  * Amount in Words

  * Terms & Conditions + Authorized Signatory box

  * Print and PDF download triggers



### 6. Embedded Surevic AI Copilot (Floating Widget)

- Bottom-right floating chat drawer accessible across all screens.

- Connected via function calling tools to query ERP state:

  1. `get_party_outstanding(partyName)` -> Returns total unpaid balance and list of unpaid invoices.

  2. `check_product_stock(productOrBrand)` -> Returns stock availability for specific brand/SKU.

  3. `get_payment_followups(date)` -> Lists receivables due today.

  4. `draft_quotation(customerName, items)` -> Pre-fills the quotation creation form.

- Natural Hinglish/English conversational persona.



### 7. UI/UX & Seed Data

- Modern Dark/Light clean dashboard with:

  * Metrics: Monthly Revenue, Outstanding Receivables, Low Stock Alerts, Active Quotations.

  * Searchable & filterable tables with pagination and badge statuses (Paid, Partial, Unpaid, Draft).

  * Quick keyboard shortcuts (e.g. `Enter` navigation, `Alt+N` for new entry).

- Include realistic seed data out of the box (e.g., SICK sensors, Siemens PLCs, Omron c

omponents, Indian party addresses with valid GSTIN formats).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://surevic-ai-reach.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f7392f70-10da-4114-9959-cab7f33883ba).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
