"use client";
import { useTransition } from "react";
import { usePreference } from "./preferences";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  ListChecks,
  ChartNoAxesCombined,
  GitCompare,
  Microscope,
  TrendingUp,
  Timer,
  ShieldCheck,
  Download,
  History,
  Settings,
  Moon,
  Sun,
  LogOut,
  FlaskConical,
  PanelLeft,
  ArrowUpRight,
} from "lucide-react";
import {
  AnimatedSidebarProvider,
  AnimatedSidebar,
  AnimatedSidebarHeader,
  AnimatedSidebarContent,
  AnimatedSidebarFooter,
  AnimatedSidebarGroup,
  AnimatedSidebarGroupLabel,
  AnimatedSidebarMenu,
  AnimatedSidebarMenuItem,
  AnimatedSidebarMenuButton,
  AnimatedSidebarTrigger,
  AnimatedSidebarInset,
} from "@/components/motion/animated-sidebar";
import {
  AnimatedToastStack,
  useAnimatedToastStack,
} from "@/components/motion/animated-toast-stack";
import { logout } from "@/actions/auth.actions";
import type { Actor } from "@/lib/professor/types";
import { Button, FeedbackContext } from "./ui";
const groups = [
  {
    label: "Espace de travail",
    links: [
      ["/dashboard", "Vue d’ensemble", LayoutDashboard],
      ["/dashboard/accounts", "Comptes", Users],
      ["/dashboard/attempts", "Tentatives", ClipboardList],
      ["/dashboard/answers", "Réponses", ListChecks],
    ],
  },
  {
    label: "Analyses de recherche",
    links: [
      [
        "/dashboard/analytics/scores",
        "Scores & distributions",
        ChartNoAxesCombined,
      ],
      ["/dashboard/analytics/pre-post", "Pré-test / post-test", GitCompare],
      ["/dashboard/analytics/questions", "Analyse des questions", Microscope],
      ["/dashboard/analytics/progression", "Progression", TrendingUp],
      ["/dashboard/analytics/timing", "Temps & participation", Timer],
    ],
  },
  {
    label: "Administration",
    links: [
      ["/dashboard/quality", "Qualité des données", ShieldCheck],
      ["/dashboard/exports", "Exports", Download],
      ["/dashboard/activity", "Journal d’activité", History],
      ["/dashboard/settings", "Paramètres", Settings],
    ],
  },
];
export function ProfessorShell({
  children,
  actor,
  fontClass,
}: {
  children: React.ReactNode;
  actor: Actor;
  fontClass: string;
}) {
  const path = usePathname();
  const [theme, setTheme] = usePreference("professor-theme", "dark");
  const [pending, startTransition] = useTransition();
  const toast = useAnimatedToastStack();
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("professor-theme", next);
  };
  const current =
    groups.flatMap((g) => g.links).find(([href]) => path === href)?.[1] ??
    "Détail";
  return (
    <div className={`professor-workspace ${fontClass}`} data-theme={theme}>
      <FeedbackContext.Provider
        value={(message, error) =>
          toast.showToast({
            title: message,
            status: error ? "error" : "success",
          })
        }
      >
        <AnimatedSidebarProvider className="p-shell" defaultOpen>
          <a className="p-skip" href="#professor-main">
            Aller au contenu
          </a>
          <AnimatedSidebar
            className="p-sidebar"
            ariaLabel="Navigation professeur"
          >
            <AnimatedSidebarHeader>
              <a className="p-brand" href="/dashboard">
                <FlaskConical size={24} />
                <span>
                  ResusSkills<small>ESPACE RECHERCHE</small>
                </span>
              </a>
            </AnimatedSidebarHeader>
            <AnimatedSidebarContent>
              {groups.map((g) => (
                <AnimatedSidebarGroup key={g.label}>
                  <AnimatedSidebarGroupLabel>
                    {g.label}
                  </AnimatedSidebarGroupLabel>
                  <AnimatedSidebarMenu>
                    {g.links.map(([href, label, Icon]) => (
                      <AnimatedSidebarMenuItem key={href as string}>
                        <AnimatedSidebarMenuButton
                          href={href as string}
                          isActive={
                            path === href ||
                            (href !== "/dashboard" &&
                              path.startsWith((href as string) + "/"))
                          }
                          icon={<Icon size={17} />}
                          className="p-nav-item"
                        >
                          {label as string}
                        </AnimatedSidebarMenuButton>
                      </AnimatedSidebarMenuItem>
                    ))}
                  </AnimatedSidebarMenu>
                </AnimatedSidebarGroup>
              ))}
            </AnimatedSidebarContent>
            <AnimatedSidebarFooter>
              <div className="p-user">
                <div className="p-avatar">
                  {actor.name
                    .split(" ")
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join("")}
                </div>
                <span>
                  {actor.name}
                  <small>Professeur</small>
                </span>
              </div>
            </AnimatedSidebarFooter>
          </AnimatedSidebar>
          <AnimatedSidebarInset className="p-inset">
            <header className="p-topbar">
              <div className="p-topbar-left">
                <AnimatedSidebarTrigger aria-label="Ouvrir ou réduire la navigation">
                  <PanelLeft size={18} />
                </AnimatedSidebarTrigger>
                <span className="p-breadcrumb">
                  Espace professeur <span>/</span>{" "}
                  <strong>{current as string}</strong>
                </span>
              </div>
              <div className="p-topbar-actions">
                <span className="p-status-dot" />
                <span className="p-live-label">Données enregistrées</span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={
                    theme === "dark"
                      ? "Activer le thème clair"
                      : "Activer le thème sombre"
                  }
                  onClick={toggle}
                >
                  {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Se déconnecter"
                  pending={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await logout();
                    })
                  }
                >
                  <LogOut size={17} />
                </Button>
              </div>
            </header>
            <main id="professor-main" className="p-main">
              {children}
            </main>
            <footer className="p-footer">
              <span>ResusSkills · Recherche descriptive</span>
              <Link href="/quiz">
                Accéder au quiz <ArrowUpRight size={13} />
              </Link>
              <span>Africa/Casablanca</span>
            </footer>
          </AnimatedSidebarInset>
        </AnimatedSidebarProvider>
        <AnimatedToastStack
          fixed
          toasts={toast.toasts}
          onDismiss={toast.dismissToast}
        />
      </FeedbackContext.Provider>
    </div>
  );
}
