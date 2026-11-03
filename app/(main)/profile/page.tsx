import { auth } from "@/lib/auth";
import { getUserProfile } from "@/actions/user.actions";
import { redirect } from "next/navigation";
import { ProfileForm } from "../../../components/profile/profile-form";
import { PasswordForm } from "../../../components/profile/password-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon Profil",
  description: "Gérez votre profil et vos paramètres",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const profileResult = await getUserProfile();

  if (!profileResult) {
    redirect("/quiz");
  }

  const profile = profileResult;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold">Mon Profil</h1>
        <p className="text-lg text-muted-foreground">
          Gérez vos informations personnelles et vos paramètres
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informations Personnelles</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>

      {/* Password */}
      {profile.hasPassword && (
        <Card>
          <CardHeader>
            <CardTitle>Mot de passe</CardTitle>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
      )}

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informations du Compte</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Email</p>
            <p className="text-lg">{profile.email}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Rôle</p>
            <p className="text-lg capitalize">{profile.role === "student" ? "Étudiant" : "Professeur"}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Membre depuis</p>
            <p className="text-lg">
              {new Date(profile.createdAt!).toLocaleDateString("fr-FR", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
