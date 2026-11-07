import { handleDiagnose } from './shindan_api/handler.js';
export { ShindanCounter } from './shindan_api/counter.js';

// moruko-lp Worker: 静的アセット配信 + 申し込み受付API（/api/apply）
// 無料AI業務診断: /shindan（静的）+ /api/diagnose（Gemini診断 → 北さんのTelegramへ要約通知）
// 申し込み内容を北さんのTelegramへ通知する。秘密情報は wrangler secret（TG_BOT_TOKEN）で注入。
// PREVIEW="1"（moruko-lp-v2 プレビュー）のときは通知を送らず、受付番号だけ返す。

// 通常 ¥300,000（税込）plink_1UZ0KUIgbCdh16E58UaXnMBp ／ 紹介者コード適用 ¥250,000 plink_1ULXpXIgbCdh16E59rbR4OFF
// 紹介者コードは wrangler secret REFERRAL_CODES（カンマ区切り、大小無視）で管理。サーバー側で判定する。
const PAYMENT_LINK = 'https://buy.stripe.com/aFa00j8u33vT6bMc143wQ0s';
const PAYMENT_LINK_REFERRAL = 'https://buy.stripe.com/28EaEXh0zd6t2ZA2qu3wQ0m';
const PRICE_NORMAL = 300000;
const PRICE_REFERRAL = 250000;
// 紹介者コード: サポートbotがTelegramアカウントごとに発行（MR<chat_id36進>-<HMAC6桁>）。REFERRAL_SECRET で検証。
// 手動発行コードは wrangler secret REFERRAL_CODES（カンマ区切り）でも受け付ける。
async function referralCheck(env, code) {
  const c = String(code || '').trim().toUpperCase();
  if (!c || c.length > 40) return { ok: false };
  if (String(env.REFERRAL_CODES || '').split(',').map(x => x.trim().toUpperCase()).filter(Boolean).includes(c)) return { ok: true, referrer: 'manual' };
  const m = /^MR([0-9A-Z]{1,13})-([0-9A-F]{6})$/.exec(c);
  if (!m || !env.REFERRAL_SECRET) return { ok: false };
  const id = parseInt(m[1].toLowerCase(), 36);
  if (!Number.isSafeInteger(id) || id <= 0) return { ok: false };
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.REFERRAL_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('ref:' + id));
  const mac = Array.from(new Uint8Array(sig), b => b.toString(16).padStart(2, '0')).join('').slice(0, 6).toUpperCase();
  return mac === m[2] ? { ok: true, referrer: String(id) } : { ok: false };
}
const LIMITS = { name: 80, email: 160, phone: 30, zip: 10, address: 300, purpose: 2000, referral: 40 };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/diagnose') {
      return handleDiagnose(request, env, ctx, { json, allowedOrigins: ALLOWED_ORIGINS, notifyTelegram });
    }
    if (url.pathname === '/api/referral') {
      const ok = (await referralCheck(env, url.searchParams.get('code'))).ok;
      const res = json({ ok, price: ok ? PRICE_REFERRAL : PRICE_NORMAL }, 200);
      const o = request.headers.get('Origin');
      if (o === 'https://moruko-contract.vercel.app') res.headers.set('Access-Control-Allow-Origin', o);
      return res;
    }
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

  const ref = await referralCheck(env, f.referral);
  const referral = ref.ok;
  const price = referral ? PRICE_REFERRAL : PRICE_NORMAL;
  const priceStr = '¥' + price.toLocaleString('en-US');
  const paymentLink = referral ? PAYMENT_LINK_REFERRAL : PAYMENT_LINK;
  const id = makeId(env.PREVIEW === '1');

  // プレビュー環境: 通知を送らない（本番と同じ検証・同じレスポンス形だけ返す）
  if (env.PREVIEW === '1') {
    console.log('[preview] apply received (no notification sent)', id, method);
    return respond(isJson, { ok: true, id, method, preview: true, payment_link: paymentLink }, 200, method, f.email, id, url, paymentLink);
  }

  const methodLabel = method === 'card' ? 'クレジットカード（Stripe決済ページへ遷移）' : '銀行振込（振込先の案内メール待ち）';
  const text = [
    'moruko 申し込みが届きました',
    '',
    '受付番号: ' + id,
    'プラン: ' + (method === 'card'
      ? '買い切りプラン ' + priceStr + '（税込・カード決済）'
      : '買い切りプラン ' + priceStr + '（税込・銀行振込）') + (referral ? '　※紹介者コード適用: ' + f.referral.toUpperCase() + '（紹介者 chat_id: ' + ref.referrer + '）' : (f.referral ? '　※紹介者コード「' + f.referral + '」は無効のため通常価格' : '')),
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
      ? '対応: 振込先と期日を ' + f.email + ' へメールで案内してください（振込額 ' + priceStr + '）。'
      : '対応: Stripeで決済完了を確認してください（client_reference_id = ' + id + '）。未決済のまま離脱している場合あり。',
  ].join('\n');

  const sent = await notifyTelegram(env, text);
  if (!sent) return respond(isJson, { ok: false, error: 'notify_failed' }, 502, '', '', '', url);

  return respond(isJson, { ok: true, id, method, payment_link: paymentLink }, 200, method, f.email, id, url, paymentLink);
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
function respond(isJson, body, status, method, email, id, url, paymentLink) {
  if (isJson) return json(body, status);
  const site = url ? url.origin : 'https://moruko.groundmole.space';
  if (body.ok) {
    if (method === 'card') {
      const u = new URL(paymentLink || PAYMENT_LINK);
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
