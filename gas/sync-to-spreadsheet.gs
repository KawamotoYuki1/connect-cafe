/**
 * Supabase → スプレッドシート 同期スクリプト
 *
 * Supabaseのデータをスプレッドシートにミラーリング。
 * 河本さんがスプシで直接データを確認できるようにする。
 *
 * セットアップ:
 * 1. スプレッドシート > 拡張機能 > Apps Script
 * 2. このコードを貼り付け
 * 3. スクリプトプロパティに SUPABASE_URL と SUPABASE_SERVICE_KEY を設定
 * 4. syncAll() を実行してテスト
 * 5. setupSyncTrigger() でトリガー設定（5分ごと）
 */

const SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL') || '';
const SUPABASE_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_SERVICE_KEY') || '';

// シート名マッピング
const SYNC_SHEETS = {
  'users': { sheetName: 'ユーザー', columns: ['email', 'name', 'role', 'registered_at', 'is_active'] },
  'menu_items': { sheetName: 'メニュー', columns: ['id', 'name', 'category', 'price', 'is_available', 'stock_count', 'sort_order', 'image_emoji', 'icon_svg'] },
  'point_balances': { sheetName: 'ポイント残高', columns: ['email', 'year_month', 'granted', 'used', 'remaining', 'granted_at', 'expired'] },
  'transactions': { sheetName: '取引履歴', columns: ['id', 'email', 'created_at', 'date', 'item_name', 'item_id', 'category', 'price', 'payment_type', 'points_used', 'status'] },
  'inventory_log': { sheetName: '在庫ログ', columns: ['created_at', 'admin_email', 'action', 'item_id', 'item_name', 'quantity_before', 'quantity_change', 'quantity_after', 'note'] },
  'config': { sheetName: '設定', columns: ['key', 'value'] },
};

// 日本語ヘッダー
const JP_HEADERS = {
  'email': 'メールアドレス', 'name': '名前', 'role': '権限', 'registered_at': '登録日時', 'is_active': '有効',
  'id': 'ID', 'category': 'カテゴリ', 'price': '価格', 'is_available': '販売中', 'stock_count': '在庫数',
  'sort_order': '表示順', 'image_emoji': '絵文字', 'icon_svg': 'アイコンキー',
  'year_month': '年月', 'granted': '付与pt', 'used': '使用pt', 'remaining': '残pt',
  'granted_at': '付与日時', 'expired': '期限切れ',
  'created_at': '日時', 'date': '日付', 'item_name': '商品名', 'item_id': '商品ID',
  'payment_type': '支払方法', 'points_used': '使用pt', 'status': 'ステータス',
  'admin_email': '管理者', 'action': '操作', 'quantity_before': '変更前',
  'quantity_change': '変更数', 'quantity_after': '変更後', 'note': 'メモ',
  'key': '設定キー', 'value': '設定値',
};

// ===== Supabase API =====

function supabaseFetch(table, params) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    Logger.log('エラー: SUPABASE_URL または SUPABASE_SERVICE_KEY が未設定');
    return [];
  }

  var url = SUPABASE_URL + '/rest/v1/' + table;
  if (params) url += '?' + params;

  var response = UrlFetchApp.fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    },
    muteHttpExceptions: true,
  });

  if (response.getResponseCode() !== 200) {
    Logger.log('Supabase エラー (' + table + '): ' + response.getContentText());
    return [];
  }

  return JSON.parse(response.getContentText());
}

// ===== 同期メイン =====

function syncAll() {
  var tables = Object.keys(SYNC_SHEETS);
  for (var i = 0; i < tables.length; i++) {
    syncTable(tables[i]);
  }
  Logger.log('全テーブル同期完了');
}

function syncTable(table) {
  var config = SYNC_SHEETS[table];
  if (!config) return;

  // テーブルごとにソート列を変える（idがないテーブルがある）
  var orderCol = { users: 'email', config: 'key' };
  var order = orderCol[table] ? orderCol[table] + '.asc' : 'id.asc.nullslast';
  var data = supabaseFetch(table, 'select=*&order=' + order);
  Logger.log(table + ': ' + data.length + '行取得');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(config.sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(config.sheetName);
  }

  // ヘッダー作成
  var headers = config.columns.map(function(col) { return JP_HEADERS[col] || col; });

  // シートをクリアして書き込み
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // ヘッダースタイル
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#085041');
  headerRange.setFontColor('#FFFFFF');
  sheet.setFrozenRows(1);

  if (data.length === 0) return;

  // データ行作成
  var rows = data.map(function(row) {
    return config.columns.map(function(col) {
      var val = row[col];
      if (val === true) return 'TRUE';
      if (val === false) return 'FALSE';
      if (val === null || val === undefined) return '';
      return val;
    });
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  Logger.log(config.sheetName + ': ' + rows.length + '行書き込み完了');
}

// ===== 月初ポイント加算 =====

/**
 * 毎月1日に実行: 全アクティブユーザーの残高に+1,000pt加算（繰り越し方式）
 * ポイントは消失せず、毎月加算される
 */
function monthlyPointReset() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    Logger.log('エラー: Supabase設定が未完了');
    return;
  }

  var now = new Date();
  var ym = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM');

  // 全アクティブユーザーを取得
  var users = supabaseFetch('users', 'select=email&is_active=eq.true');

  var granted = 0;
  for (var i = 0; i < users.length; i++) {
    var email = users[i].email;

    // 今月分が既にあるか確認
    var existing = supabaseFetch('point_balances', 'select=*&email=eq.' + encodeURIComponent(email) + '&year_month=eq.' + ym + '&expired=eq.false');

    if (existing.length > 0) {
      // 既に今月分がある → grantedに+1000を加算
      var current = existing[0];
      var newGranted = (current.granted || 0) + 1000;
      var patchUrl = SUPABASE_URL + '/rest/v1/point_balances?id=eq.' + current.id;
      UrlFetchApp.fetch(patchUrl, {
        method: 'patch',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        payload: JSON.stringify({ granted: newGranted }),
        muteHttpExceptions: true,
      });
    } else {
      // 今月分がない → 前月の残高を繰り越して新規作成
      // 前月の残高を取得
      var prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      var prevYm = Utilities.formatDate(prevMonth, 'Asia/Tokyo', 'yyyy-MM');
      var prevBalance = supabaseFetch('point_balances', 'select=remaining&email=eq.' + encodeURIComponent(email) + '&year_month=eq.' + prevYm);
      var carryOver = prevBalance.length > 0 ? (prevBalance[0].remaining || 0) : 0;

      // 繰り越し分 + 1000pt で新規作成
      var insertUrl = SUPABASE_URL + '/rest/v1/point_balances';
      UrlFetchApp.fetch(insertUrl, {
        method: 'post',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        payload: JSON.stringify({
          email: email,
          year_month: ym,
          granted: carryOver + 1000,
          used: 0,
          granted_at: now.toISOString(),
          expired: false,
        }),
        muteHttpExceptions: true,
      });

      // 前月分を期限切れに（データ整理用）
      if (prevBalance.length > 0) {
        var expireUrl = SUPABASE_URL + '/rest/v1/point_balances?email=eq.' + encodeURIComponent(email) + '&year_month=eq.' + prevYm + '&expired=eq.false';
        UrlFetchApp.fetch(expireUrl, {
          method: 'patch',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          payload: JSON.stringify({ expired: true }),
          muteHttpExceptions: true,
        });
      }
    }
    granted++;
  }

  Logger.log('月次ポイント加算完了: ' + ym + ' / ' + granted + '人に+1,000pt');
}

/**
 * 月初トリガーを設定（毎月1日 1:00に実行）
 */
function setupMonthlyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'monthlyPointReset') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('monthlyPointReset')
    .timeBased()
    .onMonthDay(1)
    .atHour(1)
    .create();

  Logger.log('毎月1日 1:00 の月次リセットトリガーを設定しました');
}

// ===== トリガー設定 =====

function setupSyncTrigger() {
  // 既存トリガー削除
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'syncAll') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  // 5分ごとに同期
  ScriptApp.newTrigger('syncAll')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('5分ごとの同期トリガーを設定しました');
}
