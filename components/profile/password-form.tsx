"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { changePassword } from "@/actions/user.actions";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z.string().min(6, "Au moins 6 caractères"),
  confirmPassword: z.string().min(6, "Au moins 6 caractères"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export function PasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: PasswordFormData) {
    setIsLoading(true);
    try {
      const result = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      if ("success" in result && result.success) {
        toast.success("Mot de passe mis à jour avec succès");
        form.reset();
      } else {
        const errorMessage = "error" in result ? result.error : "Erreur lors de la mise à jour";
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  const PasswordInput = ({
    id,
    field,
    showKey,
  }: {
    id: string;
    field: any;
    showKey: "current" | "new" | "confirm";
  }) => (
    <div className="relative">
      <Input
        id={id}
        type={showPasswords[showKey] ? "text" : "password"}
        disabled={isLoading}
        {...field}
      />
      <button
        type="button"
        onClick={() =>
          setShowPasswords((prev) => ({
            ...prev,
            [showKey]: !prev[showKey],
          }))
        }
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        disabled={isLoading}
      >
        {showPasswords[showKey] ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <FormControl>
                <PasswordInput id="currentPassword" field={field} showKey="current" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <FormControl>
                <PasswordInput id="newPassword" field={field} showKey="new" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <FormControl>
                <PasswordInput id="confirmPassword" field={field} showKey="confirm" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Mettre à jour le mot de passe
        </Button>
      </form>
    </Form>
  );
}
