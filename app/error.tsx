"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-destructive/20 via-background to-destructive/20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="text-center space-y-4 sm:space-y-6 py-8 sm:py-10 px-4 sm:px-6">
            <motion.div 
              className="text-5xl sm:text-6xl"
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              😕
            </motion.div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-2">Une erreur est survenue</h2>
              <p className="text-muted-foreground text-sm sm:text-base">
                Nous sommes désolés, quelque chose s&apos;est mal passé.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center w-full">
              <Button 
                onClick={reset}
                className="w-full sm:w-auto"
                size="lg"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Réessayer
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = "/"}
                className="w-full sm:w-auto"
                size="lg"
              >
                <Home className="mr-2 h-4 w-4" />
                Retour à l&apos;accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
