"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/motion/checkbox";
import {
  previewProfessorMutation,
  commitProfessorMutation,
} from "@/actions/professor.actions";
import type { MutationInput, Row } from "@/lib/professor/types";
import type { MutationPreview } from "@/lib/professor/service";
import { Button, Input, Choice, Dialog, Notice, useFeedback } from "./ui";
import { phaseOptions } from "./filters";
const labels = {
  accounts: "compte",
  attempts: "tentative",
  answers: "réponse",
};
const scoreKeys = [
  "preTest",
  "phase1",
  "phase2",
  "phase3",
  "phase4",
  "postTest",
];
const iso = (value: unknown) => (typeof value === "string" ? value : "");
function initial(
  resource: MutationInput["resource"],
  row?: Row,
  defaults?: Record<string, unknown>,
) {
  const now = new Date().toISOString();
  if (resource === "accounts")
    return {
      name: row?.name ?? "",
      lastName: row?.lastName ?? "",
      email: row?.email ?? "",
      role: row?.role ?? "student",
      age: row?.age ?? null,
      ...(!row ? { password: "" } : {}),
    };
  if (resource === "attempts")
    return {
      userId: row?.userId ?? defaults?.userId ?? "",
      status: row?.status ?? "in-progress",
      startedAt: iso(row?.startedAt) || now,
      completedAt: iso(row?.completedAt),
      currentPhase: row?.currentPhase ?? "preTest",
      currentQuestionIndex: row?.currentQuestionIndex ?? 0,
      scores: Object.fromEntries(
        scoreKeys.map((k) => [k, row?.scores?.[k] ?? 0]),
      ),
    };
  return {
    attemptId: row?.attemptId ?? defaults?.attemptId ?? "",
    questionId: row?.questionId ?? "",
    questionType: row?.questionType ?? "mcq",
    phase: row?.phase ?? "preTest",
    selectedOptionId: row?.selectedOptionId ?? "",
    isCorrect: !!row?.isCorrect,
    isSkipped: !!row?.isSkipped,
    timeSpent: row?.timeSpent ?? null,
    answeredAt: iso(row?.answeredAt) || now,
    correctOptionId: row?.correctOptionId ?? "",
    correctTreatmentIds: row?.correctTreatmentIds ?? [],
    confirmCorrectness: false,
  };
}
export function RecordEditor({
  resource,
  operation = "update",
  row,
  defaults,
  onClose,
  onSaved,
}: {
  resource: MutationInput["resource"];
  operation?: MutationInput["operation"];
  row?: Row;
  defaults?: Record<string, unknown>;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const router = useRouter(),
    notify = useFeedback();
  const [data, setData] = useState<Record<string, any>>(() =>
    operation === "password"
      ? { password: "" }
      : initial(resource, row, defaults),
  );
  const [reason, setReason] = useState(""),
    [denominator, setDenominator] = useState(""),
    [reference, setReference] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [confirmation, setConfirmation] = useState(""),
    [preview, setPreview] = useState<MutationPreview | null>(null),
    [frozen, setFrozen] = useState<MutationInput | null>(null),
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({}),
    [pending, start] = useTransition(),
    [dirty, setDirty] = useState(false),
    [discard, setDiscard] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const update = (key: string, value: unknown) => {
    setData((d) => ({ ...d, [key]: value }));
    setDirty(true);
    setPreview(null);
  };
  const field = (
    key: string,
    label: string,
    type = "text",
    extra: Record<string, unknown> = {},
  ) => (
    <Input
      key={key}
      label={label}
      type={type}
      value={data[key] == null ? "" : String(data[key])}
      onChange={(v) =>
        update(key, type === "number" ? (v === "" ? null : Number(v)) : v)
      }
      error={fieldErrors[key]?.join(" ")}
      {...extra}
    />
  );
  const title = `${operation === "create" ? "Créer" : operation === "delete" ? "Supprimer" : operation === "password" ? "Réinitialiser le mot de passe du" : "Modifier"} ${labels[resource]}`;
  const close = () => {
    if (pending) return;
    if (dirty) setDiscard(true);
    else onClose();
  };
  const prepare = () =>
    start(async () => {
      setError("");
      setFieldErrors({});
      const input: MutationInput = {
        resource,
        operation,
        id: row?.id,
        revision: row?.revision,
        data: operation === "delete" ? {} : data,
        reason,
        ...(confirmed
          ? {
              scoring: {
                denominator: Number(denominator),
                reference,
                confirmed,
              },
            }
          : {}),
      };
      const result = await previewProfessorMutation(input);
      if (result.success) {
        setPreview(result.preview);
        setFrozen(input);
      } else {
        setError(result.error);
        setFieldErrors(
          (result as { fieldErrors?: Record<string, string[]> }).fieldErrors ??
            {},
        );
      }
    });
  const save = () =>
    start(async () => {
      if (!preview || !frozen) return;
      setError("");
      const result = await commitProfessorMutation({
        ...frozen,
        confirmation,
        previewToken: preview.token,
      });
      if (!result.success) {
        setError(result.error);
        if (result.code === "CONFLICT") setPreview(null);
        return;
      }
      setDirty(false);
      notify(
        `${labels[resource]} ${operation === "delete" ? "supprimé(e)" : "enregistré(e)"}.`,
      );
      router.refresh();
      onSaved?.();
      onClose();
    });
  return (
    <>
      <Dialog open onClose={close} title={title} wide>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            prepare();
          }}
        >
          {error && <Notice error>{error}</Notice>}
          {!preview && (
            <>
              <div className="p-form-grid">
                {operation === "delete" ? (
                  <Notice error>
                    Suppression définitive. Les enregistrements liés seront
                    comptés avant votre confirmation.
                  </Notice>
                ) : operation === "password" ? (
                  field("password", "Nouveau mot de passe", "password", {
                    autoComplete: "new-password",
                  })
                ) : resource === "accounts" ? (
                  <>
                    {field("name", "Prénom")}
                    {field("lastName", "Nom")}
                    {field("email", "Email", "email")}
                    {field("age", "Âge (facultatif)", "number")}
                    <Choice
                      label="Rôle"
                      value={data.role}
                      onChange={(v) => update("role", v)}
                      options={[
                        { value: "student", label: "Étudiant" },
                        { value: "professor", label: "Professeur" },
                      ]}
                    />
                    {operation === "create" &&
                      field(
                        "password",
                        "Mot de passe initial (12 caractères minimum)",
                        "password",
                        { autoComplete: "new-password" },
                      )}
                  </>
                ) : resource === "attempts" ? (
                  <>
                    {field("userId", "Identifiant du compte propriétaire")}
                    <Choice
                      label="Statut"
                      value={data.status}
                      onChange={(v) => update("status", v)}
                      options={[
                        { value: "in-progress", label: "En cours" },
                        { value: "completed", label: "Terminée" },
                        { value: "abandoned", label: "Abandonnée" },
                      ]}
                    />
                    {field("startedAt", "Début · ISO avec fuseau (ex. +01:00)")}
                    {field("completedAt", "Fin · ISO avec fuseau (facultatif)")}
                    <Choice
                      label="Phase actuelle"
                      value={data.currentPhase}
                      onChange={(v) => update("currentPhase", v)}
                      options={phaseOptions.slice(1)}
                    />
                    {field(
                      "currentQuestionIndex",
                      "Index de question (base zéro)",
                      "number",
                    )}
                    {scoreKeys.map((k, i) => (
                      <Input
                        key={k}
                        label={`Score brut · ${phaseOptions[i + 1].label}`}
                        type="number"
                        min={0}
                        value={String(data.scores[k])}
                        onChange={(v) =>
                          update("scores", { ...data.scores, [k]: Number(v) })
                        }
                      />
                    ))}
                  </>
                ) : (
                  <>
                    {field("attemptId", "Identifiant de tentative", "text", {
                      disabled: !!row,
                    })}
                    {field("questionId", "Identifiant historique de question")}
                    <Choice
                      label="Type"
                      value={data.questionType}
                      onChange={(v) => update("questionType", v)}
                      options={[
                        { value: "mcq", label: "QCM" },
                        { value: "clinical-case", label: "Cas clinique" },
                      ]}
                    />
                    <Choice
                      label="Phase"
                      value={data.phase}
                      onChange={(v) => update("phase", v)}
                      options={phaseOptions.slice(1)}
                    />
                    {field(
                      "selectedOptionId",
                      data.questionType === "mcq"
                        ? "Option sélectionnée"
                        : "Traitements sélectionnés · séparés par des virgules",
                    )}
                    {data.questionType === "mcq" ? (
                      field(
                        "correctOptionId",
                        "Clé historique vérifiée · option",
                      )
                    ) : (
                      <Input
                        label="Clé historique · traitements séparés par virgules"
                        value={data.correctTreatmentIds.join(", ")}
                        onChange={(v) =>
                          update(
                            "correctTreatmentIds",
                            v
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          )
                        }
                      />
                    )}
                    {field("answeredAt", "Réponse · date ISO avec fuseau")}
                    {field(
                      "timeSpent",
                      "Durée enregistrée en secondes (vide si inconnue)",
                      "number",
                    )}
                    <Checkbox
                      label="Réponse passée"
                      checked={data.isSkipped}
                      onCheckedChange={(v) => update("isSkipped", v)}
                    />
                    <Checkbox
                      label="Réponse correcte (si clé absente)"
                      checked={data.isCorrect}
                      onCheckedChange={(v) => update("isCorrect", v)}
                    />
                    <div className="full">
                      <Checkbox
                        label="En l’absence de clé, je confirme cette correction d’après une source vérifiée"
                        checked={data.confirmCorrectness}
                        onCheckedChange={(v) => update("confirmCorrectness", v)}
                      />
                    </div>
                  </>
                )}
                <div className="full">
                  <Input
                    label="Motif de l’opération · obligatoire"
                    value={reason}
                    onChange={(v) => {
                      setReason(v);
                      setDirty(true);
                    }}
                    placeholder="Correction documentée, demande de suppression…"
                  />
                </div>
              </div>
              {resource !== "accounts" &&
                !(resource === "attempts" && operation === "delete") && (
                  <details style={{ marginTop: 20 }} open={confirmed}>
                    <summary>
                      Base de calcul historique · requise si non vérifiée
                    </summary>
                    <p className="p-form-note">
                      Ne déduisez jamais le nombre de questions du nombre de
                      réponses soumises. Les durées et acquis historiques ne
                      sont pas régénérés.
                    </p>
                    <div className="p-form-grid">
                      <Input
                        label="Nombre de questions vérifié"
                        type="number"
                        min={1}
                        value={denominator}
                        onChange={setDenominator}
                      />
                      <Input
                        label="Référence / décision documentée"
                        value={reference}
                        onChange={setReference}
                      />
                      <div className="full">
                        <Checkbox
                          label="Je confirme explicitement cette base de calcul"
                          checked={confirmed}
                          onCheckedChange={setConfirmed}
                        />
                      </div>
                    </div>
                  </details>
                )}
            </>
          )}
          {preview && (
            <>
              <Notice>
                Vérifiez les changements et leurs conséquences avant
                l’enregistrement transactionnel.
              </Notice>
              <div className="p-actions">
                {Object.entries(preview.affected).map(([key, n]) => (
                  <span className="p-chip" key={key}>
                    {key} : {n}
                  </span>
                ))}
              </div>
              {preview.warnings.map((w) => (
                <Notice key={w} error={preview.requiresScoring}>
                  {w}
                </Notice>
              ))}
              <div className="p-grid" style={{ marginTop: 16 }}>
                <section>
                  <h3>Avant</h3>
                  <pre className="p-diff">
                    {JSON.stringify(preview.before, null, 2) ??
                      "Nouvel enregistrement"}
                  </pre>
                </section>
                <section>
                  <h3>Après</h3>
                  <pre className="p-diff">
                    {JSON.stringify(preview.after, null, 2) ??
                      "Enregistrement supprimé"}
                  </pre>
                </section>
              </div>
              {preview.scores && (
                <Notice>
                  Nouveaux scores :{" "}
                  {Object.entries(preview.scores)
                    .map(([k, v]) => `${k} : ${v}`)
                    .join(" · ")}
                </Notice>
              )}
              {operation === "delete" && (
                <Input
                  label={`Pour confirmer, saisissez : ${preview.confirmation}`}
                  value={confirmation}
                  onChange={setConfirmation}
                  autoComplete="off"
                />
              )}
            </>
          )}
          <div className="p-form-footer">
            <Button
              variant="outline"
              type="button"
              onClick={close}
              disabled={pending}
            >
              Annuler
            </Button>
            {preview ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreview(null)}
                  disabled={pending}
                >
                  Revenir aux champs
                </Button>
                <Button
                  type="button"
                  className={operation === "delete" ? "p-danger" : ""}
                  pending={pending}
                  disabled={
                    preview.requiresScoring ||
                    (operation === "delete" &&
                      confirmation !== preview.confirmation)
                  }
                  onClick={save}
                >
                  Confirmer{" "}
                  {operation === "delete"
                    ? "la suppression"
                    : "l’enregistrement"}
                </Button>
              </>
            ) : (
              <Button
                type="submit"
                pending={pending}
                disabled={reason.trim().length < 5}
              >
                Prévisualiser les changements
              </Button>
            )}
          </div>
        </form>
      </Dialog>
      <Dialog
        open={discard}
        onClose={() => setDiscard(false)}
        title="Quitter sans enregistrer ?"
      >
        <p>Les modifications de ce formulaire seront perdues.</p>
        <div className="p-form-footer">
          <Button variant="outline" onClick={() => setDiscard(false)}>
            Continuer l’édition
          </Button>
          <Button className="p-danger" onClick={onClose}>
            Abandonner
          </Button>
        </div>
      </Dialog>
    </>
  );
}
