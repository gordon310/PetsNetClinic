# 宠物线上问诊小程序 · 医生需求收集

用于收集医生对「宠物线上问诊小程序」的需求确认，并把结论沉淀为开发文档。

- 在线填写表单：`index.html`（也可直接打开本地文件）
- GitHub 在线提交：仓库 `Issues` → 选择「医生需求确认表 V0.2」
- 每条提交 = 一个 GitHub Issue（label `doctor-feedback`），永久留档、可导出
- 开发需求文档骨架：`docs/宠物线上问诊开发需求文档_V0.1.md`

## 目录

```
PetsNetClinic/
├── README.md
├── index.html                       可视化问卷（可填写 / 提交 / 导出 / 打印）
├── questionnaire.md                 问卷唯一维护源
├── .github/ISSUE_TEMPLATE/
│   ├── doctor-requirements.yml      GitHub Issue 表单（33 题结构化）
│   └── config.yml                   新增 issue 引导
├── docs/
│   └── 宠物线上问诊开发需求文档_V0.1.md
└── scripts/
    └── export_issues.py             导出全部答卷为 CSV / Markdown 汇总
```

## 仓库信息

- 仓库：https://github.com/gordon310/PetsNetClinic
- 在线填写页（GitHub Pages）：https://gordon310.github.io/PetsNetClinic/
- 医生提交入口（Issue 表单）：https://github.com/gordon310/PetsNetClinic/issues/new/choose
- 建议在仓库 `Settings → Labels` 保持 `doctor-feedback` 标签存在，便于筛选导出。

## 医生如何填写

1. 打开仓库 → `Issues` → `New issue` → 选择「医生需求确认表 V0.2」。
2. 逐项勾选 / 选择，第 33 题可补充。
3. 点击 `Submit new issue`。提交后请勿删除，作为需求留档。

> GitHub Issue 表单无法强制"最多选 N 项"，第 29 / 30 题请在题干提示下自行控制；HTML 版会强制限制。

## 维护与回填

- 修改问卷：先改 `questionnaire.md`，再同步 `index.html` 的 `SECTIONS` 与 `doctor-requirements.yml`。
- 收到答卷后：在 `docs/宠物线上问诊开发需求文档_V0.1.md` 中把对应 `【待确认】` 回填，并标注来源医生 / 日期。

## 导出留档

```bash
# 需要已登录的 gh CLI
python3 scripts/export_issues.py --repo gordon310/PetsNetClinic --out ./exports
```

输出：

- `exports/doctor-feedback.csv`：每行一位医生，列出题号答案
- `exports/doctor-feedback.md`：按医生汇总的完整答卷
