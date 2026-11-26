# v2.6 Simplified Chinese Interface

Date: 2026-11-26

## Product decision

Use Simplified Chinese as the default interface. Navigation, setup, task guidance, history, statistics, rewards, authentication, sync, wallpaper, backup tools, status explanations, dates, units, accessibility labels, and recoverable errors should use natural Chinese. Keep English learning material, user-written notes, and recognizable names such as IELTS and Momo intact. No language picker or new persistent setting is needed.

## Compatibility design

- Keep stored enums, task definition/entry IDs, registry source titles, LocalStorage keys, record schemas, and cloud payloads stable. Render Chinese task titles/guidance through a presentation layer, including known legacy English task titles. Unknown/custom titles and user notes remain unchanged.
- Daily status, planning arithmetic, reward scoring, manual synchronization, and deletion semantics stay unchanged. Avoid translating strings used for legacy task matching or status detection.
- Localize presentation helpers and task-library view labels; translate task metadata at the display boundary. Dates use Chinese formatting and weekdays. Duration labels use Chinese units.
- Application metadata and document language use Chinese. Keep cached PWA upgrade behavior and asset identity intact.
- First complete the Chinese interface; reward-goal cloud sync remains a separate follow-up feature.

## Validation and release

1. Inventory user-visible text and apply consistent terminology: 今日 / 学习指南 / 历史 / 统计 / 设置; 必做任务 / 可选加练 / 已完成学习 / 专注时长; 达标 / 部分完成 / 需调整 / 待开始.
2. Add presentation and legacy-record regression tests. Update component/browser assertions to the Chinese labels without translating underlying fixture IDs, stored enums, or user content.
3. Run unit/component tests, TypeScript, icon checks, production build, and Chromium tests covering all five tabs, historical editing, wallpaper/mobile overflow, and offline usage. Visually inspect Chinese layouts and scan for remaining interface English.
4. Prepare version 2.6.0 and handoff, commit on a feature branch, push a PR, verify CI, merge, and confirm the production version and commit.

## Evidence

- Full unit/component suite: 34 files, 285 tests passed, including complete task-copy coverage and legacy English title/user-note preservation.
- Final feedback/accessibility changes passed 23 focused tests. TypeScript, six PWA PNG icons, and the production build passed.
- All 14 Chromium browser tests passed on the final build, covering Chinese navigation/labels, legacy records, English note persistence, regeneration, historical edits, wallpaper/mobile overflow, and offline PWA behavior.
- Reviewed five 390px page screenshots. Adjusted Stats duration typography to keep Chinese units readable. Study remains within 360/390/768/1280px widths.
- Static JSX text scan found no untranslated interface English, excluding the TimeBox brand and symbols. User content, recognized tool names, and internal diagnostics retain their source text where appropriate.
- Confirmed no diff in persisted types, registry source, planning/progress engine, status/sleep rules, record storage/sync, or reward scoring. `git diff --check` passed.
- Remote CI, merge, and deployment results are tracked on the release PR and resulting commit.
