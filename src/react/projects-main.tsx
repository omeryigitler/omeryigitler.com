import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PortfolioProjects } from "./PortfolioProjects";

const root = document.getElementById("portfolio-projects-root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <PortfolioProjects />
    </StrictMode>
  );
}
