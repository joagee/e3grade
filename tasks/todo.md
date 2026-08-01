# Task List: 英语冒险岛链

## Phase 1: Foundation

- [ ] **Task 1: 项目骨架与视图路由**
  - Acceptance: `npx serve .` 打开 index.html 显示应用壳；main.js 路由可切换视图（地图/关卡/商店/图鉴）
  - Verify: 浏览器手动切视图，控制台无报错
  - Files: `src/index.html`, `src/css/styles.css`, `src/js/main.js`

- [ ] **Task 2: storage.js IndexedDB 封装**
  - Acceptance: 提供 get/set/update 存取进度、金币、装扮、盲盒库存、打卡；刷新/重启不丢；首访自动建库
  - Verify: 控制台读写测试，刷新页面数据仍在
  - Files: `src/js/storage.js`

- [ ] **Task 3: 内容数据初始结构 + data.js**
  - Acceptance: `docs/content/` 下 5 个 JSON（story/levels/vocabulary/economy/avatars）结构定稿，含第 1 章样例数据；data.js 正确加载；economy 含产出/物价/盲盒概率/保底默认值
  - Verify: 控制台打印加载结果
  - Files: `docs/content/*.json`, `src/js/data.js`

### Checkpoint A: Foundation
- [ ] 应用壳可打开、视图可切换、IndexedDB 可读写、内容可加载

## Phase 2: Core Engines

- [ ] **Task 4: tts.js Edge TTS WebSocket 封装**
  - Acceptance: 中/英文文本发声；发音可选不同音色；断网/失败时优雅降级提示不卡死
  - Verify: 真机 Android Chrome 发声测试（重点验证 WebSocket 兼容性）
  - Files: `src/js/tts.js`

- [ ] **Task 5: story.js 剧情演出引擎**
  - Acceptance: 逐行文本 + 语音朗读 + 场景图；点击推进；支持选择分支占位；章末悬念预告展示
  - Verify: 走一遍第 1 章剧情，文本/语音/场景同步
  - Files: `src/js/story.js`, `src/css/styles.css`

- [ ] **Task 6: game.js 四步流水线关卡引擎**
  - Acceptance: 新词强制从 Learn（听）开始 → Repeat（跟读自评）→ Listen&Choose → Look&Choose；已学词可跳过前两步；答题正确判定 + 反馈
  - Verify: 新词无法直接跳选词题；已学词可跳过；通关结算触发
  - Files: `src/js/game.js`, `src/css/styles.css`

- [ ] **Task 7: economy.js 经济系统**
  - Acceptance: 通关发金币并持久化；装扮商店确定性购买；盲盒抽取（概率 + 保底计数）与库存持久化；连续打卡记录
  - Verify: 金币增减、购买、抽卡、保底在刷新后一致
  - Files: `src/js/economy.js`, `src/css/styles.css`

- [ ] **Task 8: 冒险地图 + 每日软限制 + 第 1 章闭环**
  - Acceptance: 地图显示 6 岛 + 解锁状态；当日章节可玩，完成后锁定"今日冒险已完成，明天见"；第 1 章（剧情+流水线+金币+装扮预览）端到端跑通
  - Verify: 完整走一遍第 1 章，次日状态正确
  - Files: `src/js/main.js`, `src/js/story.js`, `src/js/game.js`, `src/js/economy.js`, `docs/content/story.json`

### Checkpoint B: 第 1 章可玩闭环（关键里程碑）
- [ ] 端到端流程无阻塞
- [ ] 新词强制从"听"开始
- [ ] 给孩子试玩，收集兴趣反馈

## Phase 3: Content Full Build

- [ ] **Task 9: 第 2-4 章内容数据**
  - Acceptance: 第 2/3/4 章剧本（剧情节点、台词、悬念预告）+ 对应单元词汇关卡 + 字母拼读关卡，全部加载可玩
  - Verify: 逐章试玩，无数据缺失
  - Files: `docs/content/story.json`, `docs/content/levels.json`, `docs/content/vocabulary.json`

- [ ] **Task 10: 第 5-6 章 + Revision + 字母拼读内容数据**
  - Acceptance: 第 5/6 章 + Revision（Being a good guest）+ 附录字母音内容全部完成，全 6 章 90 词可玩
  - Verify: 全量走查
  - Files: `docs/content/story.json`, `docs/content/levels.json`, `docs/content/vocabulary.json`

### Checkpoint C: Content Complete
- [ ] 6 章 + 90 词全部可玩，无阻塞

## Phase 4: PWA & Polish

- [ ] **Task 11: PWA 离线与安装**
  - Acceptance: sw.js 预缓存全部静态资源与内容 JSON；manifest.webmanifest + 图标；可添加到主屏；离线打开正常
  - Verify: 安装到手机主屏，飞行模式打开仍可玩已缓存章节
  - Files: `src/sw.js`, `src/manifest.webmanifest`, `src/icons/*`

- [ ] **Task 12: 手动验收清单 + 打磨**
  - Acceptance: `docs/manual-test-checklist.md` 覆盖全流程；文案/间距/按钮尺寸按孩子视角打磨；金币数值按试玩反馈微调
  - Verify: 清单全过
  - Files: `docs/manual-test-checklist.md`, `src/**`

### Checkpoint D: Complete
- [ ] spec.md 全部 Success Criteria 可验证
- [ ] 孩子试玩反馈已用于调整
