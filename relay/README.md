# 中转服务（Cloudflare Worker）

作用：医生在网页点「提交」后，数据由本服务代写进 GitHub Issue，网页只显示「谢谢」。医生全程看不到 GitHub，密钥也不进网页。

## 一、准备 GitHub token

1. 打开 https://github.com/settings/tokens?type=beta （Fine-grained tokens）→ Generate new token。
2. Repository access：只选 `gordon310/PetsNetClinic`。
3. Permissions → Repository permissions → **Issues: Read and write**。
4. 生成后复制 token（形如 `github_pat_...`），只保存一次。

## 二、部署 Worker（本项目已部署）

在 `relay/` 目录执行：

```bash
npx wrangler login                 # 浏览器登录 Cloudflare 账号（免费）
npx wrangler deploy                # 部署
npx wrangler secret put GITHUB_TOKEN   # 粘贴上一步的 token
npx wrangler secret put FORM_KEY       # 提交口令（已设置，见 index.html）
npx wrangler secret put ADMIN_KEY      # 删除记录的管理员口令（不入仓库）
```

**当前线上地址**：`https://petsnetclinic-relay.zoubeacon.com/`

> ⚠️ `workers.dev` 在大陆被 DNS 污染 + SNI 阻断，直连不可用；因此路由绑定到自有域名
> `zoubeacon.com`（已托管在 Cloudflare）。换子域名改 `wrangler.toml` 的 `[[routes]]` 后重新 deploy。
> `wrangler.toml` 未写 `workers_dev`，故 workers.dev 入口已关闭。

## 三、让网页使用它（已配置）

`index.html` 与 `records.html` 已填好：

```js
// index.html
const RELAY_URL = "https://petsnetclinic-relay.zoubeacon.com/";
const FORM_KEY  = "见 index.html（与 Worker 的 FORM_KEY 一致）";

// records.html
const RELAY_URL = "https://petsnetclinic-relay.zoubeacon.com/";
```

记录页的「删除」按钮会提示输入 `ADMIN_KEY` 口令（存于浏览器 sessionStorage），口令不会写进网页。

提交并推送后，医生页即为「提交 → 感谢上传」模式，不再跳转 GitHub。

## 四、验证

1. 打开 https://gordon310.github.io/PetsNetClinic/ 填一份提交。
2. 应看到「提交成功，谢谢！」。
3. 到 https://gordon310.github.io/PetsNetClinic/records.html 刷新，即可看到记录。

## 说明

- `ALLOWED_ORIGIN` 已在 `wrangler.toml` 设为 GitHub Pages 域名，限制跨域来源。
- `FORM_KEY` 只是降低被随意调用的概率（会出现在网页源码里），不是强安全措施；若被滥用可随时在 Cloudflare 更换口令并更新网页。
- 若不想用 Cloudflare，`worker.js` 是标准 Fetch 处理器，可直接部署到 Vercel/Netlify/Deno Deploy，逻辑不变。
