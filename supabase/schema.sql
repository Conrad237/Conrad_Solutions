-- ============================================================================
-- CONRAD SOLUTION — ARCHITECTURE SAAS MULTI-BAILLEURS (SUPABASE / POSTGRESQL)
-- ============================================================================

CREATE TABLE landlords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  whatsapp_phone TEXT,
  orange_money_number TEXT,
  mtn_momo_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID REFERENCES landlords(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT,
  default_room_price INTEGER NOT NULL DEFAULT 32000,
  default_studio_price INTEGER NOT NULL DEFAULT 50000,
  water_m3_price INTEGER NOT NULL DEFAULT 500,
  electricity_kwh_price INTEGER NOT NULL DEFAULT 110,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE units (
  id TEXT PRIMARY KEY,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- ex: CH01, ST11
  type TEXT NOT NULL CHECK (type IN ('ROOM', 'STUDIO')),
  floor INTEGER NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('LEFT_ODD', 'RIGHT_EVEN')),
  monthly_rent INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PAID', 'PARTIAL', 'LATE', 'VACANT')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id TEXT REFERENCES units(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  cni_number TEXT,
  profile_type TEXT NOT NULL CHECK (profile_type IN ('STUDENT', 'EMPLOYEE', 'SELF_EMPLOYED')),
  move_in_date DATE NOT NULL,
  rent_valid_until DATE NOT NULL,
  months_covered INTEGER NOT NULL DEFAULT 1,
  deposit_required INTEGER NOT NULL DEFAULT 32000,
  deposit_paid INTEGER NOT NULL DEFAULT 32000,
  amount_paid_current_period INTEGER NOT NULL DEFAULT 0,
  balance_due INTEGER NOT NULL DEFAULT 0,
  arrangement_notes TEXT,
  no_guarantor_required BOOLEAN NOT NULL DEFAULT false,
  guarantor_name TEXT,
  guarantor_relation TEXT,
  guarantor_phone TEXT,
  guarantor_city_profession TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  unit_id TEXT REFERENCES units(id) ON DELETE CASCADE,
  tenant_name TEXT NOT NULL,
  receipt_number TEXT UNIQUE NOT NULL,
  payment_date DATE NOT NULL,
  period_label TEXT NOT NULL,
  months_covered INTEGER NOT NULL DEFAULT 1,
  rent_amount INTEGER NOT NULL DEFAULT 0,
  water_amount INTEGER NOT NULL DEFAULT 0,
  electricity_amount INTEGER NOT NULL DEFAULT 0,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  total_paid INTEGER NOT NULL,
  remaining_balance INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'ORANGE_MONEY', 'MTN_MOMO', 'BANK_TRANSFER')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  unit_code TEXT, -- Optionnel (ex: CH14 ou Commun)
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('TODO', 'IN_PROGRESS', 'PAID')),
  estimated_cost INTEGER NOT NULL DEFAULT 0,
  actual_cost INTEGER NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
