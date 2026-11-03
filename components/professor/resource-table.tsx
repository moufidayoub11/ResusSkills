"use client";
import { useState } from "react";
import { usePreference } from "./preferences";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Columns3,
  Eye,
  KeyRound,
} from "lucide-react";
import { Table, type TableColumn } from "@/components/motion/table";
import { Checkbox } from "@/components/motion/checkbox";
import type {
  PageResult,
  Query,
  Resource,
  Row,
  MutationInput,
} from "@/lib/professor/types";
import { Button, Choice, Dialog, Empty } from "./ui";
import { useQueryNavigation } from "./filters";
import { RecordEditor } from "./record-editor";
import { ExportWizard } from "./export-wizard";
export const dateLabel = (value: unknown) => {
  if (!value) return "—";
  const d = new Date(String(value));
  return Number.isFinite(+d)
    ? new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Casablanca",
      }).format(d)
    : "Date invalide";
};
export function Badge({ value }: { value: unknown }) {
  const text = String(value ?? "—");
  return (
    <span
      className={`p-badge ${["completed", "professor", "true"].includes(text) ? "good" : text === "in-progress" ? "warn" : ""}`}
    >
      {(
        {
          completed: "Terminée",
          "in-progress": "En cours",
          abandoned: "Abandonnée",
          professor: "Professeur",
          student: "Étudiant",
          true: "Correcte",
          false: "Incorrecte",
        } as Record<string, string>
      )[text] ?? text}
    </span>
  );
}
export function ResourceTable({
  resource,
  result,
  query,
  defaults,
}: {
  resource: Resource;
  result: PageResult;
  query: Query;
  defaults?: Record<string, unknown>;
}) {
  const nav = useQueryNavigation(),
    [selected, setSelected] = useState<string[]>([]),
    [editor, setEditor] = useState<{
      row?: Row;
      operation: MutationInput["operation"];
    } | null>(null),
    [inspect, setInspect] = useState<Row | null>(null),
    [columnsOpen, setColumnsOpen] = useState(false),
    [exportScope, setExportScope] = useState<"all" | "selected" | null>(null);
  const [density, setDensity] = usePreference(
    "professor-density",
    "comfortable",
  );
  const dense = density === "compact";
  const setDense = (v: boolean) => setDensity(v ? "compact" : "comfortable");
  const [hiddenValue, setHiddenValue] = usePreference(
    "professor-columns-" + resource,
    "[]",
  );
  let hidden: string[] = [];
  try {
    hidden = JSON.parse(hiddenValue);
  } catch {}
  const setHidden = (v: string[]) => setHiddenValue(JSON.stringify(v));
  const edit = (row: Row, operation: MutationInput["operation"] = "update") =>
    setEditor({ row, operation });
  const route = (r: Row) => `/dashboard/${resource}/${r.id}`;
  let cols: TableColumn<Row>[] =
    resource === "accounts"
      ? [
          {
            key: "name",
            header: "Compte",
            sortable: true,
            width: "240px",
            cell: (r) => (
              <Link className="p-table-link" href={route(r)}>
                {r.name} {r.lastName}
                <span className="p-table-secondary">{r.email}</span>
              </Link>
            ),
          },
          {
            key: "role",
            header: "Rôle",
            sortable: true,
            width: "125px",
            cell: (r) => <Badge value={r.role} />,
          },
          {
            key: "attemptCount",
            header: "Tentatives",
            sortable: true,
            width: "115px",
          },
          {
            key: "bestScore",
            header: "Meilleur score",
            sortable: true,
            width: "135px",
            cell: (r) => (r.bestScore == null ? "—" : `${r.bestScore} %`),
          },
          {
            key: "createdAt",
            header: "Inscription",
            sortable: true,
            width: "185px",
            cell: (r) => dateLabel(r.createdAt),
          },
        ]
      : resource === "attempts"
        ? [
            {
              key: "ownerName",
              header: "Participant",
              sortable: true,
              width: "220px",
              cell: (r) => (
                <Link
                  className="p-table-link"
                  href={`/dashboard/accounts/${r.userId}`}
                >
                  {r.ownerName || r.userId}
                  <span className="p-table-secondary">{r.ownerEmail}</span>
                </Link>
              ),
            },
            {
              key: "startedAt",
              header: "Début de tentative",
              sortable: true,
              width: "195px",
              cell: (r) => (
                <Link href={route(r)} className="p-table-link">
                  {dateLabel(r.startedAt)}
                </Link>
              ),
            },
            {
              key: "status",
              header: "Statut",
              sortable: true,
              width: "125px",
              cell: (r) => <Badge value={r.status} />,
            },
            {
              key: "scores.percentage",
              header: "Score enregistré",
              sortable: true,
              width: "150px",
              cell: (r) =>
                r.scores?.percentage == null ? "—" : `${r.scores.percentage} %`,
            },
            { key: "currentPhase", header: "Phase", width: "125px" },
          ]
        : resource === "answers"
          ? [
              {
                key: "questionId",
                header: "Question",
                sortable: true,
                width: "200px",
                cell: (r) => (
                  <Link className="p-table-link" href={route(r)}>
                    {r.questionId}
                    <span className="p-table-secondary">{r.questionType}</span>
                  </Link>
                ),
              },
              { key: "phase", header: "Phase", sortable: true, width: "125px" },
              {
                key: "selectedOptionId",
                header: "Choix enregistré",
                width: "190px",
                cell: (r) =>
                  r.isSkipped ? "Passée" : (r.selectedOptionId ?? "—"),
              },
              {
                key: "isCorrect",
                header: "Correction",
                sortable: true,
                width: "125px",
                cell: (r) => (
                  <Badge value={r.isSkipped ? "Passée" : r.isCorrect} />
                ),
              },
              {
                key: "timeSpent",
                header: "Durée (s)",
                sortable: true,
                width: "110px",
                cell: (r) => (r.timeSpent > 0 ? r.timeSpent : "—"),
              },
              {
                key: "answeredAt",
                header: "Horodatage",
                sortable: true,
                width: "190px",
                cell: (r) => dateLabel(r.answeredAt),
              },
            ]
          : [
              {
                key: "createdAt",
                header: "Date",
                sortable: true,
                width: "200px",
                cell: (r) => dateLabel(r.createdAt),
              },
              {
                key: "actorName",
                header: "Auteur",
                sortable: true,
                width: "180px",
              },
              {
                key: "action",
                header: "Action",
                sortable: true,
                width: "180px",
              },
              { key: "reason", header: "Motif", width: "260px" },
              { key: "targetId", header: "Cible", width: "220px" },
            ];
  cols = [
    ...cols,
    {
      key: "actions",
      header: "Actions",
      width: resource === "activity" ? "80px" : "180px",
      cell: (r) => (
        <div className="p-actions">
          <Button
            variant="ghost"
            aria-label="Inspecter l’enregistrement"
            onClick={() => setInspect(r)}
          >
            <Eye size={15} />
          </Button>
          {resource !== "activity" && (
            <>
              <Button
                variant="ghost"
                aria-label="Modifier l’enregistrement"
                onClick={() => edit(r)}
              >
                <Pencil size={15} />
              </Button>
              {resource === "accounts" && (
                <Button
                  variant="ghost"
                  aria-label="Réinitialiser le mot de passe"
                  onClick={() => edit(r, "password")}
                >
                  <KeyRound size={15} />
                </Button>
              )}
              <Button
                variant="ghost"
                aria-label="Supprimer l’enregistrement"
                onClick={() => edit(r, "delete")}
              >
                <Trash2 size={15} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const pages = [
    ...new Set([
      1,
      ...Array.from({ length: 5 }, (_, i) => result.page - 2 + i).filter(
        (n) => n > 0 && n <= totalPages,
      ),
      totalPages,
    ]),
  ].sort((a, b) => a - b);
  return (
    <>
      <section className="p-panel">
        <div className="p-table-toolbar">
          <div>
            <span className="p-table-title">
              {
                {
                  accounts: "Comptes",
                  attempts: "Tentatives",
                  answers: "Réponses",
                  activity: "Événements",
                }[resource]
              }
            </span>
            <span className="p-table-count">
              {result.total} résultats
              {selected.length ? ` · ${selected.length} sélectionnés` : ""}
            </span>
          </div>
          <div className="p-actions">
            <Button variant="outline" onClick={() => setColumnsOpen(true)}>
              <Columns3 size={14} />
              Colonnes
            </Button>
            {resource !== "activity" && (
              <>
                <Button variant="outline" onClick={() => setExportScope("all")}>
                  <Download size={14} />
                  Exporter
                </Button>
                <Button onClick={() => setEditor({ operation: "create" })}>
                  <Plus size={15} />
                  Créer
                </Button>
              </>
            )}
          </div>
        </div>
        {selected.length > 0 && (
          <div className="p-table-toolbar">
            <span>
              {selected.length} identifiants sélectionnés explicitement
            </span>
            <div className="p-actions">
              <Button
                variant="outline"
                onClick={() => setExportScope("selected")}
              >
                Exporter la sélection
              </Button>
              <Button variant="ghost" onClick={() => setSelected([])}>
                Désélectionner
              </Button>
            </div>
          </div>
        )}
        <Table
          data={result.items}
          columns={cols.filter((c) => !hidden.includes(c.key))}
          getRowId={(r) => r.id}
          manualSorting
          sort={
            query.sort ? { key: query.sort, direction: query.direction } : null
          }
          onSortChange={(sort) =>
            nav.update({
              sort: sort?.key ?? "",
              direction: sort?.direction ?? "desc",
            })
          }
          selectable={resource !== "activity"}
          selectedRowIds={selected}
          onSelectionChange={setSelected}
          resizable
          rowHeight={dense ? 48 : 64}
          height={Math.min(
            650,
            Math.max(190, result.items.length * (dense ? 48 : 64) + 50),
          )}
          loading={nav.pending}
          emptyState={
            <Empty
              title={
                query.search
                  ? "Aucun résultat pour cette recherche"
                  : "Aucun enregistrement"
              }
              description="Modifiez les filtres ou créez un enregistrement."
            />
          }
        />
        <div className="p-pagination">
          <span>
            {result.total ? (result.page - 1) * result.pageSize + 1 : 0}–
            {Math.min(result.page * result.pageSize, result.total)} sur{" "}
            {result.total}
          </span>
          <Choice
            label="Lignes par page"
            value={String(result.pageSize)}
            onChange={(v) => nav.update({ pageSize: v })}
            options={[25, 50, 100].map((n) => ({
              value: String(n),
              label: String(n),
            }))}
          />
          <nav className="p-page-numbers" aria-label="Pagination">
            <Button
              variant="ghost"
              disabled={result.page === 1 || nav.pending}
              onClick={() => nav.update({ page: result.page - 1 }, false)}
            >
              Préc.
            </Button>
            {pages.map((page, i) => (
              <span key={page}>
                {i > 0 && page - pages[i - 1] > 1 && "…"}
                <Button
                  variant="ghost"
                  aria-current={page === result.page ? "page" : undefined}
                  onClick={() => nav.update({ page }, false)}
                  disabled={nav.pending}
                >
                  {page}
                </Button>
              </span>
            ))}
            <Button
              variant="ghost"
              disabled={result.page === totalPages || nav.pending}
              onClick={() => nav.update({ page: result.page + 1 }, false)}
            >
              Suiv.
            </Button>
          </nav>
        </div>
      </section>
      <Dialog
        open={columnsOpen}
        onClose={() => setColumnsOpen(false)}
        title="Présentation du tableau"
      >
        <div className="p-form-grid">
          {cols
            .filter((c) => c.key !== "actions")
            .map((c) => (
              <Checkbox
                key={c.key}
                label={String(c.header)}
                checked={!hidden.includes(c.key)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? hidden.filter((k) => k !== c.key)
                    : [...hidden, c.key];
                  setHidden(next);
                  localStorage.setItem(
                    `professor-columns-${resource}`,
                    JSON.stringify(next),
                  );
                }}
              />
            ))}
          <Choice
            label="Densité"
            value={dense ? "compact" : "comfortable"}
            onChange={(v) => {
              setDense(v === "compact");
              localStorage.setItem("professor-density", v);
            }}
            options={[
              { value: "comfortable", label: "Confortable" },
              { value: "compact", label: "Compacte" },
            ]}
          />
        </div>
      </Dialog>
      <Dialog
        open={!!inspect}
        onClose={() => setInspect(null)}
        title="Inspection rapide"
        wide
      >
        {inspect && (
          <>
            <pre className="p-diff">{JSON.stringify(inspect, null, 2)}</pre>
            {resource !== "activity" && (
              <div className="p-form-footer">
                <Link className="p-table-link" href={route(inspect)}>
                  Ouvrir la fiche complète →
                </Link>
              </div>
            )}
          </>
        )}
      </Dialog>
      {editor && resource !== "activity" && (
        <RecordEditor
          key={`${editor.operation}-${editor.row?.id ?? "new"}`}
          resource={resource}
          operation={editor.operation}
          row={editor.row}
          defaults={defaults}
          onClose={() => setEditor(null)}
          onSaved={() =>
            setSelected((ids) => ids.filter((id) => id !== editor.row?.id))
          }
        />
      )}
      <Dialog
        open={!!exportScope}
        onClose={() => setExportScope(null)}
        title="Exporter les enregistrements"
        wide
      >
        {exportScope && (
          <ExportWizard
            source={resource}
            total={exportScope === "all" ? result.total : selected.length}
            query={{
              ...query,
              ids: exportScope === "selected" ? selected : [],
            }}
          />
        )}
      </Dialog>
    </>
  );
}
