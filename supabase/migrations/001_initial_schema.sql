-- Connect Cafe - Supabase Schema
-- 6テーブル: users, point_balances, transactions, menu_items, inventory_log, config

-- ========== ユーザー ==========
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ========== ポイント残高 ==========
CREATE TABLE IF NOT EXISTS point_balances (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL REFERENCES users(email),
  year_month TEXT NOT NULL, -- '2026-04'
  granted INTEGER NOT NULL DEFAULT 1000,
  used INTEGER NOT NULL DEFAULT 0,
  remaining INTEGER GENERATED ALWAYS AS (granted - used) STORED,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expired BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(email, year_month, expired)
);

-- ========== メニュー ==========
CREATE TABLE IF NOT EXISTS menu_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'meal' CHECK (category IN ('free', 'drink', 'snack', 'meal')),
  price INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  stock_count INTEGER NOT NULL DEFAULT 0, -- -1 = unlimited
  sort_order INTEGER NOT NULL DEFAULT 0,
  image_emoji TEXT NOT NULL DEFAULT '🆕',
  icon_svg TEXT, -- SVGアイコン（将来用）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 取引履歴 ==========
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL REFERENCES users(email),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  date TEXT NOT NULL DEFAULT TO_CHAR(NOW() AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD'),
  item_name TEXT NOT NULL,
  item_id BIGINT REFERENCES menu_items(id),
  category TEXT,
  price INTEGER NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('point', 'paypay', 'free')),
  points_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled'))
);

-- ========== 在庫ログ ==========
CREATE TABLE IF NOT EXISTS inventory_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('restock', 'stocktake', 'adjust')),
  item_id BIGINT REFERENCES menu_items(id),
  item_name TEXT NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_change INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  note TEXT DEFAULT ''
);

-- ========== 設定 ==========
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ========== 初期データ: 設定 ==========
INSERT INTO config (key, value) VALUES
  ('monthly_points', '1000'),
  ('daily_point_limit', '1'),
  ('company_domain', 'chronusinc.jp')
ON CONFLICT (key) DO NOTHING;

-- ========== 初期データ: メニュー ==========
INSERT INTO menu_items (name, category, price, is_available, stock_count, sort_order, image_emoji) VALUES
  ('水', 'free', 0, TRUE, -1, 1, '💧'),
  ('コーヒー', 'free', 0, TRUE, -1, 2, '☕'),
  ('烏龍茶', 'free', 0, TRUE, -1, 3, '🍵'),
  ('お湯', 'free', 0, TRUE, -1, 4, '♨️'),
  ('コーラ', 'drink', 100, TRUE, 0, 10, '🥤'),
  ('コーラゼロ', 'drink', 100, TRUE, 0, 11, '🥤'),
  ('レッドブル', 'drink', 200, TRUE, 0, 12, '⚡'),
  ('牛乳', 'drink', 200, TRUE, 0, 13, '🥛'),
  ('オレンジ', 'drink', 200, TRUE, 0, 14, '🍊'),
  ('スナック', 'snack', 100, TRUE, 0, 20, '🍿'),
  ('レンチンごはん', 'meal', 200, TRUE, 0, 30, '🍚'),
  ('チキンヌードル', 'meal', 200, TRUE, 0, 31, '🍜'),
  ('カレーヌードル', 'meal', 200, TRUE, 0, 32, '🍛'),
  ('きつねうどん', 'meal', 200, TRUE, 0, 33, '🦊'),
  ('たぬきそば', 'meal', 200, TRUE, 0, 34, '🍜'),
  ('焼きそば', 'meal', 200, TRUE, 0, 35, '🍝'),
  ('カレー', 'meal', 500, TRUE, 0, 36, '🍛'),
  ('牛丼', 'meal', 500, TRUE, 0, 37, '🥩'),
  ('ピザ', 'meal', 500, TRUE, 0, 38, '🍕')
ON CONFLICT DO NOTHING;

-- ========== 初期データ: 管理者 ==========
INSERT INTO users (email, name, role) VALUES
  ('kawamoto@chronusinc.jp', '河本', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 今月のポイント付与
INSERT INTO point_balances (email, year_month, granted, used, granted_at, expired) VALUES
  ('kawamoto@chronusinc.jp', TO_CHAR(NOW() AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM'), 1000, 0, NOW(), FALSE)
ON CONFLICT DO NOTHING;

-- ========== RLS (Row Level Security) ==========
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- メニューと設定は全員読み取り可
CREATE POLICY "menu_read" ON menu_items FOR SELECT USING (true);
CREATE POLICY "config_read" ON config FOR SELECT USING (true);

-- ユーザーは自分のデータのみ読み取り可
CREATE POLICY "users_read_own" ON users FOR SELECT USING (auth.jwt() ->> 'email' = email);
CREATE POLICY "users_admin_read" ON users FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.email = auth.jwt() ->> 'email' AND u.role = 'admin')
);

-- ポイント残高: 自分のみ読み取り、admin全部
CREATE POLICY "balance_read_own" ON point_balances FOR SELECT USING (auth.jwt() ->> 'email' = email);
CREATE POLICY "balance_admin_read" ON point_balances FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.email = auth.jwt() ->> 'email' AND u.role = 'admin')
);

-- トランザクション: 自分のみ読み取り、admin全部
CREATE POLICY "tx_read_own" ON transactions FOR SELECT USING (auth.jwt() ->> 'email' = email);
CREATE POLICY "tx_admin_read" ON transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM users u WHERE u.email = auth.jwt() ->> 'email' AND u.role = 'admin')
);

-- 在庫ログ: adminのみ
CREATE POLICY "invlog_admin" ON inventory_log FOR ALL USING (
  EXISTS (SELECT 1 FROM users u WHERE u.email = auth.jwt() ->> 'email' AND u.role = 'admin')
);

-- 書き込み系: サーバーサイド（service_role）またはEdge Functionで処理
-- フロントからの書き込みはEdge Function経由にする
