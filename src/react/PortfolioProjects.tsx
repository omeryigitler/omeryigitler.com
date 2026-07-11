import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

export type PortfolioDisplayType = "desktop-mobile" | "desktop-swap";

export type PortfolioProject = {
  id: string;
  slug: string;
  title: string;
  category: string;
  kicker: string;
  challenge: string;
  solution: string;
  result: string;
  liveUrl: string;
  desktopImage: string;
  mobileImage?: string;
  alternateDesktopImage?: string;
  alternateLabelA?: string;
  alternateLabelB?: string;
  accent: string;
  sortOrder: number;
  displayType: PortfolioDisplayType;
  published: boolean;
  lang?: string;
};

export const DEFAULT_PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: "bugun-ne-yiyelim",
    slug: "bugun-ne-yiyelim",
    title: "Bugün Ne Yiyelim?",
    category: "Food decision app",
    kicker: "AI-Powered Food Decider",
    challenge: "Overcoming daily decision fatigue when choosing what to eat.",
    solution: "AI-driven recommendation engine personalized to user mood.",
    result: "Instant, stress-free meal decisions tailored to the moment.",
    liveUrl: "https://www.bugunneyiyelim.com/",
    desktopImage: "assets/bugun-desktop.png",
    mobileImage: "assets/bugun-mobile.png",
    accent: "#FF2A1A",
    sortOrder: 10,
    displayType: "desktop-mobile",
    published: true,
    lang: "tr"
  },
  {
    id: "elite-body-protocol",
    slug: "elite-body-protocol",
    title: "Elite Body Protocol",
    category: "Gamified fitness app",
    kicker: "React Web App",
    challenge: "Designing a seamless cinematic transition between two completely different UI design languages (Retro vs. Modern).",
    solution: "Built with React and Tailwind for dynamic state management and complex CSS animations.",
    result: "A highly engaging, gamified experience that increases user retention through narrative.",
    liveUrl: "https://elitebody.omeryigitler.com",
    desktopImage: "assets/elite-modern.png?v=V10",
    alternateDesktopImage: "assets/elite-retro.png?v=V10",
    alternateLabelA: "Modern",
    alternateLabelB: "Retro",
    accent: "#a78bfa",
    sortOrder: 20,
    displayType: "desktop-swap",
    published: true
  },
  {
    id: "reformer-pilates-malta",
    slug: "reformer-pilates-malta",
    title: "Reformer Pilates Malta",
    category: "Wellness studio",
    kicker: "Custom Website Design",
    challenge: "Lack of online visibility and mobile booking options for clients.",
    solution: "Custom responsive design with clear class schedules and SEO foundations.",
    result: "Improved brand perception and accessible class information for locals.",
    liveUrl: "https://www.reformerpilatesmalta.com/",
    desktopImage: "assets/pilates-desktop.png",
    mobileImage: "assets/pilates-mobile.png",
    accent: "#D38B99",
    sortOrder: 30,
    displayType: "desktop-mobile",
    published: true
  },
  {
    id: "today-we-eat",
    slug: "today-we-eat",
    title: "Today We Eat",
    category: "Food decision app",
    kicker: "AI-Powered Food Decider",
    challenge: "Overcoming daily decision fatigue when choosing what to eat.",
    solution: "AI-driven recommendation engine personalized to user mood.",
    result: "Instant, stress-free meal decisions tailored to the moment.",
    liveUrl: "https://www.todayweeat.com/",
    desktopImage: "assets/today-we-eat-desktop.png",
    mobileImage: "assets/today-we-eat-mobile.png",
    accent: "#FF2A1A",
    sortOrder: 40,
    displayType: "desktop-mobile",
    published: true
  }
];

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeProject(id: string, value: Record<string, unknown>): PortfolioProject {
  const displayType = value.displayType === "desktop-swap" ? "desktop-swap" : "desktop-mobile";
  return {
    id,
    slug: asString(value.slug, id),
    title: asString(value.title, "Untitled Project"),
    category: asString(value.category, "Selected work"),
    kicker: asString(value.kicker, "Custom digital experience"),
    challenge: asString(value.challenge, "Project challenge details are being prepared."),
    solution: asString(value.solution, "A tailored design and development approach was delivered."),
    result: asString(value.result, "The project was shipped as a responsive production experience."),
    liveUrl: asString(value.liveUrl, "#"),
    desktopImage: asString(value.desktopImage, "assets/preview.png"),
    mobileImage: asString(value.mobileImage),
    alternateDesktopImage: asString(value.alternateDesktopImage),
    alternateLabelA: asString(value.alternateLabelA, "Primary"),
    alternateLabelB: asString(value.alternateLabelB, "Alternate"),
    accent: asString(value.accent, "#FFD700"),
    sortOrder: Number.isFinite(Number(value.sortOrder)) ? Number(value.sortOrder) : 999,
    displayType,
    published: value.published !== false,
    lang: asString(value.lang)
  };
}

function usePortfolioProjects() {
  const [projects, setProjects] = useState<PortfolioProject[]>(DEFAULT_PORTFOLIO_PROJECTS);
  const [source, setSource] = useState<"fallback" | "firestore">("fallback");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/portfolio", { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`Portfolio API returned ${response.status}`);
        const payload = await response.json();
        const loaded = Array.isArray(payload.projects)
          ? payload.projects
              .map((project: Record<string, unknown>) => normalizeProject(asString(project.id, asString(project.slug)), project))
              .filter((project: PortfolioProject) => project.published)
              .sort((a: PortfolioProject, b: PortfolioProject) => a.sortOrder - b.sortOrder)
          : [];
        if (!cancelled && loaded.length > 0) {
          setProjects(loaded);
          setSource("firestore");
        }
      } catch (error) {
        console.warn("Portfolio data fallback active:", error);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return { projects, source };
}

function Typewriter({ text, delay = 0 }: { text: string; delay?: number }) {
  const [visible, setVisible] = useState("");
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { setVisible(text); return; }
    let timer = 0;
    let index = 0;
    let deleting = false;
    let stopped = false;
    const step = () => {
      if (stopped) return;
      setVisible(text.slice(0, index));
      if (!deleting) {
        if (index < text.length) { index += 1; timer = window.setTimeout(step, 48 + Math.random() * 44); }
        else { deleting = true; timer = window.setTimeout(step, 2400); }
      } else if (index > 0) { index -= 1; timer = window.setTimeout(step, 34); }
      else { deleting = false; timer = window.setTimeout(step, 600); }
    };
    timer = window.setTimeout(step, delay);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [delay, text]);
  return <span className="type-eyebrow">{visible}</span>;
}

function getDisplayUrl(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return "project-preview"; }
}

function DesktopPreview({ project }: { project: PortfolioProject }) {
  const swap = project.displayType === "desktop-swap" && project.alternateDesktopImage;
  return (
    <div className="desktop-preview" aria-label={`${project.title} desktop preview`}>
      <div className="desktop-toolbar" aria-hidden="true">
        <span className="traffic red" /><span className="traffic yellow" /><span className="traffic green" />
        <span className="browser-address">{getDisplayUrl(project.liveUrl)}</span>
        <span className="browser-action">↗</span>
      </div>
      <div className="desktop-viewport">
        {swap ? (
          <div className="swap">
            <img className="swap-a" src={project.desktopImage} alt={`${project.title} ${project.alternateLabelA || "primary"} desktop view`} loading="lazy" />
            <img className="swap-b" src={project.alternateDesktopImage} alt={`${project.title} ${project.alternateLabelB || "alternate"} desktop view`} loading="lazy" />
          </div>
        ) : (
          <img className="desktop-shot" src={project.desktopImage} alt={`${project.title} desktop view`} loading="lazy" />
        )}
      </div>
    </div>
  );
}

function MobilePreview({ project }: { project: PortfolioProject }) {
  if (!project.mobileImage || project.displayType === "desktop-swap") return null;
  return (
    <div className="mobile-device" aria-label={`${project.title} mobile preview`}>
      <span className="mobile-button mobile-silent" aria-hidden="true" />
      <span className="mobile-button mobile-volume-up" aria-hidden="true" />
      <span className="mobile-button mobile-volume-down" aria-hidden="true" />
      <span className="mobile-button mobile-power" aria-hidden="true" />
      <div className="mobile-screen">
        <span className="dynamic-island" aria-hidden="true" />
        <img src={project.mobileImage} alt={`${project.title} mobile view`} loading="lazy" />
      </div>
    </div>
  );
}

function ProjectSection({ project, index }: { project: PortfolioProject; index: number }) {
  const flipped = index % 2 === 1;
  return (
    <section className={`project reveal${flipped ? " flip" : ""}`} style={{ "--accent": project.accent } as CSSProperties} data-project-id={project.id}>
      <div className="project-eyebrow">
        <span className="num">{String(index + 1).padStart(2, "0")} /</span>
        <Typewriter text={project.category} delay={400 + index * 260} />
        <span className="cursor eb-cursor" />
      </div>
      <div className="project-grid">
        <div className="project-copy">
          <h2 lang={project.lang || undefined}>{project.title}</h2>
          <div className="kicker">{project.kicker}</div>
          <div className="csr">
            <div className="csr-row"><h4>Challenge</h4><p>{project.challenge}</p></div>
            <div className="csr-row"><h4>Solution</h4><p>{project.solution}</p></div>
            <div className="csr-row"><h4>Result</h4><p>{project.result}</p></div>
          </div>
          <a className="visit" href={project.liveUrl} target="_blank" rel="noreferrer">
            Open project
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>
          </a>
        </div>
        <div className={`devices${project.displayType === "desktop-swap" ? " elite-swap" : ""}`}>
          <DesktopPreview project={project} />
          <MobilePreview project={project} />
          {project.displayType === "desktop-swap" && project.alternateDesktopImage ? (
            <span className="swap-hint"><span className="dot-a" />{project.alternateLabelA || "Primary"}<span className="arr">⇄</span>{project.alternateLabelB || "Alternate"}<span className="dot-b" /> · hover</span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function PortfolioProjects() {
  const { projects, source } = usePortfolioProjects();
  const orderedProjects = useMemo(() => [...projects].sort((a, b) => a.sortOrder - b.sortOrder), [projects]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = Array.from(document.querySelectorAll<HTMLElement>("#portfolio-projects-root .project"));
    if (reduced || !("IntersectionObserver" in window)) { targets.forEach((target) => target.classList.add("in")); return; }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("in"); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [orderedProjects]);

  return <div className="portfolio-projects" data-source={source}>{orderedProjects.map((project, index) => <ProjectSection key={project.id} project={project} index={index} />)}</div>;
}
