"use client";
import { useState, useTransition } from "react";
import { Checkbox } from "@/components/motion/checkbox";
import type { Query, Resource } from "@/lib/professor/types";
import { Button, Choice, Input, Notice, useFeedback } from "./ui";
import Stepper, { Step } from "./react-bits/stepper";
export function ExportWizard({
  query,
  source,
  total,
}: {
  query: Query;
  source?: Resource;
  total?: number;
}) {
  const [step, setStep] = useState(0),
    [identified, setIdentified] = useState(false),
    [confirmation, setConfirmation] = useState(""),
    [ack, setAck] = useState(false),
    [error, setError] = useState(""),
    [pending, start] = useTransition();
  const notify = useFeedback();
  const download = () =>
    start(async () => {
      setError("");
      try {
        const response = await fetch("/api/professor/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: Object.fromEntries(
              Object.entries(query).map(([k, v]) => [
                k,
                Array.isArray(v)
                  ? v.join(",")
                  : v === undefined
                    ? ""
                    : String(v),
              ]),
            ),
            source,
            identified,
            confirmation,
          }),
        });
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error || "Export indisponible.");
        }
        const blob = await response.blob(),
          url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download =
          response.headers
            .get("Content-Disposition")
            ?.match(/filename="([^"]+)"/)?.[1] ?? "resusskills-recherche.zip";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        notify("Paquet de recherche exporté.");
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Export impossible. Réessayez.",
        );
      }
    });
  return (
    <Stepper
      step={step}
      onChange={setStep}
      labels={["Périmètre", "Confidentialité", "Téléchargement"]}
    >
      <Step>
        <h3>Données comprises dans l’export</h3>
        <p className="p-form-note">
          {source
            ? `Table : ${source}.`
            : "Comptes, tentatives et réponses reliés par identifiants cohérents."}{" "}
          {query.ids.length
            ? `${query.ids.length} identifiants explicitement sélectionnés.`
            : `Tous les enregistrements filtrés${total !== undefined ? ` (${total})` : ""}, au-delà de la page visible.`}
        </p>
        <dl className="p-definition">
          <dt>Période</dt>
          <dd>
            {query.from || "Première date"} → {query.to || "Dernière date"}
          </dd>
          <dt>Tentatives</dt>
          <dd>
            {source
              ? "Toutes les lignes filtrées"
              : query.selection === "first"
                ? "Première terminée par étudiant"
                : query.selection === "latest"
                  ? "Dernière terminée par étudiant"
                  : "Toutes, y compris incomplètes"}
          </dd>
          <dt>Condition</dt>
          <dd>
            {query.search ||
              query.question ||
              query.phase ||
              "Filtres de la vue courante"}
          </dd>
        </dl>
        <div className="p-form-footer">
          <Button onClick={() => setStep(1)}>Continuer</Button>
        </div>
      </Step>
      <Step>
        <Choice
          label="Mode d’identification"
          value={identified ? "identified" : "research"}
          onChange={(v) => {
            setIdentified(v === "identified");
            setAck(false);
            setConfirmation("");
          }}
          options={[
            {
              value: "research",
              label: "Recherche · identifiants pseudonymes",
            },
            { value: "identified", label: "Identifié · données personnelles" },
          ]}
        />
        <Notice>
          Les pseudonymes sont cohérents dans ce paquet et renouvelés à chaque
          export. Les dates et autres attributs peuvent rester indirectement
          identifiants.
        </Notice>
        {identified && (
          <>
            <Notice error>
              Le paquet contiendra les identifiants réels et, pour les comptes,
              les noms et emails. L’export est journalisé.
            </Notice>
            <Input
              label="Saisissez EXPORTER pour confirmer"
              value={confirmation}
              onChange={setConfirmation}
            />
          </>
        )}
        <Checkbox
          label="Je confirme que cet export est nécessaire et sera conservé dans un emplacement autorisé"
          checked={ack}
          onCheckedChange={setAck}
        />
        <div className="p-form-footer">
          <Button variant="outline" onClick={() => setStep(0)}>
            Retour
          </Button>
          <Button
            disabled={!ack || (identified && confirmation !== "EXPORTER")}
            onClick={() => setStep(2)}
          >
            Vérifier le paquet
          </Button>
        </div>
      </Step>
      <Step>
        <h3>Paquet CSV UTF-8</h3>
        <p className="p-form-note">
          ZIP avec tables CSV, dictionnaire de données et manifeste des filtres,
          effectifs et limites. Dates ISO, nombres sans symboles, valeurs
          absentes laissées vides et protection contre les formules de tableur.
        </p>
        <Notice>
          Les scores historiques restent inchangés. Cet export n’applique aucune
          normalisation à la banque actuelle.
        </Notice>
        {error && <Notice error>{error}</Notice>}
        <div className="p-form-footer">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => setStep(1)}
          >
            Retour
          </Button>
          <Button onClick={download} pending={pending}>
            Télécharger le paquet {identified ? "identifié" : "de recherche"}
          </Button>
        </div>
      </Step>
    </Stepper>
  );
}
