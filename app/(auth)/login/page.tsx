import { LoginForm } from "@/components/auth/login-form";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à ResusSkills — Train · Learn · Save Lives",
};

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="flex items-center justify-center text-3xl font-bold">
          <img src="/logo.svg" alt="ResusSkills" className="inline-block h-10 w-10 mr-2" />
          ResusSkills
        </h1>
        <p className="text-muted-foreground">Testez vos connaissances sur les chocs</p>
      </div>
      <LoginForm />
    </div>
  );
}
