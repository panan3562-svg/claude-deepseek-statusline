#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Claude Code 状态栏插件 一键安装脚本（Windows / macOS 通用，需 Python 3）。

用法：在解压后的目录里运行
    python install.py

它会：
  1. 把 statusline-deepseek.js 复制到 ~/.claude/
  2. 备份原有 ~/.claude/settings.json 为 settings.json.bak
  3. 在 settings.json 中写入 statusLine 配置（保留原有所有其他配置）
然后重开一个 Claude Code 会话即可生效。

注意：本脚本不会打印 settings.json 的内容（里面可能含 API 密钥）。
"""
import json
import os
import shutil
import sys


def main():
    home = os.path.expanduser("~")
    claude_dir = os.path.join(home, ".claude")
    js_name = "statusline-deepseek.js"

    # 1) 找到插件脚本（脚本可能与本文件在同一目录，或用户放在 ~/.claude 里）
    src = os.path.join(os.path.dirname(os.path.abspath(__file__)), js_name)
    if not os.path.exists(src):
        src = os.path.join(claude_dir, js_name)
    if not os.path.exists(src):
        print(f"[错误] 找不到 {js_name}，请把它和 install.py 放在同一目录后重试。")
        sys.exit(1)

    # 2) 复制脚本
    os.makedirs(claude_dir, exist_ok=True)
    dst = os.path.join(claude_dir, js_name)
    shutil.copy2(src, dst)
    print(f"[1/3] 已复制插件 → {dst}")

    # 3) 备份并读取 settings.json（兼容 UTF-8 BOM）
    settings_path = os.path.join(claude_dir, "settings.json")
    settings = {}
    if os.path.exists(settings_path):
        backup = settings_path + ".bak"
        shutil.copy2(settings_path, backup)
        print(f"[2/3] 已备份原配置 → {backup}")
        with open(settings_path, "r", encoding="utf-8-sig") as f:
            try:
                settings = json.load(f)
            except json.JSONDecodeError:
                print("[警告] 原 settings.json 不是合法 JSON，已跳过备份恢复逻辑，将直接新建配置。")
                settings = {}

    # 4) 写入 statusLine（Windows 下也用正斜杠，Node 完全兼容）
    js_path = dst.replace("\\", "/")
    settings["statusLine"] = {
        "type": "command",
        "command": f"node {js_path}",
        "refreshInterval": 1,
    }
    with open(settings_path, "w", encoding="utf-8") as f:
        json.dump(settings, f, ensure_ascii=False, indent=2)

    print("[3/3] 已在 settings.json 写入 statusLine 配置（原有配置均保留）")
    print()
    print("完成！请关闭并重新打开 Claude Code，状态栏就会显示：")
    print("  ●/○ DeepSeek 高峰/空闲 北京时间 | 缓存命中 XX.X%")
    print("如需改回原样，把 ~/.claude/settings.json.bak 恢复即可。")


if __name__ == "__main__":
    main()
