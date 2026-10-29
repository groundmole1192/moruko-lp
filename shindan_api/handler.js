// POST /api/diagnose  回答を受け取り、AIの診断結果を返し、北さんのTelegramへ要約を通知する。
import { validateAnswers } from "./validate.js";
import { diagnose } from "./gemini.js";
import { buildNotifyText } from "./notify.js";
import { takeQuota } from "./counter.js";

const MAX_BODY = 16 * 1024;
const RATE_LIMIT = 5; // 同じIPから1時間に5回まで
const RATE_WINDOW_MS = 60 * 60 * 1000;

// 簡易レート制限：Workerのインスタンスごとのメモリ上のカウント。
// 制限事項：インスタンスが複数あると合算されず、再起動で消える。完全な防御ではなく、連打・誤作動の抑止が目的。
// （厳密にやるなら Cloudflare の Rate Limiting ルールをダッシュボード側で足す）
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  if (hits.size > 2000) for (const [k, v] of hits) if (now - v.t > RATE_WINDOW_MS) hits.delete(k);
  const cur = hits.get(ip);
  if (!cur || now - cur.t > RATE_WINDOW_MS) {
    hits.set(ip, { t: now, n: 1 });
    return false;
  }
  cur.n += 1;
  return cur.n > RATE_LIMIT;
}

export async function handleDiagnose(request, env, ctx, { json, allowedOrigins, notifyTelegram }) {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && !allowedOrigins.includes(origin) && origin !== url.origin) return json({ error: "forbidden" }, 403);

  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > MAX_BODY) return json({ error: "too_large" }, 413);
  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: "too_large" }, 413);
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  // ボット除け（人には見えない欄に何か入っていたら、AIも呼ばずに終わる）
  if (body && typeof body.website === "string" && body.website.trim() !== "") {
    return json({ error: "rejected" }, 400);
  }

  const v = validateAnswers(body);
  if (!v.ok) return json({ error: "invalid", fields: v.errors }, 400);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (rateLimited(ip)) return json({ error: "rate_limited" }, 429);

  // 1日の総数・同じ人の1日あたり回数（Durable Object で全体を数える）。数えられない時はAIを呼ばずに止める
  let quota;
  try {
    quota = await takeQuota(env, ip);
  } catch (e) {
    console.error("quota check failed:", e.message);
    return json({ error: "busy" }, 503);
  }
  if (!quota.ok) {
    if (quota.notify && env.PREVIEW !== "1") {
      const p = notifyTelegram(env, "【無料AI業務診断】今日の上限（1日の総数）に達したので、今日はこれ以降の診断を止めています。").catch(() => false);
      if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(p);
    }
    return json({ error: quota.reason === "daily_total" ? "busy" : "rate_limited" }, 429);
  }

  let result;
  try {
    result = await diagnose(env, v.answers);
  } catch (e) {
    console.error("diagnose failed:", e.message);
    return json({ error: "ai_failed" }, 502);
  }

  // 通知（完了した診断だけ）。PREVIEW="1" のときは送らない。失敗しても結果は返す
  if (env.PREVIEW === "1") {
    console.log("[preview] diagnosis done (no notification sent)");
  } else {
    const p = notifyTelegram(env, buildNotifyText(v.answers, result, v.email)).catch(() => false);
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(p);
  }
  return json({ ok: true, result });
}
