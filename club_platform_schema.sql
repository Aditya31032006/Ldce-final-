-- =====================================================================
--  SPORTS CLUB PLATFORM  -  multi-tenant schema (PostgreSQL 15+)
--  Run in pgAdmin Query Tool on an EMPTY database, as the owner/superuser.
--  No seed data. Everything a club needs is created by the club itself.
--
--  Design in one paragraph
--  * Every tenant table has club_id (default = current club from session)
--  * Composite FKs (club_id, x_id) make cross-club references impossible
--  * RLS on every table; the backend connects as role club_app and calls
--    app.set_context(user_id, club_id) at the start of EACH transaction
--  * Court double-booking is blocked by a GiST EXCLUDE constraint
--  * Fuzzy search = pg_trgm GIN indexes + app.search_* functions
--
--  To start over:  DROP SCHEMA app CASCADE;
-- =====================================================================
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS btree_gin;

CREATE SCHEMA IF NOT EXISTS app;
SET search_path = app, public;
ALTER DEFAULT PRIVILEGES IN SCHEMA app REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'club_app') THEN
    CREATE ROLE club_app NOLOGIN;   -- GRANT club_app TO <your backend login role>;
  END IF;
END $$;
ALTER ROLE club_app SET search_path = app, public;

-- ---------------------------------------------------------------------
-- 1. TYPES
-- ---------------------------------------------------------------------
CREATE DOMAIN money_amt AS numeric(12,2) CHECK (VALUE >= 0);
CREATE DOMAIN pct       AS numeric(5,2)  CHECK (VALUE >= 0 AND VALUE <= 100);

CREATE TYPE club_role         AS ENUM ('owner','manager','front_desk','bar_staff','kitchen','shop_staff');
CREATE TYPE module_key        AS ENUM ('courts','shop','bar','crm','hr','website','social_play');
CREATE TYPE club_status       AS ENUM ('pending','active','suspended','closed');
CREATE TYPE sub_status        AS ENUM ('trialing','active','past_due','cancelled');
CREATE TYPE member_status     AS ENUM ('active','inactive','blocked');
CREATE TYPE membership_status AS ENUM ('scheduled','active','expired','cancelled');
CREATE TYPE booking_channel   AS ENUM ('online','counter','phone');
CREATE TYPE booking_status    AS ENUM ('pending','confirmed','completed','cancelled','no_show','paid');
CREATE TYPE reservation_kind  AS ENUM ('booking','social_session','maintenance','block');
CREATE TYPE reservation_status AS ENUM ('active','released');
CREATE TYPE payment_method    AS ENUM ('cash','card','upi','online','wallet','bank_transfer','other');
CREATE TYPE payment_status    AS ENUM ('pending','completed','failed','voided');
CREATE TYPE payment_kind      AS ENUM ('payment','refund');
CREATE TYPE sales_channel     AS ENUM ('pos','online');
CREATE TYPE fulfillment_type  AS ENUM ('counter','pickup','delivery');
CREATE TYPE shop_order_status AS ENUM ('pending','confirmed','ready','completed','cancelled');
CREATE TYPE station_type      AS ENUM ('kitchen','bar');
CREATE TYPE table_status      AS ENUM ('available','occupied','billed','reserved');
CREATE TYPE tab_status        AS ENUM ('open','settled','void');
CREATE TYPE bar_order_status  AS ENUM ('open','sent','served','billed','paid','void');
CREATE TYPE kds_status        AS ENUM ('new','preparing','ready','served','cancelled');
CREATE TYPE lead_status       AS ENUM ('new','contacted','quote_sent','won','lost');
CREATE TYPE lead_source       AS ENUM ('website','walk_in','phone','referral','social','other');
CREATE TYPE quote_status      AS ENUM ('draft','sent','accepted','rejected','expired');
CREATE TYPE invoice_status    AS ENUM ('draft','issued','partially_paid','paid','overdue','void');
CREATE TYPE payable_kind      AS ENUM ('salary','tax','vendor_bill','rent','utility','other');
CREATE TYPE payable_status    AS ENUM ('due','partial','paid','cancelled');
CREATE TYPE stock_reason      AS ENUM ('opening','purchase','pos_sale','online_sale','return','adjustment','damage');
CREATE TYPE leave_status      AS ENUM ('pending','approved','rejected','cancelled');
CREATE TYPE po_status         AS ENUM ('draft','ordered','received','cancelled');
CREATE TYPE notif_channel     AS ENUM ('email','sms','whatsapp','push');
CREATE TYPE notif_status      AS ENUM ('queued','sent','failed','cancelled');
CREATE TYPE payroll_status    AS ENUM ('draft','approved','paid');

-- ---------------------------------------------------------------------
-- 2. SESSION CONTEXT (read by RLS)  -  backend sets these per transaction
-- ---------------------------------------------------------------------
CREATE FUNCTION ctx_user()   RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id',  true), '')::uuid $$;
CREATE FUNCTION ctx_club()   RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.club_id',  true), '')::uuid $$;
CREATE FUNCTION ctx_member() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.member_id',true), '')::uuid $$;
CREATE FUNCTION ctx_role()   RETURNS text LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('app.role', true), ''), 'anonymous') $$;

CREATE FUNCTION like_escape(p text) RETURNS text LANGUAGE sql IMMUTABLE AS
$$ SELECT replace(replace(replace(p, '\', '\\'), '%', '\%'), '_', '\_') $$;

-- ---------------------------------------------------------------------
-- 3. PLATFORM / TENANCY
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  phone text,
  full_name text NOT NULL,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- password hashes live apart: club_app has NO access (auth service uses owner role)
CREATE TABLE user_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE platform_admins (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE);

CREATE TABLE saas_plans (            -- what the PLATFORM sells to clubs
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  monthly_price money_amt NOT NULL DEFAULT 0,
  max_courts int, max_staff int, max_members int,      -- NULL = unlimited
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug citext NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL,
  legal_name text,
  tagline text,
  description text,
  email text, phone text, website_url text,
  address_line1 text, address_line2 text, city text, state text, postal_code text,
  country char(2) NOT NULL DEFAULT 'IN',
  latitude numeric(9,6), longitude numeric(9,6),
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  currency char(3) NOT NULL DEFAULT 'INR',
  gstin text, pan text,
  logo_url text, cover_url text, brand_color text,
  status club_status NOT NULL DEFAULT 'active',
  is_public boolean NOT NULL DEFAULT true,
  owner_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE club_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  saas_plan_id uuid NOT NULL REFERENCES saas_plans(id),
  status sub_status NOT NULL DEFAULT 'trialing',
  trial_ends_at timestamptz,
  current_period_start date, current_period_end date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE club_modules (          -- each club toggles Courts/Shop/Bar/CRM/HR/Website
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  module module_key NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, module)
);

CREATE TABLE club_settings (         -- all booking rules are per-club, nothing hardcoded
  club_id uuid PRIMARY KEY DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  slot_length_minutes int NOT NULL DEFAULT 60 CHECK (slot_length_minutes > 0),
  slot_interval_minutes int NOT NULL DEFAULT 30 CHECK (slot_interval_minutes > 0),
  max_bookings_per_member_per_day int CHECK (max_bookings_per_member_per_day > 0) DEFAULT 2,  -- NULL = unlimited
  advance_booking_days int NOT NULL DEFAULT 14,
  min_notice_minutes int NOT NULL DEFAULT 0,
  cancellation_cutoff_hours int NOT NULL DEFAULT 2,
  cancel_refund_mode text NOT NULL DEFAULT 'credit' CHECK (cancel_refund_mode IN ('refund','credit','none')),
  junior_max_age int NOT NULL DEFAULT 17,
  require_guardian_for_junior boolean NOT NULL DEFAULT true,
  prices_include_tax boolean NOT NULL DEFAULT true,
  member_code_prefix text NOT NULL DEFAULT 'M-',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE club_staff (            -- login users who work at a club, one role each
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role club_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

CREATE TABLE club_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  image_url text NOT NULL, caption text, sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id)
);

CREATE TABLE tax_rates (             -- GST slabs etc., defined by the club
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  name text NOT NULL,
  rate_percent pct NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, name)
);
CREATE UNIQUE INDEX uq_tax_rates_default ON tax_rates (club_id) WHERE is_default;

CREATE TABLE document_sequences (    -- gapless-ish numbering per club per document type
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  prefix text NOT NULL DEFAULT '',
  padding int NOT NULL DEFAULT 5,
  last_number bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (club_id, doc_type)
);

CREATE TABLE audit_log (             -- no FK on club_id so history survives club deletion
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  club_id uuid, user_id uuid,
  table_name text NOT NULL, record_id uuid,
  action text NOT NULL,
  old_data jsonb, new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  channel notif_channel NOT NULL,
  subject text, body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, template_key, channel)
);

CREATE TABLE reminder_rules (        -- "nobody should have to remember"
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'membership_expiry' CHECK (kind IN ('membership_expiry')),
  days_before int NOT NULL CHECK (days_before >= 0),
  channel notif_channel NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, kind, days_before, channel)
);

-- ---------------------------------------------------------------------
-- 4. SPORTS, COURTS, PRICING   (club sets all of this manually)
-- ---------------------------------------------------------------------
CREATE TABLE sports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  name citext NOT NULL, description text, icon text,
  sort_order int NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, name)
);

CREATE TABLE courts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  sport_id uuid NOT NULL,
  name citext NOT NULL, surface text, description text, image_url text,
  is_indoor boolean NOT NULL DEFAULT false,
  has_lighting boolean NOT NULL DEFAULT false,
  max_players int NOT NULL DEFAULT 4 CHECK (max_players > 0),
  sort_order int NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, name),
  FOREIGN KEY (club_id, sport_id) REFERENCES sports (club_id, id)
);

CREATE TABLE court_operating_hours (   -- no row for a weekday = court closed that day
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  court_id uuid NOT NULL,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),   -- 0 = Sunday
  opens_at time NOT NULL, closes_at time NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (is_closed OR closes_at > opens_at),
  UNIQUE (club_id, id), UNIQUE (court_id, weekday),
  FOREIGN KEY (club_id, court_id) REFERENCES courts (club_id, id) ON DELETE CASCADE
);

CREATE TABLE plans (                  -- membership tiers (Gold/Silver/Junior...) named by the club
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  name citext NOT NULL, code text, description text, color text,
  tier_rank smallint NOT NULL DEFAULT 0,            -- higher = better; used when several memberships overlap
  duration_days int NOT NULL CHECK (duration_days > 0),
  price money_amt NOT NULL DEFAULT 0,
  joining_fee money_amt NOT NULL DEFAULT 0,
  tax_rate_id uuid,
  min_age int, max_age int,                         -- Junior = max_age 17
  court_free boolean NOT NULL DEFAULT false,        -- e.g. Gold plays free
  court_discount_percent pct NOT NULL DEFAULT 0,    -- used when no plan-specific court rate exists
  shop_discount_percent  pct NOT NULL DEFAULT 0,
  bar_discount_percent   pct NOT NULL DEFAULT 0,
  max_bookings_per_day int CHECK (max_bookings_per_day > 0),   -- overrides club default
  advance_booking_days int,
  allows_social_play boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_age IS NULL OR min_age IS NULL OR max_age >= min_age),
  UNIQUE (club_id, id), UNIQUE (club_id, name),
  FOREIGN KEY (club_id, tax_rate_id) REFERENCES tax_rates (club_id, id)
);

CREATE TABLE plan_benefits (          -- marketing bullets shown on the public pricing page
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL, label text NOT NULL, sort_order int NOT NULL DEFAULT 0,
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, plan_id) REFERENCES plans (club_id, id) ON DELETE CASCADE
);

CREATE TABLE court_rates (            -- most specific matching rule wins (see resolve_court_price)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  sport_id uuid, court_id uuid,          -- both NULL = every court
  plan_id uuid,                          -- NULL = walk-in / non-member / default rate
  weekday smallint CHECK (weekday BETWEEN 0 AND 6),
  time_from time, time_to time,          -- peak / off-peak windows
  valid_from date, valid_to date,
  price money_amt NOT NULL,              -- pre-tax, per booking slot
  priority smallint NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (time_to IS NULL OR time_from IS NULL OR time_to > time_from),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, sport_id) REFERENCES sports (club_id, id),
  FOREIGN KEY (club_id, court_id) REFERENCES courts (club_id, id),
  FOREIGN KEY (club_id, plan_id)  REFERENCES plans  (club_id, id)
);

-- ---------------------------------------------------------------------
-- 5. MEMBERS & MEMBERSHIPS
-- ---------------------------------------------------------------------
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),                 -- set when the member has an app login
  member_code text NOT NULL,                         -- auto-numbered
  first_name text NOT NULL, last_name text,
  full_name text GENERATED ALWAYS AS (btrim(first_name || ' ' || coalesce(last_name, ''))) STORED,
  phone text,
  phone_digits text GENERATED ALWAYS AS (regexp_replace(coalesce(phone, ''), '\D', '', 'g')) STORED,
  email text,
  dob date,
  gender text CHECK (gender IN ('male','female','other','undisclosed')),
  photo_url text,
  address_line text, city text, postal_code text,
  emergency_contact_name text, emergency_contact_phone text, emergency_contact_relation text,
  qr_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status member_status NOT NULL DEFAULT 'active',
  joined_on date NOT NULL DEFAULT current_date,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, member_code)
);
CREATE UNIQUE INDEX uq_members_user ON members (club_id, user_id) WHERE user_id IS NOT NULL;

CREATE TABLE guardians (              -- for juniors
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  full_name text NOT NULL, relation text, phone text, email text,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, member_id) REFERENCES members (club_id, id) ON DELETE CASCADE
);

CREATE TABLE memberships (            -- a member holding a plan for a date range
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  member_id uuid NOT NULL, plan_id uuid NOT NULL,
  start_date date NOT NULL, end_date date NOT NULL,
  status membership_status NOT NULL DEFAULT 'active',
  price_paid money_amt NOT NULL DEFAULT 0,
  auto_renew boolean NOT NULL DEFAULT false,
  renewed_from_id uuid,
  cancelled_at timestamptz, cancel_reason text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, member_id) REFERENCES members (club_id, id),
  FOREIGN KEY (club_id, plan_id)   REFERENCES plans   (club_id, id),
  FOREIGN KEY (club_id, renewed_from_id) REFERENCES memberships (club_id, id),
  EXCLUDE USING gist (member_id WITH =, daterange(start_date, end_date, '[]') WITH &&)
    WHERE (status IN ('scheduled','active'))        -- no overlapping live memberships
);

CREATE TABLE check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  member_id uuid, guest_name text,
  booking_id uuid,                                   -- FK added after bookings
  method text NOT NULL DEFAULT 'manual' CHECK (method IN ('qr','manual')),
  checked_in_at timestamptz NOT NULL DEFAULT now(),
  checked_in_by uuid REFERENCES users(id),
  CHECK (member_id IS NOT NULL OR guest_name IS NOT NULL),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, member_id) REFERENCES members (club_id, id)
);

CREATE TABLE wallet_transactions (    -- credits from cancellations / top-ups (signed amounts)
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  member_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount <> 0),
  reason text NOT NULL CHECK (reason IN ('cancellation_credit','topup','spend','adjustment','refund')),
  booking_id uuid,                                   -- FK added after bookings
  note text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, member_id) REFERENCES members (club_id, id)
);

-- ---------------------------------------------------------------------
-- 6. CRM  (leads never vanish)
-- ---------------------------------------------------------------------
CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  full_name text NOT NULL, phone text,
  phone_digits text GENERATED ALWAYS AS (regexp_replace(coalesce(phone, ''), '\D', '', 'g')) STORED,
  email citext,
  source lead_source NOT NULL DEFAULT 'website',
  status lead_status NOT NULL DEFAULT 'new',
  interested_sport_id uuid, interested_plan_id uuid,
  message text,
  preferred_trial_at timestamptz,
  assigned_to uuid REFERENCES users(id),
  next_follow_up_at timestamptz, last_contacted_at timestamptz,
  converted_member_id uuid,
  lost_reason text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (phone IS NOT NULL OR email IS NOT NULL),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, interested_sport_id) REFERENCES sports  (club_id, id),
  FOREIGN KEY (club_id, interested_plan_id)  REFERENCES plans   (club_id, id),
  FOREIGN KEY (club_id, converted_member_id) REFERENCES members (club_id, id)
);

CREATE TABLE lead_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  activity_type text NOT NULL CHECK (activity_type IN ('note','call','email','whatsapp','meeting','status_change')),
  note text, from_status lead_status, to_status lead_status,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, lead_id) REFERENCES leads (club_id, id) ON DELETE CASCADE
);

CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  quote_no text NOT NULL,
  lead_id uuid NOT NULL, plan_id uuid,
  status quote_status NOT NULL DEFAULT 'draft',
  valid_until date, notes text, sent_at timestamptz,
  subtotal money_amt NOT NULL DEFAULT 0, discount_total money_amt NOT NULL DEFAULT 0,
  tax_total money_amt NOT NULL DEFAULT 0, total money_amt NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, quote_no),
  FOREIGN KEY (club_id, lead_id) REFERENCES leads (club_id, id),
  FOREIGN KEY (club_id, plan_id) REFERENCES plans (club_id, id)
);

CREATE TABLE quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL, description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price money_amt NOT NULL,
  discount_percent pct NOT NULL DEFAULT 0, tax_percent pct NOT NULL DEFAULT 0,
  line_subtotal numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  discount_amount numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price * discount_percent / 100, 2)) STORED,
  tax_amount numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price * (100 - discount_percent) / 100 * tax_percent / 100, 2)) STORED,
  line_total numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2) - round(quantity * unit_price * discount_percent / 100, 2) + round(quantity * unit_price * (100 - discount_percent) / 100 * tax_percent / 100, 2)) STORED,
  FOREIGN KEY (club_id, quote_id) REFERENCES quotes (club_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 7. COURT RESERVATIONS, BOOKINGS, SOCIAL PLAY
--    court_reservations is the single place that owns "who holds which
--    court when"; bookings / social sessions both hang off it, so a social
--    session can never overlap a booking either.
-- ---------------------------------------------------------------------
CREATE TABLE court_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  court_id uuid NOT NULL,
  start_at timestamptz NOT NULL, end_at timestamptz NOT NULL,
  kind reservation_kind NOT NULL DEFAULT 'booking',
  status reservation_status NOT NULL DEFAULT 'active',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_at > start_at),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, court_id) REFERENCES courts (club_id, id),
  -- THE hard rule: overlapping (even partially) active reservations on one court are impossible
  CONSTRAINT no_court_overlap EXCLUDE USING gist
    (court_id WITH =, tstzrange(start_at, end_at, '[)') WITH &&) WHERE (status = 'active')
);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL UNIQUE,
  member_id uuid, guest_name text, guest_phone text,     -- guests = walk-ins / phone callers / trials
  plan_id uuid,                                          -- plan used for pricing (snapshot)
  lead_id uuid, is_trial boolean NOT NULL DEFAULT false,
  channel booking_channel NOT NULL DEFAULT 'counter',
  status booking_status NOT NULL DEFAULT 'confirmed',
  base_price money_amt NOT NULL DEFAULT 0,
  discount_amount money_amt NOT NULL DEFAULT 0,
  tax_percent pct NOT NULL DEFAULT 0,
  tax_amount money_amt NOT NULL DEFAULT 0,
  total_amount money_amt NOT NULL DEFAULT 0,
  notes text,
  created_by uuid REFERENCES users(id),
  cancelled_at timestamptz, cancelled_by uuid REFERENCES users(id), cancel_reason text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (member_id IS NOT NULL OR guest_name IS NOT NULL),
  CHECK (total_amount = base_price - discount_amount + tax_amount),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, reservation_id) REFERENCES court_reservations (club_id, id),
  FOREIGN KEY (club_id, member_id) REFERENCES members (club_id, id),
  FOREIGN KEY (club_id, plan_id)   REFERENCES plans   (club_id, id),
  FOREIGN KEY (club_id, lead_id)   REFERENCES leads   (club_id, id)
);
ALTER TABLE check_ins          ADD FOREIGN KEY (club_id, booking_id) REFERENCES bookings (club_id, id);
ALTER TABLE wallet_transactions ADD FOREIGN KEY (club_id, booking_id) REFERENCES bookings (club_id, id);

CREATE TABLE social_session_templates (   -- e.g. "Friday night social play" every week
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  court_id uuid NOT NULL, title text NOT NULL, description text,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time time NOT NULL, duration_minutes int NOT NULL CHECK (duration_minutes > 0),
  max_players int NOT NULL CHECK (max_players > 0),
  fee_per_player money_amt NOT NULL DEFAULT 0,
  member_fee_per_player money_amt,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, court_id) REFERENCES courts (club_id, id)
);

CREATE TABLE social_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL UNIQUE, template_id uuid,
  title text NOT NULL, description text,
  max_players int NOT NULL CHECK (max_players > 0),
  fee_per_player money_amt NOT NULL DEFAULT 0,
  member_fee_per_player money_amt,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','cancelled','completed')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, reservation_id) REFERENCES court_reservations (club_id, id),
  FOREIGN KEY (club_id, template_id)    REFERENCES social_session_templates (club_id, id)
);

CREATE TABLE social_session_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  member_id uuid, guest_name text, guest_phone text,
  status text NOT NULL DEFAULT 'joined' CHECK (status IN ('joined','waitlist','attended','cancelled')),
  fee_charged money_amt NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (member_id IS NOT NULL OR guest_name IS NOT NULL),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, session_id) REFERENCES social_sessions (club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, member_id)  REFERENCES members (club_id, id)
);
CREATE UNIQUE INDEX uq_social_player_once ON social_session_players (session_id, member_id)
  WHERE member_id IS NOT NULL AND status IN ('joined','waitlist','attended');

-- ---------------------------------------------------------------------
-- 8. HR
-- ---------------------------------------------------------------------
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  employee_code text NOT NULL,
  full_name text NOT NULL, phone text, email text,
  designation text, department text,
  hired_on date, left_on date,
  base_salary money_amt NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, employee_code)
);

CREATE TABLE shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
  station text,                                       -- front desk / bar / shop / kitchen
  clock_in_at timestamptz, clock_out_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, employee_id) REFERENCES employees (club_id, id),
  EXCLUDE USING gist (employee_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
);

CREATE TABLE leave_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  name text NOT NULL, annual_quota_days numeric(5,1), is_paid boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, name)
);

CREATE TABLE leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL, leave_type_id uuid NOT NULL,
  from_date date NOT NULL, to_date date NOT NULL,
  days numeric(4,1) NOT NULL CHECK (days > 0),
  reason text,
  status leave_status NOT NULL DEFAULT 'pending',
  decided_by uuid REFERENCES users(id), decided_at timestamptz, decision_note text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (to_date >= from_date),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, employee_id)   REFERENCES employees   (club_id, id),
  FOREIGN KEY (club_id, leave_type_id) REFERENCES leave_types (club_id, id)
);

CREATE TABLE payroll_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  period_month date NOT NULL CHECK (extract(day FROM period_month) = 1),
  status payroll_status NOT NULL DEFAULT 'draft',
  approved_by uuid REFERENCES users(id), approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, period_month)
);

CREATE TABLE payroll_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  run_id uuid NOT NULL, employee_id uuid NOT NULL,
  base_salary money_amt NOT NULL, allowances money_amt NOT NULL DEFAULT 0,
  deductions money_amt NOT NULL DEFAULT 0, unpaid_leave_days numeric(4,1) NOT NULL DEFAULT 0,
  net_pay numeric(12,2) GENERATED ALWAYS AS (base_salary + allowances - deductions) STORED,
  paid_at timestamptz, payment_method payment_method,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (run_id, employee_id),
  FOREIGN KEY (club_id, run_id)      REFERENCES payroll_runs (club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, employee_id) REFERENCES employees   (club_id, id)
);

-- ---------------------------------------------------------------------
-- 9. SHOP  (one stock, two channels: POS + online)
-- ---------------------------------------------------------------------
CREATE TABLE brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  name citext NOT NULL, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, name)
);

CREATE TABLE product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  parent_id uuid, name citext NOT NULL, sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, parent_id, name),
  FOREIGN KEY (club_id, parent_id) REFERENCES product_categories (club_id, id)
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  category_id uuid, brand_id uuid, tax_rate_id uuid,
  name text NOT NULL, description text, image_url text,
  is_online boolean NOT NULL DEFAULT true,           -- visible in the online shop
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, category_id) REFERENCES product_categories (club_id, id),
  FOREIGN KEY (club_id, brand_id)    REFERENCES brands (club_id, id),
  FOREIGN KEY (club_id, tax_rate_id) REFERENCES tax_rates (club_id, id)
);

CREATE TABLE product_variants (       -- the sellable unit (size/colour); stock lives here
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  sku text NOT NULL, barcode text, size text, color text,
  price money_amt NOT NULL,                          -- pre-tax selling price
  mrp money_amt, cost_price money_amt,
  track_stock boolean NOT NULL DEFAULT true,
  stock_qty int NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),   -- DB refuses overselling
  reorder_level int NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, sku),
  FOREIGN KEY (club_id, product_id) REFERENCES products (club_id, id) ON DELETE CASCADE
);

CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  name text NOT NULL, contact_person text, phone text, email text, gstin text, address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id)
);

CREATE TABLE purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  po_no text NOT NULL, supplier_id uuid NOT NULL,
  status po_status NOT NULL DEFAULT 'draft',
  ordered_on date, expected_on date, notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, po_no),
  FOREIGN KEY (club_id, supplier_id) REFERENCES suppliers (club_id, id)
);

CREATE TABLE purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL, variant_id uuid NOT NULL,
  quantity_ordered int NOT NULL CHECK (quantity_ordered > 0),
  quantity_received int NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_cost money_amt NOT NULL,
  UNIQUE (club_id, id), UNIQUE (purchase_order_id, variant_id),
  FOREIGN KEY (club_id, purchase_order_id) REFERENCES purchase_orders (club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, variant_id) REFERENCES product_variants (club_id, id)
);

CREATE TABLE shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  order_no text NOT NULL,
  member_id uuid, guest_name text, guest_phone text,
  channel sales_channel NOT NULL DEFAULT 'pos',
  fulfillment fulfillment_type NOT NULL DEFAULT 'counter',
  status shop_order_status NOT NULL DEFAULT 'pending',
  delivery_address text,
  delivery_fee money_amt NOT NULL DEFAULT 0,
  discount_percent pct NOT NULL,                     -- auto-filled from member's plan
  subtotal money_amt NOT NULL DEFAULT 0, discount_total money_amt NOT NULL DEFAULT 0,
  tax_total money_amt NOT NULL DEFAULT 0, total money_amt NOT NULL DEFAULT 0,
  placed_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fulfillment <> 'delivery' OR delivery_address IS NOT NULL),
  UNIQUE (club_id, id), UNIQUE (club_id, order_no),
  FOREIGN KEY (club_id, member_id) REFERENCES members (club_id, id)
);

CREATE TABLE shop_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  order_id uuid NOT NULL, variant_id uuid NOT NULL,
  item_name text NOT NULL,                           -- snapshots (auto-filled from the variant)
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price money_amt NOT NULL,
  discount_percent pct NOT NULL,
  tax_percent pct NOT NULL,
  line_subtotal numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  discount_amount numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price * discount_percent / 100, 2)) STORED,
  tax_amount numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price * (100 - discount_percent) / 100 * tax_percent / 100, 2)) STORED,
  line_total numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2) - round(quantity * unit_price * discount_percent / 100, 2) + round(quantity * unit_price * (100 - discount_percent) / 100 * tax_percent / 100, 2)) STORED,
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, order_id)   REFERENCES shop_orders (club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, variant_id) REFERENCES product_variants (club_id, id)
);

CREATE TABLE stock_movements (        -- append-only ledger; trigger keeps product_variants.stock_qty in sync
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL,
  qty_change int NOT NULL CHECK (qty_change <> 0),
  reason stock_reason NOT NULL,
  shop_order_item_id uuid, purchase_order_item_id uuid,
  note text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, variant_id) REFERENCES product_variants (club_id, id),
  FOREIGN KEY (club_id, shop_order_item_id) REFERENCES shop_order_items (club_id, id),
  FOREIGN KEY (club_id, purchase_order_item_id) REFERENCES purchase_order_items (club_id, id)
);

-- ---------------------------------------------------------------------
-- 10. BAR & CAFETERIA
-- ---------------------------------------------------------------------
CREATE TABLE menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  name citext NOT NULL, station station_type NOT NULL DEFAULT 'kitchen',
  sort_order int NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, name)
);

CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  category_id uuid NOT NULL, tax_rate_id uuid,
  name text NOT NULL, description text, image_url text,
  price money_amt NOT NULL,                          -- pre-tax
  station station_type NOT NULL DEFAULT 'kitchen',
  is_veg boolean, prep_minutes int,
  sort_order int NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,        -- "86'd" toggle during service
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, name),
  FOREIGN KEY (club_id, category_id) REFERENCES menu_categories (club_id, id),
  FOREIGN KEY (club_id, tax_rate_id) REFERENCES tax_rates (club_id, id)
);

CREATE TABLE dining_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  name citext NOT NULL, zone text, capacity int NOT NULL DEFAULT 4 CHECK (capacity > 0),
  status table_status NOT NULL DEFAULT 'available',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, name)
);

CREATE TABLE tabs (                   -- charges accumulate, settled once
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  member_id uuid, guest_name text,
  status tab_status NOT NULL DEFAULT 'open',
  opened_at timestamptz NOT NULL DEFAULT now(), settled_at timestamptz,
  opened_by uuid REFERENCES users(id), settled_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (member_id IS NOT NULL OR guest_name IS NOT NULL),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, member_id) REFERENCES members (club_id, id)
);
CREATE UNIQUE INDEX uq_one_open_tab_per_member ON tabs (club_id, member_id) WHERE status = 'open' AND member_id IS NOT NULL;

CREATE TABLE bar_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  order_no text NOT NULL,
  table_id uuid, tab_id uuid, member_id uuid, guest_name text,
  status bar_order_status NOT NULL DEFAULT 'open',
  discount_percent pct NOT NULL,                     -- auto-filled from member's plan
  subtotal money_amt NOT NULL DEFAULT 0, discount_total money_amt NOT NULL DEFAULT 0,
  tax_total money_amt NOT NULL DEFAULT 0, total money_amt NOT NULL DEFAULT 0,
  shift_id uuid,
  opened_by uuid REFERENCES users(id),               -- who took the order
  opened_at timestamptz NOT NULL DEFAULT now(), closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, order_no),
  FOREIGN KEY (club_id, table_id)  REFERENCES dining_tables (club_id, id),
  FOREIGN KEY (club_id, tab_id)    REFERENCES tabs (club_id, id),
  FOREIGN KEY (club_id, member_id) REFERENCES members (club_id, id),
  FOREIGN KEY (club_id, shift_id)  REFERENCES shifts (club_id, id)
);

CREATE TABLE bar_order_items (        -- also drives the Kitchen Display
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  order_id uuid NOT NULL, menu_item_id uuid NOT NULL,
  item_name text NOT NULL,
  station station_type NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price money_amt NOT NULL,
  discount_percent pct NOT NULL,
  tax_percent pct NOT NULL,
  notes text,
  kds_status kds_status NOT NULL DEFAULT 'new',
  sent_at timestamptz, ready_at timestamptz, served_at timestamptz,
  added_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  line_subtotal numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  discount_amount numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price * discount_percent / 100, 2)) STORED,
  tax_amount numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price * (100 - discount_percent) / 100 * tax_percent / 100, 2)) STORED,
  line_total numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2) - round(quantity * unit_price * discount_percent / 100, 2) + round(quantity * unit_price * (100 - discount_percent) / 100 * tax_percent / 100, 2)) STORED,
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, order_id)     REFERENCES bar_orders (club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, menu_item_id) REFERENCES menu_items (club_id, id)
);

-- ---------------------------------------------------------------------
-- 11. FINANCE  (one ledger: payments)
-- ---------------------------------------------------------------------
CREATE TABLE clients (                -- corporate / business accounts
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  name text NOT NULL, contact_person text, email text, phone text, gstin text, address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id)
);

CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  invoice_no text NOT NULL,
  member_id uuid, client_id uuid, membership_id uuid,
  status invoice_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT current_date, due_date date,
  notes text,
  subtotal money_amt NOT NULL DEFAULT 0, discount_total money_amt NOT NULL DEFAULT 0,
  tax_total money_amt NOT NULL DEFAULT 0, total money_amt NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(member_id, client_id) = 1),
  UNIQUE (club_id, id), UNIQUE (club_id, invoice_no),
  FOREIGN KEY (club_id, member_id)     REFERENCES members (club_id, id),
  FOREIGN KEY (club_id, client_id)     REFERENCES clients (club_id, id),
  FOREIGN KEY (club_id, membership_id) REFERENCES memberships (club_id, id)
);

CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL, description text NOT NULL, hsn_sac text,
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price money_amt NOT NULL,
  discount_percent pct NOT NULL DEFAULT 0, tax_percent pct NOT NULL DEFAULT 0,
  line_subtotal numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  discount_amount numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price * discount_percent / 100, 2)) STORED,
  tax_amount numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price * (100 - discount_percent) / 100 * tax_percent / 100, 2)) STORED,
  line_total numeric(12,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2) - round(quantity * unit_price * discount_percent / 100, 2) + round(quantity * unit_price * (100 - discount_percent) / 100 * tax_percent / 100, 2)) STORED,
  FOREIGN KEY (club_id, invoice_id) REFERENCES invoices (club_id, id) ON DELETE CASCADE
);

CREATE TABLE payments (               -- every rupee from every module lands here
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  payment_no text NOT NULL,
  kind payment_kind NOT NULL DEFAULT 'payment',       -- refunds are rows, never edits
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'completed',
  amount money_amt NOT NULL CHECK (amount > 0),
  member_id uuid, client_id uuid,
  -- exactly ONE source (real FKs instead of a polymorphic id)
  booking_id uuid, social_player_id uuid, shop_order_id uuid, bar_order_id uuid,
  tab_id uuid, membership_id uuid, invoice_id uuid,
  revenue_source text GENERATED ALWAYS AS (
    CASE WHEN booking_id IS NOT NULL OR social_player_id IS NOT NULL THEN 'courts'
         WHEN shop_order_id IS NOT NULL THEN 'shop'
         WHEN bar_order_id IS NOT NULL OR tab_id IS NOT NULL THEN 'bar'
         WHEN membership_id IS NOT NULL THEN 'membership'
         WHEN invoice_id IS NOT NULL THEN 'invoice' END) STORED,
  refund_of_payment_id uuid,
  reference text,                                     -- UPI txn id, card last4, gateway id
  shift_id uuid,
  received_by uuid REFERENCES users(id),
  received_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(booking_id, social_player_id, shop_order_id, bar_order_id, tab_id, membership_id, invoice_id) = 1),
  CHECK (kind = 'refund' OR refund_of_payment_id IS NULL),
  UNIQUE (club_id, id), UNIQUE (club_id, payment_no),
  FOREIGN KEY (club_id, member_id)        REFERENCES members (club_id, id),
  FOREIGN KEY (club_id, client_id)        REFERENCES clients (club_id, id),
  FOREIGN KEY (club_id, booking_id)       REFERENCES bookings (club_id, id),
  FOREIGN KEY (club_id, social_player_id) REFERENCES social_session_players (club_id, id),
  FOREIGN KEY (club_id, shop_order_id)    REFERENCES shop_orders (club_id, id),
  FOREIGN KEY (club_id, bar_order_id)     REFERENCES bar_orders (club_id, id),
  FOREIGN KEY (club_id, tab_id)           REFERENCES tabs (club_id, id),
  FOREIGN KEY (club_id, membership_id)    REFERENCES memberships (club_id, id),
  FOREIGN KEY (club_id, invoice_id)       REFERENCES invoices (club_id, id),
  FOREIGN KEY (club_id, refund_of_payment_id) REFERENCES payments (club_id, id),
  FOREIGN KEY (club_id, shift_id)         REFERENCES shifts (club_id, id)
);

CREATE TABLE payables (               -- "what we owe": salaries, taxes, vendor bills
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  kind payable_kind NOT NULL, description text NOT NULL,
  supplier_id uuid, purchase_order_id uuid, payroll_entry_id uuid,
  bill_no text, bill_date date,
  amount money_amt NOT NULL, paid_amount money_amt NOT NULL DEFAULT 0,
  due_date date,
  status payable_status NOT NULL DEFAULT 'due',
  paid_at timestamptz, payment_method payment_method, reference text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (paid_amount <= amount),
  UNIQUE (club_id, id),
  FOREIGN KEY (club_id, supplier_id)       REFERENCES suppliers (club_id, id),
  FOREIGN KEY (club_id, purchase_order_id) REFERENCES purchase_orders (club_id, id),
  FOREIGN KEY (club_id, payroll_entry_id)  REFERENCES payroll_entries (club_id, id)
);

CREATE TABLE tax_filings (            -- GST returns etc.
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  tax_type text NOT NULL, period_start date NOT NULL, period_end date NOT NULL,
  taxable_value money_amt NOT NULL DEFAULT 0, tax_collected money_amt NOT NULL DEFAULT 0,
  input_tax_credit money_amt NOT NULL DEFAULT 0, tax_payable money_amt NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','filed','paid')),
  filed_on date, reference text, payable_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (period_end >= period_start),
  UNIQUE (club_id, id), UNIQUE (club_id, tax_type, period_start, period_end),
  FOREIGN KEY (club_id, payable_id) REFERENCES payables (club_id, id)
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL DEFAULT ctx_club() REFERENCES clubs(id) ON DELETE CASCADE,
  channel notif_channel NOT NULL DEFAULT 'push',
  recipient_user_id uuid REFERENCES users(id),
  recipient_member_id uuid, recipient_lead_id uuid,
  recipient_role club_role,                           -- e.g. low-stock alert to every shop_staff
  to_address text, subject text, body text NOT NULL,
  status notif_status NOT NULL DEFAULT 'queued',
  scheduled_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz, error text,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, id), UNIQUE (club_id, dedupe_key),
  FOREIGN KEY (club_id, recipient_member_id) REFERENCES members (club_id, id) ON DELETE CASCADE,
  FOREIGN KEY (club_id, recipient_lead_id)   REFERENCES leads (club_id, id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 12. INDEXES  (FK lookups, hot filters, dashboards)
-- ---------------------------------------------------------------------
CREATE INDEX ix_club_staff_user        ON club_staff (user_id) WHERE is_active;
CREATE INDEX ix_clubs_public           ON clubs (status, is_public);
CREATE INDEX ix_courts_sport           ON courts (club_id, sport_id) WHERE is_active;
CREATE INDEX ix_court_rates_lookup     ON court_rates (club_id, plan_id, court_id, sport_id) WHERE is_active;
CREATE INDEX ix_plans_active           ON plans (club_id, sort_order) WHERE is_active;
CREATE INDEX ix_plan_benefits_plan     ON plan_benefits (plan_id);
CREATE INDEX ix_members_status         ON members (club_id, status);
CREATE INDEX ix_members_user           ON members (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX ix_memberships_member     ON memberships (club_id, member_id, end_date DESC);
CREATE INDEX ix_memberships_expiry     ON memberships (club_id, end_date) WHERE status = 'active';
CREATE INDEX ix_memberships_plan       ON memberships (plan_id);
CREATE INDEX ix_guardians_member       ON guardians (member_id);
CREATE INDEX ix_checkins_member        ON check_ins (club_id, member_id, checked_in_at DESC);
CREATE INDEX ix_wallet_member          ON wallet_transactions (member_id, created_at DESC);
CREATE INDEX ix_res_club_time          ON court_reservations (club_id, start_at) WHERE status = 'active';
CREATE INDEX ix_bookings_member        ON bookings (club_id, member_id, created_at DESC);
CREATE INDEX ix_bookings_status        ON bookings (club_id, status);
CREATE INDEX ix_bookings_lead          ON bookings (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX ix_social_sessions_tmpl   ON social_sessions (template_id) WHERE template_id IS NOT NULL;
CREATE INDEX ix_social_players_session ON social_session_players (session_id, status);
CREATE INDEX ix_social_players_member  ON social_session_players (member_id) WHERE member_id IS NOT NULL;
CREATE INDEX ix_leads_pipeline         ON leads (club_id, status, created_at DESC);
CREATE INDEX ix_leads_followup         ON leads (club_id, next_follow_up_at) WHERE status IN ('new','contacted','quote_sent');
CREATE INDEX ix_leads_assignee         ON leads (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX ix_lead_activities_lead   ON lead_activities (lead_id, created_at DESC);
CREATE INDEX ix_quotes_lead            ON quotes (lead_id);
CREATE INDEX ix_quote_items_quote      ON quote_items (quote_id);
CREATE INDEX ix_employees_active       ON employees (club_id) WHERE is_active;
CREATE INDEX ix_shifts_time            ON shifts (club_id, starts_at);
CREATE INDEX ix_leave_req_status       ON leave_requests (club_id, status, from_date);
CREATE INDEX ix_leave_req_employee     ON leave_requests (employee_id);
CREATE INDEX ix_payroll_entries_emp    ON payroll_entries (employee_id);
CREATE INDEX ix_products_cat           ON products (club_id, category_id) WHERE is_active;
CREATE INDEX ix_variants_product       ON product_variants (product_id);
CREATE INDEX ix_variants_barcode       ON product_variants (club_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX ix_variants_low_stock     ON product_variants (club_id) WHERE track_stock AND is_active AND stock_qty <= reorder_level;
CREATE INDEX ix_stock_mov_variant      ON stock_movements (variant_id, created_at DESC);
CREATE INDEX ix_po_status              ON purchase_orders (club_id, status);
CREATE INDEX ix_poi_variant            ON purchase_order_items (variant_id);
CREATE INDEX ix_shop_orders_time       ON shop_orders (club_id, placed_at DESC);
CREATE INDEX ix_shop_orders_member     ON shop_orders (club_id, member_id);
CREATE INDEX ix_shop_orders_queue      ON shop_orders (club_id, status) WHERE status IN ('pending','confirmed','ready');
CREATE INDEX ix_shop_items_order       ON shop_order_items (order_id);
CREATE INDEX ix_shop_items_variant     ON shop_order_items (variant_id);
CREATE INDEX ix_menu_items_cat         ON menu_items (club_id, category_id) WHERE is_active;
CREATE INDEX ix_tabs_open              ON tabs (club_id, opened_at DESC) WHERE status = 'open';
CREATE INDEX ix_bar_orders_time        ON bar_orders (club_id, opened_at DESC);
CREATE INDEX ix_bar_orders_active      ON bar_orders (club_id, status) WHERE status IN ('open','sent','served','billed');
CREATE INDEX ix_bar_orders_table       ON bar_orders (table_id) WHERE table_id IS NOT NULL;
CREATE INDEX ix_bar_orders_tab         ON bar_orders (tab_id) WHERE tab_id IS NOT NULL;
CREATE INDEX ix_bar_items_order        ON bar_order_items (order_id);
CREATE INDEX ix_bar_items_kds          ON bar_order_items (club_id, station, created_at) WHERE kds_status IN ('new','preparing','ready');
CREATE INDEX ix_invoices_status        ON invoices (club_id, status, due_date);
CREATE INDEX ix_invoices_member        ON invoices (member_id) WHERE member_id IS NOT NULL;
CREATE INDEX ix_invoices_client        ON invoices (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX ix_invoice_items_inv      ON invoice_items (invoice_id);
CREATE INDEX ix_payments_time          ON payments (club_id, received_at DESC);
CREATE INDEX ix_payments_revenue       ON payments (club_id, revenue_source, received_at) WHERE status = 'completed';
CREATE INDEX ix_payments_member        ON payments (member_id) WHERE member_id IS NOT NULL;
CREATE INDEX ix_payments_booking       ON payments (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX ix_payments_shop          ON payments (shop_order_id) WHERE shop_order_id IS NOT NULL;
CREATE INDEX ix_payments_bar           ON payments (bar_order_id) WHERE bar_order_id IS NOT NULL;
CREATE INDEX ix_payments_tab           ON payments (tab_id) WHERE tab_id IS NOT NULL;
CREATE INDEX ix_payments_membership    ON payments (membership_id) WHERE membership_id IS NOT NULL;
CREATE INDEX ix_payments_invoice       ON payments (invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX ix_payments_social        ON payments (social_player_id) WHERE social_player_id IS NOT NULL;
CREATE INDEX ix_payables_due           ON payables (club_id, status, due_date);
CREATE INDEX ix_notifications_queue    ON notifications (scheduled_at) WHERE status = 'queued';
CREATE INDEX ix_notifications_member   ON notifications (recipient_member_id) WHERE recipient_member_id IS NOT NULL;
CREATE INDEX ix_audit_lookup           ON audit_log (club_id, table_name, record_id, created_at DESC);

-- ---- FUZZY SEARCH (pg_trgm): handles typos, partial words, ILIKE '%x%' ----
CREATE INDEX trgm_clubs_name       ON clubs USING gin (name gin_trgm_ops);
CREATE INDEX trgm_clubs_city       ON clubs USING gin (city gin_trgm_ops);
CREATE INDEX trgm_members_name     ON members USING gin (club_id, full_name gin_trgm_ops);
CREATE INDEX trgm_members_code     ON members USING gin (club_id, member_code gin_trgm_ops);
CREATE INDEX trgm_members_phone    ON members USING gin (club_id, phone_digits gin_trgm_ops);
CREATE INDEX trgm_members_email    ON members USING gin (club_id, email gin_trgm_ops);
CREATE INDEX trgm_leads_name       ON leads   USING gin (club_id, full_name gin_trgm_ops);
CREATE INDEX trgm_leads_phone      ON leads   USING gin (club_id, phone_digits gin_trgm_ops);
CREATE INDEX trgm_products_name    ON products USING gin (club_id, name gin_trgm_ops);
CREATE INDEX trgm_variants_sku     ON product_variants USING gin (club_id, sku gin_trgm_ops);
CREATE INDEX trgm_menu_items_name  ON menu_items USING gin (club_id, name gin_trgm_ops);
CREATE INDEX trgm_clients_name     ON clients USING gin (club_id, name gin_trgm_ops);
CREATE INDEX trgm_employees_name   ON employees USING gin (club_id, full_name gin_trgm_ops);
CREATE INDEX trgm_suppliers_name   ON suppliers USING gin (club_id, name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 13. FUNCTIONS
-- ---------------------------------------------------------------------
-- 13a. generic triggers ------------------------------------------------
CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;

CREATE FUNCTION next_doc_no(p_club uuid, p_type text, p_prefix text DEFAULT '')
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_out text;
BEGIN
  INSERT INTO document_sequences AS d (club_id, doc_type, prefix, last_number)
  VALUES (p_club, p_type, p_prefix, 1)
  ON CONFLICT (club_id, doc_type) DO UPDATE SET last_number = d.last_number + 1
  RETURNING d.prefix || lpad(d.last_number::text, d.padding, '0') INTO v_out;
  RETURN v_out;
END $$;

-- args: column, doc_type, prefix.  Fills the column when the caller left it NULL
CREATE FUNCTION trg_assign_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_prefix text := TG_ARGV[2];
BEGIN
  IF (to_jsonb(NEW) ->> TG_ARGV[0]) IS NULL THEN
    IF TG_ARGV[1] = 'member' THEN
      SELECT member_code_prefix INTO v_prefix FROM club_settings WHERE club_id = NEW.club_id;
    END IF;
    NEW := jsonb_populate_record(NEW, jsonb_build_object(TG_ARGV[0], next_doc_no(NEW.club_id, TG_ARGV[1], coalesce(v_prefix, TG_ARGV[2]))));
  END IF;
  RETURN NEW;
END $$;

-- args: parent table, fk column, extra expr, child table, extra filter
CREATE FUNCTION trg_recalc_parent() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_id uuid;
BEGIN
  v_id := CASE WHEN TG_OP = 'DELETE' THEN (to_jsonb(OLD) ->> TG_ARGV[1])::uuid ELSE (to_jsonb(NEW) ->> TG_ARGV[1])::uuid END;
  EXECUTE format(
    'UPDATE %I p SET subtotal = s.sub, discount_total = s.disc, tax_total = s.tax, total = s.tot + %s
       FROM (SELECT coalesce(sum(line_subtotal),0) AS sub, coalesce(sum(discount_amount),0) AS disc,
                    coalesce(sum(tax_amount),0) AS tax, coalesce(sum(line_total),0) AS tot
               FROM %I WHERE %I = $1 %s) s
      WHERE p.id = $1', TG_ARGV[0], TG_ARGV[2], TG_ARGV[3], TG_ARGV[1], TG_ARGV[4]) USING v_id;
  RETURN NULL;
END $$;

-- args: allowed column names. Members may only touch those columns.
CREATE FUNCTION trg_guard_member_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ctx_role() = 'member' AND (to_jsonb(NEW) - TG_ARGV) IS DISTINCT FROM (to_jsonb(OLD) - TG_ARGV) THEN
    RAISE EXCEPTION 'Members may not change these fields' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION trg_forbid_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION '% rows are append-only; add a reversing row instead', TG_TABLE_NAME USING ERRCODE = 'insufficient_privilege'; END $$;

CREATE FUNCTION trg_audit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v jsonb := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
BEGIN
  INSERT INTO audit_log (club_id, user_id, table_name, record_id, action, old_data, new_data)
  VALUES (coalesce((v ->> 'club_id')::uuid, CASE WHEN TG_TABLE_NAME = 'clubs' THEN (v ->> 'id')::uuid END),
          ctx_user(), TG_TABLE_NAME, (v ->> 'id')::uuid, TG_OP,
          CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) END,
          CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END);
  RETURN NULL;
END $$;

-- 13b. context + onboarding --------------------------------------------
-- Call at the START of every backend transaction:
--   BEGIN; SET LOCAL ROLE club_app; SELECT app.set_context(:user_id, :club_id); ...queries... COMMIT;
-- Pass user NULL for anonymous visitors of a club's public site.
CREATE FUNCTION set_context(p_user uuid, p_club uuid) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_role text := 'public'; v_member uuid;
BEGIN
  IF p_user IS NOT NULL AND NOT EXISTS (SELECT 1 FROM users WHERE id = p_user AND is_active) THEN p_user := NULL; END IF;
  IF p_user IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM platform_admins WHERE user_id = p_user) THEN
      v_role := 'super_admin';
    ELSE
      SELECT cs.role::text INTO v_role FROM club_staff cs
       WHERE cs.club_id = p_club AND cs.user_id = p_user AND cs.is_active;
      SELECT m.id INTO v_member FROM members m
       WHERE m.club_id = p_club AND m.user_id = p_user AND m.status <> 'blocked';
      IF v_role IS NULL THEN v_role := CASE WHEN v_member IS NOT NULL THEN 'member' ELSE 'public' END; END IF;
    END IF;
  END IF;
  PERFORM set_config('app.user_id',   coalesce(p_user::text, ''),   true);
  PERFORM set_config('app.club_id',   coalesce(p_club::text, ''),   true);
  PERFORM set_config('app.member_id', coalesce(v_member::text, ''), true);
  PERFORM set_config('app.role',      v_role,                       true);
  RETURN v_role;
END $$;

CREATE FUNCTION resolve_club_slug(p_slug citext) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, public AS
$$ SELECT id FROM clubs WHERE slug = p_slug AND status = 'active' $$;

CREATE FUNCTION user_clubs(p_user uuid) RETURNS TABLE (club_id uuid, slug citext, name text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, public AS $$
  SELECT c.id, c.slug, c.name, cs.role::text FROM club_staff cs JOIN clubs c ON c.id = cs.club_id
   WHERE cs.user_id = p_user AND cs.is_active
  UNION ALL
  SELECT c.id, c.slug, c.name, 'member' FROM members m JOIN clubs c ON c.id = m.club_id WHERE m.user_id = p_user
$$;

-- Club registration: creates the club shell only. Courts, plans, menu, etc. are added by the club.
CREATE FUNCTION register_club(p_user uuid, p_name text, p_slug text, p_city text DEFAULT NULL,
                              p_phone text DEFAULT NULL, p_email text DEFAULT NULL,
                              p_timezone text DEFAULT 'Asia/Kolkata') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO clubs (slug, name, city, phone, email, timezone, owner_user_id)
  VALUES (p_slug, p_name, p_city, p_phone, p_email, p_timezone, p_user) RETURNING id INTO v_id;
  INSERT INTO club_staff (club_id, user_id, role) VALUES (v_id, p_user, 'owner');
  INSERT INTO club_settings (club_id) VALUES (v_id);
  INSERT INTO club_modules (club_id, module) SELECT v_id, m FROM unnest(enum_range(NULL::module_key)) AS m;
  RETURN v_id;
END $$;

-- 13c. business logic ---------------------------------------------------
CREATE FUNCTION member_plan(p_member uuid, p_on date DEFAULT current_date) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, public AS $$
  SELECT ms.plan_id FROM memberships ms JOIN plans pl ON pl.id = ms.plan_id
   WHERE ms.member_id = p_member AND ms.status <> 'cancelled' AND p_on BETWEEN ms.start_date AND ms.end_date
   ORDER BY pl.tier_rank DESC, ms.end_date DESC LIMIT 1
$$;

-- p_kind: 'shop' | 'bar' | 'court'.  Plan discount applied automatically.
CREATE FUNCTION member_discount(p_member uuid, p_kind text, p_on date DEFAULT current_date) RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, public AS $$
  SELECT coalesce((SELECT CASE p_kind WHEN 'shop' THEN pl.shop_discount_percent
                                      WHEN 'bar'  THEN pl.bar_discount_percent
                                      WHEN 'court' THEN pl.court_discount_percent END
                     FROM plans pl WHERE pl.id = member_plan(p_member, p_on)), 0)
$$;

-- Pre-tax court price for a slot start. Specific plan rule > default rule minus plan discount.
CREATE FUNCTION resolve_court_price(p_court uuid, p_plan uuid, p_start timestamptz) RETURNS numeric
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_c courts%ROWTYPE; v_tz text; v_local timestamp; v_dow int; v_time time; v_price numeric; v_pl plans%ROWTYPE;
BEGIN
  SELECT * INTO v_c FROM courts WHERE id = p_court;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown court'; END IF;
  SELECT timezone INTO v_tz FROM clubs WHERE id = v_c.club_id;
  v_local := p_start AT TIME ZONE v_tz; v_dow := extract(dow FROM v_local)::int; v_time := v_local::time;
  IF p_plan IS NOT NULL THEN
    SELECT * INTO v_pl FROM plans WHERE id = p_plan;
    IF v_pl.court_free THEN RETURN 0; END IF;
    SELECT r.price INTO v_price FROM court_rates r
     WHERE r.club_id = v_c.club_id AND r.is_active AND r.plan_id = p_plan
       AND (r.court_id IS NULL OR r.court_id = p_court) AND (r.sport_id IS NULL OR r.sport_id = v_c.sport_id)
       AND (r.weekday IS NULL OR r.weekday = v_dow)
       AND (r.time_from IS NULL OR v_time >= r.time_from) AND (r.time_to IS NULL OR v_time < r.time_to)
       AND (r.valid_from IS NULL OR v_local::date >= r.valid_from) AND (r.valid_to IS NULL OR v_local::date <= r.valid_to)
     ORDER BY r.priority DESC, (r.court_id IS NOT NULL)::int * 8 + (r.sport_id IS NOT NULL)::int * 4
              + (r.weekday IS NOT NULL)::int * 2 + (r.time_from IS NOT NULL)::int DESC, r.created_at DESC LIMIT 1;
    IF v_price IS NOT NULL THEN RETURN v_price; END IF;
  END IF;
  SELECT r.price INTO v_price FROM court_rates r
   WHERE r.club_id = v_c.club_id AND r.is_active AND r.plan_id IS NULL
     AND (r.court_id IS NULL OR r.court_id = p_court) AND (r.sport_id IS NULL OR r.sport_id = v_c.sport_id)
     AND (r.weekday IS NULL OR r.weekday = v_dow)
     AND (r.time_from IS NULL OR v_time >= r.time_from) AND (r.time_to IS NULL OR v_time < r.time_to)
     AND (r.valid_from IS NULL OR v_local::date >= r.valid_from) AND (r.valid_to IS NULL OR v_local::date <= r.valid_to)
   ORDER BY r.priority DESC, (r.court_id IS NOT NULL)::int * 8 + (r.sport_id IS NOT NULL)::int * 4
            + (r.weekday IS NOT NULL)::int * 2 + (r.time_from IS NOT NULL)::int DESC, r.created_at DESC LIMIT 1;
  IF v_price IS NULL THEN v_price := 400.00; END IF;
  IF p_plan IS NOT NULL AND v_pl.court_discount_percent IS NOT NULL AND v_pl.court_discount_percent > 0 THEN
    v_price := round(v_price * (100 - v_pl.court_discount_percent) / 100, 2);
  END IF;
  RETURN v_price;
END $$;

-- Public-safe availability grid (no personal data). Used by the website and the staff grid.
CREATE FUNCTION court_availability(p_club uuid, p_day date, p_sport uuid DEFAULT NULL)
RETURNS TABLE (court_id uuid, court_name text, slot_start timestamptz, slot_end timestamptz, is_available boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = app, public AS $$
  WITH s AS (
    SELECT c.timezone AS tz, st.slot_length_minutes AS len, st.slot_interval_minutes AS itv
      FROM clubs c JOIN club_settings st ON st.club_id = c.id WHERE c.id = p_club AND c.status = 'active'
  ), slots AS (
    SELECT c.id AS cid, c.name::text AS cname,
           ((p_day + h.opens_at) + n * s.itv * interval '1 minute') AT TIME ZONE s.tz AS st,
           ((p_day + h.opens_at) + (n * s.itv + s.len) * interval '1 minute') AT TIME ZONE s.tz AS en
      FROM s CROSS JOIN courts c
      JOIN court_operating_hours h ON h.court_id = c.id AND h.weekday = extract(dow FROM p_day)::int AND NOT h.is_closed
      CROSS JOIN LATERAL generate_series(0, ((extract(epoch FROM (h.closes_at - h.opens_at)) / 60)::int - s.len) / s.itv) AS n
     WHERE c.club_id = p_club AND c.is_active AND (p_sport IS NULL OR c.sport_id = p_sport)
  )
  SELECT cid, cname, st, en,
         (st > now() AND NOT EXISTS (SELECT 1 FROM court_reservations r
            WHERE r.court_id = slots.cid AND r.status = 'active'
              AND tstzrange(r.start_at, r.end_at, '[)') && tstzrange(slots.st, slots.en, '[)')))
    FROM slots ORDER BY cname, st
$$;

CREATE FUNCTION expire_memberships() RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE a int; b int;
BEGIN
  UPDATE memberships SET status = 'expired' WHERE status = 'active' AND end_date < current_date;
  GET DIAGNOSTICS a = ROW_COUNT;
  UPDATE memberships SET status = 'active' WHERE status = 'scheduled' AND start_date <= current_date AND end_date >= current_date;
  GET DIAGNOSTICS b = ROW_COUNT;
  RETURN a + b;
END $$;

-- Schedule daily (pg_cron or backend cron):  SELECT app.expire_memberships(); SELECT app.queue_expiry_reminders();
CREATE FUNCTION queue_expiry_reminders() RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_n int;
BEGIN
  WITH ins AS (
    INSERT INTO notifications (club_id, channel, recipient_member_id, to_address, subject, body, dedupe_key)
    SELECT ms.club_id, rr.channel, m.id,
           CASE rr.channel WHEN 'email' THEN m.email ELSE m.phone END,
           'Your ' || pl.name || ' membership expires on ' || to_char(ms.end_date, 'DD Mon YYYY'),
           'Hi ' || m.first_name || ', your ' || pl.name || ' membership at ' || c.name || ' expires on '
             || to_char(ms.end_date, 'DD Mon YYYY') || '. Renew to keep your benefits.',
           'expiry:' || ms.id || ':' || rr.id
      FROM reminder_rules rr
      JOIN memberships ms ON ms.club_id = rr.club_id AND ms.status = 'active' AND ms.end_date = current_date + rr.days_before
      JOIN members m ON m.id = ms.member_id
      JOIN plans pl ON pl.id = ms.plan_id
      JOIN clubs c ON c.id = ms.club_id
     WHERE rr.is_active AND rr.kind = 'membership_expiry'
    ON CONFLICT (club_id, dedupe_key) DO NOTHING RETURNING 1)
  SELECT count(*) INTO v_n FROM ins;
  RETURN v_n;
END $$;

-- 13d. FUZZY SEARCH ------------------------------------------------------
CREATE FUNCTION search_members(p_q text, p_limit int DEFAULT 20)
RETURNS TABLE (id uuid, member_code text, full_name text, phone text, email text, photo_url text, status member_status, score real)
LANGUAGE sql STABLE AS $$
  WITH q AS (SELECT btrim(p_q) AS t, regexp_replace(p_q, '\D', '', 'g') AS d)
  SELECT m.id, m.member_code, m.full_name, m.phone, m.email, m.photo_url, m.status,
         greatest(similarity(m.full_name, q.t), word_similarity(q.t, m.full_name), similarity(m.member_code, q.t),
                  CASE WHEN length(q.d) >= 3 AND m.phone_digits LIKE '%' || q.d || '%' THEN 1.0 ELSE 0 END)::real AS score
    FROM members m, q
   WHERE q.t <> '' AND (
         m.full_name % q.t OR q.t <% m.full_name
      OR m.full_name ILIKE '%' || like_escape(q.t) || '%'
      OR m.member_code ILIKE like_escape(q.t) || '%'
      OR m.email ILIKE '%' || like_escape(q.t) || '%'
      OR (length(q.d) >= 3 AND m.phone_digits LIKE '%' || q.d || '%'))
   ORDER BY score DESC, m.full_name LIMIT p_limit
$$;

CREATE FUNCTION search_leads(p_q text, p_limit int DEFAULT 20)
RETURNS TABLE (id uuid, full_name text, phone text, email citext, status lead_status, score real)
LANGUAGE sql STABLE AS $$
  WITH q AS (SELECT btrim(p_q) AS t, regexp_replace(p_q, '\D', '', 'g') AS d)
  SELECT l.id, l.full_name, l.phone, l.email, l.status,
         greatest(similarity(l.full_name, q.t), word_similarity(q.t, l.full_name),
                  CASE WHEN length(q.d) >= 3 AND l.phone_digits LIKE '%' || q.d || '%' THEN 1.0 ELSE 0 END)::real
    FROM leads l, q
   WHERE q.t <> '' AND (l.full_name % q.t OR q.t <% l.full_name OR l.full_name ILIKE '%' || like_escape(q.t) || '%'
      OR (length(q.d) >= 3 AND l.phone_digits LIKE '%' || q.d || '%'))
   ORDER BY 6 DESC, l.full_name LIMIT p_limit
$$;

CREATE FUNCTION search_products(p_q text, p_limit int DEFAULT 20, p_online_only boolean DEFAULT false)
RETURNS TABLE (product_id uuid, variant_id uuid, sku text, name text, size text, color text, price numeric, stock_qty int, score real)
LANGUAGE sql STABLE AS $$
  SELECT p.id, v.id, v.sku, p.name, v.size, v.color, v.price::numeric, v.stock_qty,
         greatest(similarity(p.name, btrim(p_q)), word_similarity(btrim(p_q), p.name), similarity(v.sku, btrim(p_q)))::real
    FROM products p JOIN product_variants v ON v.product_id = p.id AND v.is_active
   WHERE btrim(p_q) <> '' AND p.is_active AND (NOT p_online_only OR p.is_online)
     AND (p.name % btrim(p_q) OR btrim(p_q) <% p.name OR p.name ILIKE '%' || like_escape(btrim(p_q)) || '%'
          OR v.sku ILIKE like_escape(btrim(p_q)) || '%' OR v.barcode = btrim(p_q))
   ORDER BY 9 DESC, p.name LIMIT p_limit
$$;

CREATE FUNCTION search_menu_items(p_q text, p_limit int DEFAULT 20)
RETURNS TABLE (id uuid, name text, price numeric, station station_type, is_available boolean, score real)
LANGUAGE sql STABLE AS $$
  SELECT i.id, i.name, i.price::numeric, i.station, i.is_available,
         greatest(similarity(i.name, btrim(p_q)), word_similarity(btrim(p_q), i.name))::real
    FROM menu_items i
   WHERE btrim(p_q) <> '' AND i.is_active
     AND (i.name % btrim(p_q) OR btrim(p_q) <% i.name OR i.name ILIKE '%' || like_escape(btrim(p_q)) || '%')
   ORDER BY 6 DESC, i.name LIMIT p_limit
$$;

-- Public club discovery ("find a club near me / by name")
CREATE FUNCTION search_clubs(p_q text, p_limit int DEFAULT 20)
RETURNS TABLE (id uuid, slug citext, name text, city text, logo_url text, score real)
LANGUAGE sql STABLE AS $$
  SELECT c.id, c.slug, c.name, c.city, c.logo_url,
         greatest(similarity(c.name, btrim(p_q)), word_similarity(btrim(p_q), c.name), similarity(coalesce(c.city, ''), btrim(p_q)))::real
    FROM clubs c
   WHERE btrim(p_q) <> '' AND c.status = 'active' AND c.is_public
     AND (c.name % btrim(p_q) OR btrim(p_q) <% c.name OR c.name ILIKE '%' || like_escape(btrim(p_q)) || '%'
          OR c.city ILIKE '%' || like_escape(btrim(p_q)) || '%' OR c.city % btrim(p_q))
   ORDER BY 6 DESC, c.name LIMIT p_limit
$$;

-- ---------------------------------------------------------------------
-- 14. BUSINESS-RULE TRIGGERS
-- ---------------------------------------------------------------------
-- document numbers
CREATE TRIGGER trg_num BEFORE INSERT ON members         FOR EACH ROW EXECUTE FUNCTION trg_assign_number('member_code','member','M-');
CREATE TRIGGER trg_num BEFORE INSERT ON employees       FOR EACH ROW EXECUTE FUNCTION trg_assign_number('employee_code','employee','EMP-');
CREATE TRIGGER trg_num BEFORE INSERT ON shop_orders     FOR EACH ROW EXECUTE FUNCTION trg_assign_number('order_no','shop_order','SO-');
CREATE TRIGGER trg_num BEFORE INSERT ON bar_orders      FOR EACH ROW EXECUTE FUNCTION trg_assign_number('order_no','bar_order','BAR-');
CREATE TRIGGER trg_num BEFORE INSERT ON payments        FOR EACH ROW EXECUTE FUNCTION trg_assign_number('payment_no','payment','PAY-');
CREATE TRIGGER trg_num BEFORE INSERT ON invoices        FOR EACH ROW EXECUTE FUNCTION trg_assign_number('invoice_no','invoice','INV-');
CREATE TRIGGER trg_num BEFORE INSERT ON quotes          FOR EACH ROW EXECUTE FUNCTION trg_assign_number('quote_no','quote','QUO-');
CREATE TRIGGER trg_num BEFORE INSERT ON purchase_orders FOR EACH ROW EXECUTE FUNCTION trg_assign_number('po_no','purchase_order','PO-');

-- totals roll up from line items
CREATE TRIGGER trg_recalc AFTER INSERT OR UPDATE OR DELETE ON shop_order_items FOR EACH ROW
  EXECUTE FUNCTION trg_recalc_parent('shop_orders','order_id','p.delivery_fee','shop_order_items','');
CREATE TRIGGER trg_recalc AFTER INSERT OR UPDATE OR DELETE ON bar_order_items FOR EACH ROW
  EXECUTE FUNCTION trg_recalc_parent('bar_orders','order_id','0','bar_order_items','AND kds_status <> ''cancelled''');
CREATE TRIGGER trg_recalc AFTER INSERT OR UPDATE OR DELETE ON invoice_items FOR EACH ROW
  EXECUTE FUNCTION trg_recalc_parent('invoices','invoice_id','0','invoice_items','');
CREATE TRIGGER trg_recalc AFTER INSERT OR UPDATE OR DELETE ON quote_items FOR EACH ROW
  EXECUTE FUNCTION trg_recalc_parent('quotes','quote_id','0','quote_items','');

-- append-only ledgers
CREATE TRIGGER trg_nodelete BEFORE DELETE ON payments            FOR EACH ROW EXECUTE FUNCTION trg_forbid_delete();
CREATE TRIGGER trg_nodelete BEFORE DELETE ON stock_movements     FOR EACH ROW EXECUTE FUNCTION trg_forbid_delete();
CREATE TRIGGER trg_nodelete BEFORE DELETE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION trg_forbid_delete();
CREATE TRIGGER trg_nodelete BEFORE DELETE ON audit_log           FOR EACH ROW EXECUTE FUNCTION trg_forbid_delete();

-- members editing their own rows: whitelist columns
CREATE TRIGGER trg_guard BEFORE UPDATE ON members FOR EACH ROW EXECUTE FUNCTION trg_guard_member_update(
  'first_name','last_name','full_name','phone','phone_digits','email','gender','photo_url','address_line','city','postal_code',
  'emergency_contact_name','emergency_contact_phone','emergency_contact_relation','updated_at');
CREATE TRIGGER trg_guard BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION trg_guard_member_update(
  'status','cancelled_at','cancelled_by','cancel_reason','updated_at');
CREATE TRIGGER trg_guard BEFORE UPDATE ON social_session_players FOR EACH ROW EXECUTE FUNCTION trg_guard_member_update(
  'status','updated_at');

-- court reservation validation: slot grid, length, operating hours
CREATE FUNCTION trg_reservation_validate() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_c courts%ROWTYPE; v_s club_settings%ROWTYPE; v_tz text; v_ls timestamp; v_le timestamp; v_h court_operating_hours%ROWTYPE;
BEGIN
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.court_id = NEW.court_id AND OLD.start_at = NEW.start_at AND OLD.end_at = NEW.end_at THEN RETURN NEW; END IF;
  SELECT * INTO v_c FROM courts WHERE id = NEW.court_id AND club_id = NEW.club_id;
  IF NOT FOUND OR NOT v_c.is_active THEN RAISE EXCEPTION 'Court is not available' USING ERRCODE = 'check_violation'; END IF;
  IF NEW.kind <> 'booking' THEN RETURN NEW; END IF;
  SELECT * INTO v_s FROM club_settings WHERE club_id = NEW.club_id;
  SELECT timezone INTO v_tz FROM clubs WHERE id = NEW.club_id;
  v_ls := NEW.start_at AT TIME ZONE v_tz; v_le := NEW.end_at AT TIME ZONE v_tz;
  IF NEW.end_at - NEW.start_at <> make_interval(mins => v_s.slot_length_minutes) THEN
    RAISE EXCEPTION 'Booking must be exactly % minutes', v_s.slot_length_minutes USING ERRCODE = 'check_violation'; END IF;
  IF (extract(hour FROM v_ls) * 60 + extract(minute FROM v_ls))::int % v_s.slot_interval_minutes <> 0 OR extract(second FROM v_ls) <> 0 THEN
    RAISE EXCEPTION 'Booking must start on a % minute boundary', v_s.slot_interval_minutes USING ERRCODE = 'check_violation'; END IF;
  IF v_ls::date <> v_le::date THEN RAISE EXCEPTION 'Booking cannot cross midnight' USING ERRCODE = 'check_violation'; END IF;
  SELECT * INTO v_h FROM court_operating_hours WHERE court_id = NEW.court_id AND weekday = extract(dow FROM v_ls)::int;
  IF NOT FOUND OR v_h.is_closed OR v_ls::time < v_h.opens_at OR v_le::time > v_h.closes_at THEN
    RAISE EXCEPTION 'Outside court operating hours' USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_validate BEFORE INSERT OR UPDATE ON court_reservations FOR EACH ROW EXECUTE FUNCTION trg_reservation_validate();

-- a 'booking'/'social_session' reservation must have its child row by COMMIT (no orphan holds)
CREATE FUNCTION trg_reservation_has_child() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
BEGIN
  IF NEW.status = 'active' THEN
    IF NEW.kind = 'booking' AND NOT EXISTS (SELECT 1 FROM bookings WHERE reservation_id = NEW.id) THEN
      RAISE EXCEPTION 'Reservation % has no booking', NEW.id USING ERRCODE = 'integrity_constraint_violation'; END IF;
    IF NEW.kind = 'social_session' AND NOT EXISTS (SELECT 1 FROM social_sessions WHERE reservation_id = NEW.id) THEN
      RAISE EXCEPTION 'Reservation % has no social session', NEW.id USING ERRCODE = 'integrity_constraint_violation'; END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER trg_has_child AFTER INSERT ON court_reservations DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_reservation_has_child();

-- members booking online: server decides plan + price (never trust the client)
CREATE FUNCTION trg_a_booking_member_pricing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_r court_reservations%ROWTYPE; v_tax numeric;
BEGIN
  IF ctx_role() <> 'member' THEN RETURN NEW; END IF;
  SELECT * INTO v_r FROM court_reservations WHERE id = NEW.reservation_id;
  NEW.member_id := ctx_member(); NEW.channel := 'online'; NEW.status := 'pending';
  NEW.plan_id := member_plan(NEW.member_id, v_r.start_at::date);
  NEW.base_price := resolve_court_price(v_r.court_id, NEW.plan_id, v_r.start_at);
  NEW.discount_amount := 0;
  SELECT coalesce(max(rate_percent), 0) INTO v_tax FROM tax_rates WHERE club_id = NEW.club_id AND is_default AND is_active;
  NEW.tax_percent := v_tax; NEW.tax_amount := round(NEW.base_price * v_tax / 100, 2);
  NEW.total_amount := NEW.base_price + NEW.tax_amount;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_a_pricing BEFORE INSERT ON bookings FOR EACH ROW EXECUTE FUNCTION trg_a_booking_member_pricing();

-- max bookings / member / day  (serialised per member+day with an advisory lock)
CREATE FUNCTION trg_b_booking_rules() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_r court_reservations%ROWTYPE; v_tz text; v_day date; v_max int; v_cnt int;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN RAISE EXCEPTION 'A cancelled booking cannot be reopened'; END IF;
    IF ctx_role() = 'member' AND NEW.status <> OLD.status AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Members can only cancel' USING ERRCODE = 'insufficient_privilege'; END IF;
  END IF;
  IF NEW.status NOT IN ('pending','confirmed') OR NEW.member_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IN ('pending','confirmed') AND OLD.member_id = NEW.member_id AND OLD.reservation_id = NEW.reservation_id THEN RETURN NEW; END IF;
  SELECT * INTO v_r FROM court_reservations WHERE id = NEW.reservation_id;
  SELECT timezone INTO v_tz FROM clubs WHERE id = NEW.club_id;
  v_day := (v_r.start_at AT TIME ZONE v_tz)::date;
  SELECT coalesce(p.max_bookings_per_day, s.max_bookings_per_member_per_day) INTO v_max
    FROM club_settings s LEFT JOIN plans p ON p.id = NEW.plan_id WHERE s.club_id = NEW.club_id;
  IF v_max IS NULL THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.member_id::text || v_day::text, 0));
  SELECT count(*) INTO v_cnt FROM bookings b JOIN court_reservations r ON r.id = b.reservation_id
   WHERE b.member_id = NEW.member_id AND b.id <> NEW.id AND b.status IN ('pending','confirmed')
     AND r.status = 'active' AND (r.start_at AT TIME ZONE v_tz)::date = v_day;
  IF v_cnt >= v_max THEN
    RAISE EXCEPTION 'Booking limit reached: % per day', v_max USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_b_rules BEFORE INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION trg_b_booking_rules();

-- cancelling a booking frees the court slot
CREATE FUNCTION trg_booking_release() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE court_reservations SET status = 'released' WHERE id = NEW.reservation_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_release AFTER UPDATE OF status ON bookings FOR EACH ROW EXECUTE FUNCTION trg_booking_release();

-- junior / age-banded plans
CREATE FUNCTION trg_membership_age() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_p plans%ROWTYPE; v_dob date; v_age int;
BEGIN
  SELECT * INTO v_p FROM plans WHERE id = NEW.plan_id;
  IF v_p.min_age IS NULL AND v_p.max_age IS NULL THEN RETURN NEW; END IF;
  SELECT dob INTO v_dob FROM members WHERE id = NEW.member_id;
  IF v_dob IS NULL THEN RAISE EXCEPTION 'Date of birth is required for plan %', v_p.name USING ERRCODE = 'check_violation'; END IF;
  v_age := extract(year FROM age(NEW.start_date::timestamp, v_dob::timestamp))::int;
  IF (v_p.min_age IS NOT NULL AND v_age < v_p.min_age) OR (v_p.max_age IS NOT NULL AND v_age > v_p.max_age) THEN
    RAISE EXCEPTION 'Member age % is outside plan % age band', v_age, v_p.name USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_age BEFORE INSERT OR UPDATE OF plan_id, member_id, start_date ON memberships
  FOR EACH ROW EXECUTE FUNCTION trg_membership_age();

-- social play capacity (row-locks the session so two joiners cannot both take the last spot)
CREATE FUNCTION trg_social_capacity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_max int; v_cnt int;
BEGIN
  IF NEW.status IN ('joined','attended') AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('joined','attended')) THEN
    SELECT max_players INTO v_max FROM social_sessions WHERE id = NEW.session_id AND status = 'scheduled' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Session is not open for joining'; END IF;
    SELECT count(*) INTO v_cnt FROM social_session_players
     WHERE session_id = NEW.session_id AND status IN ('joined','attended') AND id <> NEW.id;
    IF v_cnt >= v_max THEN RAISE EXCEPTION 'Session is full (% players)', v_max USING ERRCODE = 'check_violation'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_capacity BEFORE INSERT OR UPDATE ON social_session_players FOR EACH ROW EXECUTE FUNCTION trg_social_capacity();

-- ---- shop: auto price/discount, atomic stock, restock on cancel, low-stock alerts
CREATE FUNCTION trg_shop_order_defaults() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
BEGIN
  IF NEW.discount_percent IS NULL OR ctx_role() = 'member' THEN
    NEW.discount_percent := member_discount(NEW.member_id, 'shop');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_defaults BEFORE INSERT ON shop_orders FOR EACH ROW EXECUTE FUNCTION trg_shop_order_defaults();

CREATE FUNCTION trg_shop_item_defaults() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v record; v_disc numeric;
BEGIN
  SELECT p.name || CASE WHEN pv.size IS NULL AND pv.color IS NULL THEN '' ELSE ' (' || concat_ws(' / ', pv.size, pv.color) || ')' END AS nm,
         pv.price, coalesce(tr.rate_percent, 0) AS tax
    INTO v FROM product_variants pv JOIN products p ON p.id = pv.product_id
    LEFT JOIN tax_rates tr ON tr.id = p.tax_rate_id WHERE pv.id = NEW.variant_id;
  SELECT discount_percent INTO v_disc FROM shop_orders WHERE id = NEW.order_id;
  IF NEW.item_name IS NULL OR ctx_role() = 'member' THEN NEW.item_name := v.nm; END IF;
  IF NEW.unit_price IS NULL OR ctx_role() = 'member' THEN NEW.unit_price := v.price; END IF;
  IF NEW.tax_percent IS NULL OR ctx_role() = 'member' THEN NEW.tax_percent := v.tax; END IF;
  IF NEW.discount_percent IS NULL OR ctx_role() = 'member' THEN NEW.discount_percent := v_disc; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_defaults BEFORE INSERT ON shop_order_items FOR EACH ROW EXECUTE FUNCTION trg_shop_item_defaults();

CREATE FUNCTION trg_shop_item_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_ch sales_channel;
BEGIN
  SELECT channel INTO v_ch FROM shop_orders WHERE id = NEW.order_id;
  INSERT INTO stock_movements (club_id, variant_id, qty_change, reason, shop_order_item_id, created_by)
  VALUES (NEW.club_id, NEW.variant_id, -NEW.quantity, CASE v_ch WHEN 'pos' THEN 'pos_sale' ELSE 'online_sale' END::stock_reason, NEW.id, ctx_user());
  RETURN NULL;
END $$;
CREATE TRIGGER trg_stock AFTER INSERT ON shop_order_items FOR EACH ROW EXECUTE FUNCTION trg_shop_item_stock();

CREATE FUNCTION trg_shop_order_cancel() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    INSERT INTO stock_movements (club_id, variant_id, qty_change, reason, shop_order_item_id, note, created_by)
    SELECT i.club_id, i.variant_id, i.quantity, 'return', i.id, 'Order ' || NEW.order_no || ' cancelled', ctx_user()
      FROM shop_order_items i WHERE i.order_id = NEW.id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_cancel AFTER UPDATE OF status ON shop_orders FOR EACH ROW EXECUTE FUNCTION trg_shop_order_cancel();

CREATE FUNCTION trg_stock_apply() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
BEGIN
  UPDATE product_variants SET stock_qty = stock_qty + NEW.qty_change WHERE id = NEW.variant_id AND track_stock;
  RETURN NULL;       -- CHECK (stock_qty >= 0) aborts the whole sale if stock is insufficient
END $$;
CREATE TRIGGER trg_apply AFTER INSERT ON stock_movements FOR EACH ROW EXECUTE FUNCTION trg_stock_apply();

CREATE FUNCTION trg_po_receive() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
BEGIN
  IF NEW.quantity_received > OLD.quantity_received THEN
    INSERT INTO stock_movements (club_id, variant_id, qty_change, reason, purchase_order_item_id, created_by)
    VALUES (NEW.club_id, NEW.variant_id, NEW.quantity_received - OLD.quantity_received, 'purchase', NEW.id, ctx_user());
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_receive AFTER UPDATE OF quantity_received ON purchase_order_items FOR EACH ROW EXECUTE FUNCTION trg_po_receive();

CREATE FUNCTION trg_low_stock() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE r club_role;
BEGIN
  IF NEW.track_stock AND OLD.stock_qty > OLD.reorder_level AND NEW.stock_qty <= NEW.reorder_level THEN
    FOREACH r IN ARRAY ARRAY['manager','shop_staff']::club_role[] LOOP
      INSERT INTO notifications (club_id, channel, recipient_role, subject, body, dedupe_key)
      VALUES (NEW.club_id, 'push', r, 'Low stock: ' || NEW.sku,
              'SKU ' || NEW.sku || ' is down to ' || NEW.stock_qty || ' (reorder level ' || NEW.reorder_level || ')',
              'lowstock:' || NEW.id || ':' || r || ':' || current_date)
      ON CONFLICT (club_id, dedupe_key) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_low AFTER UPDATE OF stock_qty ON product_variants FOR EACH ROW EXECUTE FUNCTION trg_low_stock();

-- ---- bar: member discount, item snapshots, table status, tab settlement
CREATE FUNCTION trg_bar_order_defaults() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
BEGIN
  IF NEW.member_id IS NULL AND NEW.tab_id IS NOT NULL THEN SELECT member_id INTO NEW.member_id FROM tabs WHERE id = NEW.tab_id; END IF;
  IF NEW.discount_percent IS NULL THEN NEW.discount_percent := member_discount(NEW.member_id, 'bar'); END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_defaults BEFORE INSERT ON bar_orders FOR EACH ROW EXECUTE FUNCTION trg_bar_order_defaults();

CREATE FUNCTION trg_bar_item_defaults() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v record; v_disc numeric;
BEGIN
  SELECT mi.name, mi.price, mi.station, coalesce(tr.rate_percent, 0) AS tax, mi.is_available
    INTO v FROM menu_items mi LEFT JOIN tax_rates tr ON tr.id = mi.tax_rate_id WHERE mi.id = NEW.menu_item_id;
  IF NOT v.is_available THEN RAISE EXCEPTION '% is currently unavailable', v.name USING ERRCODE = 'check_violation'; END IF;
  SELECT discount_percent INTO v_disc FROM bar_orders WHERE id = NEW.order_id;
  NEW.item_name := coalesce(NEW.item_name, v.name);
  NEW.unit_price := coalesce(NEW.unit_price, v.price);
  NEW.station := coalesce(NEW.station, v.station);
  NEW.tax_percent := coalesce(NEW.tax_percent, v.tax);
  NEW.discount_percent := coalesce(NEW.discount_percent, v_disc);
  NEW.added_by := coalesce(NEW.added_by, ctx_user());
  RETURN NEW;
END $$;
CREATE TRIGGER trg_defaults BEFORE INSERT ON bar_order_items FOR EACH ROW EXECUTE FUNCTION trg_bar_item_defaults();

CREATE FUNCTION trg_bar_table_status() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
BEGIN
  IF NEW.table_id IS NOT NULL THEN
    UPDATE dining_tables t SET status = CASE
        WHEN EXISTS (SELECT 1 FROM bar_orders o WHERE o.table_id = t.id AND o.status IN ('open','sent','served')) THEN 'occupied'
        WHEN EXISTS (SELECT 1 FROM bar_orders o WHERE o.table_id = t.id AND o.status = 'billed') THEN 'billed'
        ELSE 'available' END::table_status
     WHERE t.id = NEW.table_id;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_table AFTER INSERT OR UPDATE OF status, table_id ON bar_orders FOR EACH ROW EXECUTE FUNCTION trg_bar_table_status();

CREATE FUNCTION trg_tab_settle() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE v_due numeric; v_paid numeric;
BEGIN
  IF NEW.status = 'settled' AND OLD.status = 'open' THEN
    SELECT coalesce(sum(total), 0) INTO v_due FROM bar_orders WHERE tab_id = NEW.id AND status <> 'void';
    SELECT coalesce(sum(CASE WHEN kind = 'refund' THEN -amount ELSE amount END), 0) INTO v_paid
      FROM payments WHERE tab_id = NEW.id AND status = 'completed';
    IF v_paid < v_due THEN
      RAISE EXCEPTION 'Tab has an outstanding balance of %', v_due - v_paid USING ERRCODE = 'check_violation'; END IF;
    NEW.settled_at := coalesce(NEW.settled_at, now());
    NEW.settled_by := coalesce(NEW.settled_by, ctx_user());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_settle BEFORE UPDATE OF status ON tabs FOR EACH ROW EXECUTE FUNCTION trg_tab_settle();

CREATE FUNCTION trg_tab_close_orders() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
BEGIN
  IF NEW.status = 'settled' AND OLD.status = 'open' THEN
    UPDATE bar_orders SET status = 'paid', closed_at = now() WHERE tab_id = NEW.id AND status NOT IN ('paid','void');
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_close AFTER UPDATE OF status ON tabs FOR EACH ROW EXECUTE FUNCTION trg_tab_close_orders();

-- ---- CRM: every enquiry notifies staff; status changes are logged
CREATE FUNCTION trg_lead_created() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
DECLARE r club_role;
BEGIN
  FOREACH r IN ARRAY ARRAY['manager','front_desk']::club_role[] LOOP
    INSERT INTO notifications (club_id, channel, recipient_role, subject, body, dedupe_key)
    VALUES (NEW.club_id, 'push', r, 'New enquiry: ' || NEW.full_name,
            coalesce(NEW.message, 'New lead via ' || NEW.source::text), 'lead:' || NEW.id || ':' || r)
    ON CONFLICT (club_id, dedupe_key) DO NOTHING;
  END LOOP;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_new_lead AFTER INSERT ON leads FOR EACH ROW EXECUTE FUNCTION trg_lead_created();

CREATE FUNCTION trg_lead_status_log() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, public AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    INSERT INTO lead_activities (club_id, lead_id, activity_type, from_status, to_status, created_by)
    VALUES (NEW.club_id, NEW.id, 'status_change', OLD.status, NEW.status, ctx_user());
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_status_log AFTER UPDATE OF status ON leads FOR EACH ROW EXECUTE FUNCTION trg_lead_status_log();

-- ---- updated_at on every table that has it, audit on the important ones
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT table_name FROM information_schema.columns
            WHERE table_schema = 'app' AND column_name = 'updated_at' LOOP
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.set_updated_at()', r.table_name);
  END LOOP;
  FOR r IN SELECT unnest(ARRAY['clubs','club_settings','club_staff','plans','court_rates','courts','members','memberships',
                               'bookings','payments','products','product_variants','shop_orders','invoices','payables',
                               'employees','payroll_runs']) AS t LOOP
    EXECUTE format('CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE OR DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.trg_audit()', r.t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 15. VIEWS  (security_invoker => RLS still applies to the caller)
-- ---------------------------------------------------------------------
CREATE VIEW v_member_current_plan WITH (security_invoker = true) AS
  SELECT DISTINCT ON (ms.member_id) ms.club_id, ms.member_id, ms.id AS membership_id, ms.plan_id, pl.name AS plan_name,
         ms.start_date, ms.end_date, (ms.end_date - current_date) AS days_left
    FROM memberships ms JOIN plans pl ON pl.id = ms.plan_id
   WHERE ms.status <> 'cancelled' AND current_date BETWEEN ms.start_date AND ms.end_date
   ORDER BY ms.member_id, pl.tier_rank DESC, ms.end_date DESC;

CREATE VIEW v_memberships_expiring WITH (security_invoker = true) AS
  SELECT ms.club_id, ms.id AS membership_id, m.id AS member_id, m.full_name, m.phone, m.email, pl.name AS plan_name,
         ms.end_date, (ms.end_date - current_date) AS days_left
    FROM memberships ms JOIN members m ON m.id = ms.member_id JOIN plans pl ON pl.id = ms.plan_id
   WHERE ms.status = 'active' AND ms.end_date BETWEEN current_date AND current_date + 30;

CREATE VIEW v_low_stock WITH (security_invoker = true) AS
  SELECT v.club_id, v.id AS variant_id, p.name AS product, v.sku, v.size, v.color, v.stock_qty, v.reorder_level
    FROM product_variants v JOIN products p ON p.id = v.product_id
   WHERE v.track_stock AND v.is_active AND v.stock_qty <= v.reorder_level;

CREATE VIEW v_wallet_balances WITH (security_invoker = true) AS
  SELECT club_id, member_id, sum(amount) AS balance FROM wallet_transactions GROUP BY club_id, member_id;

CREATE VIEW v_tab_balances WITH (security_invoker = true) AS
  SELECT t.club_id, t.id AS tab_id, t.member_id, t.guest_name, t.status,
         coalesce(o.total, 0) AS charged, coalesce(p.paid, 0) AS paid, coalesce(o.total, 0) - coalesce(p.paid, 0) AS balance
    FROM tabs t
    LEFT JOIN LATERAL (SELECT sum(total) AS total FROM bar_orders WHERE tab_id = t.id AND status <> 'void') o ON true
    LEFT JOIN LATERAL (SELECT sum(CASE WHEN kind = 'refund' THEN -amount ELSE amount END) AS paid
                         FROM payments WHERE tab_id = t.id AND status = 'completed') p ON true;

CREATE VIEW v_ledger WITH (security_invoker = true) AS
  SELECT p.club_id, p.id AS payment_id, p.payment_no, p.received_at, p.revenue_source, p.method, p.kind, p.member_id, p.client_id,
         CASE WHEN p.kind = 'refund' THEN -p.amount ELSE p.amount END AS signed_amount
    FROM payments p WHERE p.status = 'completed';

-- today / week / month dashboards: filter on day
CREATE VIEW v_revenue_daily WITH (security_invoker = true) AS
  SELECT p.club_id, (p.received_at AT TIME ZONE c.timezone)::date AS day, p.revenue_source, p.method,
         sum(CASE WHEN p.kind = 'refund' THEN -p.amount ELSE p.amount END) AS net_amount, count(*) AS txn_count
    FROM payments p JOIN clubs c ON c.id = p.club_id
   WHERE p.status = 'completed' GROUP BY 1, 2, 3, 4;

CREATE VIEW v_bar_daily_closing WITH (security_invoker = true) AS
  SELECT o.club_id, (o.opened_at AT TIME ZONE c.timezone)::date AS day, count(*) AS orders,
         sum(o.subtotal) AS gross, sum(o.discount_total) AS discounts, sum(o.tax_total) AS tax, sum(o.total) AS net_total
    FROM bar_orders o JOIN clubs c ON c.id = o.club_id WHERE o.status <> 'void' GROUP BY 1, 2;

CREATE VIEW v_gst_sales_monthly WITH (security_invoker = true) AS
  SELECT club_id, month, source, tax_percent, sum(taxable) AS taxable_value, sum(tax) AS tax_amount FROM (
    SELECT i.club_id, date_trunc('month', o.placed_at)::date AS month, 'shop'::text AS source, i.tax_percent,
           i.line_subtotal - i.discount_amount AS taxable, i.tax_amount AS tax
      FROM shop_order_items i JOIN shop_orders o ON o.id = i.order_id WHERE o.status <> 'cancelled'
    UNION ALL
    SELECT i.club_id, date_trunc('month', o.opened_at)::date, 'bar', i.tax_percent,
           i.line_subtotal - i.discount_amount, i.tax_amount
      FROM bar_order_items i JOIN bar_orders o ON o.id = i.order_id WHERE o.status <> 'void' AND i.kds_status <> 'cancelled'
    UNION ALL
    SELECT i.club_id, date_trunc('month', v.issue_date)::date, 'invoice', i.tax_percent,
           i.line_subtotal - i.discount_amount, i.tax_amount
      FROM invoice_items i JOIN invoices v ON v.id = i.invoice_id WHERE v.status NOT IN ('draft','void')
    UNION ALL
    SELECT b.club_id, date_trunc('month', r.start_at)::date, 'courts', b.tax_percent,
           b.base_price - b.discount_amount, b.tax_amount
      FROM bookings b JOIN court_reservations r ON r.id = b.reservation_id WHERE b.status IN ('confirmed','completed','no_show')
  ) t GROUP BY club_id, month, source, tax_percent;

-- ---------------------------------------------------------------------
-- 16. ROW LEVEL SECURITY
--     RLS is ENABLED (not FORCED): the migration/owner role and SECURITY
--     DEFINER functions bypass it, club_app is always filtered.
-- ---------------------------------------------------------------------
-- credentials & platform admins: nobody but the owner role
ALTER TABLE user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins  ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  r record; c text;
  mgr    text[] := ARRAY['owner','manager'];
  owner_ text[] := ARRAY['owner'];
  staff  text[] := ARRAY['owner','manager','front_desk','bar_staff','kitchen','shop_staff'];
  front  text[] := ARRAY['owner','manager','front_desk'];
  shop   text[] := ARRAY['owner','manager','shop_staff'];
  shopf  text[] := ARRAY['owner','manager','front_desk','shop_staff'];
  barw   text[] := ARRAY['owner','manager','front_desk','bar_staff'];
  barkw  text[] := ARRAY['owner','manager','front_desk','bar_staff','kitchen'];
  bar    text[] := ARRAY['owner','manager','bar_staff'];
  pay    text[] := ARRAY['owner','manager','front_desk','bar_staff','shop_staff'];
  none   text[] := '{}';
BEGIN
  FOR r IN SELECT * FROM (VALUES
    -- table                    read      write   public-readable
    ('club_modules',            staff,    mgr,    true),
    ('club_settings',           staff,    mgr,    true),
    ('club_staff',              staff,    owner_, false),
    ('club_gallery',            staff,    mgr,    true),
    ('tax_rates',               staff,    mgr,    true),
    ('document_sequences',      mgr,      mgr,    false),
    ('notification_templates',  mgr,      mgr,    false),
    ('reminder_rules',          mgr,      mgr,    false),
    ('notifications',           front,    front,  false),
    ('club_subscriptions',      mgr,      none,   false),
    ('audit_log',               mgr,      none,   false),
    ('sports',                  staff,    mgr,    true),
    ('courts',                  staff,    mgr,    true),
    ('court_operating_hours',   staff,    mgr,    true),
    ('court_rates',             staff,    mgr,    true),
    ('plans',                   staff,    mgr,    true),
    ('plan_benefits',           staff,    mgr,    true),
    ('members',                 staff,    front,  false),
    ('guardians',               staff,    front,  false),
    ('memberships',             staff,    front,  false),
    ('check_ins',               staff,    front,  false),
    ('wallet_transactions',     front,    front,  false),
    ('leads',                   front,    front,  false),
    ('lead_activities',         front,    front,  false),
    ('quotes',                  front,    front,  false),
    ('quote_items',             front,    front,  false),
    ('court_reservations',      staff,    front,  false),
    ('bookings',                staff,    front,  false),
    ('social_session_templates',staff,    front,  true),
    ('social_sessions',         staff,    front,  true),
    ('social_session_players',  staff,    front,  false),
    ('employees',               mgr,      mgr,    false),
    ('shifts',                  staff,    mgr,    false),
    ('leave_types',             staff,    mgr,    false),
    ('leave_requests',          mgr,      mgr,    false),
    ('payroll_runs',            mgr,      mgr,    false),
    ('payroll_entries',         mgr,      mgr,    false),
    ('brands',                  staff,    mgr,    true),
    ('product_categories',      staff,    mgr,    true),
    ('products',                staff,    shop,   false),
    ('product_variants',        staff,    shop,   false),
    ('suppliers',               shop,     shop,   false),
    ('purchase_orders',         shop,     shop,   false),
    ('purchase_order_items',    shop,     shop,   false),
    ('shop_orders',             shopf,    shopf,  false),
    ('shop_order_items',        shopf,    shopf,  false),
    ('stock_movements',         shopf,    shopf,  false),
    ('menu_categories',         staff,    mgr,    true),
    ('menu_items',              staff,    mgr,    true),
    ('dining_tables',           barkw,    bar,    false),
    ('tabs',                    barkw,    barw,   false),
    ('bar_orders',              barkw,    barw,   false),
    ('bar_order_items',         barkw,    barkw,  false),
    ('clients',                 front,    front,  false),
    ('invoices',                front,    front,  false),
    ('invoice_items',           front,    front,  false),
    ('payments',                pay,      pay,    false),
    ('payables',                mgr,      mgr,    false),
    ('tax_filings',             mgr,      mgr,    false)
  ) AS t(tbl, read_roles, write_roles, public_read)
  LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format($f$CREATE POLICY p_super ON app.%I FOR ALL
                      USING (app.ctx_role() = 'super_admin') WITH CHECK (app.ctx_role() = 'super_admin')$f$, r.tbl);
    EXECUTE format($f$CREATE POLICY p_staff_read ON app.%I FOR SELECT
                      USING (club_id = (SELECT app.ctx_club()) AND app.ctx_role() = ANY (%L::text[]))$f$, r.tbl, r.read_roles);
    IF cardinality(r.write_roles) > 0 THEN
      EXECUTE format($f$CREATE POLICY p_staff_write ON app.%I FOR ALL
                        USING (club_id = (SELECT app.ctx_club()) AND app.ctx_role() = ANY (%L::text[]))
                        WITH CHECK (club_id = (SELECT app.ctx_club()) AND app.ctx_role() = ANY (%L::text[]))$f$,
                     r.tbl, r.write_roles, r.write_roles);
    END IF;
    IF r.public_read THEN        -- website visitors + members: active/public rows only
      EXECUTE format($f$CREATE POLICY p_public_read ON app.%I FOR SELECT
                        USING (club_id = (SELECT app.ctx_club()) AND app.ctx_role() IN ('public','member')%s)$f$,
        r.tbl,
        (SELECT coalesce(string_agg(' AND ' || column_name, ''), '') FROM information_schema.columns
          WHERE table_schema = 'app' AND table_name = r.tbl AND column_name IN ('is_active','is_public','is_online')));
    END IF;
  END LOOP;
END $$;

-- ---- clubs
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_super        ON clubs FOR ALL USING (app.ctx_role() = 'super_admin') WITH CHECK (app.ctx_role() = 'super_admin');
CREATE POLICY p_public_read  ON clubs FOR SELECT USING (status = 'active' AND is_public);
CREATE POLICY p_staff_read   ON clubs FOR SELECT USING (id = (SELECT app.ctx_club()) AND app.ctx_role() IN ('owner','manager','front_desk','bar_staff','kitchen','shop_staff'));
CREATE POLICY p_owner_update ON clubs FOR UPDATE USING (id = (SELECT app.ctx_club()) AND app.ctx_role() IN ('owner','manager'))
                                                 WITH CHECK (id = (SELECT app.ctx_club()) AND app.ctx_role() IN ('owner','manager'));

-- ---- users (signup/login are done by the auth service on the owner role)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_super  ON users FOR ALL USING (app.ctx_role() = 'super_admin') WITH CHECK (app.ctx_role() = 'super_admin');
CREATE POLICY p_self   ON users FOR SELECT USING (id = (SELECT app.ctx_user()));
CREATE POLICY p_self_u ON users FOR UPDATE USING (id = (SELECT app.ctx_user())) WITH CHECK (id = (SELECT app.ctx_user()));
CREATE POLICY p_colleagues ON users FOR SELECT USING (
  app.ctx_role() IN ('owner','manager','front_desk')
  AND EXISTS (SELECT 1 FROM club_staff cs WHERE cs.user_id = users.id AND cs.club_id = (SELECT app.ctx_club())));

-- ---- SaaS plans: everyone can read, only the owner role writes
ALTER TABLE saas_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY p_read ON saas_plans FOR SELECT USING (is_active);

-- ---- shop catalog visible online (only online + active products / variants)
CREATE POLICY p_public_read ON products FOR SELECT
  USING (club_id = (SELECT app.ctx_club()) AND app.ctx_role() IN ('public','member') AND is_active AND is_online);
CREATE POLICY p_public_read ON product_variants FOR SELECT
  USING (club_id = (SELECT app.ctx_club()) AND app.ctx_role() IN ('public','member') AND is_active
         AND EXISTS (SELECT 1 FROM products p WHERE p.id = product_variants.product_id));

-- ---- members: see / edit own data (columns restricted by trg_guard)
CREATE POLICY p_self_read ON members FOR SELECT USING (club_id = (SELECT app.ctx_club()) AND id = (SELECT app.ctx_member()));
CREATE POLICY p_self_upd  ON members FOR UPDATE USING (club_id = (SELECT app.ctx_club()) AND id = (SELECT app.ctx_member()))
                                               WITH CHECK (club_id = (SELECT app.ctx_club()) AND id = (SELECT app.ctx_member()));
CREATE POLICY p_self_signup ON members FOR INSERT WITH CHECK (
  club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'public'
  AND user_id IS NOT NULL AND user_id = (SELECT app.ctx_user()) AND status = 'active');

-- ---- members: read their own rows in every member-owned table
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['memberships','check_ins','wallet_transactions','payments','invoices','bar_orders','tabs',
                           'shop_orders','bookings','social_session_players'] LOOP
    EXECUTE format($f$CREATE POLICY p_member_read ON app.%I FOR SELECT
                      USING (club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member' AND member_id = (SELECT app.ctx_member()))$f$, t);
  END LOOP;
END $$;
CREATE POLICY p_member_read ON invoice_items FOR SELECT USING (
  club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member'
  AND EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id));
CREATE POLICY p_member_read ON shop_order_items FOR SELECT USING (
  club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member'
  AND EXISTS (SELECT 1 FROM shop_orders o WHERE o.id = shop_order_items.order_id));
CREATE POLICY p_member_read ON notifications FOR SELECT USING (
  club_id = (SELECT app.ctx_club()) AND recipient_member_id = (SELECT app.ctx_member()));

-- ---- members: self-service court booking (price & plan are forced server-side by triggers)
CREATE POLICY p_member_read   ON court_reservations FOR SELECT USING (club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member');
CREATE POLICY p_member_insert ON court_reservations FOR INSERT WITH CHECK (
  club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member' AND kind = 'booking' AND status = 'active');
CREATE POLICY p_member_insert ON bookings FOR INSERT WITH CHECK (
  club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member' AND member_id = (SELECT app.ctx_member()) AND lead_id IS NULL);
CREATE POLICY p_member_update ON bookings FOR UPDATE
  USING (club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member' AND member_id = (SELECT app.ctx_member()))
  WITH CHECK (club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member' AND member_id = (SELECT app.ctx_member()));
CREATE POLICY p_member_insert ON social_session_players FOR INSERT WITH CHECK (
  club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member' AND member_id = (SELECT app.ctx_member()) AND status = 'joined');
CREATE POLICY p_member_update ON social_session_players FOR UPDATE
  USING (club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member' AND member_id = (SELECT app.ctx_member()))
  WITH CHECK (club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member' AND member_id = (SELECT app.ctx_member()));

-- ---- members: online shop orders
CREATE POLICY p_member_insert ON shop_orders FOR INSERT WITH CHECK (
  club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member' AND member_id = (SELECT app.ctx_member())
  AND channel = 'online' AND status = 'pending');
CREATE POLICY p_member_insert ON shop_order_items FOR INSERT WITH CHECK (
  club_id = (SELECT app.ctx_club()) AND app.ctx_role() = 'member'
  AND EXISTS (SELECT 1 FROM shop_orders o WHERE o.id = shop_order_items.order_id AND o.status = 'pending'));

-- ---- staff see their own employee row / leave; anyone on staff can request leave
CREATE POLICY p_own_read ON employees FOR SELECT USING (club_id = (SELECT app.ctx_club()) AND user_id = (SELECT app.ctx_user()));
CREATE POLICY p_own_read ON leave_requests FOR SELECT USING (
  club_id = (SELECT app.ctx_club()) AND EXISTS (SELECT 1 FROM employees e WHERE e.id = leave_requests.employee_id));
CREATE POLICY p_own_insert ON leave_requests FOR INSERT WITH CHECK (
  club_id = (SELECT app.ctx_club()) AND status = 'pending'
  AND EXISTS (SELECT 1 FROM employees e WHERE e.id = leave_requests.employee_id AND e.user_id = (SELECT app.ctx_user())));

-- ---- website enquiry form: visitors may create a NEW lead and nothing else
CREATE POLICY p_public_insert ON leads FOR INSERT WITH CHECK (
  club_id = (SELECT app.ctx_club()) AND app.ctx_role() IN ('public','member')
  AND status = 'new' AND assigned_to IS NULL AND converted_member_id IS NULL);

-- Safety net: abort the whole script if any table was left without RLS
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'app' AND c.relkind = 'r' AND NOT c.relrowsecurity LOOP
    RAISE EXCEPTION 'RLS is not enabled on app.%', t;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 17. GRANTS
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA app TO club_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO club_app;
REVOKE ALL ON user_credentials, platform_admins FROM club_app;
REVOKE INSERT, UPDATE, DELETE ON audit_log, saas_plans, club_subscriptions FROM club_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO club_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO club_app;

COMMIT;
-- If anything above errors in pgAdmin, run ROLLBACK; then fix and re-run on a clean schema.
