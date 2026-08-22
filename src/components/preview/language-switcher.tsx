"use client";

import { Button } from "@/components/ui/button";
import {
  PREVIEW_LOCALES,
  PREVIEW_LOCALE_NAMES,
  type PreviewLocale,
} from "./i18n";

interface LanguageSwitcherProps {
  value: PreviewLocale;
  label: string;
  onChange: (locale: PreviewLocale) => void;
}

/**
 * Segmented control that picks the language of the preview page.
 *
 * Rendered as a radio group: the options are mutually exclusive and each one
 * is announced with its own name, written in the language it selects.
 */
const LanguageSwitcher = ({ value, label, onChange }: LanguageSwitcherProps) => (
  <div
    role="radiogroup"
    aria-label={label}
    className="inline-flex border border-border"
  >
    {PREVIEW_LOCALES.map((locale) => (
      <Button
        key={locale}
        type="button"
        role="radio"
        aria-checked={value === locale}
        lang={locale}
        size="sm"
        variant={value === locale ? "secondary" : "ghost"}
        className="cursor-pointer"
        onClick={() => onChange(locale)}
      >
        {PREVIEW_LOCALE_NAMES[locale]}
      </Button>
    ))}
  </div>
);

export default LanguageSwitcher;
