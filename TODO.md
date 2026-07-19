# ERP_Project_Forest TODO

## Phase 1 — Database & integration verification
- [ ] Validate DB schema matches SQLAlchemy models (tables + FKs for production + accounting)
- [ ] Validate Alembic migrations applied cleanly; add/adjust missing migrations if any
- [ ] Confirm seed data runs and produces demo rows in production module tables

## Phase 2 — Accounting ledger integration fixes
- [ ] Daily Expenses: create `LedgerEntry` records when expenses are created/updated/deleted (and keep `current_balance` in sync)
- [ ] Utility Bills: when marking bill as **Paid**, create `LedgerEntry` records referencing the bill
- [ ] Production Payroll: when payroll run is finalized, create `LedgerEntry` records for salary totals (loan/advance deductions already partly handled)

## Phase 3 — Seed data so UI pages are non-empty
- [ ] Extend `seed_production_payroll_demo_data` to create:
  - [ ] Expense ledgers (type=Expense, status=Active)
  - [ ] DailyExpense demo records linked to an Expense ledger
  - [ ] UtilityBill demo records for current month (some Pending; some Paid)
  - [ ] Ensure seed values match frontend expectations (`status` strings, due dates, billing_month/year)

## Phase 4 — Dashboard KPIs
- [ ] Backend: extend `dashboard.py` with endpoints that return production/accounting KPIs required by the prompt
- [ ] Frontend: update `DashboardPage.jsx` + `src/api/dashboard.js` to display:
  - [ ] Total Employees
  - [ ] Today’s Production
  - [ ] Monthly Production
  - [ ] Payroll Generated / Pending Payroll
  - [ ] Total Loans / Pending Loans
  - [ ] Advance Salary / Pending Advances
  - [ ] Daily Expenses
  - [ ] Utility Bills
  - [ ] Monthly Profit
  - [ ] Monthly Expenses

## Phase 5 — API verification & frontend checks
- [ ] Confirm each endpoint used by the six modules returns non-empty data after seeding
- [ ] Fix any schema mismatches between backend response and frontend rendering
- [ ] Ensure loading/error states handle empty lists correctly

## Phase 6 — Final validation
- [ ] Run docker compose, confirm migrations + seed complete
- [ ] Manually verify each page shows meaningful demo data

