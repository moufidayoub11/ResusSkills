import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Home, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <Card className="max-w-md w-full shadow-xl">
        <CardContent className="text-center space-y-6 py-10 px-6">
          <div className="text-6xl">🔍</div>
          <div>
            <h1 className="text-4xl font-bold mb-2">404</h1>
            <h2 className="text-xl font-bold mb-2">Page non trouvée</h2>
            <p className="text-muted-foreground">
              La page que vous recherchez n&apos;existe pas ou a été déplacée.
            </p>
          </div>
          <Button asChild className="w-full" size="lg">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Retour à l&apos;accueil
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
