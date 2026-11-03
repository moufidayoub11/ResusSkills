import { auth } from "@/lib/auth";
import { MainFrame } from "@/components/layout/main-frame";
import { redirect } from "next/navigation";
import React from "react";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <MainFrame session={session}>{children}</MainFrame>
  );
}
