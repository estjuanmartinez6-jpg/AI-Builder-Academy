import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  generateIdeas,
  generatePlan,
  generateLesson,
  generateQuiz,
  generateFeedback,
  type Stage,
  type Question,
  type Idea,
} from "@/lib/academy.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Builder Academy — Construye algo real con IA" },
      { name: "description", content: "Convierte tu idea en un producto de IA real, etapa por etapa, con tu mentor de IA." },
      { property: "og:title", content: "AI Builder Academy — Construye algo real con IA" },
      { property: "og:description", content: "Learn by building: turn your idea into a working AI product with your personal AI mentor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Lang = "en" | "es";
type Level = "beginner" | "intermediate" | "advanced";
const PASS = 2;

const T = {
  es: {
    hero: "Construye algo real con IA.",
    sub: "Aprende construyendo, no viendo tutoriales. Convierte tu idea en un producto de IA funcional con tu mentor personal.",
    ask: "¿Qué quieres construir?",
    suggestions: ["Un agente de IA de atención al cliente", "Un asistente de estudio con IA", "Un revisor de hojas de vida con IA", "Automatizar mi flujo de trabajo con IA", "Un chatbot de IA para mi sitio web", "Mi primer SaaS de IA"],
    placeholder: "Describe tu idea… ej. “Quiero un asistente que resuma mis correos”",
    levelLabel: "Tu nivel",
    levels: { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado" },
    start: "Empezar a construir",
    idea: "Dame una idea",
    ideasTitle: "Ideas para ti",
    ideasHint: "Toca una para usarla. Usa el cuadro de arriba para contarme tus intereses.",
    loadingIdeas: "Pensando ideas…",
    journey: "Tu Build Journey",
    stage: "Etapa",
    mission: "Misión",
    objective: "Objetivo",
    skills: "Habilidades",
    output: "Entregable",
    diff: { easy: "Fácil", medium: "Media", hard: "Difícil" },
    back: "Volver",
    newGoal: "Nuevo proyecto",
    current: "Etapa actual",
    yourOutput: "Tu entregable",
    outputHint: "Pega o escribe aquí lo que construiste en “Constrúyelo”. Se guarda automáticamente.",
    test: "Hacer el Builder Check",
    needOutput: "Escribe tu entregable para continuar.",
    loadingPlan: "Diseñando tu Build Journey…",
    loadingLesson: "Preparando tu misión…",
    loadingQuiz: "Preparando el Builder Check…",
    question: "Pregunta", of: "de",
    correct: "¡Correcto!", wrong: "Incorrecto",
    next: "Siguiente", finish: "Ver resultado",
    score: "Builder Check",
    passed: "¡Misión completada!",
    failed: `Necesitas ${PASS} de 3 para completar la misión.`,
    tryAgain: "Intentar de nuevo",
    backPlan: "Volver al journey",
    retry: "Reintentar",
    progress: "Progreso", completed: "completadas",
    continue: "Continuar mi proyecto",
    errors: { RATE_LIMIT: "Hay mucha demanda ahora. Espera un momento y reintenta.", CREDITS: "El servicio de IA no está disponible por ahora (créditos o permisos).", AI_ERROR: "No pudimos generar el contenido. Inténtalo de nuevo." },
  },
  en: {
    hero: "Build something real with AI.",
    sub: "Learn by building, not by watching tutorials. Turn your idea into a working AI product with your personal AI mentor.",
    ask: "What do you want to build?",
    suggestions: ["An AI customer support agent", "An AI study assistant", "An AI resume reviewer", "Automate my workflow with AI", "An AI chatbot for my website", "My first AI SaaS"],
    placeholder: "Describe your idea… e.g. “An assistant that summarizes my emails”",
    levelLabel: "Your level",
    levels: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
    start: "Start Building",
    idea: "Give me an idea",
    ideasTitle: "Ideas for you",
    ideasHint: "Tap one to use it. Use the box above to tell me your interests.",
    loadingIdeas: "Thinking of ideas…",
    journey: "Your Build Journey",
    stage: "Stage",
    mission: "Mission",
    objective: "Objective",
    skills: "Skills",
    output: "Output",
    diff: { easy: "Easy", medium: "Medium", hard: "Hard" },
    back: "Back",
    newGoal: "New project",
    current: "Current stage",
    yourOutput: "Your output",
    outputHint: "Paste or write what you built in “Build it”. Saved automatically.",
    test: "Take the Builder Check",
    needOutput: "Write your output to continue.",
    loadingPlan: "Designing your Build Journey…",
    loadingLesson: "Preparing your mission…",
    loadingQuiz: "Preparing the Builder Check…",
    question: "Question", of: "of",
    correct: "Correct!", wrong: "Incorrect",
    next: "Next", finish: "See result",
    score: "Builder Check",
    passed: "Mission complete!",
    failed: `You need ${PASS} of 3 to complete the mission.`,
    tryAgain: "Try again",
    backPlan: "Back to journey",
    retry: "Retry",
    progress: "Progress", completed: "completed",
    continue: "Continue my project",
    errors: { RATE_LIMIT: "High demand right now. Wait a moment and retry.", CREDITS: "The AI service is unavailable right now (credits or permissions).", AI_ERROR: "We couldn't generate the content. Please try again." },
  },
};

type Plan = { goal: string; projectName: string; level: Level; lang: Lang; lessons: Stage[]; done: number[]; artifacts: Record<number, string> };
type View = { name: "home" } | { name: "plan" } | { name: "lesson"; i: number } | { name: "quiz"; i: number };

function errMsg(e: unknown, lang: Lang): string {
  const m = e instanceof Error ? e.message : "";
  const map = T[lang].errors as Record<string, string>;
  return map[m] ?? map["AI_ERROR"] ?? "";
}

function isValidPlan(p: unknown): p is Plan {
  const x = p as Plan;
  return !!x && Array.isArray(x.lessons) && x.lessons.length > 0 && typeof x.lessons[0]?.objective === "string" && !!x.artifacts;
}

function App() {
  const [lang, setLang] = useState<Lang>("es");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [view, setView] = useState<View>({ name: "home" });
  const [lessonCache, setLessonCache] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const l = localStorage.getItem("aba-lang");
      if (l === "en" || l === "es") setLang(l);
      const p = localStorage.getItem("aba-plan");
      if (p) {
        const parsed = JSON.parse(p);
        if (isValidPlan(parsed)) setPlan(parsed);
        else localStorage.removeItem("aba-plan");
      }
    } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("aba-lang", lang); } catch {}
  }, [lang]);
  useEffect(() => {
    try {
      if (plan) localStorage.setItem("aba-plan", JSON.stringify(plan));
      else localStorage.removeItem("aba-plan");
    } catch {}
  }, [plan]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  const key = (i: number) => `${plan?.goal}|${lang}|${i}`;

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <button onClick={() => setView({ name: "home" })} className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand font-display text-sm font-bold text-primary-foreground">AB</span>
            <span className="font-display font-semibold">AI Builder Academy</span>
          </button>
          <div className="flex rounded-full border p-0.5 text-xs font-semibold">
            {(["es", "en"] as Lang[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`rounded-full px-3 py-1 transition ${lang === l ? "bg-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        {view.name === "home" && (
          <Home lang={lang} plan={plan} onContinue={() => setView({ name: "plan" })} onPlan={(p) => { setPlan(p); setLessonCache({}); setView({ name: "plan" }); }} />
        )}
        {view.name === "plan" && plan && (
          <PlanView plan={plan} lang={lang} onOpen={(i) => setView({ name: "lesson", i })} onNew={() => { setPlan(null); setView({ name: "home" }); }} />
        )}
        {view.name === "lesson" && plan && (
          <LessonView
            key={key(view.i)} plan={plan} i={view.i} lang={lang}
            cached={lessonCache[key(view.i)]}
            onLoaded={(c) => setLessonCache((s) => ({ ...s, [key(view.i)]: c }))}
            onArtifact={(txt) => setPlan((p) => (p ? { ...p, artifacts: { ...p.artifacts, [view.i]: txt } } : p))}
            onBack={() => setView({ name: "plan" })}
            onQuiz={() => setView({ name: "quiz", i: view.i })}
          />
        )}
        {view.name === "quiz" && plan && (
          <QuizView
            key={"q" + key(view.i)} lang={lang} title={plan.lessons[view.i]!.title}
            content={lessonCache[key(view.i)] ?? plan.lessons[view.i]!.explanation}
            artifact={plan.artifacts[view.i] ?? ""}
            onPassed={() => setPlan((p) => (p && !p.done.includes(view.i) ? { ...p, done: [...p.done, view.i] } : p))}
            onRetry={() => setView({ name: "lesson", i: view.i })}
            onBack={() => setView({ name: "plan" })}
          />
        )}
      </main>
    </div>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-muted-foreground animate-rise">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-secondary border-t-primary" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
function Skeleton({ lines = 5 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-muted" style={{ width: `${90 - (i % 3) * 15}%` }} />
      ))}
    </div>
  );
}
function ErrorBox({ msg, onRetry, label }: { msg: string; onRetry: () => void; label: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm animate-rise">
      <p className="text-destructive">{msg}</p>
      <button onClick={onRetry} className="mt-3 rounded-full border px-4 py-1.5 font-semibold hover:bg-muted">{label}</button>
    </div>
  );
}
function PrimaryBtn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button {...p} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 font-semibold text-primary-foreground shadow-card transition hover:opacity-90 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50">
      {children}
    </button>
  );
}
function OutlineBtn({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button {...p} className="inline-flex items-center justify-center gap-2 rounded-full border bg-card px-6 py-3 font-semibold transition hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-50">
      {children}
    </button>
  );
}
function GhostBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="text-sm font-semibold text-muted-foreground transition hover:text-primary">{children}</button>;
}
function Chip({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "accent" }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone === "accent" ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>{children}</span>;
}

function Home({ lang, plan, onPlan, onContinue }: { lang: Lang; plan: Plan | null; onPlan: (p: Plan) => void; onContinue: () => void }) {
  const t = T[lang];
  const planFn = useServerFn(generatePlan);
  const ideasFn = useServerFn(generateIdeas);
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState<Level>("beginner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [ideasLoading, setIdeasLoading] = useState(false);

  async function start() {
    const g = goal.trim();
    if (g.length < 2) return;
    setLoading(true); setError("");
    try {
      const r = await planFn({ data: { goal: g, level, lang } });
      onPlan({ goal: g, projectName: r.projectName, level, lang, lessons: r.lessons, done: [], artifacts: {} });
    } catch (e) { setError(errMsg(e, lang)); } finally { setLoading(false); }
  }
  async function getIdeas() {
    setIdeasLoading(true); setError("");
    try { const r = await ideasFn({ data: { interests: goal.trim().slice(0, 300), level, lang } }); setIdeas(r.ideas); }
    catch (e) { setError(errMsg(e, lang)); } finally { setIdeasLoading(false); }
  }

  if (loading) return <Spinner label={t.loadingPlan} />;
  return (
    <div className="animate-rise">
      <h1 className="max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl"><span className="text-brand">{t.hero}</span></h1>
      <p className="mt-4 max-w-xl text-muted-foreground">{t.sub}</p>

      {plan && (
        <button onClick={onContinue} className="mt-8 flex w-full items-center justify-between rounded-2xl border bg-secondary p-4 text-left transition hover:border-primary">
          <span>
            <span className="block text-sm font-semibold">{t.continue}</span>
            <span className="text-sm text-muted-foreground">{plan.projectName} · {plan.done.length}/5 {t.completed}</span>
          </span>
          <span className="text-primary">→</span>
        </button>
      )}

      <label className="mt-10 block font-display text-xl font-semibold">{t.ask}</label>
      <textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={t.placeholder} rows={3} maxLength={500}
        className="mt-3 w-full resize-none rounded-2xl border bg-card p-4 text-base outline-none shadow-card transition focus:border-primary focus:ring-2 focus:ring-primary/20" />

      <div className="mt-3 flex flex-wrap gap-2">
        {t.suggestions.map((s) => (
          <button key={s} onClick={() => setGoal(s)}
            className={`rounded-full border bg-card px-3.5 py-1.5 text-sm transition hover:border-primary hover:text-primary ${goal === s ? "border-primary text-primary" : ""}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold text-muted-foreground">{t.levelLabel}</span>
        <div className="flex rounded-full border p-0.5 text-sm">
          {(["beginner", "intermediate", "advanced"] as Level[]).map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={`rounded-full px-3 py-1 transition ${level === l ? "bg-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t.levels[l]}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <PrimaryBtn onClick={start} disabled={goal.trim().length < 2}>{t.start} →</PrimaryBtn>
        <OutlineBtn onClick={getIdeas} disabled={ideasLoading}>💡 {t.idea}</OutlineBtn>
      </div>

      {(ideasLoading || ideas) && (
        <section className="mt-10 animate-rise">
          <h2 className="font-display text-xl font-semibold">{t.ideasTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.ideasHint}</p>
          {ideasLoading ? <div className="mt-4"><Skeleton lines={4} /></div> : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {ideas!.map((idea) => (
                <button key={idea.title} onClick={() => { setGoal(`${idea.title} — ${idea.pitch}`); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="rounded-2xl border bg-card p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary">
                  <span className="block font-semibold">{idea.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{idea.pitch}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function PlanView({ plan, lang, onOpen, onNew }: { plan: Plan; lang: Lang; onOpen: (i: number) => void; onNew: () => void }) {
  const t = T[lang];
  const pct = (plan.done.length / plan.lessons.length) * 100;
  const currentIdx = plan.lessons.findIndex((_, i) => !plan.done.includes(i));
  return (
    <div className="animate-rise">
      <GhostBtn onClick={onNew}>← {t.newGoal}</GhostBtn>
      <p className="mt-6 text-xs font-semibold uppercase tracking-widest text-accent">{t.journey}</p>
      <h1 className="mt-1 font-display text-3xl font-bold">{plan.projectName}</h1>
      <p className="mt-1 text-muted-foreground">{plan.goal}</p>
      <div className="mt-6 rounded-2xl border bg-card p-5 shadow-card">
        <div className="flex flex-wrap justify-between gap-2 text-xs font-semibold text-muted-foreground">
          <span>{currentIdx >= 0 ? `${t.current}: ${t.stage} ${currentIdx + 1}` : t.passed}</span>
          <span>{plan.done.length}/{plan.lessons.length} {t.completed}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-brand transition-all duration-700" style={{ width: `${pct}%` }} /></div>
      </div>
      <ol className="mt-8 space-y-3">
        {plan.lessons.map((s, i) => {
          const done = plan.done.includes(i);
          const current = i === currentIdx;
          return (
            <li key={i} style={{ animationDelay: `${i * 60}ms` }} className="animate-rise">
              <button onClick={() => onOpen(i)} className={`flex w-full items-start gap-4 rounded-2xl border bg-card p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary ${done ? "border-success/40" : current ? "border-primary ring-2 ring-primary/15" : ""}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-success text-primary-foreground" : current ? "bg-brand text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{done ? "✓" : i + 1}</span>
                <span className="flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-accent">{t.stage} {i + 1}</span>
                    <Chip>{t.diff[s.difficulty]}</Chip>
                  </span>
                  <span className="mt-1 block font-semibold">{s.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{s.explanation}</span>
                  <span className="mt-3 block text-sm"><b>{t.objective}:</b> {s.objective}</span>
                  <span className="mt-1 block text-sm"><b>{t.output}:</b> {s.artifact}</span>
                  <span className="mt-3 flex flex-wrap gap-1.5">{s.skills.map((k) => <Chip key={k} tone="accent">{k}</Chip>)}</span>
                </span>
                <span className="self-center text-primary">→</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function LessonView({ plan, i, lang, cached, onLoaded, onArtifact, onBack, onQuiz }: { plan: Plan; i: number; lang: Lang; cached?: string | undefined; onLoaded: (c: string) => void; onArtifact: (t: string) => void; onBack: () => void; onQuiz: () => void }) {
  const t = T[lang];
  const fn = useServerFn(generateLesson);
  const [content, setContent] = useState(cached ?? "");
  const [error, setError] = useState("");
  const [artifact, setArtifact] = useState(plan.artifacts[i] ?? "");
  const s = plan.lessons[i]!;
  async function load() {
    setError("");
    try {
      const r = await fn({ data: { goal: plan.goal, title: s.title, description: s.explanation, objective: s.objective, artifact: s.artifact, level: plan.level, index: i, outline: plan.lessons.map((l) => l.title), lang } });
      setContent(r.content); onLoaded(r.content);
    } catch (e) { setError(errMsg(e, lang)); }
  }
  useEffect(() => { if (!cached) load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <article className="mx-auto max-w-3xl animate-rise">
      <GhostBtn onClick={onBack}>← {t.back}</GhostBtn>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-accent">{t.mission} {i + 1} / {plan.lessons.length}</p>
      <h1 className="mt-1 font-display text-3xl font-bold">{s.title}</h1>
      <p className="mt-2 text-muted-foreground"><b className="text-foreground">{t.objective}:</b> {s.objective}</p>
      <div className="mt-8 rounded-3xl border bg-card p-6 shadow-card sm:p-8">
        {error ? <ErrorBox msg={error} onRetry={load} label={t.retry} /> : content ? (
          <div className="prose-lesson animate-rise"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown></div>
        ) : (
          <div><p className="mb-5 flex items-center gap-2 text-sm text-muted-foreground"><span className="h-4 w-4 animate-spin rounded-full border-2 border-secondary border-t-primary" />{t.loadingLesson}</p><Skeleton lines={10} /></div>
        )}
      </div>
      {content && (
        <section className="mt-8 rounded-3xl border-2 border-primary/30 bg-card p-6 shadow-card animate-rise">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">{t.yourOutput}</p>
          <h2 className="mt-1 font-display text-xl font-semibold">{s.artifact}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.outputHint}</p>
          <textarea value={artifact} onChange={(e) => { setArtifact(e.target.value); onArtifact(e.target.value); }} rows={8} maxLength={8000}
            className="mt-4 w-full rounded-2xl border bg-background p-4 font-mono text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <PrimaryBtn onClick={onQuiz} disabled={artifact.trim().length < 10}>{t.test} →</PrimaryBtn>
            {artifact.trim().length < 10 && <span className="text-sm text-muted-foreground">{t.needOutput}</span>}
          </div>
        </section>
      )}
    </article>
  );
}

function QuizView({ lang, title, content, artifact, onPassed, onRetry, onBack }: { lang: Lang; title: string; content: string; artifact: string; onPassed: () => void; onRetry: () => void; onBack: () => void }) {
  const t = T[lang];
  const quizFn = useServerFn(generateQuiz);
  const fbFn = useServerFn(generateFeedback);
  const [qs, setQs] = useState<Question[] | null>(null);
  const [error, setError] = useState("");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function load() {
    setError("");
    try { const r = await quizFn({ data: { title, content, lang } }); setQs(r.questions); } catch (e) { setError(errMsg(e, lang)); }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function finish(final: number) {
    setFinished(true);
    if (final >= PASS) onPassed();
    try { const r = await fbFn({ data: { title, score: final, total: qs!.length, artifact, lang } }); setFeedback(r.message); }
    catch (e) { setFeedback(errMsg(e, lang)); }
  }

  if (error) return <div className="mx-auto max-w-2xl"><ErrorBox msg={error} onRetry={load} label={t.retry} /></div>;
  if (!qs) return <Spinner label={t.loadingQuiz} />;

  if (finished) {
    const ok = score >= PASS;
    return (
      <div className="mx-auto max-w-xl text-center animate-rise">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">{t.score}</p>
        <p className="mt-2 font-display text-7xl font-bold"><span className="text-brand">{score}/{qs.length}</span></p>
        <p className={`mt-3 font-semibold ${ok ? "text-success" : "text-destructive"}`}>{ok ? `✓ ${t.passed}` : t.failed}</p>
        <div className="mt-8 rounded-2xl border bg-card p-6 text-left shadow-card">
          {feedback ? <p className="leading-relaxed animate-rise">{feedback}</p> : <Skeleton lines={3} />}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {!ok && <OutlineBtn onClick={onRetry}>{t.tryAgain}</OutlineBtn>}
          <PrimaryBtn onClick={onBack}>{t.backPlan}</PrimaryBtn>
        </div>
      </div>
    );
  }

  const q = qs[idx]!;
  const answered = picked !== null;
  return (
    <div className="mx-auto max-w-2xl animate-rise" key={idx}>
      <GhostBtn onClick={onBack}>← {t.back}</GhostBtn>
      <div className="mt-6 flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{t.question} {idx + 1} {t.of} {qs.length}</span>
        <div className="flex gap-1.5">{qs.map((_, k) => <span key={k} className={`h-1.5 w-8 rounded-full ${k <= idx ? "bg-brand" : "bg-muted"}`} />)}</div>
      </div>
      <h2 className="mt-4 font-display text-2xl font-semibold">{q.question}</h2>
      <div className="mt-6 space-y-3">
        {q.options.map((o, k) => {
          const isCorrect = k === q.correctIndex;
          const state = !answered ? "border-border hover:border-primary" : isCorrect ? "border-success bg-success-soft" : k === picked ? "border-destructive bg-destructive/5" : "border-border opacity-60";
          return (
            <button key={k} disabled={answered} onClick={() => { setPicked(k); if (isCorrect) setScore((s) => s + 1); }}
              className={`flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left transition ${state}`}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{String.fromCharCode(65 + k)}</span>
              <span>{o}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div className={`mt-5 rounded-2xl p-4 text-sm animate-rise ${picked === q.correctIndex ? "bg-success-soft" : "bg-destructive/5"}`}>
          <p className={`font-semibold ${picked === q.correctIndex ? "text-success" : "text-destructive"}`}>{picked === q.correctIndex ? t.correct : t.wrong}</p>
          <p className="mt-1 text-muted-foreground">{q.explanation}</p>
        </div>
      )}
      {answered && (
        <div className="mt-6 flex justify-end">
          <PrimaryBtn onClick={() => {
            if (idx + 1 < qs.length) { setIdx(idx + 1); setPicked(null); }
            else finish(score);
          }}>{idx + 1 < qs.length ? t.next : t.finish} →</PrimaryBtn>
        </div>
      )}
    </div>
  );
}
