#!/usr/bin/env node
// statusline-deepseek.js — Claude Code 终端状态栏
//   ① DeepSeek 高峰/空闲（北京时间 UTC+8，高峰 9-12、14-18；周六/周日全天空闲）
//   ② 当前会话 prompt 缓存命中率（读本地会话记录 usage 字段实时统计）
// 注意：勿读 stdin（会阻塞）；直接输出一行文本到 stdout。

const fs = require('fs');
const os = require('os');
const path = require('path');

/* ---------- ① DeepSeek 高峰/空闲 + 北京时间（UTC+8） ---------- */
const now = new Date();
const bj = new Date(now.getTime() + 8 * 3600 * 1000);
const h = bj.getUTCHours();
const m = bj.getUTCMinutes();
const s = bj.getUTCSeconds();
const isWeekend = bj.getUTCDay() === 0 || bj.getUTCDay() === 6; // 北京时间 周日=0、周六=6
const isPeak = !isWeekend && ((h >= 9 && h < 12) || (h >= 14 && h < 18));
const mark = isPeak ? '●' : '○';
const label = isPeak ? 'DeepSeek 高峰' : 'DeepSeek 空闲';
const clock = [h, m, s].map(n => String(n).padStart(2, '0')).join(':');

/* ---------- ② 当前会话缓存命中率 ---------- */
// 项目目录 → 会话记录目录 key（与 Claude Code 一致：去掉盘符冒号、\ 变 -）
// 例：C:\Users\you → C--Users-you
function projectKeyFromCwd(cwd) {
  let p = String(cwd || '').replace(/\//g, '\\');          // 兼容 Git Bash 的 /c/...
  const m = p.match(/^\\([a-zA-Z])\\(.*)$/);
  if (m) p = m[1].toUpperCase() + ':\\' + m[2];
  return p.replace(/:/g, '').replace(/[\\/]/g, '-').replace(/\s+/g, '-');
}

// 定位当前会话的 transcript：优先 cwd 对应的项目，找不到就全盘扫最新
function findTranscript() {
  const key = projectKeyFromCwd(process.env.CLAUDE_PROJECT_DIR || process.cwd());
  const dir = path.join(os.homedir(), '.claude', 'projects', key);
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => path.join(dir, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (files.length) return files[0];
  }
  const root = path.join(os.homedir(), '.claude', 'projects');
  let best = null, bestT = 0;
  for (const p of fs.readdirSync(root)) {
    const d = path.join(root, p);
    let st; try { st = fs.statSync(d); } catch (e) { continue; }
    if (!st.isDirectory()) continue;
    for (const f of fs.readdirSync(d)) {
      if (!f.endsWith('.jsonl')) continue;
      const fp = path.join(d, f);
      try {
        const t = fs.statSync(fp).mtimeMs;
        if (t > bestT) { bestT = t; best = fp; }
      } catch (e) {}
    }
  }
  return best;
}

// 只读文件末尾，避免每次全量读大文件
function readTail(file, maxBytes = 256 * 1024) {
  const size = fs.statSync(file).size;
  if (size === 0) return '';
  const start = Math.max(0, size - maxBytes);
  const len = size - start;
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.alloc(len);
  fs.readSync(fd, buf, 0, len, start);
  fs.closeSync(fd);
  return buf.toString('utf8');
}

// 统计命中率 = cache_read / (cache_read + cache_creation + 新增 input)
function cacheStats(file) {
  let read = 0, creation = 0, fresh = 0;
  const seen = new Set();
  const tail = readTail(file);
  for (const line of tail.split('\n')) {
    if (!line) continue;
    let o;
    try { o = JSON.parse(line); } catch (e) { continue; }
    const msg = o && o.message;
    if (!msg || msg.type !== 'message' || msg.role !== 'assistant' || !msg.usage) continue;
    const k = msg.id || line;          // 同一次请求可能有多条记录，去重
    if (seen.has(k)) continue;
    seen.add(k);
    read += msg.usage.cache_read_input_tokens || 0;
    creation += msg.usage.cache_creation_input_tokens || 0;
    fresh += msg.usage.input_tokens || 0;
  }
  const total = read + creation + fresh;
  return total > 0 ? read / total : null;
}

let cacheStr = '缓存 --';
try {
  const file = findTranscript();
  if (file) {
    const rate = cacheStats(file);
    if (rate !== null) cacheStr = '缓存命中 ' + (rate * 100).toFixed(1) + '%';
  }
} catch (e) {
  cacheStr = '缓存 --';
}

process.stdout.write(' ' + mark + ' ' + label + ' ' + clock + ' | ' + cacheStr + ' ');
