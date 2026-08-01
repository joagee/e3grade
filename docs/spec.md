# Spec: 英语冒险岛链 (English Adventure Islands)

## Objective

让 8-9 岁的三年级孩子在暑假用手机，通过"闯关(英语) → 金币 → 装扮/盲盒 + 连续冒险故事"的机制，主动、开心地每天花 10-15 分钟预习人教版英语三年级上册（PEP English G3 Up，6 单元 / 约 90 核心词），建立对英语的正反馈，开学对课本内容"混个脸熟"。

**用户故事（按优先级）**：

- 作为孩子，打开 App 看到一座冒险岛链地图，每天解锁一个新章节（世界）。
- 作为孩子，我闯关赚金币：每个新词先听发音 → 跟读建立语感 → 才能进入听音选词 / 看图选词，英语答对即通关。
- 作为孩子，我用金币买装扮（确定性）或抽盲盒（随机），我的主角形象会实时变化。
- 作为孩子，我追一部连续冒险故事，章末悬念预告让我第二天想回来。
- 作为家长，我确认孩子主动使用且开学对课本不陌生、不恐惧。

**成功标准（可验证）**：

1. 6 章剧本 + 全部关卡可完整玩通，无阻塞。
2. 孩子连续 7 天主动要求闯关（家长观察记录）。
3. Edge TTS 在孩子手机（国内网络）正常发声，响应可接受。
4. PWA 可从主屏启动、离线可用。
5. 金币 / 装扮 / 盲盒库存 / 章节进度在刷新与重启后不丢失。
6. 开学后孩子对课本词汇与单元主题不陌生（家长/老师反馈）。

## Learning Sequence (学习递进)

**核心教学原则：零基础非母语儿童必须先输入、再输出、最后检验，禁止跳过前两步直接进入选词题。**（依据二语习得的"可理解输入"：没听过、没说过，谈不上辨词。）

每个新词 / 字母必须走完整四步流水线：

1. **听 (Listen)**：Edge TTS 朗读示范，同时显示单词 + 图形 + 中文释义，建立音-形-义连接，可反复点听。
2. **跟读 (Repeat)**：孩子跟读，回放原音与自己的录音对比，自评"像 / 再试"，建立语音肌肉记忆与语感。
3. **听音选词 (Listen & Choose)**：完成前两步后才出现；听发音，从候选中选出对应词。
4. **看图 / 看词选词 (Look & Choose)**：巩固形-义对应。

规则：章节内**首次出现的词必从第 1 步开始**；已学过的词可跳过前两步直接进入检验。字母拼读（Letters and sounds）同样遵循：先听字母音 → 跟读 → 再辨首音。

## Tech Stack

- 纯静态 Web：HTML5 + CSS3 + Vanilla JS（ES Modules），**无构建工具链**。
- PWA：手写 `sw.js` + `manifest.webmanifest`，可安装、可离线。
- 存储：IndexedDB（进度、金币、装扮、盲盒库存、连续打卡）。
- 语音合成：微软 Edge TTS，浏览器 WebSocket 直连（免费、无 key、国内实测可用、不受 CORS 限制）。
- 语音评测一期：MediaRecorder 录音 + HTMLAudioElement 回放对比（原音 vs 自己录音），孩子自评。
- 部署：Cloudflare Pages + 用户已有自定义域名。
- 无后端、无数据库、无框架、无构建、无内购。

## Commands

```bash
# 本地预览（任选其一）——静态根目录为 src/
npx serve src

# 部署（任选其一）——Pages 构建输出目录设为 src/
npx wrangler pages deploy src --project-name=xxx
# 或 Cloudflare 控制台手动上传 src/

# 测试：无自动化测试框架，走 docs/manual-test-checklist.md 手动清单
```

## Project Structure

```
docs/
  ideas/english-adventure-islands.md   → 方案 one-pager
  spec.md                              → 本文件
  manual-test-checklist.md             → 手动验收清单
src/
  index.html            → PWA 入口
  css/styles.css        → 全部样式
  data/                 → 内容数据（JSON，随 Pages 部署，与代码分离）
    story.json          → 6 章剧本（剧情节点、台词、悬念预告）
    levels.json         → 章节-词汇映射与关卡配置（四步流水线）
    vocabulary.json     → 词汇表（含音标、中文释义、emoji 图形）
    economy.json        → 金币产出规则 + 盲盒机制数值（物价/概率在 avatars.json）
    avatars.json        → 主角形象 + 装扮全量定义（价格、来源、稀有度、盲盒权重）
  js/main.js            → 启动、视图路由、状态初始化
  js/story.js           → 剧情演出引擎（逐行文本+语音+场景图）
  js/game.js            → 关卡引擎（四步流水线：Learn→Repeat→Listen&Choose→Look&Choose）
  js/economy.js         → 金币、装扮、盲盒、打卡逻辑
  js/tts.js             → Edge TTS WebSocket 封装（含降级提示）
  js/storage.js         → IndexedDB 封装
  js/data.js            → fetch 加载 src/data 内容数据
  sw.js                 → Service Worker（离线缓存）
  manifest.webmanifest  → PWA 清单
```

## Code Style

- 命名：变量/函数/文件英文驼峰；数据字段英文 snake_case。
- 不写代码注释（保持简洁，命名自解释；数据 JSON 用字段名表达含义）。
- 代码与内容数据分离：剧本/词汇/数值全在 `src/data/*.json`，`src/js` 不含业务数据。
- 视图切换由 `main.js` 路由控制，单页应用。
- 面向孩子的文案必须积极、正向、无挫败感语言。

**风格示例（伪代码示意）**：

```js
// js/tts.js
export async function speak(text, { voice = 'en-US-AriaNeural' } = {}) {
  // Edge TTS over WebSocket, returns an audio blob
}
```

## Testing Strategy

- 无自动化测试框架。验收方式 = `docs/manual-test-checklist.md` 手动清单 + 浏览器真机验证。
- 关键验证路径：
  - 学习流水线：新词必须从"听"开始，禁止直接跳进选词题；已学词可跳过。
  - 关卡全流程：选关 → 学习 → 做题 → 结算金币 → 持久化。
  - TTS：中文/英文朗读发声正常，断网时优雅降级提示。
  - 经济系统：金币增减、购买、抽卡、保底计数在刷新后一致。
  - PWA：主屏安装、离线打开、Service Worker 缓存命中。
- 优先 Android Chrome 真机验证（目标设备是孩子手机）。

## Boundaries

**Always（必须做）**：

- 关卡通过结果必须持久化；金币变动原子化写入 IndexedDB。
- TTS 加载失败/网络断开时显示友好降级文案，不卡死。
- 所有面向孩子的内容积极正向、无负面评价式反馈。

**Ask first（先问用户）**：

- 引入构建工具 / 框架 / 新增依赖。
- 引入后端、数据库、云同步、账号系统。
- 引入真实 AI 语音评测（二期）或国内 STT。
- 修改金币经济核心数值（产出/物价/概率/保底）。
- 增加任何内购/真实货币概念。

**Never（绝对不做）**：

- 真实货币、内购、充值。
- 收集或上传儿童个人信息。
- 把 API key / 密钥写进前端代码或提交进仓库。
- 直接复制教材插图/内容作素材（版权）。

## Success Criteria

1. 6 章剧本 + 全部关卡可完整玩通，无阻塞。
2. 孩子连续 7 天主动要求闯关（家长观察记录）。
3. Edge TTS 在孩子手机（国内网络）正常发声，响应可接受。
4. PWA 可从主屏启动、离线可用。
5. 金币 / 装扮 / 盲盒库存 / 章节进度在刷新与重启后不丢失。
6. 开学后孩子对课本词汇与单元主题不陌生（家长/老师反馈）。

## Open Questions

- 金币经济数值的最终调优（MVP 已用合理默认值，试玩后按真实反馈调整）。
- 盲盒概率与保底的具体数值体验（试玩后观察孩子是否受挫）。

## Confirmed Decisions (已确认)

- **故事基调**：魔法冒险（主角捡到会说话的魔法英语书，词语被咒语打散，跟读"念咒语"把词救回来）。
- **每日软限制**：延迟满足，**必做**——当日章节完成后显示"今日冒险已完成，明天见"，不提供一键解锁全部。
- **金币数值**：MVP 用合理默认值，试玩后调整。
