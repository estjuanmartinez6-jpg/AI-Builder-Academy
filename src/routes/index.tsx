import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  generatePlan,
  generateLesson,
  generateQuiz,
  generateFeedback,
  type Lesson,
  type Question,
} from "@/lib/academy.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Builder Academy — Aprende a construir con IA" },
      { name: "description", content: "Planes de estudio personalizados para crear agentes, apps y automatizaciones con IA." },
      { property: "og:title", content: "AI Builder Academy" },
      { property: "og:description", content: "Learn to build AI agents and apps with Claude, Codex and Lovable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: App,
});

type Lang = "en" | "es";
const T = {
  es: {
    tagline: "Aprende a construir productos y agentes de IA",
    hero: "¿Qué quieres aprender a construir?",
    sub: "Elige un objetivo o escribe el tuyo. Crearemos un plan de 5 lecciones solo para ti.",
    suggestions: ["Construir mi primer agente de IA", "Aprender ingeniería de prompts", "Crear una app con Lovable", "Conectarme a una API de IA por primera vez", "Automatizar un flujo de trabajo con IA"],
    placeholder: "O escribe tu propio objetivo…",
    start: "Empezar a aprender",
    planTitle: "Tu plan de estudio",
    lesson: "Lección",
    back: "Volver",
    newGoal: "Nuevo objetivo",
    test: "Pon a prueba tus conocimientos",
    loadingPlan: "Diseñando tu plan…",
    loadingLesson: "Escribiendo tu lección…",
    loadingQuiz: "Preparando tu quiz…",
    question: "Pregunta",
    of: "de",
    correct: "¡Correcto!",
    wrong: "Incorrecto",
    next: "Siguiente",
    finish: "Ver resultado",
    score: "Tu puntuación",
    backPlan: "Volver al plan",
    retry: "Reintentar",
    progress: "Progreso",
    completed: "completadas",
    continue: "Continuar mi plan",
    errors: { RATE_LIMIT: "Hay mucha demanda ahora. Espera un momento y reintenta.", CREDITS: "El servicio de IA no está disponible por ahora (créditos o permisos).", AI_ERROR: "No pudimos generar el contenido. Inténtalo de nuevo." },
  },
  en: {
    tagline: "Learn to build AI products and agents",
    hero: "What do you want to learn to build?",
    sub: "Pick a goal or type your own. We'll craft a 5-lesson plan just for you.",
    suggestions: ["Build my first AI agent", "Learn prompt engineering", "Build an app with Lovable", "Connect to an AI API for the first time", "Automate a workflow with AI"],
    placeholder: "Or type your own goal…",
    start: "Start Learning",
    planTitle: "Your study plan",
    lesson: "Lesson",
    back: "Back",
    newGoal: "New goal",
    test: "Test my knowledge",
    loadingPlan: "Designing your plan…",
    loadingLesson: "Writing your lesson…",
    loadingQuiz: "Preparing your quiz…",
    question: "Question",
    of: "of",
    correct: "Correct!",
    wrong: "Incorrect",
    next: "Next",
    finish: "See result",
    score: "Your score",
    backPlan: "Back to plan",
    retry: "Retry",
    progress: "Progress",
    completed: "completed",
    continue: "Continue my plan",
    errors: { RATE_LIMIT: "High demand right now. Wait a moment and retry.", CREDITS: "The AI service is unavailable right now (credits or permissions).", AI_ERROR: "We couldn't generate the content. Please try again." },
  },
};
const ICONS = ["🤖", "✍️", "💜", "🔌", "⚡"];

type Plan = { goal: string; lang: Lang; lessons: Lesson[]; done: number[] };
type View = { name: "home" } | { name: "plan" } | { name: "lesson"; i: number } | { name: "quiz"; i: number };

function errMsg(e: unknown, lang: Lang) {
  const m = e instanceof Error ? e.message : "";
  const map = T[lang].errors as Record<string, string>;
  return map[m] ?? map.AI_ERROR;
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
      if (p) setPlan(JSON.parse(p));
    } catch {}
  }, []);
  useEffect(() => localStorage.setItem("aba-lang", lang), [lang]);
  useEffect(() => {
    if (plan) localStorage.setItem("aba-plan", JSON.stringify(plan));
    else localStorage.removeItem("aba-plan");
  }, [plan]);
  useEffect(() => window.scrollTo({ top: 0, behavior: "smooth" }), [view]);

  const t = T[lang];
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
            onBack={() => setView({ name: "plan" })}
            onQuiz={() => setView({ name: "quiz", i: view.i })}
          />
        )}
        {view.name === "quiz" && plan && (
          <QuizView
            key={"q" + key(view.i)} lang={lang} title={plan.lessons[view.i].title} content={lessonCache[key(view.i)] ?? plan.lessons[view.i].description}
            onPassed={() => setPlan((p) => (p && !p.done.includes(view.i) ? { ...p, done: [...p.done, view.i] } : p))}
            onBack={() => setView({ name: "plan" })}
          />
        )}
        <p className="sr-only">{t.tagline}</p>
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
function GhostBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="text-sm font-semibold text-muted-foreground transition hover:text-primary">{children}</button>;
}

function Home({ lang, plan, onPlan, onContinue }: { lang: Lang; plan: Plan | null; onPlan: (p: Plan) => void; onContinue: () => void }) {
  const t = T[lang];
  const fn = useServerFn(generatePlan);
  const [goal, setGoal] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const finalGoal = goal.trim() || (selected !== null ? t.suggestions[selected] : "");

  async function start() {
    if (!finalGoal) return;
    setLoading(true); setError("");
    try {
      const r = await fn({ data: { goal: finalGoal, lang } });
      onPlan({ goal: finalGoal, lang, lessons: r.lessons, done: [] });
    } catch (e) { setError(errMsg(e, lang)); } finally { setLoading(false); }
  }

  if (loading) return <Spinner label={t.loadingPlan} />;
  return (
    <div className="animate-rise">
      <p className="text-sm font-semibold uppercase tracking-widest text-accent">{t.tagline}</p>
      <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl">
        <span className="text-brand">{t.hero}</span>
      </h1>
      <p className="mt-4 max-w-xl text-muted-foreground">{t.sub}</p>

      {plan && (
        <button onClick={onContinue} className="mt-8 flex w-full items-center justify-between rounded-2xl border bg-secondary p-4 text-left transition hover:border-primary">
          <span>
            <span className="block text-sm font-semibold">{t.continue}</span>
            <span className="text-sm text-muted-foreground">{plan.goal} · {plan.done.length}/5 {t.completed}</span>
          </span>
          <span className="text-primary">→</span>
        </button>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {t.suggestions.map((s, i) => (
          <button key={s} onClick={() => { setSelected(i); setGoal(""); }}
            className={`rounded-2xl border bg-card p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary ${selected === i && !goal ? "border-primary ring-2 ring-primary/20" : ""}`}>
            <span className="text-2xl">{ICONS[i]}</span>
            <span className="mt-3 block font-semibold">{s}</span>
          </button>
        ))}
      </div>
      <textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={t.placeholder} rows={2}
        className="mt-4 w-full resize-none rounded-2xl border bg-card p-4 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20" />
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-5"><PrimaryBtn onClick={start} disabled={!finalGoal}>{t.start} →</PrimaryBtn></div>
    </div>
  );
}

function PlanView({ plan, lang, onOpen, onNew }: { plan: Plan; lang: Lang; onOpen: (i: number) => void; onNew: () => void }) {
  const t = T[lang];
  const pct = (plan.done.length / plan.lessons.length) * 100;
  return (
    <div className="animate-rise">
      <div className="flex items-center justify-between"><GhostBtn onClick={onNew}>← {t.newGoal}</GhostBtn></div>
      <h1 className="mt-4 font-display text-3xl font-bold">{t.planTitle}</h1>
      <p className="mt-1 text-muted-foreground">{plan.goal}</p>
      <div className="mt-6">
        <div className="flex justify-between text-xs font-semibold text-muted-foreground"><span>{t.progress}</span><span>{plan.done.length}/{plan.lessons.length} {t.completed}</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-brand transition-all duration-700" style={{ width: `${pct}%` }} /></div>
      </div>
      <ol className="mt-8 space-y-3">
        {plan.lessons.map((l, i) => {
          const done = plan.done.includes(i);
          return (
            <li key={i} style={{ animationDelay: `${i * 60}ms` }} className="animate-rise">
              <button onClick={() => onOpen(i)} className={`flex w-full items-start gap-4 rounded-2xl border bg-card p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary ${done ? "border-success/40" : ""}`}>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-success text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{done ? "✓" : i + 1}</span>
                <span className="flex-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">{t.lesson} {i + 1}</span>
                  <span className="mt-0.5 block font-semibold">{l.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{l.description}</span>
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

function LessonView({ plan, i, lang, cached, onLoaded, onBack, onQuiz }: { plan: Plan; i: number; lang: Lang; cached?: string; onLoaded: (c: string) => void; onBack: () => void; onQuiz: () => void }) {
  const t = T[lang];
  const fn = useServerFn(generateLesson);
  const [content, setContent] = useState(cached ?? "");
  const [error, setError] = useState("");
  const lesson = plan.lessons[i];
  async function load() {
    setError("");
    try {
      const r = await fn({ data: { goal: plan.goal, title: lesson.title, description: lesson.description, index: i, outline: plan.lessons.map((l) => l.title), lang } });
      setContent(r.content); onLoaded(r.content);
    } catch (e) { setError(errMsg(e, lang)); }
  }
  useEffect(() => { if (!cached) load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <article className="mx-auto max-w-3xl animate-rise">
      <GhostBtn onClick={onBack}>← {t.back}</GhostBtn>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-accent">{t.lesson} {i + 1} / {plan.lessons.length}</p>
      <h1 className="mt-1 font-display text-3xl font-bold">{lesson.title}</h1>
      <p className="mt-2 text-muted-foreground">{lesson.description}</p>
      <div className="mt-8 rounded-3xl border bg-card p-6 shadow-card sm:p-8">
        {error ? <ErrorBox msg={error} onRetry={load} label={t.retry} /> : content ? (
          <div className="prose-lesson animate-rise"><ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown></div>
        ) : (
          <div><p className="mb-5 flex items-center gap-2 text-sm text-muted-foreground"><span className="h-4 w-4 animate-spin rounded-full border-2 border-secondary border-t-primary" />{t.loadingLesson}</p><Skeleton lines={10} /></div>
        )}
      </div>
      {content && <div className="mt-8 flex justify-center"><PrimaryBtn onClick={onQuiz}>{t.test} →</PrimaryBtn></div>}
    </article>
  );
}

function QuizView({ lang, title, content, onPassed, onBack }: { lang: Lang; title: string; content: string; onPassed: () => void; onBack: () => void }) {
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
    onPassed();
    try { const r = await fbFn({ data: { title, score: final, total: qs!.length, lang } }); setFeedback(r.message); }
    catch (e) { setFeedback(errMsg(e, lang)); }
  }

  if (error) return <div className="mx-auto max-w-2xl"><ErrorBox msg={error} onRetry={load} label={t.retry} /></div>;
  if (!qs) return <Spinner label={t.loadingQuiz} />;

  if (finished) {
    return (
      <div className="mx-auto max-w-xl text-center animate-rise">
        <p className="text-sm font-semibold uppercase tracking-widest text-accent">{t.score}</p>
        <p className="mt-2 font-display text-7xl font-bold"><span className="text-brand">{score}/{qs.length}</span></p>
        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-card">
          {feedback ? <p className="leading-relaxed animate-rise">{feedback}</p> : <Skeleton lines={3} />}
        </div>
        <div className="mt-8"><PrimaryBtn onClick={onBack}>{t.backPlan}</PrimaryBtn></div>
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
