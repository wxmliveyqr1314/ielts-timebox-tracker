import { TASK_REGISTRY, type TaskDefinition } from "../planning/taskRegistry";

type TaskCopy = Pick<TaskDefinition, "title" | "description" | "instruction" | "doneCriteria">;

export const TASK_COPY_ZH: Readonly<Record<string, TaskCopy>> = {
  momo: {
    title: "Momo 词汇复习",
    description: "完成今天的 Momo 词汇复习，优先保证准确率。",
    instruction: "复习安排好的词汇，标记难词，方便以后重复巩固。",
    doneCriteria: "完成计划时长，或完成今天安排的 Momo 复习单元。",
  },
  "dictation-review": {
    title: "听写错题复习",
    description: "重听以前的听写错题，纠正听音和拼写问题。",
    instruction: "重听漏听片段，对照原文，记录反复出现的发音辨识或拼写问题。",
    doneCriteria: "复习至少 5 道错题，或完成计划复习时长。",
  },
  "dictation-new": {
    title: "新听写单元",
    description: "完成一段新的短篇听写，再核对并标记错误。",
    instruction: "听录音、写下内容、对照原文，标出没听清的单词或句子。",
    doneCriteria: "完成一段指定听写，或完成计划时长。",
  },
  "dictation-error-check": {
    title: "听写错误核查",
    description: "快速核查最近的听写错误，只重练薄弱片段。",
    instruction: "浏览近期错题，重听薄弱部分，确认同类错误是否还会出现。",
    doneCriteria: "完成错误核查清单，或完成计划时长。",
  },
  "dictation-stretch": {
    title: "听写加练",
    description: "必做听写完成得比较稳妥时，再练一段额外听写。",
    instruction: "先完成必做听写，有余力时再做这项加练。",
    doneCriteria: "完成一段额外的短篇听写，或完成加练时长。",
  },
  "reading-scan": {
    title: "阅读文章速览",
    description: "限时浏览一篇文章，定位关键信息。",
    instruction: "先浏览标题、主题句、人名、数字和逻辑标记，再定位题目相关内容。",
    doneCriteria: "完成一篇文章速览，或完成计划时长。",
  },
  "reading-analysis": {
    title: "长难句分析",
    description: "拆解 3～5 个难句，识别句子主干和语法结构。",
    instruction: "挑选雅思阅读长难句，找出主干，标记从句、语法关系和关键词。",
    doneCriteria: "完成至少 3 个长难句分析，或完成计划时长。",
  },
  "reading-notes": {
    title: "同义替换与词汇笔记",
    description: "整理雅思阅读中的同义替换、词汇和实用表达。",
    instruction: "从阅读文章、错题或长难句分析中，整理有用的改写和词汇。",
    doneCriteria: "记录至少 5 条有用内容，或完成计划时长。",
  },
  "reading-stretch": {
    title: "限时阅读加练",
    description: "额外完成一组限时阅读，不影响当天必做任务的状态。",
    instruction: "先完成必做阅读，有余力时再安排限时阅读加练。",
    doneCriteria: "完成一组额外限时阅读，或完成加练时长。",
  },
  "light-dictation-review": {
    title: "轻量听写复习",
    description: "复习少量听写错题，不开启完整的新单元。",
    instruction: "重听最近漏听的几个单词或句子，纠正听音和拼写问题。",
    doneCriteria: "复习至少 3 道听写错题，或完成计划时长。",
  },
  "light-reading-review": {
    title: "轻量阅读复习",
    description: "复习少量阅读笔记、同义替换或词汇错题。",
    instruction: "挑选近期阅读笔记或错题词汇，巩固它们之间的同义替换关系。",
    doneCriteria: "复习至少 3 条阅读笔记，或完成计划时长。",
  },
  "speaking-shadowing": {
    title: "口语跟读",
    description: "跟读一段短音频，模仿发音、节奏和停顿。",
    instruction: "听短音频后大声跟读，模仿其中的重音、节奏、停顿和发音。",
    doneCriteria: "完成一组短音频跟读，或完成计划时长。",
  },
  "speaking-conversation": {
    title: "AI 口语对话",
    description: "完成一轮专注的 AI 口语练习，先保证表达流畅。",
    instruction: "大声回答雅思风格的问题，先保持对话连贯，再打磨表达细节。",
    doneCriteria: "完成一轮专注口语对话，或完成计划时长。",
  },
  "speaking-retake": {
    title: "口语纠错重录",
    description: "挑选 1～2 个薄弱回答，修改后重新说一遍。",
    instruction: "回顾薄弱回答，改进措辞或结构，然后大声重录。",
    doneCriteria: "完成至少 1 个回答的纠错重录，或完成计划时长。",
  },
  "speaking-stretch": {
    title: "口语模拟加练",
    description: "必做任务完成后，有余力时再增加一轮雅思口语模拟。",
    instruction: "先完成必做口语任务，再进行这项可选加练。",
    doneCriteria: "完成一轮额外口语练习，或完成加练时长。",
  },
  "mixed-review": {
    title: "听写或阅读轻量复习",
    description: "轻量复习听写错题或阅读笔记。",
    instruction: "选择今天较薄弱的方向，复习少量近期错题或笔记。",
    doneCriteria: "完成一组轻量复习，或完成计划时长。",
  },
  "wrap-up": {
    title: "记录成果与明日第一步",
    description: "记录今天的学习成果，写下明天的第一步。",
    instruction: "简要总结今天的情况，写下明天可以立即开始的一个具体行动。",
    doneCriteria: "填写明天的第一步，并记录今天的重要情况。",
  },
  "passive-listening": {
    title: "泛听参考",
    description: "如实记录泛听习惯，泛听不会抵扣专注学习任务。",
    instruction: "记录背景听力或广泛接触英语的时间，专注雅思练习单独记录。",
    doneCriteria: "发生泛听时，如实记录参考时长。",
  },
  "sleep-stop-heavy": {
    title: "22:30 后不再开启高强度任务",
    description: "确认 22:30 后没有再开始高强度学习任务。",
    instruction: "这是一项保护睡眠的检查，不计入学习时长。",
    doneCriteria: "确认 22:30 后未开启新的高强度学习，再勾选完成。",
  },
  "sleep-no-compensation": {
    title: "不补偿性熬夜",
    description: "确认没有为了补完任务而熬夜。",
    instruction: "及时收尾，保护明天的精力，避免用熬夜补偿未完成任务。",
    doneCriteria: "确认没有因补做未完成任务而熬夜，再勾选完成。",
  },
};

const titles = new Map(Object.entries(TASK_COPY_ZH).map(([id, copy]) => [TASK_REGISTRY[id].title, copy.title]));

export function formatTaskTitle(task: { title: string }): string {
  return titles.get(task.title) ?? task.title;
}

export function localizeTaskDefinition(definition: Readonly<TaskDefinition>): Readonly<TaskDefinition> {
  return { ...definition, ...TASK_COPY_ZH[definition.id] };
}
