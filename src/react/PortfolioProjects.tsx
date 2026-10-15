import { useEffect, useMemo, useState } from "react";

export type PortfolioDisplayType = "desktop-mobile" | "desktop-swap";

export type PortfolioProject = {
  id: string;
  slug: string;
  title: string;
  category: string;
  archiveCategory?: string;
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
    archiveCategory: asString(value.archiveCategory, "other"),
    kicker: asString(value.kicker, "Custom digital experience"),
    challenge: asString(value.challenge),
    solution: asString(value.solution),
    result: asString(value.result),
    liveUrl: asString(value.liveUrl),
    githubUrl: asString(value.githubUrl), description: asString(value.description),
    stack: Array.isArray(value.stack) ? value.stack.filter((v): v is string => typeof v === "string") : [],
    featured: value.featured === true, featuredOrder: Number(value.featuredOrder ?? 9999),
    desktopImage: asString(value.desktopImage),
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

const FILTERS = [
  ["all", "All"], ["sites", "Sites"], ["commerce", "Commerce"], ["apps", "Apps"],
  ["tools", "Tools"], ["experiments", "Experiments"], ["other", "Other"]
];

export function ProjectArchiveCard({ project, index }: { project: PortfolioProject; index: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [preview, setPreview] = useState(false);
  const hasImage = Boolean(project.desktopImage) && !imageFailed;
  const target = project.liveUrl || project.githubUrl;
  let address = "";
  try { address = new URL(target || "").hostname.replace(/^www\./, ""); } catch { /* No external link. */ }
  return <article className={`archive-card${preview ? " preview-open" : ""}${hasImage ? " has-preview" : ""}`}>
    <div className="archive-card-top"><span>{String(index + 1).padStart(2, "0")}</span><span>{project.archiveCategory === "other" ? project.category : project.archiveCategory}</span></div>
    <div className="archive-card-main">
      <h2 lang={project.lang}>{target ? <a href={target} target="_blank" rel="noreferrer">{project.title}<span className="archive-card-arrow" aria-hidden="true">↗</span></a> : project.title}</h2>
      <p className="archive-address">{address || project.category}</p>
      {hasImage ? <div className="archive-image">{target ? <a href={target} target="_blank" rel="noreferrer" aria-label={`Open ${project.title}`}><img src={project.desktopImage} alt={`${project.title} website preview`} loading="lazy" decoding="async" onError={() => setImageFailed(true)} /></a> : <img src={project.desktopImage} alt={`${project.title} preview`} loading="lazy" onError={() => setImageFailed(true)} />}</div> : null}
      <dl><div><dt>Project</dt><dd>{project.description || project.kicker || project.category}</dd></div>{project.stack?.length ? <div><dt>Stack</dt><dd>{project.stack.join(" · ")}</dd></div> : null}</dl>
    </div>
    <div className="archive-card-bottom"><div>{project.liveUrl ? <a href={project.liveUrl} target="_blank" rel="noreferrer">Live site ↗</a> : null}{project.githubUrl ? <a href={project.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a> : null}</div>{hasImage ? <button type="button" onClick={() => setPreview(!preview)} aria-pressed={preview} aria-label={`${preview ? "Hide" : "Show"} preview for ${project.title}`}>{preview ? "Close ×" : "Preview +"}</button> : null}</div>
  </article>;
}

export function PortfolioProjects() {
  const { projects, source } = usePortfolioProjects();
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") || "");
  const [filter, setFilter] = useState(() => {
    const value = new URLSearchParams(window.location.search).get("filter");
    return FILTERS.some(([key]) => key === value) ? value! : "all";
  });
  const results = useMemo(() => projects.filter((project) => {
    const matchesCategory = filter === "all" || (project.archiveCategory || "other") === filter;
    const haystack = [project.title, project.category, project.description, project.kicker, ...(project.stack || [])].join(" ").toLocaleLowerCase();
    return matchesCategory && haystack.includes(query.trim().toLocaleLowerCase());
  }), [projects, filter, query]);
  function update(nextFilter: string, nextQuery: string) {
    setFilter(nextFilter); setQuery(nextQuery);
    const url = new URL(window.location.href);
    if (nextFilter === "all") url.searchParams.delete("filter"); else url.searchParams.set("filter", nextFilter);
    if (!nextQuery) url.searchParams.delete("q"); else url.searchParams.set("q", nextQuery);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }
  return <section className="project-archive" aria-labelledby="archive-title">
    <div className="archive-eyebrow"><span><i aria-hidden="true" /> Project archive</span><span>{source === "loading" ? "Loading collection" : `${String(projects.length).padStart(2, "0")} selected projects`}</span><a href="/">↖ Back home</a></div>
    <header className="archive-heading"><p>Design / Development / Independent work</p><h1 id="archive-title">Projects,<br />experiments &amp; tools<span>.</span></h1><div className="archive-intro"><p>A collection of things I’ve designed, built and brought to life.</p><span>Explore the work ↓</span></div></header>
    <div className="archive-controls">
      <div className="archive-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Search projects" placeholder="Find a project…" value={query} onChange={(event) => update(filter, event.target.value)} /><span role="status" aria-live="polite">{results.length} results</span>{query ? <button type="button" aria-label="Clear search" onClick={() => update(filter, "")}>×</button> : null}</div>
      <div className="archive-filters" aria-label="Project categories">{FILTERS.filter(([key]) => key !== "other" || projects.some((p) => p.archiveCategory === "other")).map(([key, label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => update(key, query)}>{label}</button>)}</div>
    </div>
    {results.length ? <div className="archive-grid">{results.map((project, index) => <ProjectArchiveCard key={project.id} project={project} index={index} />)}</div> : <div className="archive-empty" role="status"><p>{source === "loading" ? "Loading the collection…" : source === "error" ? "The collection is temporarily unavailable. Please try again later." : projects.length ? "No projects match your search." : "New work will appear here soon."}</p>{query || filter !== "all" ? <button type="button" onClick={() => update("all", "")}>Reset filters ↗</button> : null}</div>}
    <div className="archive-end"><span>Thoughtfully designed. Carefully built.</span><a href="/#contact">Let’s make something together ↗</a></div>
  </section>;
}
