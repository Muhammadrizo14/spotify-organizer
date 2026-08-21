"use client";

import { usePathname } from "next/navigation";
import Header from "./header";
import { isPreviewMode } from "@/lib/app-mode";

const HIDDEN_ROUTES = ["/callback"];

export default function ConditionalHeader() {
  const pathname = usePathname();
  // The hidden routes never render in preview mode — every URL shows the
  // preview page — so the header stays put there.
  if (!isPreviewMode && HIDDEN_ROUTES.includes(pathname)) return null;
  return <Header />;
}
