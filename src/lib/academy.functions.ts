import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const lang = z.enum(["en", "es"]);
const L = (l: "en" | "es") => (l === "es" ? "Spanish (neutral Latin American)" : "English");
const SCOPE =
  "You are a senior AI builder mentoring beginners at 'AI Builder Academy'. The only domain is building AI products and agents: Claude, OpenAI Codex, Lovable, AI APIs, prompt engineering, agents, automation. If a goal drifts off-topic, reframe it toward AI building.";

export type Lesson = { title: string; description: string };
export type Question = { question: string; options: string[]; correctIndex: number; explanation: string };

export const generatePlan = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ goal: z.string().min(2).max(500), lang }).parse(d))
  .handler(async ({ data }) => {
    const { askClaude, extractJson } = await import("./claude.server");
    const text = await askClaude(
      `${SCOPE} Respond ONLY with JSON, no prose.`,
      `Create a personalized learning plan of EXACTLY 5 sequential lessons for this goal: "${data.goal}".
Write everything in ${L(data.lang)}.
Return JSON: {"lessons":[{"title":"short title","description":"1-2 sentence description"}]}`,
    );
    const parsed = extractJson<{ lessons: Lesson[] }>(text);
    return { lessons: parsed.lessons.slice(0, 5) };
  });

export const generateLesson = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ goal: z.string(), title: z.string(), description: z.string(), index: z.number(), outline: z.array(z.string()), lang }).parse(d),
  )
  .handler(async ({ data }) => {
    const { askClaude } = await import("./claude.server");
    const content = await askClaude(
      `${SCOPE} Write warm, practical, concrete lessons in Markdown. Use ## headings, short paragraphs, bullet lists, real examples, fenced code blocks with language tags when relevant, and a final "Tips" section. 600-1000 words. No preamble.`,
      `Learner goal: "${data.goal}". Full plan: ${data.outline.map((t, i) => `${i + 1}. ${t}`).join("; ")}.
Write lesson ${data.index + 1}: "${data.title}" — ${data.description}.
Write entirely in ${L(data.lang)}.`,
    );
    return { content };
  });

export const generateQuiz = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ title: z.string(), content: z.string().max(20000), lang }).parse(d))
  .handler(async ({ data }) => {
    const { askClaude, extractJson } = await import("./claude.server");
    const text = await askClaude(
      `${SCOPE} Respond ONLY with JSON, no prose.`,
      `Based on this lesson "${data.title}":\n---\n${data.content}\n---\nCreate EXACTLY 3 multiple choice questions, 4 options each, one correct. Write in ${L(data.lang)}.
Return JSON: {"questions":[{"question":"...","options":["a","b","c","d"],"correctIndex":0,"explanation":"brief why"}]}`,
    );
    const parsed = extractJson<{ questions: Question[] }>(text);
    return { questions: parsed.questions.slice(0, 3) };
  });

export const generateFeedback = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ title: z.string(), score: z.number(), total: z.number(), lang }).parse(d))
  .handler(async ({ data }) => {
    const { askClaude } = await import("./claude.server");
    const message = await askClaude(
      `${SCOPE} Reply with 2-3 short motivating sentences, plain text, no markdown.`,
      `The learner scored ${data.score}/${data.total} on the quiz for "${data.title}". Give personalized motivational feedback in ${L(data.lang)}.`,
    );
    return { message: message.trim() };
  });
