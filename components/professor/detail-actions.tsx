"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, KeyRound } from "lucide-react";
import type { Row, MutationInput } from "@/lib/professor/types";
import { Button, Choice } from "./ui";
import { RecordEditor } from "./record-editor";
export function DetailActions({
  resource,
  row,
  settings = false,
}: {
  resource: MutationInput["resource"];
  row: Row;
  settings?: boolean;
}) {
  const [operation, setOperation] = useState<MutationInput["operation"] | null>(
      null,
    ),
    router = useRouter();
  return (
    <>
      <div className="p-actions">
        <Button onClick={() => setOperation("update")}>
          <Pencil size={15} />
          Modifier
        </Button>
        {resource === "accounts" && (
          <Button variant="outline" onClick={() => setOperation("password")}>
            <KeyRound size={15} />
            Mot de passe
          </Button>
        )}
        {!settings && (
          <Button
            className="p-danger"
            variant="outline"
            onClick={() => setOperation("delete")}
          >
            <Trash2 size={15} />
            Supprimer
          </Button>
        )}
      </div>
      {operation && (
        <RecordEditor
          resource={resource}
          row={row}
          operation={operation}
          onClose={() => setOperation(null)}
          onSaved={() => {
            if (operation === "delete") router.push(`/dashboard/${resource}`);
          }}
        />
      )}
    </>
  );
}
export function Preferences() {
  const [density, setDensity] = useState("comfortable");
  return (
    <Choice
      label="Densité des tableaux (cet appareil)"
      value={density}
      onChange={(v) => {
        setDensity(v);
        localStorage.setItem("professor-density", v);
      }}
      options={[
        { value: "comfortable", label: "Confortable" },
        { value: "compact", label: "Compacte" },
      ]}
    />
  );
}
