import { Page } from "@playwright/test";
import { AppState, DailyRecord, DayStatus } from "../src/types";

export const APP_STATE_KEY = "ielts_timebox_state_v2";
export const WALLPAPER_META_KEY = "ielts_timebox_wallpaper_meta_v1";

function makeRecord(date: string, status: DayStatus): DailyRecord {
  const task = (
    id: string,
    category: DailyRecord["tasks"][number]["category"],
    minutes: number,
  ): DailyRecord["tasks"][number] => ({
    id: `${date}-${id}`,
    title: `${id} practice`,
    category,
    plannedMinutes: minutes,
    actualMinutes: minutes,
    completed: true,
    isCore: category !== "passive_listening",
    isEveningTask: category !== "passive_listening",
    notes: "E2E fixture",
  });

  return {
    date,
    weekday: "Friday",
    exercised: false,
    startTime: "19:00",
    energyLevel: "normal",
    dayType: "listening_focus",
    workdayBonus: { passiveListeningMinutes: 0 },
    tasks: [
      task("Momo", "momo", 20),
      task("Dictation", "dictation_new", 30),
      task("Reading", "reading_scan", 20),
      task("Speaking", "speaking_shadowing", 10),
      task("Passive listening", "passive_listening", 15),
    ],
    stoppedAfter2230: true,
    noCompensatoryStayingUp: true,
    bedtime: "22:20",
    tomorrowFirstStep: "Review one sentence",
    notes: "E2E fixture",
    status,
    createdAt: `${date}T00:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

export const TEST_APP_STATE: AppState = {
  records: {
    "2026-06-27": makeRecord("2026-06-27", "green"),
    "2026-06-26": makeRecord("2026-06-26", "yellow"),
    "2026-06-25": makeRecord("2026-06-25", "red"),
    "2026-06-24": makeRecord("2026-06-24", "pending"),
  },
};

export async function seedAppState(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, state }) => localStorage.setItem(key, JSON.stringify(state)),
    { key: APP_STATE_KEY, state: TEST_APP_STATE },
  );
}

export async function seedWallpaper(page: Page): Promise<void> {
  await page.evaluate(async ({ metaKey }) => {
    localStorage.setItem(metaKey, JSON.stringify({
      schemaVersion: 1,
      ownerUserId: null,
      cloudPath: null,
      enabled: true,
      overlayOpacity: 42,
      wallpaperUpdatedAt: "2026-06-28T00:00:00.000Z",
    }));

    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1800">',
      '<rect width="1200" height="1800" fill="#264653"/>',
      '<circle cx="900" cy="350" r="260" fill="#e9c46a"/>',
      '<rect y="1050" width="1200" height="750" fill="#2a9d8f"/>',
      '</svg>',
    ].join("");
    const blob = new Blob([svg], { type: "image/svg+xml" });

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("ielts_timebox_wallpaper_v1", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("wallpaper");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("wallpaper", "readwrite");
        transaction.objectStore("wallpaper").put(blob, "active");
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, { metaKey: WALLPAPER_META_KEY });
}
