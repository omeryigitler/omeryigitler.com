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
  githubUrl?: string;
  description?: string;
  stack?: string[];
  featured?: boolean;
  featuredOrder?: number;
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
    challenge: asString(value.challenge),
    solution: asString(value.solution),
    result: asString(value.result),
    liveUrl: asString(value.liveUrl),
    githubUrl: asString(value.githubUrl), description: asString(value.description),
    stack: Array.isArray(value.stack) ? value.stack.filter((v): v is string => typeof v === "string") : [],
    featured: value.featured === true, featuredOrder: Number(value.featuredOrder ?? 9999),
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

export function usePortfolioProjects() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [source, setSource] = useState<"loading" | "error" | "firestore">("loading");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/portfolio", { cache: "no-store", headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`Portfolio API returned ${response.status}`);
        const payload = await response.json();
        if (!Array.isArray(payload.projects)) throw new Error("Invalid portfolio response");
        const loaded = Array.isArray(payload.projects)
          ? payload.projects
              .map((project: Record<string, unknown>) => normalizeProject(asString(project.id, asString(project.slug)), project))
              .filter((project: PortfolioProject) => project.published)
              .sort((a: PortfolioProject, b: PortfolioProject) => a.sortOrder - b.sortOrder)
          : [];
        if (!cancelled) {
          setProjects(loaded);
          setSource("firestore");
        }
      } catch (error) {
        if (!cancelled) setSource("error");
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
          <p>{project.description}</p><p>{project.stack?.join(" · ")}</p>
          <div className="csr">
            {project.challenge ? <div className="csr-row"><h4>Challenge</h4><p>{project.challenge}</p></div> : null}
            {project.solution ? <div className="csr-row"><h4>Solution</h4><p>{project.solution}</p></div> : null}
            {project.result ? <div className="csr-row"><h4>Result</h4><p>{project.result}</p></div> : null}
          </div>
          {project.liveUrl ? <a className="visit" href={project.liveUrl} target="_blank" rel="noreferrer">
            Open project
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10" /></svg>
          </a> : null}
          {project.githubUrl ? <a className="visit" href={project.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a> : null}
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

  if (!orderedProjects.length) return <p role="status" style={{ padding: "48px 24px", textAlign: "center" }}>{source === "loading" ? "Loading projects…" : source === "error" ? "Projects could not be loaded. Please try again later." : "New work will appear here soon."}</p>;

  return <div className="portfolio-projects" data-source={source}>{orderedProjects.map((project, index) => <ProjectSection key={project.id} project={project} index={index} />)}</div>;
}
