// Cloudflare Worker：接收医生答卷并代表其创建 GitHub Issue。
// 需要环境变量（用 `wrangler secret put` 配置）：
//   GITHUB_TOKEN   具备本仓库 Issues: write 的细粒度 token
//   FORM_KEY       可选，与网页端 FORM_KEY 一致的简单口令
// 普通变量（wrangler.toml [vars]）：
//   GITHUB_REPO    "gordon310/PetsNetClinic"
//   ALLOWED_ORIGIN "https://gordon310.github.io"

function jsonResponse(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: Object.assign({}, cors, { "Content-Type": "application/json; charset=utf-8" }),
  });
}

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-form-key",
      "Vary": "Origin",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405, cors);

    if (env.FORM_KEY && request.headers.get("x-form-key") !== env.FORM_KEY) {
      return jsonResponse({ error: "unauthorized" }, 401, cors);
    }

    let data;
    try {
      data = await request.json();
    } catch (e) {
      return jsonResponse({ error: "invalid json" }, 400, cors);
    }

    const title = String(data.title || "").slice(0, 200);
    const body = String(data.body || "");
    if (!title || !body) return jsonResponse({ error: "missing title or body" }, 400, cors);
    if (body.length > 100000) return jsonResponse({ error: "payload too large" }, 413, cors);

    const repo = env.GITHUB_REPO;
    if (!repo || !env.GITHUB_TOKEN) {
      return jsonResponse({ error: "server not configured" }, 500, cors);
    }

    const res = await fetch("https://api.github.com/repos/" + repo + "/issues", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + env.GITHUB_TOKEN,
        Accept: "application/vnd.github+json",
        "User-Agent": "petsnetclinic-relay",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: title, body: body, labels: ["doctor-feedback"] }),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      return jsonResponse({ error: "github_error", status: res.status, detail: detail }, 502, cors);
    }

    const issue = await res.json();

    // 回查确认记录确实已创建（最多 3 次，规避 GitHub API 短暂延迟）
    let verified = false;
    for (let i = 0; i < 3 && !verified; i++) {
      try {
        const chk = await fetch("https://api.github.com/repos/" + repo + "/issues/" + issue.number, {
          headers: {
            Authorization: "Bearer " + env.GITHUB_TOKEN,
            Accept: "application/vnd.github+json",
            "User-Agent": "petsnetclinic-relay",
          },
        });
        verified = chk.ok;
      } catch (e) {
        verified = false;
      }
      if (!verified) await new Promise((r) => setTimeout(r, 800));
    }

    return jsonResponse({ ok: true, verified: verified, number: issue.number, url: issue.html_url }, 200, cors);
  },
};
