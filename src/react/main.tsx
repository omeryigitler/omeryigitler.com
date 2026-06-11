import { StrictMode } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BuildProcessSection, Expertise } from "./InteractiveSections";

function mountReactSection(rootId: string, element: ReactNode) {
  const root = document.getElementById(rootId);

  if (!root) return;

  createRoot(root).render(<StrictMode>{element}</StrictMode>);
}

mountReactSection("expertise", <Expertise />);
mountReactSection("build-process-react-root", <BuildProcessSection />);
