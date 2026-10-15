import { createRoot } from "react-dom/client";
import { FeaturedProjects } from "./FeaturedProjects";
const root = document.getElementById("featured-projects-root");
if (root) createRoot(root).render(<FeaturedProjects />);
