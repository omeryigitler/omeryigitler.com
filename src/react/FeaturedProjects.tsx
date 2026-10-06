import { usePortfolioProjects } from "./PortfolioProjects";

export function FeaturedProjects() {
  const { projects } = usePortfolioProjects();
  const featured = projects.filter((p) => p.published && p.featured)
    .sort((a, b) => (a.featuredOrder ?? 9999) - (b.featuredOrder ?? 9999) || a.title.localeCompare(b.title));
  if (!featured.length) return null;
  return <section className="featured-work" aria-labelledby="featured-work-title">
    <div className="featured-work-heading"><div><p>$ selected work →</p><h2 id="featured-work-title">Built to make a difference.</h2></div><a href="/projects.html">Explore all projects ↗</a></div>
    <div className="featured-work-grid">{featured.map((project) => <article key={project.id}>
      <img src={project.desktopImage} alt={`${project.title} preview`} loading="lazy" width="640" height="400" />
      <div><p>{project.category}</p><h3>{project.title}</h3><p>{project.description || project.kicker}</p>
        <nav aria-label={`${project.title} links`}>{project.liveUrl ? <a href={project.liveUrl} target="_blank" rel="noreferrer">Live project ↗</a> : null}{project.githubUrl ? <a href={project.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a> : null}</nav>
      </div>
    </article>)}</div>
  </section>;
}
