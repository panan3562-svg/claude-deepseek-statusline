# Claude Code 状态栏：DeepSeek 峰谷 + 缓存命中率

一个很小的 Claude Code 状态栏脚本，在终端底部显示：

```
 ● DeepSeek 高峰 09:30:12 | 缓存命中 85.3%
```

- **DeepSeek 高峰/空闲 + 北京时间**：工作日 9:00–12:00、14:00–18:00 显示 `● 高峰`，其余时间与周末显示 `○ 空闲`（可自行改时段）。
- **会话缓存命中率**：读当前会话 transcript 的 `usage` 字段，实时算 `cache_read / (cache_read + cache_creation + input)`，精度 0.1%。

用途：套用任何按峰谷计价或限速的模型服务时，一眼看出现在是不是贵时段，以及长会话里 prompt 缓存帮你省了多少。

## 安装

需要 Node.js（Claude Code 自带运行时即可）与 Python 3（仅一键脚本需要）。

### 一键安装（推荐）

```bash
python install.py
```

脚本会：① 把 `.js` 复制到 `~/.claude/`；② 备份原 `settings.json`；③ 只写入 `statusLine` 段，**其余配置一律不动**（不会碰 API 密钥）。然后重开 Claude Code。

### 手动安装

1. 把 `statusline-deepseek.js` 复制到 `~/.claude/`
2. 在 `~/.claude/settings.json` 里加：

```json
{
  "statusLine": {
    "type": "command",
    "command": "node ~/.claude/statusline-deepseek.js",
    "refreshInterval": 1
  }
}
```

Windows 用正斜杠全路径，如 `node C:/Users/<你的用户名>/.claude/statusline-deepseek.js`。

## 卸载

```bash
mv ~/.claude/settings.json.bak ~/.claude/settings.json
rm ~/.claude/statusline-deepseek.js
```

## 自定义

- **不是 DeepSeek**：改脚本里 `const label = isPeak ? 'DeepSeek 高峰' : 'DeepSeek 空闲';`
- **改高峰时段**：改 `const isPeak = !isWeekend && ((h >= 9 && h < 12) || (h >= 14 && h < 18));`
- **只想要缓存命中率**：把第 ① 段整体删掉，输出改为 `cacheStr` 即可。

## 说明

- 只读不写，不改任何会话文件；只读 transcript 末尾 256 KB，开销极小。
- 状态栏命令不能读 stdin（读会阻塞），脚本只往 stdout 写一行。
- 缓存命中率取自本轮会话；没有 usage 记录（如刚开新会话）时显示 `缓存 --`。

## License

MIT
