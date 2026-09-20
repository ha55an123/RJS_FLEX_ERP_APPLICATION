# Foster Garment ERP → Gym Management ERP Conversion Mapping

## Project Audit Summary

### Existing Architecture (Preserved)
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Alembic, JWT Auth, RBAC
- **Frontend**: React, Tailwind CSS, Axios, React Router, Lucide Icons
- **Infrastructure**: Docker, Docker Compose, Nginx, PostgreSQL
- **Authentication**: JWT tokens, password hashing, role-based access control
- **Features**: Audit logging, PDF generation (reportlab), QR/barcode support

### Current Status
- ✅ Gym models already created in `app/models/` (gym_member, membership, gym_staff, gym_attendance, etc.)
- ✅ Gym routers already created in `app/routers/gym/` (members, memberships, dashboard, etc.)
- ❌ Frontend still shows garment navigation and pages
- ❌ Database migrations for gym tables may be missing
- ❌ Seed data for gym modules not implemented
- ❌ Frontend API clients for gym endpoints not created

---

## Module Mapping: Garment → Gym

### 1. Authentication & Authorization (PRESERVE)
**Status**: ✅ Already implemented, no changes needed

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| User management | User management | PRESERVE |
| Role management (admin, company_manager) | Role management (super_admin, gym_owner, manager, receptionist, trainer, accountant, inventory_manager, member) | EXTEND with gym roles |
| JWT authentication | JWT authentication | PRESERVE |
| Permission system | Permission system | PRESERVE |

### 2. Dashboard
**Status**: ⚠️ Backend exists, Frontend needs update

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| Production dashboard | Gym dashboard | REPLACE |
| Total Employees | Total Members | REPLACE |
| Today's Production | Today's Attendance | REPLACE |
| Monthly Production | Monthly Revenue | REPLACE |
| Production Departments | Active Trainers | REPLACE |
| Production Technologies | Equipment Status | REPLACE |

**Backend**: `app/routers/gym/dashboard.py` ✅ Exists
**Frontend**: `src/pages/DashboardPage.jsx` ❌ Needs gym metrics

### 3. Member Management (NEW)
**Status**: ✅ Backend exists, ❌ Frontend missing

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| Employees | Gym Members | NEW MODULE |
| Employee profiles | Member profiles | NEW |
| Employee codes | Member codes/QR/RFID | NEW |

**Backend**: 
- `app/models/gym_member.py` ✅ Exists
- `app/routers/gym/members.py` ✅ Exists

**Frontend**: ❌ Needs `MembersPage.jsx`

### 4. Membership Management (NEW)
**Status**: ✅ Backend exists, ❌ Frontend missing

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| N/A | Membership Plans | NEW MODULE |
| N/A | Membership Subscriptions | NEW |
| N/A | Membership Freezes | NEW |
| N/A | Membership Transfers | NEW |

**Backend**:
- `app/models/membership.py` ✅ Exists
- `app/routers/gym/memberships.py` ✅ Exists

**Frontend**: ❌ Needs `MembershipsPage.jsx`

### 5. Staff/Trainer Management (NEW)
**Status**: ✅ Backend exists, ❌ Frontend missing

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| Employees | Gym Staff (Trainers, Receptionists, etc.) | NEW MODULE |
| Employee assignments | Trainer-Member assignments | NEW |
| Production departments | Trainer specializations | NEW |

**Backend**:
- `app/models/gym_staff.py` ✅ Exists
- `app/routers/gym/gym_staff.py` ✅ Exists

**Frontend**: ❌ Needs `GymStaffPage.jsx`

### 6. Attendance Management (NEW)
**Status**: ✅ Backend exists, ❌ Frontend missing

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| Attendance Payroll | Gym Attendance | NEW MODULE |
| Manual attendance | Manual attendance | PRESERVE logic |
| N/A | QR/Barcode/RFID attendance | NEW |
| N/A | Biometric device integration | NEW |

**Backend**:
- `app/models/gym_attendance.py` ✅ Exists
- `app/models/biometric_device.py` ✅ Exists
- `app/routers/gym/gym_attendance.py` ✅ Exists
- `app/routers/gym/biometric_devices.py` ✅ Exists

**Frontend**: ❌ Needs `GymAttendancePage.jsx`, `BiometricDevicesPage.jsx`

### 7. Workout Management (NEW)
**Status**: ✅ Backend exists, ❌ Frontend missing

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| N/A | Workout Plans | NEW MODULE |
| N/A | Exercise Library | NEW |
| N/A | Trainer-Member workout assignments | NEW |

**Backend**:
- `app/models/workout.py` ✅ Exists
- `app/routers/gym/workouts.py` ✅ Exists

**Frontend**: ❌ Needs `WorkoutsPage.jsx`

### 8. Diet/Nutrition Management (NEW)
**Status**: ✅ Backend exists, ❌ Frontend missing

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| N/A | Diet Plans | NEW MODULE |
| N/A | Meal Plans | NEW |
| N/A | Nutrition tracking | NEW |

**Backend**:
- `app/models/diet.py` ✅ Exists
- `app/routers/gym/diet.py` ✅ Exists

**Frontend**: ❌ Needs `DietPage.jsx`

### 9. Payment Management (NEW)
**Status**: ✅ Backend exists, ❌ Frontend missing

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| N/A | Gym Payments | NEW MODULE |
| N/A | Membership payments | NEW |
| N/A | Personal training payments | NEW |

**Backend**:
- `app/models/gym_payment.py` ✅ Exists
- `app/routers/gym/gym_payments.py` ✅ Exists

**Frontend**: ❌ Needs `GymPaymentsPage.jsx`

### 10. Expense Management (PRESERVE & EXTEND)
**Status**: ✅ Backend exists, ⚠️ Frontend exists but may need gym categories

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| Daily Expenses | Gym Expenses | PRESERVE + EXTEND categories |
| Utility Bills | Utility Bills | PRESERVE |
| N/A | Rent, Equipment, Maintenance | EXTEND categories |

**Backend**:
- `app/models/accounting.py` ✅ Exists (DailyExpense, UtilityBill)
- `app/routers/expenses.py` ✅ Exists

**Frontend**:
- `src/pages/ExpensesPage.jsx` ✅ Exists (may need gym-specific categories)

### 11. Invoice System (PRESERVE)
**Status**: ✅ Backend exists, ✅ Frontend exists

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| Invoice generation | Gym Invoice generation | PRESERVE & ADAPT |
| PDF generation | PDF generation | PRESERVE (reportlab) |

**Backend**:
- `app/models/invoice.py` ✅ Exists
- `app/routers/invoice.py` ✅ Exists

**Frontend**:
- `src/pages/InvoicesPage.jsx` ✅ Exists

### 12. Inventory Management (CONVERT)
**Status**: ✅ Backend exists, ⚠️ Frontend exists but needs gym products

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| Raw materials inventory | Gym inventory (supplements, protein, etc.) | CONVERT |
| Product inventory | Merchandise inventory | CONVERT |
| Suppliers | Suppliers | PRESERVE |
| Purchases | Purchases | PRESERVE |

**Backend**:
- `app/models/inventory.py` ✅ Exists (garment inventory)
- `app/models/gym_inventory.py` ✅ Exists (gym-specific inventory)
- `app/routers/inventory.py` ✅ Exists
- `app/routers/gym/gym_inventory.py` ✅ Exists

**Frontend**:
- `src/pages/InventoryPage.jsx` ✅ Exists (may need gym products)
- ❌ May need dedicated `GymInventoryPage.jsx`

### 13. Equipment Management (NEW)
**Status**: ✅ Backend exists, ❌ Frontend missing

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| N/A | Gym Equipment | NEW MODULE |
| N/A | Equipment maintenance | NEW |
| N/A | Equipment tracking | NEW |

**Backend**:
- `app/models/gym_equipment.py` ✅ Exists
- `app/routers/gym/equipment.py` ✅ Exists

**Frontend**: ❌ Needs `EquipmentPage.jsx`

### 14. Branch/Outlet Management (CONVERT)
**Status**: ✅ Backend exists, ⚠️ Frontend exists

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| Outlets | Gym Branches | CONVERT terminology |
| Outlet POS | Branch operations | CONVERT |

**Backend**:
- `app/models/outlet.py` ✅ Exists
- `app/models/branch.py` ✅ Exists (gym-specific)
- `app/routers/outlets.py` ✅ Exists
- `app/routers/gym/branches.py` ✅ Exists

**Frontend**:
- `src/pages/OutletsPage.jsx` ✅ Exists (may need to become BranchesPage)

### 15. Reports (EXTEND)
**Status**: ✅ Backend exists, ❌ Frontend missing gym reports

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| Production reports | Membership reports | EXTEND |
| Payroll reports | Attendance reports | EXTEND |
| Financial reports | Financial reports | PRESERVE |
| N/A | Member reports | NEW |
| N/A | Trainer reports | NEW |

**Backend**:
- `app/routers/gym/reports.py` ✅ Exists

**Frontend**: ❌ Needs `ReportsPage.jsx`

### 16. Accounting/Ledgers (PRESERVE)
**Status**: ✅ Backend exists, ✅ Frontend exists

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| Ledger accounts | Ledger accounts | PRESERVE |
| Daily expenses | Daily expenses | PRESERVE |
| Utility bills | Utility bills | PRESERVE |

**Backend**:
- `app/models/accounting.py` ✅ Exists
- `app/routers/ledgers.py` ✅ Exists

**Frontend**:
- `src/pages/LedgersPage.jsx` ✅ Exists

### 17. Purchase Management (PRESERVE)
**Status**: ✅ Backend exists, ✅ Frontend exists

| Garment Module | Gym Module | Action |
|----------------|------------|--------|
| Purchase requests | Purchase requests | PRESERVE |
| Purchases | Purchases | PRESERVE |

**Backend**:
- `app/routers/purchase_requests.py` ✅ Exists
- `app/routers/purchases.py` ✅ Exists

**Frontend**:
- `src/pages/PurchaseRequestsPage.jsx` ✅ Exists
- `src/pages/PurchasesPage.jsx` ✅ Exists

---

## Frontend Navigation Mapping

### Current Sidebar (Garment)
```jsx
Dashboard
Inventory
Purchase Orders
Sales Orders
Invoices
Outlets
Outlet POS
Employees
Attendance
Attendance Payroll
Production Payroll
Production Loans
Production Advances
Production Departments
Production Technologies
Employee Assignments
Production Entries
App Users
Ledger Accounts
Daily Expenses
Utility Bills
Purchase Requests
```

### New Sidebar (Gym)
```jsx
Dashboard
Members
  ├── All Members
  ├── Add Member
  ├── Active
  └── Expiring Soon
Memberships
  ├── Plans
  ├── Active Memberships
  ├── Renewals
  └── History
Attendance
  ├── Today's Attendance
  ├── Attendance History
  └── Biometric Devices
Trainers
Workout Plans
Diet Plans
Payments
  ├── Payments
  ├── Invoices
  └── Outstanding
Expenses
Inventory
Equipment
Branches
Reports
Users & Roles
Settings
```

---

## Database Table Mapping

### Existing Tables (Preserve)
- `users` - User accounts
- `roles` - Role definitions (extend with gym roles)
- `ledgers` - Accounting ledgers
- `daily_expenses` - Daily expenses (extend categories)
- `utility_bills` - Utility bills
- `invoices` - Invoice records
- `purchase_requests` - Purchase requests
- `purchases` - Purchase orders
- `suppliers` - Supplier information
- `inventory` - Generic inventory (may keep for gym)
- `audit_logs` - Audit logging

### New Gym Tables (Already Created)
- `branches` - Gym branches
- `gym_members` - Gym members
- `membership_plans` - Membership plan definitions
- `membership_subscriptions` - Active memberships
- `membership_freezes` - Membership freeze records
- `membership_transfers` - Membership transfer records
- `gym_staff` - Gym staff (trainers, receptionists, etc.)
- `gym_attendance` - Member attendance
- `staff_attendance` - Staff attendance
- `trainer_schedules` - Trainer schedules
- `biometric_devices` - Biometric device records
- `biometric_device_logs` - Device sync logs
- `workout_plans` - Workout plans
- `workout_exercises` - Exercise library
- `diet_plans` - Diet plans
- `diet_meals` - Meal plans
- `gym_payments` - Gym payments
- `gym_inventory_items` - Gym-specific inventory
- `gym_equipment` - Gym equipment
- `equipment_maintenance` - Equipment maintenance records

### Obsolete Garment Tables (Deprecate)
- `employees` - Replace with `gym_staff`
- `production_departments` - Deprecate (not needed for gym)
- `production_technologies` - Deprecate (not needed for gym)
- `production_entries` - Deprecate (not needed for gym)
- `production_payroll_runs` - Deprecate (not needed for gym)
- `production_payroll_items` - Deprecate (not needed for gym)
- `production_loans` - Deprecate (not needed for gym)
- ` `production_advances` - Deprecate (not needed for gym)
- `employee_technology_assignments` - Deprecate (not needed for gym)
- `outlets` - Replace with `branches` (or convert terminology)

---

## API Endpoint Mapping

### Preserved Endpoints (Keep)
- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/ledgers/*` - Accounting ledgers
- `/api/expenses/*` - Expenses
- `/api/utility-bills/*` - Utility bills
- `/api/invoices/*` - Invoices
- `/api/purchase-requests/*` - Purchase requests
- `/api/purchases/*` - Purchases

### New Gym Endpoints (Already Created)
- `/api/v1/dashboard/*` - Gym dashboard
- `/api/v1/branches/*` - Branch management
- `/api/v1/members/*` - Member management
- `/api/v1/memberships/*` - Membership management
- `/api/v1/gym-staff/*` - Staff/Trainer management
- `/api/v1/gym-attendance/*` - Attendance management
- `/api/v1/biometric-devices/*` - Biometric device management
- `/api/v1/workouts/*` - Workout plans
- `/api/v1/diet/*` - Diet plans
- `/api/v1/equipment/*` - Equipment management
- `/api/v1/gym-inventory/*` - Gym inventory
- `/api/v1/gym-payments/*` - Gym payments
- `/api/v1/reports/*` - Gym reports

### Deprecate Endpoints
- `/api/employees/*` - Replace with gym-staff
- `/api/attendance-payroll/*` - Replace with gym-attendance
- `/api/production-payroll/*` - Deprecate
- `/api/production-loans/*` - Deprecate
- `/api/production-advances/*` - Deprecate
- `/api/production-departments/*` - Deprecate
- `/api/production-technologies/*` - Deprecate
- `/api/production-assignments/*` - Deprecate
- `/api/production-entries/*` - Deprecate
- `/api/outlets/*` - Replace with branches

---

## Implementation Priority

### Phase 1: Database (HIGH PRIORITY)
1. Create Alembic migration for gym tables (if not exists)
2. Create gym seed data function
3. Test database migrations

### Phase 2: Frontend Navigation (HIGH PRIORITY)
1. Update `Sidebar.jsx` with gym navigation
2. Update `App.jsx` with gym routes
3. Update branding from "Foster Garments" to gym name

### Phase 3: Frontend Pages (HIGH PRIORITY)
1. Create `MembersPage.jsx`
2. Create `MembershipsPage.jsx`
3. Create `GymStaffPage.jsx`
4. Create `GymAttendancePage.jsx`
5. Create `WorkoutsPage.jsx`
6. Create `DietPage.jsx`
7. Create `EquipmentPage.jsx`
8. Create `ReportsPage.jsx`

### Phase 4: Frontend API Clients (HIGH PRIORITY)
1. Create `src/api/gym/members.js`
2. Create `src/api/gym/memberships.js`
3. Create `src/api/gym/dashboard.js`
4. Create `src/api/gym/attendance.js`
5. Create other gym API clients

### Phase 5: Dashboard Update (HIGH PRIORITY)
1. Update `DashboardPage.jsx` with gym metrics
2. Connect to gym dashboard API
3. Add gym-specific charts

### Phase 6: Biometric Integration (MEDIUM PRIORITY)
1. Review existing biometric device model
2. Implement device abstraction layer
3. Add vendor adapter interfaces

### Phase 7: Testing (MEDIUM PRIORITY)
1. Test gym APIs
2. Test frontend pages
3. Test authentication with gym roles
4. End-to-end testing

### Phase 8: Cleanup (LOW PRIORITY)
1. Remove garment-specific frontend pages
2. Update documentation
3. Clean up unused code

---

## Key Decisions

### 1. Role Mapping
- `admin` → `super_admin` (keep admin for compatibility)
- `company_manager` → `gym_owner` or `manager`
- New roles: `receptionist`, `trainer`, `accountant`, `inventory_manager`, `member`

### 2. Branch vs Outlet
- Keep `outlets` table for now, migrate to `branches` terminology
- Update frontend to use "Branches" instead of "Outlets"

### 3. Employee vs Staff
- Keep `employees` table for production payroll (if still needed)
- Use `gym_staff` for gym operations
- Frontend should use Gym Staff page

### 4. Inventory
- Keep generic `inventory` for now
- Use `gym_inventory` for gym-specific products
- Frontend can show both or consolidate

---

## Notes

- The backend gym models and routers are already well-implemented
- The main work is in the frontend: navigation, pages, API clients
- Database migrations need to be verified for gym tables
- Seed data needs to be created for gym modules
- Authentication and authorization system is solid and can be extended
- PDF/invoice infrastructure can be reused for gym invoices
`