#!/usr/bin/env python3
"""导出 GitHub 上医生需求答卷（Issues）为 CSV 与 Markdown 汇总。

用法：
    python3 scripts/export_issues.py --repo gordon310/PetsNetClinic \
        --label doctor-feedback --out ./exports

依赖：已安装并登录的 GitHub CLI (gh)。
"""

import argparse
import csv
import json
import os
import re
import subprocess
import sys

# 题号 -> 简短列名（导出 CSV 用）
COLS = [
    ("doctor_name", "医生姓名"),
    ("clinic", "医院/科室"),
    ("fill_date", "填写日期"),
    ("doctor_contact", "工号/联系方式"),
    ("q1", "1_可线上问"),
    ("q2", "2_必须到院"),
    ("q3", "3_默认资料"),
    ("q4", "4_自动询问"),
    ("q5", "5_分症状流程"),
    ("q6", "6_专门流程症状"),
    ("q7", "7_照片"),
    ("q8", "8_视频"),
    ("q9", "9_风险分级"),
    ("q10", "10_病情摘要"),
    ("q11", "11_自动追问"),
    ("q12", "12_危险提醒"),
    ("q13", "13_后台辅助"),
    ("q14", "14_疾病名称"),
    ("q15", "15_推荐药物"),
    ("q16", "16_用药剂量"),
    ("q17", "17_接诊首屏"),
    ("q18", "18_在线追问"),
    ("q19", "19_处理选项"),
    ("q20", "20_到院预约"),
    ("q21", "21_预约内容"),
    ("q22", "22_健康档案"),
    ("q23", "23_现有资料"),
    ("q24", "24_病例入库"),
    ("q25", "25_知识审核"),
    ("q26", "26_收费模式"),
    ("q27", "27_排班"),
    ("q28", "28_回复时间"),
    ("q29", "29_重点功能"),
    ("q30", "30_减少工作"),
    ("q31", "31_价值判断"),
    ("q32", "32_参与测试"),
    ("q33", "33_补充"),
    ("q34", "34_影像AI适用"),
    ("q35", "35_影像结果给谁"),
    ("q36", "36_影像表述上限"),
    ("q37", "37_影像免责"),
    ("q38", "38_拍摄要求"),
    ("q39", "39_影像留存"),
    ("q40", "40_红色风险提醒"),
    ("q41", "41_知情同意"),
    ("q42", "42_AI兜底"),
    ("q43", "43_交互形式"),
    ("q44", "44_语音"),
    ("q45", "45_医生介入时机"),
    ("q46", "46_医生离线"),
    ("q47", "47_注册绑定"),
    ("q48", "48_多宠物家庭"),
    ("q49", "49_通知方式"),
    ("q50", "50_复诊提醒"),
    ("q51", "51_HIS打通"),
    ("q52", "52_结果回写"),
    ("q53", "53_AI采纳反馈"),
]


def run(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        raise SystemExit("命令失败: " + " ".join(cmd))
    return result.stdout


def fetch_issues(repo, label):
    out = run([
        "gh", "issue", "list",
        "--repo", repo,
        "--label", label,
        "--state", "all",
        "--limit", "1000",
        "--json", "number,title,body,author,createdAt,url,state",
    ])
    return json.loads(out)


def parse_body(body):
    """把 Issue 正文解析为 {id: value}。兼容 HTML 表单生成的 Markdown。"""
    answers = {}
    current = None
    for raw in (body or "").splitlines():
        line = raw.rstrip()
        m = re.match(r"^\*\*(\d+)\.\s", line)
        if m:
            current = "q" + m.group(1)
            answers.setdefault(current, [])
            continue
        if current:
            m2 = re.match(r"^\s*[-*]\s*\[(x| )\]\s*(.+)$", line)
            if m2:
                if m2.group(1).lower() == "x":
                    answers[current].append(m2.group(2).strip())
                continue
            m3 = re.match(r"^\s*[-*]\s*(.+)$", line)
            if m3:
                answers[current].append(m3.group(1).strip())
                continue
            if line and not re.match(r"^(#|>|---|\*\*)", line):
                answers[current].append(line.strip())
                continue
        m4 = re.match(
            r"^[-*]\s*(医生姓名|所属医院\s*/\s*科室|填写日期|工号\s*/\s*联系方式)[：:]\s*(.+)$", line)
        if m4:
            key = {
                "医生姓名": "doctor_name",
                "所属医院 / 科室": "clinic",
                "填写日期": "fill_date",
                "工号 / 联系方式": "doctor_contact",
            }[m4.group(1)]
            answers[key] = m4.group(2).strip()
    for k, v in answers.items():
        if isinstance(v, list):
            answers[k] = "；".join(v)
    return answers


def write_csv(issues, outdir):
    path = os.path.join(outdir, "doctor-feedback.csv")
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(["issue", "url", "提交人", "创建时间", "状态"] + [c[1] for c in COLS])
        for it in issues:
            a = parse_body(it.get("body", ""))
            writer.writerow([
                it["number"], it["url"],
                (it.get("author") or {}).get("login", ""),
                it.get("createdAt", ""), it.get("state", ""),
            ] + [a.get(cid, "") for cid, _ in COLS])
    return path


def write_md(issues, outdir):
    path = os.path.join(outdir, "doctor-feedback.md")
    lines = ["# 医生需求答卷汇总", ""]
    for it in issues:
        a = parse_body(it.get("body", ""))
        lines.append("## #{n} {title}".format(n=it["number"], title=it.get("title", "").strip()))
        lines.append("")
        lines.append("- 提交人：{}".format((it.get("author") or {}).get("login", "")))
        lines.append("- 时间：{}".format(it.get("createdAt", "")))
        lines.append("- 链接：{}".format(it.get("url", "")))
        lines.append("")
        for cid, name in COLS:
            if a.get(cid):
                lines.append("- **{}**：{}".format(name, a[cid]))
        lines.append("")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True, help="OWNER/PetsNetClinic")
    ap.add_argument("--label", default="doctor-feedback")
    ap.add_argument("--out", default="./exports")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)
    issues = fetch_issues(args.repo, args.label)
    csv_path = write_csv(issues, args.out)
    md_path = write_md(issues, args.out)
    print("已导出 {} 份答卷：\n- {}\n- {}".format(len(issues), csv_path, md_path))


if __name__ == "__main__":
    main()
