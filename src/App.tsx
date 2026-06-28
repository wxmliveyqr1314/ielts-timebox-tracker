import { useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { DailyPage } from "./pages/DailyPage";
import { HistoryPage } from "./pages/HistoryPage";
import { StatsPage } from "./pages/StatsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useAppData } from "./hooks/useAppData";
import { useSupabaseAuth } from "./hooks/useSupabaseAuth";
import { useWallpaper } from "./hooks/useWallpaper";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { realWallpaperDeps } from "./utils/wallpaperDeps";

export default function App() {
  const [currentTab, setCurrentTab] = useState("daily");
  const appData = useAppData();
  const auth = useSupabaseAuth();
  const wallpaper = useWallpaper({ userId: auth.session?.user.id ?? null, authReady: !auth.loading, deps: realWallpaperDeps });
  const online = useOnlineStatus();

  return (
    <AppLayout currentTab={currentTab} onChangeTab={setCurrentTab} wallpaper={wallpaper} online={online}>
      {currentTab === "daily" && <DailyPage appData={appData} />}
      {currentTab === "history" && <HistoryPage appData={appData} />}
      {currentTab === "stats" && <StatsPage appData={appData} />}
      {currentTab === "settings" && <SettingsPage appData={appData} auth={auth} wallpaper={wallpaper} online={online} />}
    </AppLayout>
  );
}
