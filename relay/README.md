# 中转服务（Cloudflare Worker）

作用：医生在网页点「提交」后，数据由本服务代写进 GitHub Issue，网页只显示「谢谢」。医生全程看不到 GitHub，密钥也不进网页。

## 一、准备 GitHub token

1. 打开 https://github.com/settings/tokens?type=beta （Fine-grained tokens）→ Generate new token。
2. Repository access：只选 `gordon310/PetsNetClinic`。
3. Permissions → Repository permissions → **Issues: Read and write**。
4. 生成后复制 token（形如 `github_pat_...`），只保存一次。

## 二、部署 Worker

需要 Node 环境。在 `relay/` 目录执行：

```bash
npm install -g wrangler        # 或 npx wrangler
wrangler login                 # 浏览器登录你的 Cloudflare 账号（免费注册）
wrangler deploy                # 部署，输出形如 https://petsnetclinic-relay.<子域>.workers.dev
wrangler secret put GITHUB_TOKEN   # 粘贴上一步的 token
wrangler secret put FORM_KEY       # 提交口令（可留空跳过，但建议设置）
wrangler secret put ADMIN_KEY      # 删除记录用的管理员口令（记录页删除时需要）
```

部署成功后会得到 Worker 地址，例如：
`https://petsnetclinic-relay.abc123.workers.dev/`

## 三、让网页使用它

编辑仓库根目录 `index.html` 与 `records.html`，填写中转地址：

```js
// index.html
const RELAY_URL = "https://petsnetclinic-relay.abc123.workers.dev/";
const FORM_KEY  = "与上面 FORM_KEY 相同的口令";   // 若未设置 FORM_KEY 则留空

// records.html
const RELAY_URL = "https://petsnetclinic-relay.abc123.workers.dev/";
```

记录页的「删除」按钮会提示输入 `ADMIN_KEY` 口令（存于浏览器 sessionStorage），口令不会写进网页。

提交并推送后，医生页即变为「提交 → 谢谢」模式，不再跳转 GitHub。

## 四、验证

1. 打开 https://gordon310.github.io/PetsNetClinic/ 填一份提交。
2. 应看到「提交成功，谢谢！」。
3. 到 https://gordon310.github.io/PetsNetClinic/records.html 刷新，即可看到记录。

## 说明

- `ALLOWED_ORIGIN` 已在 `wrangler.toml` 设为 GitHub Pages 域名，限制跨域来源。
- `FORM_KEY` 只是降低被随意调用的概率（会出现在网页源码里），不是强安全措施；若被滥用可随时在 Cloudflare 更换口令并更新网页。
- 若不想用 Cloudflare，`worker.js` 是标准 Fetch 处理器，可直接部署到 Vercel/Netlify/Deno Deploy，逻辑不变。
