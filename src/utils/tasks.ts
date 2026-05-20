import { DayType, TaskCheckItem, EnergyLevel, DailyPlanOptions } from "../types";

export function generateDailyPlan(options: DailyPlanOptions): TaskCheckItem[] {
  const {
    exercised,
    energyLevel,
    dayType: rawDayType,
    workdayBonus = { passiveListeningMinutes: 0 },
    yesterdayStatus,
  } = options;

  const tasks: TaskCheckItem[] = [];
  let idCounter = 1;

  const addTask = (
    title: string,
    category: TaskCheckItem["category"],
    plannedMinutes: number,
    isCore: boolean = false,
  ) => {
    if (plannedMinutes < 0) return;
    tasks.push({
      id: `task_${idCounter++}`,
      title,
      category,
      plannedMinutes,
      actualMinutes: 0,
      completed: false,
      isCore,
      isEveningTask: title.includes("🌙") || title.includes("✅"),
    });
  };

  // 第 1 步：如果 yesterdayStatus === "red"，默认推荐 recovery（如果不覆盖用户的选择，使用传入的dayType）
  let dayType = rawDayType;
  if (yesterdayStatus === "red" && dayType !== "recovery") {
    // 界面层已经通过 useState 处理默认值。我们这里尊重传入的参数，如果有特定的强制改写可在此进行
  }

  // --- A. 上班后台任务 ---
  addTask("☀️ 泛听英语文章 / 新闻", "passive_listening", 30, false);
  addTask("☀️ 上班摸鱼墨墨", "momo", 15, false);
  addTask("☀️ 上班摸鱼王陆错词 / 少量听写", "dictation", 15, false);
  addTask("☀️ 上班摸鱼精读 / 长难句", "reading", 15, false);

  // 第 2 步：处理恢复日的绝对高优先级
  if (dayType === "recovery") {
    const isLow = energyLevel === "low";
    const recMomo = isLow ? 15 : 20;
    const recDict = isLow ? 15 : 20;
    const recSpeak = isLow ? 10 : 15;

    addTask("🌙 墨墨背单词", "momo", recMomo, true);
    addTask("🌙 王陆错词轻复习", "dictation", recDict, true);
    addTask("🌙 雅思口语跟读", "speaking", recSpeak, true);
    
    addTask("✅ 收尾：记录今日结果 + 明天第一步", "wrap_up", 5, true);
    addTask("✅ 22:30 后不开新重任务", "sleep_control", 0, true);
    addTask("✅ 没有补偿性熬夜", "sleep_control", 0, true);
    
    return tasks;
  }

  // 第 3 步：根据 dayType 选择主任务方向并设定基础时长
  let momoMins = 40;
  let mainTaskMins = 0; 
  let subTaskMins = 0;
  let extraTaskMins = 0;
  
  if (dayType === "listening_focus") {
    mainTaskMins = 90; // dictation: 30 + 50 + 10
    subTaskMins = 30;  // speaking
  } else if (dayType === "reading_focus") {
    mainTaskMins = 80; // reading: 10 + 45 + 25 = 80
    subTaskMins = 30;  // speaking
    extraTaskMins = 25; // dictation review
  } else if (dayType === "speaking_focus") {
    mainTaskMins = 45; // speaking: 15 + 20 + 10
    subTaskMins = 30;  // dictation/reading mix
  }

  // 第 4 步：根据 exercised 调整任务时长
  // 锻炼大概吃掉 40 分钟晚间核心时长
  if (exercised) {
    if (dayType === "reading_focus") {
      mainTaskMins -= 5; // 80 -> 75
      extraTaskMins -= 5; // 25 -> 20
    } else if (dayType === "speaking_focus") {
      momoMins = 30;
      mainTaskMins -= 5; // 45 -> 40
      subTaskMins -= 10; // 30 -> 20
    } else {
      // if exercised, we reduce main tasks. momo can stay the same or drop slightly
      // for listening_focus: mainTaskMins 90 -> 75
      momoMins -= 0; // momo stays 40 by default based on rules
      mainTaskMins -= 15;
      subTaskMins -= 0; // don't compress speaking
    }
  }

  // 第 5 步：根据 energyLevel 调整强度
  if (energyLevel === "low") {
    momoMins = Math.max(10, momoMins - 10);
    mainTaskMins = dayType === "speaking_focus" ? 15 : 30; // drop main rigidly
    subTaskMins = dayType === "speaking_focus" ? 0 : 15;
    extraTaskMins = 0; // rigidly drop
  } else if (energyLevel === "high") {
    // momo remains 40 mostly
    momoMins = 40;
    if (dayType === "speaking_focus") {
      mainTaskMins = 55; // 15 + 25 + 15
    } else {
      mainTaskMins += 10;
    }
    subTaskMins += 0;
  }

  // 第 6 步：根据 workdayBonus 抵扣晚上任务时长
  let mainDeduct = 0;
  if (dayType === "listening_focus") mainDeduct = workdayBonus.dictationMinutes || 0;
  if (dayType === "reading_focus") mainDeduct = workdayBonus.readingMinutes || 0;

  let momoDeduct = workdayBonus.momoMinutes || 0;
  
  momoMins -= momoDeduct;
  mainTaskMins -= mainDeduct;

  // 第 7 步：保证最低保留限制
  momoMins = Math.max(momoMins, 10);
  
  if (dayType === "listening_focus" || dayType === "reading_focus" || dayType === "speaking_focus") {
    if (energyLevel === "low") {
      mainTaskMins = Math.max(mainTaskMins, 15);
    } else {
      mainTaskMins = Math.max(mainTaskMins, 30);
    }
  }

  // 副任务保底处理
  if (dayType === "listening_focus" || dayType === "reading_focus") {
    if (energyLevel === "low") {
      subTaskMins = Math.max(subTaskMins, 10);
    } else {
      subTaskMins = Math.max(subTaskMins, 30);
    }
  } else if (dayType === "speaking_focus") {
    if (energyLevel === "low") {
      mainTaskMins = Math.max(mainTaskMins, 15);
    } else {
      mainTaskMins = Math.max(mainTaskMins, 30);
    }
    subTaskMins = Math.max(subTaskMins, 0); 
  }

  // ============================
  // 生成最终任务列表（分配具体模块）
  // ============================
  addTask("🌙 墨墨背单词", "momo", momoMins, true);

  const divideTime = (total: number, weights: number[]) => {
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    let remaining = total;
    const result = weights.map((w, idx) => {
      if (idx === weights.length - 1) return remaining;
      const val = Math.round((w / sumWeights) * total);
      remaining -= val;
      return val;
    });
    return result;
  };

  if (dayType === "listening_focus") {
    if (energyLevel === "low") {
      if (mainTaskMins > 0) addTask("🌙 王陆听写：旧错词复习", "dictation_review", mainTaskMins, true);
    } else {
      if (mainTaskMins > 0) {
        // 分配给 旧错词(30) / 新听写(50) / 查错(10) 以 [3, 5, 1] 比例分配
        const [oldRev, newDict, errChk] = divideTime(mainTaskMins, [3, 5, 1]);
        if (oldRev > 0) addTask("🌙 王陆听写：旧错词复习", "dictation_review", oldRev, true);
        if (newDict > 0) addTask("🌙 王陆听写：新单元听写", "dictation_new", newDict, true);
        if (errChk > 0) addTask("🌙 王陆听写：错词快速查看", "dictation_error_check", errChk, true);
      }
    }
    
    if (subTaskMins > 0) {
       addTask("🌙 雅思口语：跟读 / 影子跟读", "speaking_shadowing", subTaskMins, true);
    }
  } 
  else if (dayType === "reading_focus") {
    if (energyLevel === "low") {
      if (mainTaskMins > 0) addTask("🌙 雅思精读：长难句拆解", "reading_sentence_analysis", mainTaskMins, true);
    } else {
      if (mainTaskMins > 0) {
        // 分配给 扫读(1) / 长难句(4.5) / 词汇(2.5) -> [10, 45, 25] 比例
        const [scan, structure, vocab] = divideTime(mainTaskMins, [10, 45, 25]);
        if (scan > 0) addTask("🌙 雅思精读：段落扫读", "reading_scan", scan, true);
        if (structure > 0) addTask("🌙 雅思精读：长难句拆解", "reading_sentence_analysis", structure, true);
        if (vocab > 0) addTask("🌙 雅思精读：同义替换 / 生词整理", "reading_synonym_notes", vocab, true);
      }
    }

    if (subTaskMins > 0) {
      addTask("🌙 雅思口语：跟读 / 影子跟读", "speaking_shadowing", subTaskMins, true);
    }
    
    if (extraTaskMins > 0) {
      addTask("🌙 王陆错词轻回看", "dictation_review", extraTaskMins, true);
    }
  }
  else if (dayType === "speaking_focus") {
    if (energyLevel === "low") {
      if (mainTaskMins > 0) addTask("🌙 雅思口语：Part 1 问答", "speaking_ai_conversation", mainTaskMins, true);
    } else {
      if (mainTaskMins > 0) {
        if (mainTaskMins === 40) { // exercised + normal
          addTask("🌙 雅思口语：跟读", "speaking_shadowing", 10, true);
          addTask("🌙 雅思口语：AI 口语问答", "speaking_ai_conversation", 20, true);
          addTask("🌙 雅思口语：纠错后重说", "speaking_correction_retake", 10, true);
        } else if (mainTaskMins === 55) { // high energy
          addTask("🌙 雅思口语：跟读", "speaking_shadowing", 15, true);
          addTask("🌙 雅思口语：AI 口语问答", "speaking_ai_conversation", 25, true);
          addTask("🌙 雅思口语：纠错后重说 / 录音复盘", "speaking_correction_retake", 15, true);
        } else { // normal: 45, or fallback
          addTask("🌙 雅思口语：跟读 / 影子跟读", "speaking_shadowing", 15, true);
          addTask("🌙 雅思口语：AI 雅思口语问答", "speaking_ai_conversation", 20, true);
          addTask("🌙 雅思口语：纠错后重说 / 录音复盘", "speaking_correction_retake", 10, true);
        }
      }
    }

    if (subTaskMins > 0) {
      addTask("🌙 听写或轻精读复习", "other", subTaskMins, true);
    }
  }

  // --- 第 9 步：加入收尾和防熬夜任务 ---
  let wrapUpMins = 15;
  if (energyLevel === "low") {
    wrapUpMins = 5;
  } else if (exercised) {
    wrapUpMins = 10;
  }

  addTask("✅ 收尾：记录今日结果 + 明天第一步", "wrap_up", wrapUpMins, true);
  addTask("✅ 22:30 后不开新重任务", "sleep_control", 0, true);
  addTask("✅ 没有补偿性熬夜", "sleep_control", 0, true);

  return tasks;
}

export function syncSleepControlTasks(
  record: import("../types").DailyRecord,
  updates: {
    stoppedAfter2230?: boolean;
    noCompensatoryStayingUp?: boolean;
  }
): import("../types").DailyRecord {
  const nextRecord = {
    ...record,
    ...updates,
    tasks: record.tasks.map((task) => {
      if (task.category !== "sleep_control") return task;

      if (
        typeof updates.stoppedAfter2230 === "boolean" &&
        task.title.includes("22:30")
      ) {
        return {
          ...task,
          completed: updates.stoppedAfter2230,
        };
      }

      if (
        typeof updates.noCompensatoryStayingUp === "boolean" &&
        (task.title.includes("补偿性熬夜") || task.title.includes("没有补偿"))
      ) {
        return {
          ...task,
          completed: updates.noCompensatoryStayingUp,
        };
      }

      return task;
    }),
  };

  const { calculateColorStatus } = require("./status");
  return {
    ...nextRecord,
    status: calculateColorStatus(nextRecord),
    updatedAt: new Date().toISOString(),
  };
}

export function syncRecordFieldsFromSleepControlTasks(
  record: import("../types").DailyRecord
): import("../types").DailyRecord {
  const stoppedTask = record.tasks.find(
    (task) =>
      task.category === "sleep_control" &&
      task.title.includes("22:30")
  );

  const noStayingUpTask = record.tasks.find(
    (task) =>
      task.category === "sleep_control" &&
      (task.title.includes("补偿性熬夜") || task.title.includes("没有补偿"))
  );

  const nextRecord = {
    ...record,
    stoppedAfter2230:
      typeof stoppedTask?.completed === "boolean"
        ? stoppedTask.completed
        : record.stoppedAfter2230,
    noCompensatoryStayingUp:
      typeof noStayingUpTask?.completed === "boolean"
        ? noStayingUpTask.completed
        : record.noCompensatoryStayingUp,
  };

  const { calculateColorStatus } = require("./status");
  return {
    ...nextRecord,
    status: calculateColorStatus(nextRecord),
    updatedAt: new Date().toISOString(),
  };
}
