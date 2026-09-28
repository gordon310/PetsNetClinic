# 宠物线上问诊小程序 · 医生需求收集

用于收集医生对「宠物线上问诊小程序」的需求确认，并把结论沉淀为开发文档。

- 在线填写表单：`index.html`（也可直接打开本地文件）
- GitHub 在线提交：仓库 `Issues` → 选择「医生需求确认表 V0.3」
- 每条提交 = 一个 GitHub Issue（label `doctor-feedback`），永久留档、可导出
- 开发需求文档骨架：`docs/宠物线上问诊开发需求文档_V0.2.md`

## 目录

```
PetsNetClinic/
├── README.md
├── index.html                       医生填写页（单按钮提交）
├── thanks.html                      提交成功后显示「感谢上传」
├── records.html                     答卷记录页（完成情况 / 明细 / CSV）
├── questionnaire.md                 问卷唯一维护源
├── package.json                     测试脚本
├── .github/ISSUE_TEMPLATE/
│   ├── doctor-requirements.yml      GitHub Issue 表单（53 题结构化）
│   └── config.yml                   新增 issue 引导
├── docs/
│   └── 宠物线上问诊开发需求文档_V0.2.md
├── relay/                           Cloudflare Worker 中转（可选，实现“提交→谢谢”）
│   ├── worker.js
│   ├── wrangler.toml
│   └── README.md
├── scripts/
│   └── export_issues.py             导出全部答卷为 CSV / Markdown 汇总
└── tests/
    ├── logic.test.mjs               逻辑测试（只读）
    └── render.mjs                   无头 Chrome 渲染测试
```

## 仓库信息

- 仓库：https://github.com/gordon310/PetsNetClinic
- **医生填写页（单按钮提交）**：https://gordon310.github.io/PetsNetClinic/
- **答卷记录页（内部查看完成情况）**：https://gordon310.github.io/PetsNetClinic/records.html
  （每条记录可「删除」，经中转服务调 GitHub API，需管理员口令）
- 医生提交入口（Issue 表单，备用）：https://github.com/gordon310/PetsNetClinic/issues/new/choose
- 建议在仓库 `Settings → Labels` 保持 `doctor-feedback` 标签存在，便于筛选导出。

> 记录页会展示每位医生的提交次数、最近提交时间与状态，并支持按姓名过滤、导出 CSV。

### 提交方式

- **当前**：打开填写页点「提交」→ Cloudflare Worker 中转写入 GitHub Issue → 页面显示「感谢上传」，医生直接关闭浏览器，全程不接触 GitHub。
  中转地址 `https://petsnetclinic-relay.zoubeacon.com/`，配置项在 `index.html`（`RELAY_URL`、`FORM_KEY`）与 `records.html`（`RELAY_URL`）。
- **回退**：把 `RELAY_URL` 留空即回到「打开 GitHub 新建 Issue 页」的旧流程，医生需登录 GitHub 点一次 Submit。

> `workers.dev` 在大陆被墙，中转绑定自有域名 `zoubeacon.com`；换域名改 `relay/wrangler.toml` 的 `[[routes]]` 后重新 `wrangler deploy`。

## 医生如何填写

1. 打开 `https://gordon310.github.io/PetsNetClinic/`（共 53 题，单按钮提交）。
2. 填写姓名与日期，逐项作答，第 33 题可补充。
3. 点「提交」，看到「感谢上传」即完成，可直接关闭浏览器。
4. 提交后请勿删除，作为需求留档。

> GitHub Issue 表单（`issues/new/choose`）无法强制"最多选 N 项"，第 29 / 30 题请在题干提示下自行控制；HTML 版会强制限制。

### 医生身份与多次提交

- **姓名必填**：每份答卷第一项要求填写「医生姓名 / 昵称」，用于识别是谁提交。
- **可多次提交**：同一医生可提交多份（如修订版），每份都是独立 Issue，全部留档。
- **双重身份来源**：`医生姓名`（表单填写）+ GitHub 账号（Issue 作者）都会在导出中保留。
- **建议**：提交时在 Issue 标题带上姓名（HTML 版已自动填充为 `[医生答卷] 姓名 / 医院 / 日期`）。
- **取最新为准**：同名多次提交时，以导出表中 `创建时间` 最新的一条为准。

## 维护与回填

- 修改问卷：先改 `questionnaire.md`，再同步 `index.html` 的 `SECTIONS` 与 `doctor-requirements.yml`。
- 收到答卷后：在 `docs/宠物线上问诊开发需求文档_V0.2.md` 中把对应 `【待确认】` 回填，并标注来源医生 / 日期。

## 测试

只读测试，不会创建或修改任何记录。

```bash
npm test          # 逻辑（提交 URL / Markdown 往返 / 导出 / Worker）
npm run test:all  # 逻辑 + 无头浏览器渲染
```

详见 `tests/README.md`。

## 导出留档

```bash
# 需要已登录的 gh CLI
python3 scripts/export_issues.py --repo gordon310/PetsNetClinic --out ./exports
```

输出：

- `exports/doctor-feedback.csv`：每行一位医生，列出题号答案
- `exports/doctor-feedback.md`：按医生汇总的完整答卷
