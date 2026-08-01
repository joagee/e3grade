# Implementation Plan: 英语冒险岛链 (English Adventure Islands)

## Overview

为 8-9 岁三年级孩子构建一个 PWA 网页应用：用"连续魔法冒险故事 + 闯关(英语) + 金币/装扮/盲盒经济 + 每日软限制"驱动暑假预习人教版英语三年级上册（6 单元 / 约 90 词）。学习核心是**四步学习流水线**：先听发音 → 跟读建立语感 → 听音选词 → 看图/看词选词，禁止零基础直接进选词题。纯前端、无后端、无构建工具链。

## Architecture Decisions

1. **无构建工具链**：Vanilla JS（ES Modules）+ 手写 Service Worker，静态部署到 Cloudflare Pages。避免 Vite/Webpack 的依赖维护成本，符合"简单优先"。
2. **Edge TTS 前端 WebSocket 直连**：实测国内网络可达、免费无 key、WebSocket 不受 CORS 限制。Google TTS 实测不可达（已排除）。
3. **四步流水线是关卡引擎状态机核心**：`Learn → Repeat → Listen&Choose → Look&Choose`，新词强制从 Learn 开始，已学词可跳过。
4. **内容与代码分离**：剧本/词汇/数值全在 `src/data/*.json`（Cloudflare Pages 根目录为 src/，随站部署），`src/js` 不含业务数据，内容创作不影响代码。
5. **数据本地化**：IndexedDB 单设备存储（进度/金币/装扮/盲盒/打卡），无后端无账号，规避儿童数据与隐私问题。
6. **语音评测一期用自评**：录音回放原音对比，孩子当裁判；AI 评测二期再引入。
7. **每日软限制（延迟满足）必做**：当日章节完成即锁，"今日冒险已完成，明天见"，不提供一键解锁。

## Task List

### Phase 1: Foundation（骨架 + 数据层）

- [ ] Task 1: 项目骨架与视图路由（index.html + styles.css + main.js + 占位视图）
- [ ] Task 2: storage.js IndexedDB 封装（进度/金币/装扮/盲盒/打卡）
- [ ] Task 3: 内容数据初始 JSON 结构 + data.js（story/levels/vocabulary/economy/avatars，含第 1 章样例数据）

### Checkpoint A: Foundation
- [ ] 本地 `npx serve .` 打开显示应用壳，视图可切换
- [ ] IndexedDB 读写测试通过，刷新不丢
- [ ] 内容 JSON 可被 data.js 正确加载

### Phase 2: Core Engines（第 1 章垂直切片）

- [ ] Task 4: tts.js Edge TTS WebSocket 封装（含断网降级提示）
- [ ] Task 5: story.js 剧情演出引擎（逐行文本 + 语音 + 场景图 + 悬念预告）
- [ ] Task 6: game.js 四步流水线关卡引擎（Learn→Repeat→Listen&Choose→Look&Choose）
- [ ] Task 7: economy.js 经济系统（金币结算 + 装扮商店 + 盲盒保底 + 打卡）
- [ ] Task 8: 冒险地图 + 每日软限制 + 打通第 1 章完整闭环

### Checkpoint B: 第 1 章可玩闭环（关键里程碑）
- [ ] 端到端：地图 → 剧情 → 流水线学习 → 通关 → 金币 → 装扮/盲盒预览 → 悬念预告 → 次日锁定
- [ ] 新词强制从"听"开始，无法直接跳进选词题
- [ ] **立即给孩子试玩，验证兴趣假设（最高优先）**

### Phase 3: Content Full Build（全量内容）

- [ ] Task 9: 第 2-4 章剧本 + 关卡内容数据
- [ ] Task 10: 第 5-6 章 + Revision + 字母拼读内容数据

### Checkpoint C: Content Complete
- [ ] 6 章 + 90 词全部加载并可玩，无阻塞

### Phase 4: PWA & Polish

- [ ] Task 11: PWA（sw.js + manifest + 图标，可安装离线）
- [ ] Task 12: docs/manual-test-checklist.md + 整体走查打磨

### Checkpoint D: Complete
- [ ] 全部成功标准可验证（见 spec.md Success Criteria）
- [ ] 孩子试玩反馈后调整金币数值

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Edge TTS 在 Android Chrome 的 WebSocket 兼容性 | High | Task 4 立即真机验证；失败则降级 Web Speech API 或 Cloudflare Worker 代理 |
| 内容创作量（6 章剧本 + 90 词） | Med | 分章交付（Task 3/9/10），每章独立数据文件，逐章验收 |
| 9 岁孩子 UI 可操作性 | Med | 大按钮、emoji/SVG 图形化、少文字；试玩反馈迭代 |
| 盲盒多巴胺机制失控 | Low | 纯金币驱动 + 保底，绝无真实货币 |
| 每日软限制引发挫败 | Low | "明天见"文案积极，进度（宝石/地图）可视化补偿 |

## Open Questions

- 金币产出/物价/盲盒概率的具体默认值（MVP 先用合理默认值，试玩后按反馈调）
- 主角形象呈现形式（SVG 组合 vs emoji 组合，待试玩定）
