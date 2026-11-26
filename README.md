<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

Current version: **v2.7.0**. The interface is Chinese. Daily records and reward goals use local-first storage and manual Supabase synchronization.

For reward cloud sync, apply [`20261126_reward_goal_sync.sql`](supabase/migrations/20261126_reward_goal_sync.sql) once in the existing project's Supabase SQL Editor. Deploying the frontend does not apply database migrations. See the [setup and acceptance checklist](docs/V2_7_REWARD_GOAL_SYNC_RELEASE.md) and [project handoff](docs/PROJECT_HANDOFF.md).

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/caaa3a45-f106-4668-9f6c-624f24ae40fe

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
