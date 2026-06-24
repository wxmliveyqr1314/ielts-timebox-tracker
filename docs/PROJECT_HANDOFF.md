# IELTS TimeBox Tracker 后续开发交接

## 1. 项目概况

项目名称：IELTS TimeBox Tracker / 雅思时间盒打卡系统

项目用途：

帮助用户根据工作日、健身、精力和前一天完成状态，生成雅思学习时间盒计划，并通过 Daily、History、Stats 和状态系统保持长期不断线。

技术栈：

- React

- Vite

- TypeScript

- Tailwind CSS

- Lucide React

- LocalStorage

- GitHub

- Vercel

项目最初由 Google AI Studio 生成界面和基础代码，随后下载到本地项目文件夹继续开发。

当前主要开发工具：

- Codex：产品规划、技术方案、开发指令、代码审核和版本决策

- Antigravity：代码执行、终端操作、浏览器验证和 Bug 修复

- Stitch：可选的 UI/UX 设计工具

- GitHub：版本和交接的唯一事实来源

- Vercel：Preview 和正式部署

## 2. 当前稳定状态

当前功能版本约为 v0.4.2，已经部署到 Vercel 进行测试。

Codex开始后续工作前，必须通过 Git 日志、Tag 和实际代码确认准确版本，不得仅依赖本文版本号。

当前已实现功能：

1. Daily 今日计划生成

2. 四种 Focus Mode

3. 工作时间和晚间时间盒

4. 任务完成状态及实际学习时长

5. Green / Yellow / Red / Pending 日状态

6. History 历史记录查看和修改

7. 今日页与历史页数据同步

8. sleep_control 双向同步

9. Stats 近七日统计

10. 当前连续天数和最长连续天数

11. 日期规范化和非法日期过滤

12. LocalStorage 损坏数据备份和安全模式

13. 导入、清空等破坏性操作二次确认

14. Vercel Web 部署

已通过审核的重要修复：

- 重新生成计划保留任务进度

- Recovery 模式生成规则

- 状态前缀匹配

- 去除浏览器 require

- sleep_control 同步

- Pending 不参与防熬夜失败统计

- YYYY-M-D 和 YYYY-MM-DD 日期兼容

- 非法日期过滤

- Streak 不再比较原始日期字符串

- LocalStorage 损坏时不会立即覆盖主 Key

## 3. 已知低优先级问题

1. stats.ts 可能仍有少量未使用 import，需要先检查。

2. Current Streak 当前可能从最新有效记录开始，而不是强制从今天开始。

3. Pending 在 UI 中可能表现为黑色，后续建议统一改为灰色“未结算”。

4. 当前主要依赖 LocalStorage，尚不支持多端同步。

5. 当前 UI 仍保留较明显的原型风格。

6. 尚未完成完整 PWA 应用化。

不得假设这些问题仍然存在，必须检查当前真实代码。

## 4. 后续产品目标

### 目标 A：Focus Mode 智能推荐

Generate Plan 页面目前有四种 Focus Mode。

Codex必须先检查项目中的真实枚举、显示名称和数据结构，不得根据本文猜测字段名。

用户当前的产品意图：

1. 正常学习 Focus Mode 应当轮转。

2. 如果昨天的 Focus Mode 最终完成为 Green，今天默认推荐下一个正常模式。

3. 示例：
   
   - 昨天 Dictation / Listening 为 Green
   
   - 今天默认推荐 Reading

4. 如果昨天没有达到 Green，今天默认推荐 Recovery。

5. 推荐值只作为默认值，用户仍然可以手动选择其他模式。

6. 页面要解释推荐原因。

7. 目标是避免用户忘记昨天模式，从而连续多天选择相同 Focus Mode。

Codex实施前必须确认：

- Green 指整日状态，还是 Focus 模块自己的状态。

- 正常轮转的准确顺序。

- Recovery 完成后恢复哪个模式。

- 昨天为 Pending 时如何处理。

- 中间缺少记录时如何处理。

- 手动覆盖是否改变后续轮转位置。

这些未确认内容不得自行猜测后直接开发。

### 目标 B：数据库和多端云同步

目标：

- 手机和电脑之间同步记录

- 登录后恢复用户数据

- 离线时仍能正常打卡

- 网络恢复后继续同步

- 不丢失现有 LocalStorage 数据

- 第一次登录能够安全迁移本地记录

- 提供导出和恢复能力

- 明确冲突解决规则

- 明确删除记录的同步规则

Codex必须先输出技术决策文档，再决定 Firebase、Supabase 或其他方案。

不得直接删除 LocalStorage 本地保存能力。

数据库开发前必须定义：

- 用户身份

- DailyRecord 文档结构

- Settings 数据结构

- schemaVersion

- updatedAt

- deviceId

- deletedAt 或删除墓碑

- 首次迁移策略

- 同步冲突策略

- 安全规则

- 环境变量管理

- Vercel Preview 和 Production 配置

### 目标 C：App 风格 UI

目标：

- 移动端优先

- 明确的信息层级

- Focus Mode 有独立图标

- Green / Yellow / Red / Pending 容易理解

- 登录和同步状态清晰

- Generate Plan 操作更直观

- Today 页面减少操作负担

- History 和 Stats 更适合手机

- 具备应用图标和启动视觉

- 后续支持 PWA 添加到桌面

Stitch是可选设计阶段，不负责业务逻辑或数据库实现。

如使用 Stitch：

1. Codex先整理 UI_BRIEF.md。

2. 用户将 Vercel 页面、截图和 UI_BRIEF 提交给 Stitch。

3. Stitch产出设计页面和设计系统。

4. Antigravity通过 Stitch MCP 获取设计上下文。

5. Antigravity在现有代码中实现。

6. Codex检查真实 Diff、业务回归和视觉结果。

## 5. 工具职责

### Codex

Codex是后续开发的规划者和审核者。

职责：

- 阅读完整代码仓库

- 理解现有数据模型

- 与用户明确需求

- 拆分版本和开发阶段

- 生成可执行的 Antigravity 开发指令

- 定义验收标准

- 定义测试用例

- 审查 Antigravity 的真实代码 Diff

- 运行类型检查、构建和必要测试

- 判断通过、修复或回退

- 更新 Roadmap 和交接文档

默认情况下，Codex不得直接修改代码。

只有用户明确要求 Codex亲自修复时，才允许进入写入模式。

### Antigravity

Antigravity是唯一默认代码执行者。

职责：

- 阅读 Codex开发指令

- 创建或切换功能分支

- 修改真实代码

- 运行终端命令

- 运行浏览器验证

- 记录修改文件

- 记录测试结果

- Commit 并 Push 功能分支

Antigravity不得：

- 擅自扩大需求

- 自动进入下一版本

- 未经允许重构整个项目

- 仅用文字宣称测试通过而不执行命令

- 跳过 Git 分支和 Commit

- 在 Codex审核期间继续修改代码

### Stitch

Stitch只负责 UI/UX 设计：

- 页面视觉方案

- 设计系统

- 图标方向

- 布局

- 字体

- 色彩

- 间距

- 组件视觉状态

- 移动端和桌面端设计

Stitch不负责：

- Focus 推荐算法

- 数据库架构

- 同步逻辑

- 数据迁移

- 权限安全

- 业务状态计算

## 6. Git 是唯一事实来源

每个功能使用独立分支，例如：

- feature/v1.1-focus-recommendation

- feature/v1.2-cloud-sync

- feature/v1.3-ui-redesign

- feature/v1.4-pwa-release

标准交接必须包含：

- 分支名称

- Commit Hash

- 修改文件

- Git Diff

- 类型检查结果

- 构建结果

- 测试结果

- Preview 地址

Codex审核真实代码和 Diff，不得只审核 Antigravity 的文字总结。

Codex和Antigravity不得同时修改同一个工作区。

## 7. 固定开发循环

每个版本必须遵循：

1. 用户向 Codex说明需求。

2. Codex读取当前仓库。

3. Codex确认需求和开放问题。

4. Codex输出版本计划。

5. Codex输出 Antigravity 开发指令。

6. Antigravity创建功能分支。

7. Antigravity执行开发和测试。

8. Antigravity Commit 并 Push。

9. Codex审核真实分支、Commit 和 Diff。

10. Codex运行必要检查。

11. Codex输出：
- 通过

- 有小问题但可继续

- 不通过
12. 不通过时，Codex输出精确修复指令。

13. 通过后合并到 main。

14. 部署 Vercel Preview 或 Production。

15. 更新交接和版本记录。

## 8. 每轮必须执行的最低检查

至少执行：

```bash
git status
npx tsc --noEmit
npm run build
```

涉及 UI 时还必须：

- 启动开发服务器

- 使用浏览器验证主要页面

- 检查手机宽度

- 提供关键页面截图

涉及数据时还必须：

- 测试空数据

- 测试旧数据

- 测试异常数据

- 测试刷新

- 测试取消操作

- 测试导入和覆盖

- 测试离线或失败降级

涉及云同步时还必须：

- 测试首次登录迁移

- 测试两台设备修改

- 测试同一天冲突

- 测试删除同步

- 测试退出登录

- 测试权限隔离

- 测试网络中断恢复

## 9. 推荐路线

### Phase 0：仓库恢复审计

只检查，不修改。

确认：

- 本地与远端是否一致

- 当前分支和最新 Commit

- Vercel对应哪个 Commit

- 当前数据结构

- 当前 Focus Mode 枚举

- 当前状态计算

- 当前测试能力

- 已知问题是否仍存在

### v1.1：Focus Mode 智能推荐

先完成轮转和 Recovery 推荐，不接数据库，不大改 UI。

### v1.2：多端云同步

先写技术决策和数据迁移方案，再实施。

### v1.3：UI 重设计

业务逻辑和同步状态稳定后，再决定是否引入 Stitch。

### v1.4：PWA 和发布加固

完成图标、安装、离线启动、版本更新提示、备份恢复和正式发布测试。

## 10. 禁止事项

未经用户明确批准，不得：

- 一次开发多个大版本

- 直接在 main 分支开发

- 删除现有本地数据兼容

- 静默覆盖用户数据

- 擅自改变 Green / Yellow / Red / Pending 定义

- 擅自改变 Focus Mode 轮转规则

- 为了 UI 重写全部业务逻辑

- 在审核未通过时部署生产环境

- 因工具宣称“完成”而跳过真实代码审核
