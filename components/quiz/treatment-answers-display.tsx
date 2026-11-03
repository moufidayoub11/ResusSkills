"use client";

import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TreatmentOption {
  id: string;
  text: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string | null;
  subcategoryName: string | null;
}

interface TreatmentAnswersDisplayProps {
  correctTreatments: TreatmentOption[];
  selectedTreatments: TreatmentOption[];
  isCorrect: boolean;
}

export function TreatmentAnswersDisplay({
  correctTreatments,
  selectedTreatments,
  isCorrect,
}: TreatmentAnswersDisplayProps) {
  // Group treatments by category and subcategory
  const groupTreatments = (treatments: TreatmentOption[]) => {
    const grouped: Record<string, Record<string, TreatmentOption[]>> = {};

    treatments.forEach((treatment) => {
      if (!grouped[treatment.categoryName]) {
        grouped[treatment.categoryName] = {};
      }
      const subcatName = treatment.subcategoryName || "Autres";
      if (!grouped[treatment.categoryName][subcatName]) {
        grouped[treatment.categoryName][subcatName] = [];
      }
      grouped[treatment.categoryName][subcatName].push(treatment);
    });

    return grouped;
  };

  const correctGrouped = groupTreatments(correctTreatments);
  const selectedSet = new Set(selectedTreatments.map((t) => t.id));
  const correctSet = new Set(correctTreatments.map((t) => t.id));

  // Find missing treatments
  const missingTreatments = correctTreatments.filter((t) => !selectedSet.has(t.id));
  const missingGrouped = groupTreatments(missingTreatments);

  return (
    <div className="space-y-4">
      {/* Header with summary */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/30">
        {isCorrect ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">Prise en charge correcte</p>
              <p className="text-sm text-green-800 dark:text-green-200">
                {selectedTreatments.length} / {correctTreatments.length} options sélectionnées
              </p>
            </div>
          </>
        ) : (
          <>
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            <div>
              <p className="font-semibold text-red-900 dark:text-red-100">Prise en charge incomplète</p>
              <p className="text-sm text-red-800 dark:text-red-200">
                {selectedTreatments.length} / {correctTreatments.length} options sélectionnées
              </p>
            </div>
          </>
        )}
      </div>

      {/* Correct treatments */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
          Prise en charge correcte:
        </h4>
        <div className="space-y-4 pl-2">
          {Object.entries(correctGrouped).map(([categoryName, subcategories]) => (
            <div key={categoryName} className="space-y-2">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {categoryName}
              </p>
              <div className="space-y-2 pl-3">
                {Object.entries(subcategories).map(([subcatName, treatments]) => (
                  <div key={`${categoryName}-${subcatName}`} className="space-y-1">
                    {subcatName !== "Autres" && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        {subcatName}
                      </p>
                    )}
                    <div className="space-y-1 pl-2">
                      {treatments.map((treatment) => (
                        <div
                          key={treatment.id}
                          className="flex items-center gap-2 p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                          <span className="text-sm text-green-900 dark:text-green-100 font-medium">
                            {treatment.text}
                          </span>
                          {selectedSet.has(treatment.id) && (
                            <Badge variant="secondary" className="ml-auto text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 border-green-300 dark:border-green-700">
                              Sélectionné
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missing treatments (if any) */}
      {missingTreatments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <h4 className="font-semibold text-sm text-orange-900 dark:text-orange-100">
              Traitements manquants:
            </h4>
          </div>
          <div className="space-y-4 pl-2">
            {Object.entries(missingGrouped).map(([categoryName, subcategories]) => (
              <div key={categoryName} className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {categoryName}
                </p>
                <div className="space-y-2 pl-3">
                  {Object.entries(subcategories).map(([subcatName, treatments]) => (
                    <div key={`${categoryName}-${subcatName}`} className="space-y-1">
                      {subcatName !== "Autres" && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          {subcatName}
                        </p>
                      )}
                      <div className="space-y-1 pl-2">
                        {treatments.map((treatment) => (
                          <div
                            key={treatment.id}
                            className="flex items-center gap-2 p-2 rounded bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800"
                          >
                            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                            <span className="text-sm text-orange-900 dark:text-orange-100">
                              {treatment.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User's incorrect selections (if any) */}
      {selectedTreatments.some((t) => !correctSet.has(t.id)) && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-red-900 dark:text-red-100">
            Traitements incorrects sélectionnés:
          </h4>
          <div className="space-y-2 pl-2">
            {selectedTreatments
              .filter((t) => !correctSet.has(t.id))
              .map((treatment) => (
                <div
                  key={treatment.id}
                  className="flex items-center gap-2 p-2 rounded bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                >
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                  <span className="text-sm text-red-900 dark:text-red-100">
                    {treatment.text}
                  </span>
                  <Badge variant="secondary" className="ml-auto text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 border-red-300 dark:border-red-700">
                    Incorrect
                  </Badge>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
