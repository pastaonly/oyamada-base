'use client';

import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
