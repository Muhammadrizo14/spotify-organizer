"use client";

import { usePathname } from "next/navigation";
import Header from "./header";

const HIDDEN_ROUTES = ["/callback"];

export default function ConditionalHeader() {
  const pathname = usePathname();
  if (HIDDEN_ROUTES.includes(pathname)) return null;
  return <Header />;
}
