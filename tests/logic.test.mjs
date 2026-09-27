// 逻辑测试（只读，不会创建/修改任何记录）
// 运行：node tests/logic.test.mjs
// 可配置：TEST_REPO=gordon310/PetsNetClinic
import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const REPO = process.env.TEST_REPO || "gordon310/PetsNetClinic";
const read = p => fs.readFileSync(path.join(ROOT, p), "utf8");
let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log("  PASS " + m)) : (fail++, console.log("  FAIL " + m)); };

// ---------- 1) index.html 逻辑 ----------
console.log("[1] index.html 提交逻辑");
const idx = read("index.html");
const s1 = idx.slice(idx.indexOf("const GITHUB_REPO"), idx.indexOf("function setStatus"));
const api = new Function(s1 + "\nreturn { SECTIONS, toMarkdown, issueUrl, GITHUB_REPO, RELAY_URL, FORM_KEY };")();
const qids = api.SECTIONS.flatMap(s => s.questions).filter(q => q.id.startsWith("q"));
ok(qids.length === 53, "题目 53 个 (实际 " + qids.length + ")");
ok(api.GITHUB_REPO === REPO, "GITHUB_REPO = " + api.GITHUB_REPO);
ok(typeof api.RELAY_URL === "string", "RELAY_URL 存在 (值=\"" + api.RELAY_URL + "\")");

const sample = { doctor_name: "测试医生", fill_date: "2026-09-27",
  q1: ["呕吐", "腹泻"], q5: "非常需要", q9: "同意", q33: "补一句" };
const md = api.toMarkdown(sample);
ok(md.includes("- 医生姓名：测试医生"), "Markdown 含医生姓名");
ok(md.includes("- 填写日期：2026-09-27"), "Markdown 含填写日期");
ok(!md.includes("所属医院"), "Markdown 无医院字段");
ok(md.includes("**1.") && md.includes("- 呕吐") && md.includes("- 腹泻"), "多选只列已选");
ok(!md.includes("- [ ]") && !md.includes("- [x]"), "多选未输出全部选项");
ok(!md.includes("（未选择）") && !md.includes("（未回答）"), "跳过未作答");

const url = api.issueUrl(sample);
ok(url.startsWith("https://github.com/" + REPO + "/issues/new?title="), "提交 URL 前缀正确");
ok(decodeURIComponent(url).includes("labels=doctor-feedback"), "URL 含 label");

const full = { doctor_name: "测试医生", fill_date: "2026-09-27" };
for (const s of api.SECTIONS) for (const q of s.questions) {
  if (!q.id.startsWith("q")) continue;
  if (q.type === "multi") full[q.id] = q.options.slice(0, 3);
  else if (q.type === "single") full[q.id] = q.options[0];
  else full[q.id] = "补充说明";
}
const fullUrl = api.issueUrl(full);
console.log("    全量作答 URL 长度 = " + fullUrl.length);
ok(fullUrl.length < 30000, "全量 URL 长度 " + fullUrl.length + " < 30000 (回退阈值)");

// ---------- 2) records.html 解析（往返 + 线上真实数据） ----------
console.log("[2] records.html 解析");
const rec = read("records.html");
const s2 = rec.slice(rec.indexOf("function esc("), rec.indexOf("async function load"));
const parseBody = new Function(s2 + "\nreturn parseBody;")();
const parsed = parseBody(md);
ok(parsed.info.doctor_name === "测试医生", "往返：解析出医生姓名");
ok(parsed.info.fill_date === "2026-09-27", "往返：解析出填写日期");
ok(Array.isArray(parsed.answers.q1) && parsed.answers.q1.join("") === "呕吐腹泻", "往返：q1");
ok(parsed.answers.q5 === "非常需要", "往返：q5 单选");
ok(parsed.answers.q33 === "补一句", "往返：q33 文本");

try {
  const issues = await (await fetch("https://api.github.com/repos/" + REPO + "/issues?state=all&per_page=100")).json();
  const real = Array.isArray(issues) ? issues.filter(i => !i.pull_request) : [];
  ok(Array.isArray(issues), "线上 Issue 列表可读取 (共 " + real.length + " 条)");
  const withName = real.filter(i => parseBody(i.body).info.doctor_name);
  ok(withName.length === real.length || real.length === 0,
     "所有记录都能解析出医生姓名 (" + withName.length + "/" + real.length + ")");
  if (process.env.TEST_EXPECT_COUNT) ok(real.length === Number(process.env.TEST_EXPECT_COUNT),
     "记录数 = " + process.env.TEST_EXPECT_COUNT);
} catch (e) { ok(false, "读取线上 Issue 失败: " + e.message); }

// ---------- 3) 导出脚本 ----------
console.log("[3] export_issues.py");
const outdir = path.join(os.tmpdir(), "petsnetclinic-test-exports");
try {
  const out = execFileSync("python3", ["scripts/export_issues.py", "--repo", REPO, "--out", outdir], { cwd: ROOT }).toString();
  ok(/已导出 \d+ 份答卷/.test(out), "导出脚本执行: " + out.trim());
  const csvPath = path.join(outdir, "doctor-feedback.csv");
  const csv = fs.readFileSync(csvPath, "utf8").split("\n");
  ok(csv[0].includes("医生姓名") && csv[0].includes("填写日期"), "CSV 表头含姓名/日期");
  ok(!csv[0].includes("医院"), "CSV 无医院列");
  ok(fs.existsSync(path.join(outdir, "doctor-feedback.md")), "生成 Markdown 汇总");
} catch (e) { ok(false, "导出脚本异常: " + e.message); }

// ---------- 4) Worker 逻辑 ----------
console.log("[4] relay/worker.js");
const mod = await import("file://" + path.join(ROOT, "relay/worker.js"));
const worker = mod.default;
const env = { GITHUB_REPO: REPO, GITHUB_TOKEN: "test", FORM_KEY: "k", ALLOWED_ORIGIN: "https://gordon310.github.io" };
let captured = null;
globalThis.fetch = async (u, o) => { captured = { u, o }; return new Response(JSON.stringify({ number: 99, html_url: "x" }), { status: 201 }); };
const mk = (body, headers = {}) => new Request("https://relay/", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
let r = await worker.fetch(mk({ title: "t", body: "b" }, { "x-form-key": "k" }), env);
let j = await r.json();
ok(r.status === 200 && j.ok === true && j.number === 99, "正常提交返回 ok");
ok(captured.u === "https://api.github.com/repos/" + REPO + "/issues", "调用 GitHub issues API");
ok(captured.o.headers.Authorization === "Bearer test", "带 token");
ok(JSON.parse(captured.o.body).labels[0] === "doctor-feedback", "打标签");
r = await worker.fetch(mk({ title: "t", body: "b" }, { "x-form-key": "bad" }), env);
ok(r.status === 401, "错误口令被拒 401");
r = await worker.fetch(mk({ title: "", body: "" }, { "x-form-key": "k" }), env);
ok(r.status === 400, "缺字段返回 400");
r = await worker.fetch(new Request("https://relay/", { method: "OPTIONS" }), env);
ok(r.status === 204, "OPTIONS 预检 204");

console.log("\n结果: " + pass + " passed, " + fail + " failed");
process.exit(fail ? 1 : 0);
