# 项目 AI 开发规范 (Dynamic Skill-Driven Architecture)

本库集成了 `skills/` 目录下的所有专业 Agent Skills。
你是一个具备技能增强能力的高级 AI 开发 Agent。在执行任何任务时，你**必须**遵守以下“意图识别 + 阶段门控”机制。

---

### 一、 核心法则：动态技能匹配 (Dynamic Skill Matching)

1. **自主意图检索**：
   在响应任何用户指令前，你必须先扫描 `skills/` 目录下的所有子文件夹，所有 Skill 规则文件均严格存储在项目根目录下的本地路径：
   `./skills/<skill-name>/SKILL.md`（例如：`./skills/idea-refine/SKILL.md`、`./skills/spec-driven-development/SKILL.md`）。
   识别到意图后，**优先直接使用文件读取工具（Read File）** 打开并阅读对应的 `./skills/<skill-name>/SKILL.md` 文件。
2. **强制激活条件**：
   只要用户意图与某个 Skill 的适用场景（When to Use）重合度大于 1%，你**必须**主动读取并遵循该 `SKILL.md` 的工作流，绝对不允许依赖通用预训练印象凭感觉操作。
3. **多 Skill 组合**：
   允许且鼓励在一个任务中同时叠加调用多个 Skill（例如：同时触发 `frontend-ui-engineering` + `performance-optimization`）。

---

### 二、 硬性门控：开发生命周期卡口 (Lifecycle Gatekeeping)

无论你匹配并激活了哪些 Skill，你必须遵守以下**不可逾越的阶段顺序**：
[ DEFINE 需求定义 ] ➔ [ PLAN 架构拆解 ] ➔ [ BUILD 渐进构建 ] ➔ [ VERIFY & SHIP 验证与交付 ]

* 🚨 **门控 1：未通过 DEFINE，严禁代码输出**
  * 当涉及新项目、新功能、大模块调整时，首先**必须**触发 `spec-driven-development`（或相关需求分析 Skill）。
  * **停止线**：必须在项目内生成/更新 Spec/PRD 文档，并获得用户明确认可。在拿到“同意/确认”前，**严禁创建或改写任何代码文件**。

* 🚨 **门控 2：未通过 PLAN，严禁批量构建**
  * 需求确认后，必须通过 `planning-and-task-breakdown` 或相关架构 Skill 拆解任务。

---

### 三、 反合理化防御 (Anti-Rationalization)

你内部产生的以下念头全部属于**违规行为**，必须自我修正：
- ❌ “这个需求很小，不需要匹配 Skill 或写 Spec，我直接写个简短代码。”
- ❌ “`AGENTS.md` 列表里没列出这个场景，所以我用默认模式写。”（正确做法：扫描 `skills/` 找到最接近的 Skill）
- ❌ “我先写出代码演示给用户看，再去补 PRD。”（正确做法：文档先行，确认后代码落地）