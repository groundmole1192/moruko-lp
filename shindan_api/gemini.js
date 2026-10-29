// Gemini API 呼び出し（サーバー側のみ）。キーは環境変数 GEMINI_API_KEY。
import { SYSTEM_PROMPT, buildUserContent, RESPONSE_SCHEMA, TOOLS_LEVELS, POTENTIAL_KEYS } from "./prompt.js";

const DEFAULT_MODEL = "gemini-3.8-flash";
const S = (v, max) => String(v ?? "").slice(0, max);

export async function diagnose(env, answers, { fetchImpl = fetch, timeoutMs = 60000 } = {}) {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");
  const model = env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "content-type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: buildUserContent(answers) }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    // エラー本文にキーは含まれないが、念のため状態コードだけ返す
    throw new Error(`Gemini HTTP ${res.status}`);
  }
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned non-JSON");
  }
  return normalize(parsed);
}

// 形をそろえ、長さを切り、合計時間と金額はここで計算する（AIに足し算をさせない）。
// 表示は textContent なので HTML は効かない。
const int = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : NaN);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const WAGE_MIN = 1000;
const WAGE_MAX = 5000;
const TASK_HOURS_MAX = 30;

export function normalize(p) {
  const tasks = Array.isArray(p?.tasks) ? p.tasks.slice(0, 3) : [];
  if (tasks.length < 3) throw new Error("Gemini returned fewer than 3 tasks");

  const outTasks = tasks.map((t) => {
    let lo = int(t.hours_min);
    let hi = int(t.hours_max);
    if (!Number.isFinite(lo) || lo < 1) lo = 1;
    lo = clamp(lo, 1, TASK_HOURS_MAX);
    if (!Number.isFinite(hi) || hi < lo) hi = lo;
    hi = clamp(hi, lo, Math.min(TASK_HOURS_MAX, lo * 3)); // 極端に広い幅だけ抑える（指示では2倍以内）
    let diff = int(t.difficulty);
    if (!Number.isFinite(diff)) diff = 2;
    diff = clamp(diff, 1, 3);
    const steps = (Array.isArray(t.steps) ? t.steps : []).map((x) => S(x, 200).replace(/^\s*(\d+[.．、)]|[①②③]|ステップ\s*\d+[:：]?)\s*/, "")).filter(Boolean).slice(0, 3);
    return {
      title: S(t.title, 60),
      what: S(t.what, 300),
      how: S(t.how, 500),
      hours_min: lo,
      hours_max: hi,
      hours: lo === hi ? `月${lo}時間ほど（推定）` : `月${lo}〜${hi}時間ほど（推定）`,
      basis: S(t.basis, 200),
      difficulty: diff,
      difficulty_reason: S(t.difficulty_reason, 160),
      tools_level: TOOLS_LEVELS.includes(t.tools_level) ? t.tools_level : "無料の道具を足す",
      tools: S(t.tools, 300),
      steps,
      cautions: S(t.cautions, 300),
    };
  });

  let wage = int(p?.hourly_wage);
  if (!Number.isFinite(wage)) wage = 1500;
  wage = Math.round(clamp(wage, WAGE_MIN, WAGE_MAX) / 100) * 100;

  const hMin = outTasks.reduce((a, t) => a + t.hours_min, 0);
  const hMax = outTasks.reduce((a, t) => a + t.hours_max, 0);
  // 金額は1,000円単位に丸める（細かい数字で精度があるように見せない）
  const yen = (h) => Math.round((h * wage) / 1000) * 1000;

  return {
    summary: S(p.summary, 400),
    tasks: outTasks,
    total: {
      hours_min: hMin,
      hours_max: hMax,
      hourly_wage: wage,
      yen_min: yen(hMin),
      yen_max: yen(hMax),
      wage_basis: S(p.wage_basis, 200),
    },
    keep_for_human: { title: S(p.keep_for_human?.title, 60), why: S(p.keep_for_human?.why, 300) },
    next_step: S(p.next_step, 300),
    potential: Object.fromEntries(
      POTENTIAL_KEYS.map((k) => {
        const n = int(p?.potential?.[k]);
        return [k, Number.isFinite(n) ? clamp(n, 1, 5) : 1];
      })
    ),
    potential_note: S(p?.potential_note, 200),
  };
}
