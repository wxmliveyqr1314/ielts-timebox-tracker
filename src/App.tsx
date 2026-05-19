import { useState } from "react";
import { AppLayout } from "./components/layout/AppLayout";
import { DailyPage } from "./pages/DailyPage";
import { HistoryPage } from "./pages/HistoryPage";
import { StatsPage } from "./pages/StatsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { useAppData } from "./hooks/useAppData";

export default function App() {
  const [currentTab, setCurrentTab] = useState("daily");
  const appData = useAppData();

  return (
    <AppLayout currentTab={currentTab} onChangeTab={setCurrentTab}>
      {currentTab === "daily" && <DailyPage appData={appData} />}
      {currentTab === "history" && <HistoryPage appData={appData} />}
      {currentTab === "stats" && <StatsPage appData={appData} />}
      {currentTab === "settings" && <SettingsPage appData={appData} />}
    </AppLayout>
  );
}
