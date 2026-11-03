import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";

export default async function HomePage() {
  const session = await auth();

  if (session) {
    redirect("/quiz");
  }

  const features = [
    {
      icon: "📚",
      title: "Pré-Test & Post-Test",
      description: "Évaluez vos connaissances avant et après les cas cliniques",
    },
    {
      icon: "🏥",
      title: "Cas Cliniques Réalistes",
      description: "16 cas cliniques répartis par type de choc",
    },
    {
      icon: "📊",
      title: "Suivi des Progrès",
      description: "Visualisez vos scores et votre évolution",
    },
    {
      icon: "🏆",
      title: "Gamification",
      description: "Débloquez des succès et suivez votre progression",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center space-y-6 sm:space-y-8 max-w-4xl w-full">
          <h1 className="flex items-center justify-center text-4xl sm:text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
            <img src="/logo.svg" alt="ResusSkills" className="inline-block h-12 w-12 mr-3" />
            ResusSkills
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
            Testez vos connaissances sur les différents types de chocs médicaux
            à travers un quiz interactif et gamifié.
            <br />
            <span className="font-semibold">Train · Learn · Save Lives</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <Button 
              asChild
              size="lg"
              className="w-full sm:w-auto min-w-[200px]"
            >
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Se connecter
              </Link>
            </Button>
            <Button 
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto min-w-[200px]"
            >
              <Link href="/register">
                <UserPlus className="mr-2 h-4 w-4" />
                S&apos;inscrire
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-12 sm:mt-16 w-full max-w-6xl px-4">
          {features.map((feature) => (
            <div key={feature.title}>
              <Card className="bg-background/60 backdrop-blur-md h-full hover:bg-background/80 transition-colors border">
                <CardContent className="text-center p-4 sm:p-6">
                  <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">{feature.icon}</div>
                  <h3 className="font-semibold text-base sm:text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-xs sm:text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 sm:py-6 text-muted-foreground text-xs sm:text-sm px-4">
        <p>© 2024 ResusSkills - Quiz Médical Interactif</p>
      </footer>
    </div>
  );
}
