"use client";
import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  I18nProvider,
  RangeCalendar,
  CalendarGrid,
  CalendarCell,
  Heading,
  Button as AriaButton,
} from "react-aria-components";
import { parseDate, today } from "@internationalized/date";
import {
  CalendarDays,
  SlidersHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button, Input, Choice, Dialog } from "./ui";
import type { Query } from "@/lib/professor/types";
export const phaseOptions = [
  { value: "", label: "Toutes les phases" },
  { value: "preTest", label: "Pré-test" },
  { value: "phase-1", label: "Hémorragique" },
  { value: "phase-2", label: "Septique" },
  { value: "phase-3", label: "Anaphylactique" },
  { value: "phase-4", label: "Cardiogénique" },
  { value: "postTest", label: "Post-test" },
];
export function useQueryNavigation() {
  const router = useRouter(),
    path = usePathname(),
    params = useSearchParams();
  const [pending, start] = useTransition();
  return {
    pending,
    update: (
      changes: Record<string, string | number | undefined>,
      reset = true,
    ) => {
      const next = new URLSearchParams(params);
      if (reset) next.delete("page");
      for (const [k, v] of Object.entries(changes)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, String(v));
      }
      start(() => router.push(`${path}?${next}`, { scroll: false }));
    },
  };
}
export function Filters({
  query: q,
  research = false,
  resource = "",
  students = [],
}: {
  query: Query;
  research?: boolean;
  resource?: string;
  students?: { id: string; name: string }[];
}) {
  const nav = useQueryNavigation();
  const [search, setSearch] = useState(q.search),
    [advanced, setAdvanced] = useState(false),
    [calendar, setCalendar] = useState(false),
    [draft, setDraft] = useState(q);
  const change = (key: keyof Query, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const apply = () => {
    nav.update({
      from: draft.from,
      to: draft.to,
      status: draft.status,
      role: draft.role,
      phase: draft.phase,
      question: draft.question,
      students: draft.students.join(","),
      minScore: draft.minScore,
      maxScore: draft.maxScore,
      availability: draft.availability,
      bins: draft.bins,
      summary: draft.summary,
      display: draft.display,
      grouping: draft.grouping,
    });
    setAdvanced(false);
    setCalendar(false);
  };
  const active = [
    q.from && `Depuis le ${q.from}`,
    q.to && `Jusqu’au ${q.to}`,
    q.status,
    q.role,
    q.phase,
    q.question,
    q.students.length && `${q.students.length} compte(s)`,
    q.availability,
    q.minScore !== undefined && `≥ ${q.minScore} %`,
    q.maxScore !== undefined && `≤ ${q.maxScore} %`,
  ].filter(Boolean);
  return (
    <>
      <div className="p-filter-bar" aria-busy={nav.pending}>
        {!research && resource !== "" && (
          <form
            className="p-search p-actions"
            onSubmit={(e) => {
              e.preventDefault();
              nav.update({ search });
            }}
          >
            <Input
              aria-label="Rechercher"
              placeholder="Rechercher dans tous les résultats…"
              value={search}
              onChange={setSearch}
            />
            <Button
              type="submit"
              variant="outline"
              aria-label="Lancer la recherche"
            >
              <Search size={16} />
            </Button>
          </form>
        )}
        <div className="p-field">
          <span className="p-field-label">
            {resource === "accounts"
              ? "Date de création"
              : resource === "activity"
                ? "Date de l’événement"
                : "Date de début de tentative"}{" "}
            · Casablanca
          </span>
          <Button
            variant="outline"
            onClick={() => {
              setDraft(q);
              setCalendar(true);
            }}
          >
            <CalendarDays size={15} />
            {q.from || q.to
              ? `${q.from || "Début"} → ${q.to || "Fin"}`
              : "Toutes les dates"}
          </Button>
        </div>
        {research && (
          <Choice
            label="Population analysée"
            value={q.selection}
            onChange={(selection) => nav.update({ selection })}
            options={[
              { value: "first", label: "Première terminée / étudiant" },
              { value: "latest", label: "Dernière terminée / étudiant" },
              { value: "all", label: "Toutes · pondération par tentative" },
            ]}
          />
        )}
        <Button
          variant="outline"
          onClick={() => {
            setDraft(q);
            setAdvanced(true);
          }}
        >
          <SlidersHorizontal size={15} />
          Filtres & options
        </Button>
        {(active.length > 0 || q.search) && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              nav.update({
                from: "",
                to: "",
                status: "",
                role: "",
                phase: "",
                question: "",
                students: "",
                minScore: "",
                maxScore: "",
                availability: "",
                search: "",
              });
            }}
          >
            Réinitialiser
          </Button>
        )}
      </div>
      {active.length > 0 && (
        <div className="p-active-filters">
          {active.map((item, i) => (
            <span className="p-chip" key={i}>
              {item}
            </span>
          ))}
        </div>
      )}
      <Dialog
        open={calendar}
        onClose={() => setCalendar(false)}
        title="Période d’observation"
      >
        <div className="p-actions">
          {[7, 30, 90].map((days) => (
            <Button
              variant="outline"
              key={days}
              onClick={() => {
                const end = today("Africa/Casablanca");
                setDraft((d) => ({
                  ...d,
                  from: end.subtract({ days: days - 1 }).toString(),
                  to: end.toString(),
                }));
              }}
            >
              {days} jours
            </Button>
          ))}
          <Button
            variant="ghost"
            onClick={() => setDraft((d) => ({ ...d, from: "", to: "" }))}
          >
            Toutes les dates
          </Button>
        </div>
        <div className="p-form-grid" style={{ marginTop: 16 }}>
          <Input
            type="date"
            label="Début inclus"
            value={draft.from}
            onChange={(v) => change("from", v)}
          />
          <Input
            type="date"
            label="Fin incluse"
            value={draft.to}
            onChange={(v) => change("to", v)}
          />
        </div>
        <I18nProvider locale="fr-FR">
          <RangeCalendar
            aria-label="Période"
            className="p-calendar"
            value={
              draft.from && draft.to
                ? { start: parseDate(draft.from), end: parseDate(draft.to) }
                : null
            }
            onChange={(v) =>
              setDraft((d) => ({
                ...d,
                from: v.start.toString(),
                to: v.end.toString(),
              }))
            }
          >
            <header>
              <AriaButton
                slot="previous"
                className="p-button"
                aria-label="Mois précédent"
              >
                <ChevronLeft size={18} />
              </AriaButton>
              <Heading />
              <AriaButton
                slot="next"
                className="p-button"
                aria-label="Mois suivant"
              >
                <ChevronRight size={18} />
              </AriaButton>
            </header>
            <CalendarGrid>
              {(date) => <CalendarCell date={date} />}
            </CalendarGrid>
          </RangeCalendar>
        </I18nProvider>
        <p>
          Les bornes incluent toute la journée dans le fuseau Africa/Casablanca.
        </p>
        <div className="p-form-footer">
          <Button
            onClick={apply}
            disabled={!!draft.from && !!draft.to && draft.to < draft.from}
          >
            Appliquer la période
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={advanced}
        onClose={() => setAdvanced(false)}
        title="Filtres & configuration"
      >
        <div className="p-form-grid">
          {resource === "accounts" ? (
            <Choice
              label="Rôle"
              value={draft.role}
              onChange={(v) => change("role", v)}
              options={[
                { value: "", label: "Tous" },
                { value: "student", label: "Étudiant" },
                { value: "professor", label: "Professeur" },
              ]}
            />
          ) : (
            resource !== "activity" && (
              <Choice
                label="Statut"
                value={draft.status}
                onChange={(v) => change("status", v)}
                options={[
                  { value: "", label: "Tous" },
                  { value: "completed", label: "Terminée" },
                  { value: "in-progress", label: "En cours" },
                  { value: "abandoned", label: "Abandonnée" },
                ]}
              />
            )
          )}
          {resource !== "accounts" && resource !== "activity" && (
            <>
              <Choice
                label="Phase (réponses)"
                value={draft.phase}
                onChange={(v) => change("phase", v)}
                options={phaseOptions}
              />
              <Input
                label="Identifiant de question"
                value={draft.question}
                onChange={(v) => change("question", v)}
              />
              <Input
                type="number"
                label="Score enregistré minimum (%)"
                min={0}
                max={100}
                value={
                  draft.minScore === undefined ? "" : String(draft.minScore)
                }
                onChange={(v) =>
                  change("minScore", v === "" ? undefined : Number(v))
                }
              />
              <Input
                type="number"
                label="Score enregistré maximum (%)"
                min={0}
                max={100}
                value={
                  draft.maxScore === undefined ? "" : String(draft.maxScore)
                }
                onChange={(v) =>
                  change("maxScore", v === "" ? undefined : Number(v))
                }
              />
              <Choice
                label="Disponibilité des réponses"
                value={draft.availability}
                onChange={(v) => change("availability", v)}
                options={[
                  { value: "", label: "Toutes" },
                  { value: "timed", label: "Durée positive" },
                  { value: "untimed", label: "Durée indisponible" },
                  { value: "skipped", label: "Réponse passée" },
                  { value: "unresolved", label: "Question non résolue" },
                ]}
              />
            </>
          )}
          {!!students.length && (
            <div className="full">
              <Choice
                label="Ajouter un compte au filtre"
                value=""
                onChange={(v) =>
                  v && change("students", [...new Set([...draft.students, v])])
                }
                options={[
                  { value: "", label: "Tous les comptes" },
                  ...students.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
              <div className="p-actions">
                {draft.students.map((student) => (
                  <Button
                    key={student}
                    variant="ghost"
                    onClick={() =>
                      change(
                        "students",
                        draft.students.filter((s) => s !== student),
                      )
                    }
                  >
                    {students.find((s) => s.id === student)?.name ?? student} ×
                  </Button>
                ))}
              </div>
            </div>
          )}
          {research && (
            <>
              <Choice
                label="Classes de l’histogramme"
                value={String(draft.bins)}
                onChange={(v) => change("bins", Number(v))}
                options={[5, 10, 20].map((n) => ({
                  value: String(n),
                  label: `${n} classes`,
                }))}
              />
              <Choice
                label="Résumé des trajectoires"
                value={draft.summary}
                onChange={(v) => change("summary", v)}
                options={[
                  { value: "mean", label: "Moyenne" },
                  { value: "median", label: "Médiane" },
                ]}
              />
              <Choice
                label="Histogramme"
                value={draft.display}
                onChange={(v) => change("display", v)}
                options={[
                  { value: "count", label: "Effectifs" },
                  { value: "percentage", label: "Pourcentages" },
                ]}
              />
              <Choice
                label="Regroupement chronologique"
                value={draft.grouping}
                onChange={(v) => change("grouping", v)}
                options={[
                  { value: "day", label: "Jour" },
                  { value: "week", label: "Semaine" },
                  { value: "month", label: "Mois" },
                ]}
              />
            </>
          )}
        </div>
        <div className="p-form-footer">
          <Button variant="outline" onClick={() => setAdvanced(false)}>
            Annuler
          </Button>
          <Button onClick={apply}>Appliquer</Button>
        </div>
      </Dialog>
    </>
  );
}
