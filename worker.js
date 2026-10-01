// moruko-lp Worker: 静的アセット配信 + 申し込み受付API（/api/apply）
// 申し込み内容を北さんのTelegramへ通知する。秘密情報は wrangler secret（TG_BOT_TOKEN）で注入。
// PREVIEW="1"（moruko-lp-v2 プレビュー）のときは通知を送らず、受付番号だけ返す。

// カード決済: ¥250,000（税込）plink_1ULXpXIgbCdh16E59rbR4OFF
const PAYMENT_LINK = 'https://buy.stripe.com/28EaEXh0zd6t2ZA2qu3wQ0m';
const ALLOWED_ORIGINS = ['https://moruko.groundmole.space'];
const LIMITS = { name: 80, email: 160, phone: 30, zip: 10, address: 300, purpose: 2000 };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/apply') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);
      return handleApply(request, env, url);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleApply(request, env, url) {
  const origin = request.headers.get('Origin');
  if (origin && !ALLOWED_ORIGINS.includes(origin) && origin !== url.origin) {
    return json({ ok: false, error: 'forbidden' }, 403);
  }

  const ctype = request.headers.get('Content-Type') || '';
  const isJson = ctype.includes('application/json');
  let data = {};
  try {
    if (isJson) {
      data = await request.json();
    } else {
      const fd = await request.formData();
      for (const [k, v] of fd.entries()) data[k] = typeof v === 'string' ? v : '';
    }
  } catch (e) {
    return respond(isJson, { ok: false, error: 'bad_request' }, 400, '', '', '', url);
  }

  const f = {};
  for (const key of Object.keys(LIMITS)) f[key] = String(data[key] ?? '').trim().slice(0, LIMITS[key]);
  const method = data.method === 'card' ? 'card' : data.method === 'bank' ? 'bank' : '';
  const truthy = v => v === true || v === 'on' || v === 'true' || v === '1';
  const agree = truthy(data.agree);
  const agreeContract = truthy(data.agree_contract);

  // ボット対策（honeypot）: 埋まっていたら黙って成功扱い
  if (String(data.website ?? '').trim()) {
    return respond(isJson, { ok: true, id: 'MRK-IGNORED', method }, 200, method, '', '', url);
  }

  const missing = [];
  if (!f.name) missing.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) missing.push('email');
  if (f.phone.replace(/[^0-9]/g, '').length < 10) missing.push('phone');
  if (!f.address) missing.push('address');
  if (!method) missing.push('method');
  if (!agreeContract) missing.push('agree_contract');
  if (!agree) missing.push('agree');
  if (missing.length) return respond(isJson, { ok: false, error: 'invalid', fields: missing }, 422, '', '', '', url);

  const id = makeId(env.PREVIEW === '1');

  // プレビュー環境: 通知を送らない（本番と同じ検証・同じレスポンス形だけ返す）
  if (env.PREVIEW === '1') {
    console.log('[preview] apply received (no notification sent)', id, method);
    return respond(isJson, { ok: true, id, method, preview: true }, 200, method, f.email, id, url);
  }

  const methodLabel = method === 'card' ? 'クレジットカード（Stripe決済ページへ遷移）' : '銀行振込（振込先の案内メール待ち）';
  const text = [
    'moruko 申し込みが届きました',
    '',
    '受付番号: ' + id,
    'プラン: ' + (method === 'card'
      ? '買い切りプラン ¥250,000（税込・カード決済）'
      : '買い切りプラン ¥240,000（税込・銀行振込）'),
    '利用契約書への同意: あり（申し込みフォームで確認）',
    'お支払い方法: ' + methodLabel,
    '',
    'お名前: ' + f.name,
    'メール: ' + f.email,
    '電話: ' + f.phone,
    '配送先: ' + (f.zip ? '〒' + f.zip + ' ' : '') + f.address,
    '使いたいこと: ' + (f.purpose || '（未記入）'),
    '',
    method === 'bank'
      ? '対応: 振込先と期日を ' + f.email + ' へメールで案内してください（振込額 ¥240,000）。'
      : '対応: Stripeで決済完了を確認してください（client_reference_id = ' + id + '）。未決済のまま離脱している場合あり。',
  ].join('\n');

  const sent = await notifyTelegram(env, text);
  if (!sent) return respond(isJson, { ok: false, error: 'notify_failed' }, 502, '', '', '', url);

  return respond(isJson, { ok: true, id, method }, 200, method, f.email, id, url);
}

async function notifyTelegram(env, text) {
  if (!env.TG_BOT_TOKEN || !env.TG_CHAT_ID) return false;
  try {
    const r = await fetch('https://api.telegram.org/bot' + env.TG_BOT_TOKEN + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text, disable_web_page_preview: true }),
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}

function makeId(preview) {
  const d = new Date(Date.now() + 9 * 3600 * 1000); // JST
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.getRandomValues(new Uint8Array(3));
  return (preview ? 'MRK-PREVIEW-' : 'MRK-') + ymd + '-' + Array.from(rand, b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// JS無効時（通常のフォームPOST）はリダイレクトで返す。リダイレクト先は自サイト（本番=カスタムドメイン、プレビュー=workers.dev）
function respond(isJson, body, status, method, email, id, url) {
  if (isJson) return json(body, status);
  const site = url ? url.origin : 'https://moruko.groundmole.space';
  if (body.ok) {
    if (method === 'card') {
      const u = new URL(PAYMENT_LINK);
      if (email) u.searchParams.set('prefilled_email', email);
      if (id) u.searchParams.set('client_reference_id', id);
      return Response.redirect(u.toString(), 303);
    }
    return Response.redirect(site + '/thanks.html?method=bank', 303);
  }
  return Response.redirect(site + '/apply.html?error=' + encodeURIComponent(body.error || 'error'), 303);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
