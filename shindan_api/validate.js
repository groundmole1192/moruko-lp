// 入力チェック：選択肢は定義にあるものだけ通す。自由記入は長さを切る。
import { QUESTIONS, OTHER_MAX, EMAIL_MAX } from "../shindan/questions.js";

const clean = (s, max) =>
  String(s ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);

const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

export function validateAnswers(body) {
  const src = body && typeof body === "object" ? body.answers || {} : {};
  const out = {};
  const errors = [];

  for (const q of QUESTIONS) {
    const v = src[q.id];
    if (q.type === "single") {
      const val = typeof v === "string" && q.options.includes(v) ? v : "";
      if (q.required && !val) errors.push(q.id);
      out[q.id] = val;
    } else if (q.type === "multi") {
      let arr = Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === "string" && q.options.includes(x)))] : [];
      if (q.exclusive && arr.includes(q.exclusive)) arr = [q.exclusive];
      if (q.required && arr.length === 0) errors.push(q.id);
      out[q.id] = arr;
    } else {
      const val = clean(v, q.maxLength || 300);
      if (q.required && !val) errors.push(q.id);
      out[q.id] = val;
    }
    if (q.other) {
      const chosen = q.type === "single" ? out[q.id] === "その他" : out[q.id].includes("その他");
      out[q.id + "_other"] = chosen ? clean(src[q.id + "_other"], OTHER_MAX) : "";
    }
    if (q.followup) {
      const f = src[q.followup.id];
      out[q.followup.id] = typeof f === "string" && q.followup.options.includes(f) ? f : "";
    }
  }

  const emailRaw = clean(body?.email, EMAIL_MAX);
  const email = emailRaw && EMAIL_RE.test(emailRaw) ? emailRaw : "";
  if (emailRaw && !email) errors.push("email");

  return { ok: errors.length === 0, errors, answers: out, email };
}
