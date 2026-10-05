import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const lang = z.enum(["en", "es"]);
const level = z.enum(["beginner", "intermediate", "advanced"]);
const L = (l: "en" | "es") => (l === "es" ? "Spanish (neutral Latin American)" : "English");
const SCOPE =
  "You are Builder Mentor, a senior AI product engineer at 'AI Builder Academy' teaching through REAL projects. Domain: building AI products and agents (Claude, OpenAI Codex, Lovable, AI APIs, prompt engineering, agents, automation). If an idea drifts off-topic, reframe it into an AI product. Explain why things matter, avoid jargon, adapt to the learner's level.";

export type Stage = {
  title: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  objective: string;
  skills: string[];
  artifact: string;
};
export type Lesson = Stage;
export type Question = { question: string; options: string[]; correctIndex: number; explanation: string };
export type Idea = { title: string; pitch: string };

export const generateIdeas = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ interests: z.string().max(300), level, lang }).parse(d))
  .handler(async ({ data }) => {
    const { askClaude, extractJson } = await import("./claude.server");
    const text = await askClaude(
      `${SCOPE} Respond ONLY with JSON, no prose.`,
      `Suggest EXACTLY 4 realistic, small AI product ideas a ${data.level} builder could finish in a week. Interests: "${data.interests || "anything"}". Write in ${L(data.lang)}.
Return JSON: {"ideas":[{"title":"short product name + what it does","pitch":"one sentence"}]}`,
    );
    return { ideas: extractJson<{ ideas: Idea[] }>(text).ideas.slice(0, 4) };
  });

export const generatePlan = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ goal: z.string().min(2).max(500), level, lang }).parse(d))
  .handler(async ({ data }) => {
    const { askClaude, extractJson } = await import("./claude.server");
    const text = await askClaude(
      `${SCOPE} Respond ONLY with JSON, no prose.`,
      `The learner (${data.level}) wants to build: "${data.goal}".
Create a personalized Build Journey of EXACTLY 5 stages in this order: 1 Understand (problem, users, AI opportunity), 2 Design (architecture, flow, prompts, AI behavior), 3 Build (core product + AI), 4 Test & Improve, 5 Ship. Titles must be personalized to THIS project (e.g. "Design the AI Brain of your Study Assistant"). Not a generic curriculum.
Write all text in ${L(data.lang)}.
Return JSON: {"projectName":"short catchy name","stages":[{"title":"...","explanation":"1-2 sentences","difficulty":"easy|medium|hard","objective":"practical objective, one sentence","skills":["2-4 short skill names"],"artifact":"the tangible output, e.g. 'Your first system prompt'"}]}`,
    );
    const p = extractJson<{ projectName: string; stages: Stage[] }>(text);
    const stages = p.stages.slice(0, 5).map((s) => ({
      ...s,
      difficulty: (["easy", "medium", "hard"].includes(s.difficulty) ? s.difficulty : "medium") as Stage["difficulty"],
      skills: Array.isArray(s.skills) ? s.skills.slice(0, 4) : [],
    }));
    return { projectName: p.projectName || data.goal, lessons: stages };
  });

export const generateLesson = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ goal: z.string(), title: z.string(), description: z.string(), objective: z.string(), artifact: z.string(), level, index: z.number(), outline: z.array(z.string()), lang }).parse(d),
  )
  .handler(async ({ data }) => {
    const { askClaude } = await import("./claude.server");
    const H = data.lang === "es"
      ? ["Por qué importa", "Aprende", "Míralo", "Constrúyelo", "Mejóralo"]
      : ["Why this matters", "Learn", "See it", "Build it", "Improve it"];
    const content = await askClaude(
      `${SCOPE} Write a practical Build Mission in Markdown — NOT a textbook lesson. Use EXACTLY these ## headings in order: ${H.map((h) => `"## ${h}"`).join(", ")}. Short paragraphs, bullets, a concrete example tied to the learner's project, fenced code blocks with language tags when useful. "${H[3]}" must be a concrete numbered task the learner performs, ending with exactly what they must paste back as their output. 500-850 words. No preamble.`,
      `Project: "${data.goal}". Learner level: ${data.level}. Journey: ${data.outline.map((t, i) => `${i + 1}. ${t}`).join("; ")}.
Mission ${data.index + 1}: "${data.title}" — ${data.description}
Objective: ${data.objective}. Expected output: ${data.artifact}.
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
      `Based on this mission "${data.title}":\n---\n${data.content}\n---\nCreate EXACTLY 3 practical multiple choice questions (applied to building, not trivia), 4 options each, one correct. Write in ${L(data.lang)}.
Return JSON: {"questions":[{"question":"...","options":["a","b","c","d"],"correctIndex":0,"explanation":"brief why"}]}`,
    );
    const parsed = extractJson<{ questions: Question[] }>(text);
    return { questions: parsed.questions.slice(0, 3) };
  });

export const generateFeedback = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ title: z.string(), score: z.number(), total: z.number(), artifact: z.string().max(8000), lang }).parse(d))
  .handler(async ({ data }) => {
    const { askClaude } = await import("./claude.server");
    const message = await askClaude(
      `${SCOPE} Reply with 3-4 short sentences, plain text, no markdown. Celebrate progress honestly, give ONE concrete improvement for their output.`,
      `Mission "${data.title}". Builder Check score: ${data.score}/${data.total}. The learner's output:\n---\n${data.artifact || "(none)"}\n---\nGive personalized feedback in ${L(data.lang)}.`,
    );
    return { message: message.trim() };
  });
