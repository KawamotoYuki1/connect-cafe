/**
 * Connect Cafe - GAS API Proxy
 *
 * スプレッドシートへの読み書きを仲介するWebアプリ。
 * Google OAuth トークンで認証し、@chronusinc.jp ドメインのみアクセス許可。
 *
 * デプロイ方法:
 * 1. スプレッドシート > 拡張機能 > Apps Script
 * 2. このコードを貼り付け
 * 3. デプロイ > 新しいデプロイ > ウェブアプリ
 * 4. アクセスできるユーザー: 「全員」
 * 5. デプロイ後のURLをフロントエンドの config.js に設定
 */

const SPREADSHEET_ID = '1ISj7tNTYLTScG4Zwq7p9OtVrOxhgin_IlApLS8A4TLc';
const ALLOWED_DOMAIN = 'chronusinc.jp';

// 日本語ヘッダー → 英語フィールド名マッピング
// スプレッドシートは日本語ヘッダーだが、コード内部では英語キーを使用
const COL_MAP = {
  // users
  'メールアドレス': 'email',
  '名前': 'name',
  '権限': 'role',
  '登録日時': 'registered_at',
  '有効': 'is_active',
  // point_balances
  '年月': 'year_month',
  '付与pt': 'granted',
  '使用pt': 'used',
  '残pt': 'remaining',
  '付与日時': 'granted_at',
  '期限切れ': 'expired',
  // transactions
  '取引ID': 'id',
  '日時': 'timestamp',
  '日付': 'date',
  '商品名': 'item_name',
  '商品ID': 'item_id',
  'カテゴリ': 'category',
  '価格': 'price',
  '支払方法': 'payment_type',
  // '使用pt' は point_balances と共有（上で定義済み → transactions では 'points_used'）
  'ステータス': 'status',
  // menu_items
  '販売中': 'is_available',
  '在庫数': 'stock_count',
  '表示順': 'sort_order',
  'アイコン': 'image_emoji',
  // inventory_log
  '管理者': 'admin_email',
  '操作': 'action',
  '変更前': 'quantity_before',
  '変更数': 'quantity_change',
  '変更後': 'quantity_after',
  'メモ': 'note',
  // config
  '設定キー': 'key',
  '設定値': 'value',
};

// シートごとに「使用pt」の意味が異なるため、シート名で分岐するマッピング
const SHEET_SPECIFIC_MAP = {
  'transactions': { '使用pt': 'points_used' },
  'point_balances': { '使用pt': 'used' },
};

// ========== エントリーポイント ==========

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const params = e.parameter || {};
  const action = params.action;

  // CORS対応
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    // 認証チェック
    const token = params.token;
    if (!token) {
      return jsonResponse({ error: 'Token required' }, 401);
    }

    const userInfo = verifyToken(token);
    if (!userInfo) {
      return jsonResponse({ error: 'Invalid token' }, 401);
    }

    if (!userInfo.email.endsWith('@' + ALLOWED_DOMAIN)) {
      return jsonResponse({ error: 'Unauthorized domain' }, 403);
    }

    // ルーティング
    const result = routeAction(action, params, userInfo, e);
    return jsonResponse(result);

  } catch (err) {
    return jsonResponse({ error: err.message }, 500);
  }
}

// ========== 認証 ==========

function verifyToken(token) {
  try {
    const url = 'https://www.googleapis.com/oauth2/v3/userinfo';
    const res = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return null;
    return JSON.parse(res.getContentText());
  } catch (e) {
    return null;
  }
}

// ========== ルーティング ==========

function routeAction(action, params, user, e) {
  switch (action) {
    // ユーザー
    case 'getUser': return getUser(user.email);
    case 'registerUser': return registerUser(user);
    case 'listUsers': return requireAdmin(user, () => listUsers());
    case 'toggleAdmin': return requireAdmin(user, () => toggleAdmin(params.targetEmail));

    // メニュー
    case 'getMenu': return getMenu();

    // ポイント
    case 'getBalance': return getBalance(user.email);
    case 'getAllBalances': return requireAdmin(user, () => getAllBalances());
    case 'grantPoints': return requireAdmin(user, () => grantPoints(params.targetEmail, Number(params.amount)));

    // 取引
    case 'purchase': return purchase(user, JSON.parse(params.item), params.paymentType);
    case 'getHistory': return getHistory(user.email, params.limit);
    case 'getAllHistory': return requireAdmin(user, () => getAllHistory(params.limit, params.dateFrom, params.dateTo));
    case 'getTodayStats': return requireAdmin(user, () => getTodayStats());

    // 在庫
    case 'restock': return requireAdmin(user, () => restock(user.email, Number(params.itemId), Number(params.quantity), params.note));
    case 'stocktake': return requireAdmin(user, () => stocktake(user.email, JSON.parse(params.counts)));
    case 'getInventoryLog': return requireAdmin(user, () => getInventoryLog(params.limit));
    case 'updateMenuItem': return requireAdmin(user, () => updateMenuItem(Number(params.itemId), JSON.parse(params.updates)));
    case 'addMenuItem': return requireAdmin(user, () => addMenuItem(JSON.parse(params.item)));
    case 'deleteMenuItem': return requireAdmin(user, () => deleteMenuItem(Number(params.itemId)));
    case 'reorderMenu': return requireAdmin(user, () => reorderMenu(JSON.parse(params.order)));

    // 設定
    case 'getConfig': return getConfig();

    // 月次処理
    case 'monthlyReset': return requireAdmin(user, () => monthlyReset());

    default:
      return { error: 'Unknown action: ' + action };
  }
}

// ========== ヘルパー ==========

function jsonResponse(data, status) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const sheetName = sheet.getName();
  const specific = SHEET_SPECIFIC_MAP[sheetName] || {};
  const headers = data[0].map(h => specific[h] || COL_MAP[h] || h);
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function findRowIndex(sheet, col, value) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][col] === value) return i + 1; // 1-indexed
  }
  return -1;
}

function requireAdmin(user, fn) {
  const userRow = getUser(user.email);
  if (!userRow || userRow.role !== 'admin') {
    return { error: 'Admin required' };
  }
  return fn();
}

function nowJST() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss");
}

function todayJST() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
}

function currentYearMonth() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM');
}

function generateUUID() {
  return Utilities.getUuid();
}

// ========== ユーザー ==========

function getUser(email) {
  const sheet = getSheet('users');
  const users = sheetToObjects(sheet);
  return users.find(u => u.email === email) || null;
}

function registerUser(userInfo) {
  const sheet = getSheet('users');
  const existing = getUser(userInfo.email);
  if (existing) return existing;

  const newUser = [userInfo.email, userInfo.name || '', 'user', nowJST(), 'TRUE'];
  sheet.appendRow(newUser);

  // 今月のポイントも付与
  grantPointsInternal(userInfo.email, 1000);

  return { email: userInfo.email, name: userInfo.name, role: 'user', registered_at: nowJST(), is_active: true };
}

function listUsers() {
  const sheet = getSheet('users');
  return sheetToObjects(sheet);
}

function toggleAdmin(targetEmail) {
  const sheet = getSheet('users');
  const row = findRowIndex(sheet, 0, targetEmail);
  if (row === -1) return { error: 'User not found' };

  const currentRole = sheet.getRange(row, 3).getValue();
  const newRole = currentRole === 'admin' ? 'user' : 'admin';
  sheet.getRange(row, 3).setValue(newRole);
  return { email: targetEmail, role: newRole };
}

// ========== メニュー ==========

function getMenu() {
  const sheet = getSheet('menu_items');
  return sheetToObjects(sheet);
}

// ========== ポイント ==========

function getBalance(email) {
  const sheet = getSheet('point_balances');
  const ym = currentYearMonth();
  const all = sheetToObjects(sheet);
  const current = all.find(b => b.email === email && b.year_month === ym && b.expired !== 'TRUE' && b.expired !== true);
  if (!current) return { email, year_month: ym, granted: 0, used: 0, remaining: 0 };
  return current;
}

function getAllBalances() {
  const sheet = getSheet('point_balances');
  const ym = currentYearMonth();
  const all = sheetToObjects(sheet);
  return all.filter(b => b.year_month === ym && b.expired !== 'TRUE' && b.expired !== true);
}

function grantPoints(targetEmail, amount) {
  return grantPointsInternal(targetEmail, amount || 1000);
}

function grantPointsInternal(email, amount) {
  const sheet = getSheet('point_balances');
  const ym = currentYearMonth();

  // 既存の今月分があるか確認
  const all = sheetToObjects(sheet);
  const existing = all.find(b => b.email === email && b.year_month === ym && b.expired !== 'TRUE' && b.expired !== true);

  if (existing) {
    // 既存のgrantedに加算
    const row = findBalanceRow(sheet, email, ym);
    if (row > 0) {
      const currentGranted = Number(sheet.getRange(row, 3).getValue());
      const currentRemaining = Number(sheet.getRange(row, 5).getValue());
      sheet.getRange(row, 3).setValue(currentGranted + amount);
      sheet.getRange(row, 5).setValue(currentRemaining + amount);
    }
    return { email, added: amount };
  }

  // 新規作成
  sheet.appendRow([email, ym, amount, 0, amount, nowJST(), 'FALSE']);
  return { email, year_month: ym, granted: amount, used: 0, remaining: amount };
}

function findBalanceRow(sheet, email, ym) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email && data[i][1] === ym && data[i][6] !== 'TRUE' && data[i][6] !== true) {
      return i + 1;
    }
  }
  return -1;
}

// ========== 取引 ==========

function purchase(user, item, paymentType) {
  const today = todayJST();
  const txSheet = getSheet('transactions');

  // ポイント購入の場合：1日1回制限チェック
  if (paymentType === 'point') {
    const txData = sheetToObjects(txSheet);
    const todayPointTx = txData.find(t =>
      t.email === user.email && t.date === today &&
      t.payment_type === 'point' && t.status === 'completed'
    );
    if (todayPointTx) {
      return { error: '本日のポイント利用は上限に達しています（1日1商品まで）' };
    }

    // ポイント残高チェック
    const balance = getBalance(user.email);
    if (balance.remaining < item.price) {
      return { error: 'ポイントが不足しています' };
    }

    // ポイント消費
    const balanceSheet = getSheet('point_balances');
    const bRow = findBalanceRow(balanceSheet, user.email, currentYearMonth());
    if (bRow > 0) {
      const used = Number(balanceSheet.getRange(bRow, 4).getValue());
      const remaining = Number(balanceSheet.getRange(bRow, 5).getValue());
      balanceSheet.getRange(bRow, 4).setValue(used + item.price);
      balanceSheet.getRange(bRow, 5).setValue(remaining - item.price);
    }
  }

  // 在庫減算（stock_count > 0 の場合のみ）
  const menuSheet = getSheet('menu_items');
  const menuData = menuSheet.getDataRange().getValues();
  for (let i = 1; i < menuData.length; i++) {
    if (Number(menuData[i][0]) === Number(item.id)) {
      const stock = Number(menuData[i][5]);
      if (stock > 0) {
        menuSheet.getRange(i + 1, 6).setValue(stock - 1);
        if (stock - 1 === 0) {
          menuSheet.getRange(i + 1, 5).setValue('FALSE'); // is_available
        }
      } else if (stock === 0) {
        return { error: 'この商品は在庫切れです' };
      }
      // stock === -1 は無制限（freeドリンク等）
      break;
    }
  }

  // トランザクション記録
  const txId = generateUUID();
  const pointsUsed = paymentType === 'point' ? item.price : 0;
  txSheet.appendRow([
    txId, user.email, nowJST(), today,
    item.name, item.id, item.category, item.price,
    paymentType, pointsUsed, 'completed'
  ]);

  return {
    success: true,
    transactionId: txId,
    paymentType,
    item: item.name,
    price: item.price,
    pointsUsed
  };
}

function getHistory(email, limit) {
  const sheet = getSheet('transactions');
  const all = sheetToObjects(sheet);
  const userTx = all.filter(t => t.email === email).reverse();
  return limit ? userTx.slice(0, Number(limit)) : userTx;
}

function getAllHistory(limit, dateFrom, dateTo) {
  const sheet = getSheet('transactions');
  const all = sheetToObjects(sheet);
  let filtered = all;
  if (dateFrom) filtered = filtered.filter(t => t.date >= dateFrom);
  if (dateTo) filtered = filtered.filter(t => t.date <= dateTo);
  filtered = filtered.reverse();
  return limit ? filtered.slice(0, Number(limit)) : filtered;
}

function getTodayStats() {
  const today = todayJST();
  const sheet = getSheet('transactions');
  const all = sheetToObjects(sheet);
  const todayTx = all.filter(t => t.date === today && t.status === 'completed');

  const pointCount = todayTx.filter(t => t.payment_type === 'point').length;
  const paypayCount = todayTx.filter(t => t.payment_type === 'paypay').length;
  const paypayTotal = todayTx.filter(t => t.payment_type === 'paypay').reduce((s, t) => s + Number(t.price), 0);
  const pointTotal = todayTx.filter(t => t.payment_type === 'point').reduce((s, t) => s + Number(t.points_used), 0);

  return { date: today, pointCount, paypayCount, paypayTotal, pointTotal, totalTransactions: todayTx.length };
}

// ========== 在庫管理 ==========

function restock(adminEmail, itemId, quantity, note) {
  const menuSheet = getSheet('menu_items');
  const logSheet = getSheet('inventory_log');
  const data = menuSheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === itemId) {
      const before = Number(data[i][5]);
      const after = before === -1 ? quantity : before + quantity;
      menuSheet.getRange(i + 1, 6).setValue(after);
      if (after > 0) {
        menuSheet.getRange(i + 1, 5).setValue('TRUE');
      }

      logSheet.appendRow([nowJST(), adminEmail, 'restock', itemId, data[i][1], before, quantity, after, note || '']);
      return { itemId, itemName: data[i][1], before, after };
    }
  }
  return { error: 'Item not found' };
}

function stocktake(adminEmail, counts) {
  // counts: [{itemId: 1, actual: 5}, ...]
  const menuSheet = getSheet('menu_items');
  const logSheet = getSheet('inventory_log');
  const data = menuSheet.getDataRange().getValues();
  const results = [];

  for (const count of counts) {
    for (let i = 1; i < data.length; i++) {
      if (Number(data[i][0]) === Number(count.itemId)) {
        const before = Number(data[i][5]);
        const actual = Number(count.actual);
        const diff = actual - (before === -1 ? 0 : before);

        menuSheet.getRange(i + 1, 6).setValue(actual);
        menuSheet.getRange(i + 1, 5).setValue(actual > 0 ? 'TRUE' : 'FALSE');

        logSheet.appendRow([nowJST(), adminEmail, 'stocktake', count.itemId, data[i][1], before, diff, actual, '棚卸し']);
        results.push({ itemId: count.itemId, name: data[i][1], before, actual, diff });
        break;
      }
    }
  }
  return results;
}

function getInventoryLog(limit) {
  const sheet = getSheet('inventory_log');
  const all = sheetToObjects(sheet).reverse();
  return limit ? all.slice(0, Number(limit)) : all;
}

function updateMenuItem(itemId, updates) {
  const sheet = getSheet('menu_items');
  const data = sheet.getDataRange().getValues();
  const rawHeaders = data[0];
  // 英語キー → 日本語ヘッダーの逆引きマップを構築
  const englishToJp = {};
  rawHeaders.forEach(h => {
    const eng = COL_MAP[h] || h;
    englishToJp[eng] = h;
  });

  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === itemId) {
      for (const [key, value] of Object.entries(updates)) {
        // フロントから英語キーが来るので、日本語ヘッダーに変換して検索
        const jpHeader = englishToJp[key] || key;
        const colIndex = rawHeaders.indexOf(jpHeader);
        if (colIndex >= 0) {
          sheet.getRange(i + 1, colIndex + 1).setValue(value);
        }
      }
      return { success: true, itemId };
    }
  }
  return { error: 'Item not found' };
}

// ========== メニュー追加・削除・並べ替え ==========

function addMenuItem(item) {
  const sheet = getSheet('menu_items');
  const data = sheet.getDataRange().getValues();
  // 新しいIDを生成（既存の最大ID + 1）
  let maxId = 0;
  for (let i = 1; i < data.length; i++) {
    const id = Number(data[i][0]);
    if (id > maxId) maxId = id;
  }
  const newId = maxId + 1;
  const sortOrder = item.sort_order || (newId * 10);
  sheet.appendRow([
    newId,
    item.name || '新商品',
    item.category || 'meal',
    Number(item.price) || 0,
    'TRUE',
    Number(item.stock_count) || 0,
    sortOrder,
    item.image_emoji || '🆕'
  ]);
  return { success: true, id: newId, name: item.name };
}

function deleteMenuItem(itemId) {
  const sheet = getSheet('menu_items');
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (Number(data[i][0]) === itemId) {
      sheet.deleteRow(i + 1);
      return { success: true, itemId };
    }
  }
  return { error: 'Item not found' };
}

function reorderMenu(order) {
  // order: [{id: 1, sort_order: 10}, {id: 2, sort_order: 20}, ...]
  const sheet = getSheet('menu_items');
  const data = sheet.getDataRange().getValues();
  for (const item of order) {
    for (let i = 1; i < data.length; i++) {
      if (Number(data[i][0]) === Number(item.id)) {
        sheet.getRange(i + 1, 7).setValue(Number(item.sort_order)); // 7列目=表示順
        break;
      }
    }
  }
  return { success: true, updated: order.length };
}

// ========== 設定 ==========

function getConfig() {
  const sheet = getSheet('config');
  const data = sheetToObjects(sheet);
  const config = {};
  data.forEach(row => config[row.key] = row.value);
  return config;
}

// ========== 月次処理 ==========

function monthlyReset() {
  const sheet = getSheet('point_balances');
  const userSheet = getSheet('users');
  const ym = currentYearMonth();
  const data = sheet.getDataRange().getValues();

  // 前月分を期限切れに
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] !== ym && data[i][6] !== 'TRUE' && data[i][6] !== true) {
      sheet.getRange(i + 1, 7).setValue('TRUE');
    }
  }

  // 全アクティブユーザーに今月分を付与
  const users = sheetToObjects(userSheet).filter(u => u.is_active === 'TRUE' || u.is_active === true);
  const config = getConfig();
  const monthlyPoints = Number(config.monthly_points) || 1000;

  let granted = 0;
  for (const user of users) {
    const existing = sheetToObjects(sheet).find(b => b.email === user.email && b.year_month === ym);
    if (!existing) {
      sheet.appendRow([user.email, ym, monthlyPoints, 0, monthlyPoints, nowJST(), 'FALSE']);
      granted++;
    }
  }

  return { month: ym, usersGranted: granted, pointsPerUser: monthlyPoints };
}

// 月次トリガー用（毎月1日に実行）
function setupMonthlyTrigger() {
  // 既存トリガー削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'monthlyReset') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // 毎月1日 1:00 に実行
  ScriptApp.newTrigger('monthlyReset')
    .timeBased()
    .onMonthDay(1)
    .atHour(1)
    .create();
}
