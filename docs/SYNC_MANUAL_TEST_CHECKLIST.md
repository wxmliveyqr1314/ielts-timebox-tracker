# 手动云同步验证指南 (Manual Sync Test Checklist)

本文档提供针对 IELTS TimeBox Tracker (v1.2.x 手动同步阶段) 的验证清单，以确保在 Supabase 环境下的数据同步、冲突合并与删除（Tombstone）等功能正常工作。

## 1. 环境准备
- [ ] Vercel (或本地) 环境变量已配置 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
- [ ] Supabase 数据库已成功创建 `daily_records` 表，包含 `user_id`、`device_id`、`date_key`、`record_json`、`deleted_at` 等必要字段。
- [ ] 确保 Supabase 开启了 RLS (Row Level Security)，并配置了正确的 Policies（用户只能看到自己的数据）。

## 2. 单设备验证
- [ ] **登录**：在 Settings 页面，输入邮箱通过 Magic Link 成功登录，并显示账户状态为 Signed in。
- [ ] **导出备份**：点击 `Export Data` 进行一次 JSON 备份。
- [ ] **首次同步提示**：点击 `Sync now`，确认出现“请先导出 JSON 备份...”的提示。点击 Continue 进行同步。
- [ ] **同步完成文案**：如果无新数据，应当显示 `Sync complete: no changes.`。
- [ ] **刷新页面**：刷新浏览器，再次点击 `Sync now`，应表现为无需再次确认首次弹窗，直接输出同步完成结果。

## 3. 双设备验证（冲突与合并）
- [ ] **电脑生成记录**：在电脑端新建/编辑当天的打卡记录，然后点击 `Sync now`。期望结果为 `uploaded 1`。
- [ ] **手机同步下载**：在手机端（未记录当天数据）登录并点击 `Sync now`。期望结果为 `downloaded 1`，并能看到电脑端刚生成的数据。
- [ ] **手机编辑**：在手机端修改刚才下载的记录内容（此时 `updatedAt` 会被更新）。再次点击 `Sync now`，期望结果为 `uploaded 1`。
- [ ] **电脑同步拉取**：回到电脑端，点击 `Sync now`。由于手机端的 `updatedAt` 更晚，期望结果为 `downloaded 1`，并且看到手机端的修改，不发生复活或旧数据覆盖。

## 4. 删除验证 (Tombstone)
- [ ] **删除记录**：在任一设备上删除某天的打卡记录。
- [ ] **同步删除**：点击 `Sync now`，期望结果包含 `uploaded 1`，此操作会在 Supabase 将该记录标记为 `deleted_at` (Tombstone)。
- [ ] **另一设备确认不复活**：在另一设备上，原先拥有这条记录。点击 `Sync now`，期望结果包含 `downloaded 1`，且由于检测到 Tombstone，该设备上的这条本地记录应该消失（被删除）。
- [ ] **防止假死恢复**：若设备 B 在同步期间离线并试图重新创建同一天的记录，当其连网再次同步时，若它的 `updatedAt` 晚于云端 `deleted_at`，它将被当作新记录重新上传；如果早于云端 `deleted_at`，它将重新被删除。请通过代码测试验证该逻辑。

## 5. 失败场景
- [ ] **断网**：在断网环境下点击 `Sync now`，应当显示类似 `Sync failed. Your local data was kept safe. (Failed to fetch)` 的错误。
- [ ] **未登录**：在登出状态点击 `Sync now`，应当明确提示 `Please sign in before syncing.`。
- [ ] **配置缺失**：若把环境变量暂时去除（模拟未配置），界面应显示 `Cloud sync is not configured.`。

## 6. 回滚方案
- [ ] **恢复数据**：如果在测试过程中发生了数据混乱或意外丢失，可点击 `Settings > Import Data`，选择第 2 步中备份的 `.json` 文件恢复所有本地进度，然后可以再次点击 `Sync now` 强行使用本地最新数据覆盖云端。
