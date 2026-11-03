import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Heart, Clipboard, Microscope } from "lucide-react";

interface ClinicalCaseCardProps {
  question: any;
}

export function ClinicalCaseCard({ question }: ClinicalCaseCardProps) {
  return (
    <div className="space-y-6">

      {/* Patient Demographics Card */}
      {question.patient && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clipboard className="h-5 w-5 text-purple-500" />
              Patient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Nom</p>
                <p className="font-medium text-base">{question.patient.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Âge</p>
                <p className="font-medium text-base">{question.patient.age} ans</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Sexe</p>
                <p className="font-medium text-base">{question.patient.sex === "M" ? "Homme" : "Femme"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Antécédents</p>
                <div className="flex flex-wrap gap-1">
                  {question.patient.atcd?.map((item: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">{item}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chief Complaint Card */}
      {question.motif && (
        <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Motif de Consultation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base leading-relaxed font-medium">{question.motif}</p>
          </CardContent>
        </Card>
      )}

      {/* General State + Vital Signs - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* General State */}
        {question.etatGeneral && (
          <Card className="border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-5 w-5 text-red-500" />
                État Général
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {question.etatGeneral.map((item: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vital Signs */}
        {question.constantesVitales && (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Heart className="h-5 w-5 text-green-500" />
                Signes Vitaux
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {question.constantesVitales.ta && (
                  <div className="bg-muted/60 dark:bg-muted/30 p-3 rounded-lg text-center">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">TA</p>
                    <p className="font-bold text-sm">{question.constantesVitales.ta}</p>
                  </div>
                )}
                {question.constantesVitales.fc && (
                  <div className="bg-muted/60 dark:bg-muted/30 p-3 rounded-lg text-center">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">FC</p>
                    <p className="font-bold text-sm">{question.constantesVitales.fc}</p>
                  </div>
                )}
                {question.constantesVitales.fr && (
                  <div className="bg-muted/60 dark:bg-muted/30 p-3 rounded-lg text-center">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">FR</p>
                    <p className="font-bold text-sm">{question.constantesVitales.fr}</p>
                  </div>
                )}
                {question.constantesVitales.spo2 && (
                  <div className="bg-muted/60 dark:bg-muted/30 p-3 rounded-lg text-center">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">SpO2</p>
                    <p className="font-bold text-sm">{question.constantesVitales.spo2}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Clinical Examination */}
      {question.examenClinique && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-5 w-5 text-blue-500" />
              Examen Clinique
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {question.examenClinique.map((item: string, idx: number) => (
                <li key={idx} className="flex items-center gap-3">
                    
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Additional Examinations */}
      {question.examensComplementaires && (
        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Microscope className="h-5 w-5 text-cyan-500" />
              Examens Complémentaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {question.examensComplementaires.map((item: string, idx: number) => (
                <li key={idx} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-500" />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
