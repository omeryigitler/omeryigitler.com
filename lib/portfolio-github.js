const OWNER = "omeryigitler";

// Fetch the complete public inventory before making any database changes.
async function fetchPublicRepositories(fetcher = fetch) {
  const repositories = [];
  const signal = AbortSignal.timeout(20000);
  for (let page = 1; page <= 5; page += 1) {
    const response = await fetcher(`https://api.github.com/users/${OWNER}/repos?type=owner&sort=full_name&per_page=100&page=${page}`, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "omeryigitler-portfolio" }, signal
    });
    if (!response.ok) {
      const error = new Error("GitHub listesi alınamadı. Mevcut projeleriniz değişmedi; daha sonra tekrar deneyin.");
      error.statusCode = 502;
      throw error;
    }
    const items = await response.json();
    if (!Array.isArray(items)) throw new Error("Invalid GitHub response");
    repositories.push(...items.filter((repo) => repo.private === false && repo.owner?.login?.toLowerCase() === OWNER));
    if (items.length < 100) return repositories;
  }
  const error = new Error("GitHub envanteri tek aktarım sınırını aşıyor. Hiçbir proje değiştirilmedi.");
  error.statusCode = 422;
  throw error;
}

function publicHomepage(value) {
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.toString() : ""; }
  catch { return ""; }
}

function draftFromRepository(repo) {
  return {
    slug: `github-${repo.id}`, title: String(repo.name).slice(0, 120),
    category: "Projects", kicker: String(repo.description || "").slice(0, 120),
    description: String(repo.description || "").slice(0, 1200),
    githubUrl: `https://github.com/${OWNER}/${repo.name}`,
    liveUrl: publicHomepage(repo.homepage), stack: repo.language ? [repo.language] : [],
    published: false, featured: false, sortOrder: 9999, featuredOrder: 9999,
    desktopImage: "", mobileImage: "", displayType: "desktop-mobile", accent: "#FFD700"
  };
}

module.exports = { fetchPublicRepositories, draftFromRepository };
