import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValueEvent,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue
} from "motion/react";
import {
  BarChart3,
  BadgeCheck,
  CalendarCheck,
  CheckCircle2,
  ClipboardCheck,
  Code2,
  ExternalLink,
  Gauge,
  GitBranch,
  Image,
  Layers3,
  MapPin,
  MessageCircle,
  MousePointerClick,
  PenTool,
  PhoneCall,
  Rocket,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store
} from "lucide-react";

type ExpertiseCardProps = {
  align: "left" | "center" | "right";
  title: string;
  description: string;
  items: string[];
  accent: "gold" | "blue" | "emerald";
  icon: ComponentType<{ className?: string }>;
  motionStyle: CardMotionStyle;
  hoverStyle: CardHoverStyle;
};

type TransformKey = "x" | "y" | "z" | "rotateY" | "scale";
type CardMotionStyle = Partial<Record<TransformKey, MotionValue<number> | number>>;
type CardHoverStyle = Partial<Record<TransformKey, number>>;
type BeamSide = "left" | "right";
type BeamPoint = {
  x: number;
  y: number;
};
type BeamRouteSample = BeamPoint & {
  distance: number;
};

type ProcessStepId = "strategy" | "interface" | "development" | "launch";

type ProcessStep = {
  id: ProcessStepId;
  eyebrow: string;
  title: string;
  description: string;
  pills: string[];
  icon: ComponentType<{ className?: string }>;
};

type DeviceMockupAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
};

type ProjectMockup = {
  id: string;
  name: string;
  url: string;
  kicker: string;
  theme: {
    accent: string;
    border: string;
    glow: string;
  };
  desktop: DeviceMockupAsset;
  mobile: DeviceMockupAsset;
};

const accentStyles = {
  gold: {
    icon: "text-taurusGold",
    dot: "bg-taurusGold",
    border: "hover:border-taurusGold/40",
    glow: "from-taurusGold/0 via-taurusGold/60 to-taurusGold/0",
    shadow: "rgba(255,215,0,0.18)"
  },
  blue: {
    icon: "text-blue-400",
    dot: "bg-blue-500",
    border: "hover:border-blue-500/40",
    glow: "from-blue-500/0 via-blue-400/60 to-blue-500/0",
    shadow: "rgba(96,165,250,0.2)"
  },
  emerald: {
    icon: "text-emerald-400",
    dot: "bg-emerald-500",
    border: "hover:border-emerald-500/40",
    glow: "from-emerald-500/0 via-emerald-400/60 to-emerald-500/0",
    shadow: "rgba(52,211,153,0.18)"
  }
};

const processSteps: ProcessStep[] = [
  {
    id: "strategy",
    eyebrow: "01 / Strategy",
    title: "From visitor to enquiry",
    description:
      "We map how a local customer finds you, understands what you sell, trusts the business, and contacts you without friction.",
    pills: ["Google", "Trust", "Call / WhatsApp"],
    icon: Store
  },
  {
    id: "interface",
    eyebrow: "02 / Interface",
    title: "A storefront people understand",
    description:
      "Services, prices, photos, reviews, location, and contact actions are arranged so visitors instantly know what to do next.",
    pills: ["Services", "Photos", "Clear actions"],
    icon: Layers3
  },
  {
    id: "development",
    eyebrow: "03 / Development",
    title: "Built to load and convert",
    description:
      "The approved design becomes a fast site with working forms, tracking, screen checks, SEO foundations, and clean production code.",
    pills: ["Fast pages", "Forms work", "Tracking"],
    icon: GitBranch
  },
  {
    id: "launch",
    eyebrow: "04 / Launch",
    title: "Live project proof",
    description:
      "The same system finishes as real work: live sites checked on desktop and phone before the launch is handed over.",
    pills: ["MacBook view", "iPhone view", "Live launches"],
    icon: Rocket
  }
];

const projectMockups: ProjectMockup[] = [
  {
    id: "omeryigitler",
    name: "omeryigitler.com",
    url: "https://omeryigitler.com",
    kicker: "Digital studio",
    theme: {
      accent: "#FFD700",
      border: "rgba(255,215,0,0.34)",
      glow: "rgba(255,215,0,0.16)"
    },
    desktop: {
      src: "assets/mockups/omeryigitler-desktop.webp",
      width: 1440,
      height: 900,
      alt: "omeryigitler.com desktop homepage preview"
    },
    mobile: {
      src: "assets/mockups/omeryigitler-mobile.webp",
      width: 780,
      height: 1688,
      alt: "omeryigitler.com mobile homepage preview"
    }
  },
  {
    id: "reformerpilatesmalta",
    name: "reformerpilatesmalta.com",
    url: "https://reformerpilatesmalta.com",
    kicker: "Wellness studio",
    theme: {
      accent: "#D38B99",
      border: "rgba(211,139,153,0.38)",
      glow: "rgba(211,139,153,0.2)"
    },
    desktop: {
      src: "assets/mockups/reformerpilatesmalta-desktop.webp",
      width: 1440,
      height: 900,
      alt: "Reformer Pilates Malta desktop homepage preview"
    },
    mobile: {
      src: "assets/mockups/reformerpilatesmalta-mobile.webp",
      width: 780,
      height: 1688,
      alt: "Reformer Pilates Malta mobile homepage preview"
    }
  },
  {
    id: "todayweeat",
    name: "todayweeat.com",
    url: "https://todayweeat.com",
    kicker: "Food decision app",
    theme: {
      accent: "#FF2A1A",
      border: "rgba(255,42,26,0.34)",
      glow: "rgba(255,42,26,0.18)"
    },
    desktop: {
      src: "assets/mockups/todayweeat-desktop.webp",
      width: 1440,
      height: 900,
      alt: "Today We Eat desktop homepage preview"
    },
    mobile: {
      src: "assets/mockups/todayweeat-mobile.webp",
      width: 780,
      height: 1688,
      alt: "Today We Eat mobile homepage preview"
    }
  }
];

const launchStepIndex = processSteps.findIndex((step) => step.id === "launch");
const totalScrollSegments = processSteps.length + projectMockups.length - 1;
const beamBottomY = 100;
const beamCornerRadius = 4;
const beamRunnerLength = 5.8;
const beamRouteSamples: Record<BeamSide, BeamRouteSample[]> = {
  left: buildBeamRouteSamples("left"),
  right: buildBeamRouteSamples("right")
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sampleQuadratic(start: BeamPoint, control: BeamPoint, end: BeamPoint, steps = 12) {
  const points: BeamPoint[] = [];

  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps;
    const inverse = 1 - t;

    points.push({
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y
    });
  }

  return points;
}

function createBeamRoutePoints(side: BeamSide): BeamPoint[] {
  const edgeX = side === "left" ? 0 : 100;
  const innerX = side === "left" ? beamCornerRadius : 100 - beamCornerRadius;
  const topControl = { x: edgeX, y: 0 };
  const bottomControl = { x: edgeX, y: beamBottomY };

  return [
    { x: 50, y: 0 },
    { x: innerX, y: 0 },
    ...sampleQuadratic({ x: innerX, y: 0 }, topControl, { x: edgeX, y: beamCornerRadius }),
    { x: edgeX, y: beamBottomY - beamCornerRadius },
    ...sampleQuadratic({ x: edgeX, y: beamBottomY - beamCornerRadius }, bottomControl, { x: innerX, y: beamBottomY }),
    { x: 50, y: beamBottomY }
  ];
}

function buildBeamRouteSamples(side: BeamSide): BeamRouteSample[] {
  let distance = 0;

  return createBeamRoutePoints(side).map((point, index, points) => {
    if (index > 0) {
      const previous = points[index - 1];
      distance += Math.hypot(point.x - previous.x, point.y - previous.y);
    }

    return { ...point, distance };
  });
}

function getBeamPointAtDistance(distance: number, side: BeamSide): BeamPoint {
  const samples = beamRouteSamples[side];
  const routeLength = samples[samples.length - 1].distance;
  const clampedDistance = clampNumber(distance, 0, routeLength);

  for (let index = 1; index < samples.length; index += 1) {
    const start = samples[index - 1];
    const end = samples[index];

    if (clampedDistance <= end.distance) {
      const segmentLength = end.distance - start.distance;
      const segmentProgress = segmentLength === 0 ? 0 : (clampedDistance - start.distance) / segmentLength;

      return {
        x: start.x + (end.x - start.x) * segmentProgress,
        y: start.y + (end.y - start.y) * segmentProgress
      };
    }
  }

  return samples[samples.length - 1];
}

function formatBeamPoint(point: BeamPoint) {
  return `${Number(point.x.toFixed(2))} ${Number(point.y.toFixed(2))}`;
}

function getBeamRunnerPath(progress: number, side: BeamSide) {
  const samples = beamRouteSamples[side];
  const routeLength = samples[samples.length - 1].distance;
  const headDistance = clampNumber(progress, 0, 1) * routeLength;
  const tailDistance = Math.max(0, headDistance - beamRunnerLength);
  const points: BeamPoint[] = [getBeamPointAtDistance(tailDistance, side)];

  samples.forEach((point) => {
    if (point.distance > tailDistance && point.distance < headDistance) {
      points.push(point);
    }
  });

  points.push(getBeamPointAtDistance(headDistance, side));

  return `M ${points.map(formatBeamPoint).join(" L ")}`;
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQuery.matches);

    updateMatches();
    mediaQuery.addEventListener("change", updateMatches);

    return () => mediaQuery.removeEventListener("change", updateMatches);
  }, [query]);

  return matches;
}

function readMotionNumber(value: MotionValue<number> | number | undefined, fallback: number) {
  return typeof value === "number" ? value : value?.get() ?? fallback;
}

function useHoverMixedTransform(
  base: MotionValue<number> | number | undefined,
  hoverTarget: number | undefined,
  hoverProgress: MotionValue<number>,
  fallback: number
) {
  return useTransform(() => {
    const baseValue = readMotionNumber(base, fallback);
    const targetValue = hoverTarget ?? baseValue;
    const progress = hoverProgress.get();

    return baseValue + (targetValue - baseValue) * progress;
  });
}

function ExpertiseCard({
  title,
  description,
  items,
  accent,
  icon: Icon,
  motionStyle,
  hoverStyle,
  align
}: ExpertiseCardProps) {
  const style = accentStyles[accent];
  const hoverProgress = useMotionValue(0);
  const x = useHoverMixedTransform(motionStyle.x, hoverStyle.x, hoverProgress, 0);
  const y = useHoverMixedTransform(motionStyle.y, hoverStyle.y, hoverProgress, 0);
  const z = useHoverMixedTransform(motionStyle.z, hoverStyle.z, hoverProgress, 0);
  const rotateY = useHoverMixedTransform(motionStyle.rotateY, hoverStyle.rotateY, hoverProgress, 0);
  const scale = useHoverMixedTransform(motionStyle.scale, hoverStyle.scale, hoverProgress, 1);

  const animateHoverProgress = (target: number) => {
    animate(hoverProgress, target, {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    });
  };

  return (
    <motion.article
      style={{ x, y, z, rotateY, scale, transformStyle: "preserve-3d" }}
      onMouseEnter={() => animateHoverProgress(1)}
      onMouseLeave={() => animateHoverProgress(0)}
      className={`group pointer-events-auto relative min-h-[320px] overflow-hidden rounded-3xl border border-white/10 bg-neutral-950/80 p-8 shadow-2xl backdrop-blur-xl ${style.border}`}
    >
      <div className={`absolute left-0 top-0 h-[1px] w-full bg-gradient-to-r ${style.glow} opacity-35 transition-opacity duration-500 group-hover:opacity-100`} />
      <div
        className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full opacity-30 blur-3xl transition-opacity duration-500 group-hover:opacity-70"
        style={{ background: style.shadow }}
      />

      <div className={`mb-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] ${align === "center" ? "shadow-[0_0_34px_rgba(96,165,250,0.1)]" : ""}`}>
        <Icon className={`h-6 w-6 ${style.icon}`} />
      </div>

      <h3 className="mb-4 font-display text-xl font-bold text-white">{title}</h3>
      <p className="mb-8 text-xs leading-relaxed text-gray-400">{description}</p>

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </motion.article>
  );
}

export function Expertise() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "center center"]
  });

  const leftX = useTransform(scrollYProgress, [0, 1], [-100, 0]);
  const leftZ = useTransform(scrollYProgress, [0, 1], [-200, -50]);
  const leftRotateY = useTransform(scrollYProgress, [0, 1], [45, 15]);

  const centerY = useTransform(scrollYProgress, [0, 1], [100, 0]);
  const centerScale = useTransform(scrollYProgress, [0, 1], [0.8, 1.05]);
  const centerZ = useTransform(scrollYProgress, [0, 1], [-50, 50]);

  const rightX = useTransform(scrollYProgress, [0, 1], [100, 0]);
  const rightZ = useTransform(scrollYProgress, [0, 1], [-200, -50]);
  const rightRotateY = useTransform(scrollYProgress, [0, 1], [-45, -15]);

  const enableDepth = isDesktop && !prefersReducedMotion;

  return (
    <motion.section
      ref={containerRef}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <div className="relative mb-16 text-center">
        <div className="mx-auto mb-8 h-20 w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        <span className="mb-4 inline-block rounded-full border border-taurusGold/20 bg-taurusGold/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-taurusGold">
          What I Do
        </span>
        <h2 className="mb-4 font-display text-3xl font-bold text-white md:text-5xl">
          Complete Digital <br />
          <span className="bg-gradient-to-r from-gray-200 to-gray-500 bg-clip-text text-transparent">
            Solutions
          </span>
        </h2>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-gray-400">
          A holistic approach to digital product creation, ensuring every layer from design to deployment is crafted to perfection.
        </p>
      </div>

      <div
        className="pointer-events-none grid grid-cols-1 gap-6 px-4 md:grid-cols-3"
        style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
      >
        <ExpertiseCard
          align="left"
          accent="gold"
          icon={PenTool}
          title="UI/UX Design"
          description="Crafting intuitive, user-centric interfaces that not only look stunning but drive engagement and conversion."
          items={["Figma & Prototyping", "Design Systems", "Mobile-First Layouts"]}
          motionStyle={{
            x: enableDepth ? leftX : 0,
            z: enableDepth ? leftZ : 0,
            rotateY: enableDepth ? leftRotateY : 0
          }}
          hoverStyle={enableDepth ? { rotateY: 0, z: 20, scale: 1.02 } : { y: -8, scale: 1.02 }}
        />

        <ExpertiseCard
          align="center"
          accent="blue"
          icon={Code2}
          title="Engineering"
          description="Building robust, scalable, and high-performance web applications using modern technologies and clean code practices."
          items={["React / Next.js", "Tailwind CSS", "API Integration"]}
          motionStyle={{
            y: enableDepth ? centerY : 0,
            scale: enableDepth ? centerScale : 1,
            z: enableDepth ? centerZ : 0
          }}
          hoverStyle={enableDepth ? { scale: 1.1, z: 80 } : { y: -8, scale: 1.03 }}
        />

        <ExpertiseCard
          align="right"
          accent="emerald"
          icon={BarChart3}
          title="Strategy & SEO"
          description="Optimizing for visibility and performance to ensure your digital product actually reaches and converts your target audience."
          items={["Technical SEO", "Performance Tuning", "Analytics"]}
          motionStyle={{
            x: enableDepth ? rightX : 0,
            z: enableDepth ? rightZ : 0,
            rotateY: enableDepth ? rightRotateY : 0
          }}
          hoverStyle={enableDepth ? { rotateY: 0, z: 20, scale: 1.02 } : { y: -8, scale: 1.02 }}
        />
      </div>
    </motion.section>
  );
}

function ProcessPills({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="group inline-flex items-center gap-2 rounded-full border border-taurusGold/25 bg-taurusGold/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-taurusGold transition-all duration-300 hover:-translate-y-0.5 hover:border-taurusGold/60 hover:bg-taurusGold/10 hover:shadow-[0_0_22px_-12px_rgba(255,215,0,0.9)]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-taurusGold transition-transform duration-300 group-hover:scale-125" />
          {item}
        </span>
      ))}
    </div>
  );
}

function StrategyVisual() {
  const journey = [
    {
      title: "Found",
      detail: "Google search, map, nearby intent",
      icon: Search
    },
    {
      title: "Trusted",
      detail: "reviews, photos, prices, proof",
      icon: Star
    },
    {
      title: "Enquiry",
      detail: "call, WhatsApp, booking",
      icon: PhoneCall
    }
  ];

  const actionButtons = [
    { label: "Call", icon: PhoneCall },
    { label: "WhatsApp", icon: MessageCircle },
    { label: "Directions", icon: MapPin }
  ];

  return (
    <div className="group/strategy relative min-h-[430px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-4 transition-colors duration-500 hover:border-taurusGold/25 sm:min-h-[400px] lg:min-h-[380px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,215,0,0.12),transparent_30%),linear-gradient(rgba(255,215,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,215,0,0.03)_1px,transparent_1px)] bg-[size:100%_100%,44px_44px,44px_44px]" />
      <div className="pointer-events-none absolute right-8 top-8 h-28 w-28 rounded-full bg-taurusGold/10 opacity-0 blur-3xl transition-opacity duration-700 group-hover/strategy:opacity-100" />

      <div className="relative h-full rounded-2xl border border-white/10 bg-black/35 p-4">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2">
            <Store className="h-4 w-4 text-taurusGold" />
            <span className="text-[9px] font-black uppercase tracking-widest text-white">Local customer path</span>
          </div>
          <BadgeCheck className="h-5 w-5 text-taurusGold" />
        </div>

        <div className="relative mb-5 grid gap-3 md:grid-cols-3">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[11%] right-[11%] top-8 hidden h-px origin-left bg-gradient-to-r from-transparent via-taurusGold/70 to-transparent md:block"
          />
          {journey.map(({ title, detail, icon: Icon }) => (
            <div
              key={title}
              className="group/journey relative rounded-2xl border border-white/10 bg-neutral-950/80 p-3 transition-colors duration-200 hover:border-taurusGold/45 hover:bg-taurusGold/[0.04]"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-taurusGold/25 bg-taurusGold/10">
                <Icon className="h-4 w-4 text-taurusGold transition-transform duration-300 group-hover/journey:scale-125" />
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white">{title}</div>
              <div className="mt-1 text-xs leading-relaxed text-gray-500">{detail}</div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_0.82fr]">
          <div className="rounded-2xl border border-taurusGold/20 bg-taurusGold/[0.04] p-4">
            <div className="mb-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-taurusGold">
              <Search className="h-3.5 w-3.5" />
              Search intent becomes a plan
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <span className="truncate text-xs font-bold text-white">service near me</span>
                <MapPin className="h-4 w-4 flex-shrink-0 text-taurusGold" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["Services", "Prices", "Photos", "Reviews"].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-lg border px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all duration-300 hover:border-taurusGold/55 hover:text-taurusGold ${
                      index === 3 ? "border-taurusGold/35 bg-taurusGold/[0.06] text-taurusGold" : "border-white/10 bg-black/25 text-gray-500"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-neutral-950/80 p-4">
            <div className="mb-3 text-[9px] font-black uppercase tracking-widest text-gray-500">Clear next step</div>
            <div className="space-y-2">
              {actionButtons.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="group/action flex items-center gap-3 rounded-xl border border-taurusGold/20 bg-taurusGold/[0.045] px-3 py-2.5 transition-colors duration-200 hover:border-taurusGold/60 hover:bg-taurusGold/10"
                >
                  <Icon className="h-4 w-4 text-taurusGold transition-transform duration-300 group-hover/action:scale-125" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-300">
              More calls, messages, bookings
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InterfaceVisual() {
  const contentBlocks = [
    { label: "Services", icon: ShoppingBag },
    { label: "Photos", icon: Image },
    { label: "Reviews", icon: Star },
    { label: "Location", icon: MapPin }
  ];

  const actions = [
    { label: "Call the shop", icon: PhoneCall },
    { label: "Send WhatsApp", icon: MessageCircle },
    { label: "Get directions", icon: MapPin }
  ];

  return (
    <div className="group/interface relative min-h-[430px] overflow-hidden rounded-3xl border border-white/10 bg-neutral-950 p-4 transition-colors duration-500 hover:border-taurusGold/25 sm:min-h-[400px] lg:min-h-[380px]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,215,0,0.08),transparent_42%)]" />
      <div className="pointer-events-none absolute right-6 top-8 h-24 w-24 rounded-full bg-taurusGold/10 opacity-0 blur-3xl transition-opacity duration-700 group-hover/interface:opacity-100" />

      <div className="relative h-full rounded-2xl border border-white/10 bg-black/35 p-3">
        <div className="mb-3 flex h-8 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <div className="ml-2 h-2.5 flex-1 rounded-full bg-white/[0.06]" />
        </div>

        <div className="relative grid gap-4 md:grid-cols-[1fr_0.74fr]">
          <div className="rounded-2xl border border-taurusGold/20 bg-taurusGold/[0.035] p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 text-[9px] font-black uppercase tracking-widest text-taurusGold">Homepage first view</div>
                <div className="h-5 w-52 max-w-full rounded bg-white/85" />
                <div className="mt-2 h-2.5 w-36 rounded bg-white/20" />
              </div>
              <div className="rounded-full border border-taurusGold/25 bg-black/40 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-taurusGold">
                Ready
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {contentBlocks.map(({ label, icon: Icon }, index) => (
                <div
                  key={label}
                  className="group/content rounded-xl border border-white/10 bg-black/35 p-3 transition-colors duration-300 hover:border-taurusGold/35 hover:bg-black/55"
                >
                  <Icon className={`mb-3 h-4 w-4 transition-transform duration-300 group-hover/content:scale-125 ${index === 2 ? "fill-taurusGold text-taurusGold" : "text-taurusGold"}`} />
                  <div className="mb-2 text-[9px] font-black uppercase tracking-widest text-white">{label}</div>
                  <div className="space-y-1.5">
                    <div className="h-1.5 w-full rounded-full bg-white/15" />
                    <div className="h-1.5 w-2/3 rounded-full bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-2xl border border-white/10 bg-white/[0.025] p-4">
            <div className="pointer-events-none absolute left-0 top-1/2 hidden h-px w-10 -translate-x-8 bg-gradient-to-r from-transparent to-taurusGold/70 md:block" />
            <div className="mb-3 flex items-center justify-between">
              <div className="text-[9px] font-black uppercase tracking-widest text-gray-500">Actions collected</div>
              <MousePointerClick className="h-4 w-4 text-taurusGold" />
            </div>
            <div className="space-y-2">
              {actions.map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="group/customer flex items-center gap-3 rounded-xl border border-taurusGold/20 bg-taurusGold/[0.045] px-3 py-3 transition-colors duration-300 hover:border-taurusGold/60 hover:bg-taurusGold/10"
                >
                  <Icon className="h-4 w-4 text-taurusGold transition-transform duration-300 group-hover/customer:scale-125" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {["4.9", "Open", "Local"].map((item, index) => (
                <div key={item} className={`rounded-xl border px-2 py-3 text-center text-[10px] font-black uppercase tracking-widest ${index === 0 ? "border-taurusGold/35 bg-taurusGold/[0.05] text-taurusGold" : "border-white/10 bg-black/30 text-gray-500"}`}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DevelopmentVisual() {
  const lines = [
    ["01", "const pages = build(['Home', 'Services', 'Contact']);"],
    ["02", "connectActions(['Call', 'WhatsApp', 'Booking']);"],
    ["03", "testForms(); trackLeads();"],
    ["04", "auditPerformance({ mobile: 95, seo: true });"],
    ["05", "deployLive({ domain, analytics, security });"],
    ["06", "handoffClient({ checks: 'passed' });"]
  ];

  return (
    <div className="group/development relative min-h-[430px] overflow-hidden rounded-3xl border border-white/10 bg-[#0d1117] p-4 transition-colors duration-500 hover:border-taurusGold/25 sm:min-h-[400px] lg:min-h-[380px]">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-taurusGold/10 opacity-0 blur-3xl transition-opacity duration-700 group-hover/development:opacity-100" />
      <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-black/35">
        <div className="flex h-11 items-center gap-2 border-b border-white/10 bg-white/[0.04] px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="ml-3 rounded-md border border-taurusGold/25 bg-taurusGold/10 px-3 py-1 text-[9px] font-bold text-taurusGold">
            production.tsx
          </span>
        </div>

        <div className="p-4 font-mono text-xs leading-8 sm:p-5">
          {lines.map(([number, code], index) => (
            <div
              key={number}
              className={`group/code-row grid min-w-0 grid-cols-[34px_1fr] rounded-lg px-3 transition-colors duration-200 hover:bg-taurusGold/[0.11] ${index === 2 ? "bg-taurusGold/[0.07]" : ""}`}
            >
              <span className="text-gray-700 transition-colors duration-200 group-hover/code-row:text-taurusGold/70">{number}</span>
              <span className={`truncate transition-colors duration-200 group-hover/code-row:text-taurusGold ${index === 2 ? "text-taurusGold" : "text-gray-400"}`}>{code}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScreenshotImage({
  asset,
  className
}: {
  asset: DeviceMockupAsset;
  className?: string;
}) {
  return (
    <img
      src={asset.src}
      width={asset.width}
      height={asset.height}
      alt={asset.alt}
      loading="eager"
      decoding="async"
      draggable={false}
      onError={(event) => {
        const fallback = "assets/preview.png";
        if (!event.currentTarget.src.endsWith(fallback)) {
          event.currentTarget.src = fallback;
        }
      }}
      className={`h-full w-full object-cover object-top ${className || ""}`}
    />
  );
}

function MacBookProMockup({ asset }: { asset: DeviceMockupAsset }) {
  return (
    <div className="relative mx-auto w-full max-w-[720px]">
      <div className="relative rounded-[1.15rem] bg-gradient-to-br from-[#4a4b4f] via-[#17181b] to-[#050506] p-[1.5%] shadow-[0_42px_90px_-54px_rgba(0,0,0,0.96),inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-white/15 transition-colors duration-300 hover:ring-[color:var(--case-border)]">
        <div className="absolute left-1/2 top-[1.2%] z-20 h-[0.62%] w-[1.15%] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/15" />
        <div className="relative overflow-hidden rounded-[0.82rem] bg-black ring-1 ring-black">
          <div className="aspect-[16/10] overflow-hidden">
            <ScreenshotImage asset={asset} />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.16),rgba(255,255,255,0.02)_22%,transparent_44%)] opacity-45" />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </div>
      </div>

      <div className="relative mx-auto h-[18px] w-[112%] -translate-x-[5.3%] overflow-hidden rounded-b-[2rem] border border-white/10 bg-gradient-to-b from-[#7b7d83] via-[#303137] to-[#111216] shadow-[0_20px_45px_-34px_rgba(0,0,0,0.95)]">
        <div className="absolute left-1/2 top-0 h-[5px] w-[18%] -translate-x-1/2 rounded-b-xl bg-black/35 shadow-[inset_0_-1px_1px_rgba(255,255,255,0.15)]" />
        <div className="absolute inset-x-8 top-0 h-px bg-white/25" />
      </div>
      <div className="mx-auto h-[5px] w-[82%] rounded-b-full bg-black/70 blur-[1px]" />
    </div>
  );
}

function IPhoneProMockup({ asset }: { asset: DeviceMockupAsset }) {
  return (
    <div className="relative mx-auto aspect-[9/19.5] w-full max-w-[142px] rounded-[2.15rem] bg-gradient-to-br from-[#8d8f95] via-[#2c2d31] to-[#09090a] p-[3px] shadow-[0_30px_70px_-38px_rgba(0,0,0,0.98),inset_0_1px_0_rgba(255,255,255,0.22)] ring-1 ring-white/15 transition-colors duration-300 hover:ring-[color:var(--case-border)]">
      <div className="pointer-events-none absolute -left-[3px] top-[19%] h-[12%] w-[2px] rounded-l-full bg-[#3c3d42]" />
      <div className="pointer-events-none absolute -right-[3px] top-[28%] h-[16%] w-[2px] rounded-r-full bg-[#3c3d42]" />
      <div className="relative h-full overflow-hidden rounded-[1.85rem] bg-black p-[5px]">
        <div className="absolute left-1/2 top-[2.2%] z-30 h-[4.8%] w-[38%] -translate-x-1/2 rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_1px_5px_rgba(0,0,0,0.7)]" />
        <div className="relative h-full overflow-hidden rounded-[1.55rem] bg-black">
          <ScreenshotImage asset={asset} />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(125deg,rgba(255,255,255,0.2),transparent_32%,rgba(255,255,255,0.07)_68%,transparent)] opacity-35" />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </div>
      </div>
    </div>
  );
}

function AppleDeviceMockups({ project }: { project: ProjectMockup }) {
  return (
    <div className="relative mx-auto h-full min-h-[320px] w-full max-w-[640px]">
      <div className="absolute left-1/2 top-1/2 z-10 w-[78%] -translate-x-[54%] -translate-y-[42%]">
        <MacBookProMockup asset={project.desktop} />
      </div>

      <div className="absolute bottom-[8%] right-[5%] z-30 w-[23%] min-w-[96px] max-w-[136px] rotate-[3deg] transition-transform duration-500 group-hover/devices:rotate-0">
        <IPhoneProMockup asset={project.mobile} />
      </div>
    </div>
  );
}

function DeviceShowcase({ projectIndex }: { projectIndex: number }) {
  const activeProject = projectMockups[projectIndex] ?? projectMockups[0];
  const caseStyle = {
    "--case-accent": activeProject.theme.accent,
    "--case-border": activeProject.theme.border,
    "--case-glow": activeProject.theme.glow
  } as CSSProperties;

  return (
    <div
      style={caseStyle}
      className="group/devices relative min-h-[430px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025] p-5 transition-colors duration-500 hover:border-[color:var(--case-border)] sm:min-h-[450px] lg:min-h-[430px]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--case-glow),transparent_58%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.07),transparent_32%,rgba(255,255,255,0.035)_70%,transparent)] opacity-60" />
      <div className="absolute inset-x-8 top-[4.75rem] h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <div
        style={{ backgroundColor: "var(--case-accent)" }}
        className="pointer-events-none absolute inset-x-12 bottom-10 h-20 rounded-full opacity-0 blur-3xl transition-opacity duration-700 group-hover/devices:opacity-20"
      />

      <a
        href={activeProject.url}
        target="_blank"
        rel="noreferrer"
        className="absolute left-5 top-5 z-50 flex max-w-[62%] items-center gap-3 border-l border-[color:var(--case-border)] bg-black/10 py-1 pl-3 pr-2 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.035]"
      >
        <div className="min-w-0">
          <div className="truncate text-[8px] font-black uppercase tracking-widest text-[color:var(--case-accent)]">Live project</div>
          <div className="truncate text-[10px] font-black uppercase tracking-widest text-white">{activeProject.name}</div>
        </div>
        <ExternalLink className="h-3 w-3 flex-shrink-0 text-[color:var(--case-accent)] opacity-80 transition-opacity duration-200 group-hover/devices:opacity-100" />
      </a>

      <div className="absolute right-5 top-5 z-50 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-[color:var(--case-accent)] backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--case-accent)] shadow-[0_0_14px_var(--case-accent)]" />
        0{projectIndex + 1} / 03
      </div>

      <div className="absolute inset-x-6 bottom-10 top-16 z-10 flex items-center justify-center">
        <AppleDeviceMockups project={activeProject} />
      </div>

      <div className="absolute bottom-5 left-1/2 z-40 flex -translate-x-1/2 gap-2">
        {projectMockups.map((project, index) => (
          <span
            key={project.id}
            aria-label={project.name}
            className={`h-1.5 rounded-full transition-all duration-300 ${index === projectIndex ? "w-9 bg-[color:var(--case-accent)] shadow-[0_0_14px_var(--case-accent)]" : "w-4 bg-white/15"}`}
          />
        ))}
      </div>
    </div>
  );
}

function ProcessVisual({ stepId, projectIndex }: { stepId: ProcessStepId; projectIndex: number }) {
  const visuals: Record<ProcessStepId, ReactNode> = {
    strategy: <StrategyVisual />,
    interface: <InterfaceVisual />,
    development: <DevelopmentVisual />,
    launch: <DeviceShowcase projectIndex={projectIndex} />
  };

  return (
    <div className="min-w-0 max-w-full">
      {visuals[stepId]}
    </div>
  );
}

export function BuildProcessSection() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const canPinSection = useMediaQuery("(min-width: 1024px)") && !prefersReducedMotion;

  const { scrollYProgress } = useScroll({
    target: scrollContainerRef,
    offset: ["start start", "end end"]
  });

  const leftBeamPath = `M50 0 H4 Q0 0 0 4 V${beamBottomY - 4} Q0 ${beamBottomY} 4 ${beamBottomY} H50`;
  const rightBeamPath = `M50 0 H96 Q100 0 100 4 V${beamBottomY - 4} Q100 ${beamBottomY} 96 ${beamBottomY} H50`;
  const beamRouteProgress = useTransform(scrollYProgress, [0.12, 0.82], [0, 1]);
  const beamRouteOpacity = useTransform(scrollYProgress, [0.08, 0.12, 0.84, 0.88], [0, 1, 1, 0]);
  const beamExitOpacity = useTransform(scrollYProgress, [0.82, 0.86, 0.94], [0, 1, 0]);
  const beamExitY2 = useTransform(scrollYProgress, [0.84, 0.92], [beamBottomY, 118]);
  const beamLeftRunnerPath = useTransform(beamRouteProgress, (progress) => getBeamRunnerPath(progress, "left"));
  const beamRightRunnerPath = useTransform(beamRouteProgress, (progress) => getBeamRunnerPath(progress, "right"));
  const activeStep = processSteps[activeIndex];
  const ActiveIcon = activeStep.icon;

  useEffect(() => {
    const assets = projectMockups.flatMap((project) => [project.desktop, project.mobile]);

    assets.forEach((asset) => {
      const image = new window.Image();
      image.decoding = "async";
      image.src = asset.src;
    });
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!canPinSection) return;

    const heldProgress = Math.min(0.999, latest / 0.88);
    const activeSegment = Math.min(
      totalScrollSegments - 1,
      Math.max(0, Math.floor(heldProgress * totalScrollSegments))
    );
    const nextIndex = Math.min(processSteps.length - 1, activeSegment);
    const nextProjectIndex = activeSegment >= launchStepIndex
      ? Math.min(projectMockups.length - 1, activeSegment - launchStepIndex)
      : 0;

    setActiveIndex((currentIndex) => currentIndex === nextIndex ? currentIndex : nextIndex);
    setActiveProjectIndex((currentIndex) => currentIndex === nextProjectIndex ? currentIndex : nextProjectIndex);
  });

  const scrollToStep = (index: number) => {
    if (!canPinSection) {
      setActiveIndex(index);
    }

    if (!canPinSection || !scrollContainerRef.current) return;

    const sectionTop = window.scrollY + scrollContainerRef.current.getBoundingClientRect().top;
    const scrollableDistance = scrollContainerRef.current.offsetHeight - window.innerHeight;
    const targetSegment = index >= launchStepIndex ? launchStepIndex : index;
    const targetProgress = Math.min(0.86, ((targetSegment + 0.5) / totalScrollSegments) * 0.88);

    window.scrollTo({
      top: sectionTop + scrollableDistance * targetProgress,
      behavior: "auto"
    });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

    event.preventDefault();
    const nextIndex = event.key === "ArrowRight"
      ? (index + 1) % processSteps.length
      : (index - 1 + processSteps.length) % processSteps.length;
    scrollToStep(nextIndex);
  };

  return (
    <section
      ref={scrollContainerRef}
      className={canPinSection ? "relative w-full lg:h-[660vh]" : "relative w-full"}
    >
      <div className={canPinSection ? "lg:sticky lg:top-[6.5rem]" : ""}>
        <section className="relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950/95 px-4 py-10 shadow-2xl backdrop-blur-xl sm:px-6 md:px-8 lg:h-[calc(100vh-8rem)] lg:min-h-0 lg:py-7">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,215,0,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,215,0,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <svg
            className="build-process-beam pointer-events-none absolute inset-0 z-[2] hidden h-full w-full lg:block"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path className="beam-base" d={leftBeamPath} />
            <path className="beam-base" d={rightBeamPath} />
            <motion.path className="beam-runner-halo" d={beamLeftRunnerPath} style={{ opacity: beamRouteOpacity }} />
            <motion.path className="beam-runner-halo" d={beamRightRunnerPath} style={{ opacity: beamRouteOpacity }} />
            <motion.line className="beam-runner-halo" x1="50" y1={beamBottomY} x2="50" y2={beamExitY2} style={{ opacity: beamExitOpacity }} />
            <motion.path className="beam-runner-core" d={beamLeftRunnerPath} style={{ opacity: beamRouteOpacity }} />
            <motion.path className="beam-runner-core" d={beamRightRunnerPath} style={{ opacity: beamRouteOpacity }} />
            <motion.line className="beam-runner-core" x1="50" y1={beamBottomY} x2="50" y2={beamExitY2} style={{ opacity: beamExitOpacity }} />
          </svg>
          <div className="relative z-10 mx-auto mb-7 max-w-3xl text-center">
            <span className="mb-4 inline-flex rounded-full border border-taurusGold/20 bg-taurusGold/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-taurusGold">
              Build Process
            </span>
            <h2 className="font-display text-3xl font-bold uppercase leading-tight text-white md:text-4xl xl:text-5xl">
              Structure Before <br />
              <span className="text-white/20 [-webkit-text-stroke:1px_rgba(255,255,255,0.28)]">Pixels</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-gray-400">
              A precise build system from strategy to launch-ready deployment, shaped for fast decisions and durable execution.
            </p>
          </div>

          <div className="relative z-10 mx-auto mb-7 grid max-w-2xl grid-cols-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-1 sm:grid-cols-4">
            {processSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={activeIndex === index}
                onClick={() => scrollToStep(index)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`relative overflow-hidden rounded-xl border px-3 py-3 text-[10px] font-black uppercase tracking-widest transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-taurusGold/70 ${
                  activeIndex === index
                    ? "border-taurusGold/40 bg-taurusGold/10 text-taurusGold shadow-[0_0_24px_-14px_rgba(255,215,0,0.9)]"
                    : "border-transparent text-gray-600 hover:text-white"
                }`}
              >
                <span className="relative z-10">{step.id}</span>
              </button>
            ))}
          </div>

          <div className="relative z-10 grid min-w-0 gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <motion.div
              key={activeStep.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0 max-w-full text-left"
            >
              <motion.div
                whileHover={{ rotate: -6, scale: 1.05 }}
                className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-taurusGold/25 bg-taurusGold/10 text-taurusGold"
              >
                <ActiveIcon className="h-6 w-6" />
              </motion.div>
              <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-taurusGold">
                {activeStep.eyebrow}
              </div>
              <h3 className="mb-4 font-display text-2xl font-bold uppercase leading-tight text-white md:text-3xl">
                {activeStep.title}
              </h3>
              <p className="mb-6 max-w-xl text-sm leading-relaxed text-gray-400">
                {activeStep.description}
              </p>
              <ProcessPills items={activeStep.pills} />
            </motion.div>

            <ProcessVisual stepId={activeStep.id} projectIndex={activeProjectIndex} />
          </div>

          <div className="relative z-10 mt-6 flex justify-center gap-2">
            {processSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                aria-label={`Show ${step.id} step`}
                onClick={() => scrollToStep(index)}
                className={`h-1 rounded-full transition-all ${activeIndex === index ? "w-12 bg-taurusGold" : "w-6 bg-white/10 hover:bg-white/25"}`}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

type PhilosophyLineProps = {
  left: string;
  right: string;
  scrollYProgress: MotionValue<number>;
  index: number;
  total: number;
};

function buildLineRange(index: number, total: number) {
  const slice = 1 / total;
  const start = index * slice;
  const end = index === total - 1 ? 1 : start + slice;
  const fade = slice * 0.18;

  if (index === 0) {
    return {
      input: [0, end, Math.min(1, end + fade)],
      inactiveActiveInactive: false
    };
  }

  if (index === total - 1) {
    return {
      input: [Math.max(0, start - fade), start, 1],
      inactiveActiveInactive: false
    };
  }

  return {
    input: [Math.max(0, start - fade), start, end, Math.min(1, end + fade)],
    inactiveActiveInactive: true
  };
}

function PhilosophyLine({ left, right, scrollYProgress, index, total }: PhilosophyLineProps) {
  const [isHovered, setIsHovered] = useState(false);
  const { input, inactiveActiveInactive } = buildLineRange(index, total);

  const scale = useTransform(
    scrollYProgress,
    input,
    inactiveActiveInactive ? [0.9, 1.05, 1.05, 0.9] : index === 0 ? [1.05, 1.05, 0.9] : [0.9, 1.05, 1.05]
  );

  const opacity = useTransform(
    scrollYProgress,
    input,
    inactiveActiveInactive ? [0.3, 1, 1, 0.3] : index === 0 ? [1, 1, 0.3] : [0.3, 1, 1]
  );

  const overColor = useTransform(
    scrollYProgress,
    input,
    inactiveActiveInactive ? ["#737373", "#FFD700", "#FFD700", "#737373"] : index === 0 ? ["#FFD700", "#FFD700", "#737373"] : ["#737373", "#FFD700", "#FFD700"]
  );

  const overGlow = useTransform(
    scrollYProgress,
    input,
    inactiveActiveInactive
      ? ["0 0 0 rgba(255,215,0,0)", "0 0 18px rgba(255,215,0,0.5)", "0 0 18px rgba(255,215,0,0.5)", "0 0 0 rgba(255,215,0,0)"]
      : index === 0
        ? ["0 0 18px rgba(255,215,0,0.5)", "0 0 18px rgba(255,215,0,0.5)", "0 0 0 rgba(255,215,0,0)"]
        : ["0 0 0 rgba(255,215,0,0)", "0 0 18px rgba(255,215,0,0.5)", "0 0 18px rgba(255,215,0,0.5)"]
  );

  return (
    <motion.h2
      aria-label={`${left} over ${right}.`}
      style={{ scale, opacity }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="flex cursor-default flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center font-display text-3xl font-bold uppercase leading-none text-white sm:text-4xl md:text-6xl"
    >
      <span className="whitespace-nowrap">{left}</span>
      <motion.span
        style={{
          color: isHovered ? "#FFD700" : overColor,
          textShadow: isHovered ? "0 0 18px rgba(255,215,0,0.65)" : overGlow
        }}
        className="whitespace-nowrap font-body text-xl font-light italic lowercase md:text-3xl"
      >
        over
      </motion.span>
      <span className="whitespace-nowrap">
        {right}
        <span className="text-taurusGold">.</span>
      </span>
    </motion.h2>
  );
}

export function PhilosophySection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 75%", "end 25%"]
  });

  return (
    <section ref={containerRef} className="flex w-full flex-col items-center gap-6 px-4 py-20 text-center md:gap-8">
      <PhilosophyLine left="Balance" right="Chaos" scrollYProgress={scrollYProgress} index={0} total={3} />
      <PhilosophyLine left="Symmetry" right="Noise" scrollYProgress={scrollYProgress} index={1} total={3} />
      <PhilosophyLine left="Clarity" right="Jargon" scrollYProgress={scrollYProgress} index={2} total={3} />
    </section>
  );
}
