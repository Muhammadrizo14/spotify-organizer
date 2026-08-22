/**
 * i18n.ts — Copy for the preview page, in every language it is offered in.
 *
 * The preview page is the only thing a hosted build renders, so it carries its
 * own tiny translation layer instead of pulling in an i18n framework the rest
 * of the app has no use for. Add a language by extending `PreviewLocale` and
 * adding an entry to `PREVIEW_COPY` — TypeScript then reports every string the
 * new language is still missing.
 */

import type { PreviewScreenshotId } from "./screenshots";

export type PreviewLocale = "en" | "ru";

/** Order the language switcher renders in. */
export const PREVIEW_LOCALES: readonly PreviewLocale[] = ["en", "ru"];

export const DEFAULT_PREVIEW_LOCALE: PreviewLocale = "en";

/** Label each language is offered under — always written in that language. */
export const PREVIEW_LOCALE_NAMES: Record<PreviewLocale, string> = {
  en: "English",
  ru: "Русский",
};

interface ScreenshotCopy {
  title: string;
  description: string;
}

export interface PreviewCopy {
  /** Switcher label, for screen readers. */
  languageLabel: string;
  badge: string;
  title: string;
  lead: string;
  note: string;
  viewSource: string;
  readPolicy: string;
  policyTitle: string;
  /** Split around the inline link to Spotify's Developer Policy. */
  policyIntro: { before: string; link: string; after: string };
  quotes: { text: string; source: string }[];
  quotaNote: string;
  screenshotsTitle: string;
  screenshotsNote: string;
  screenshots: Record<PreviewScreenshotId, ScreenshotCopy>;
  setupTitle: string;
  setupNote: string;
  setupSteps: string[];
}

export const PREVIEW_COPY: Record<PreviewLocale, PreviewCopy> = {
  en: {
    languageLabel: "Language",
    badge: "Preview only",
    title: "Spotify organizer",
    lead:
      "Build Spotify playlists from your own saved library — describe the mood in a sentence and let the AI translate it into filters, or set the genres, decades, tempo and energy by hand.",
    note:
      "This deployment is a walkthrough, not a working app. Everything below is a screenshot of the real project running locally.",
    viewSource: "View the source",
    readPolicy: "Read Spotify's policy",
    policyTitle: "Why you cannot sign in here",
    policyIntro: {
      before:
        "Spotify does not permit an outsourced, third-party hosted service to organize a user's library on their behalf. Their ",
      link: "Developer Policy",
      after:
        " restricts building an app that replicates a core Spotify experience, and restricts moving a user's data out to another service:",
    },
    quotes: [
      {
        text:
          "“Do not … mimic, or replicate or attempt to replace a core user experience of Spotify or its group companies without our prior written permission.”",
        source: "— Developer Policy, III.11",
      },
      {
        text:
          "“Do not build an SDA that enables the transfer of data to another service, except for the purpose of enabling a user to transfer their personal data, or the metadata of the user's playlists to another service.”",
        source: "— Developer Policy, III.9",
      },
    ],
    quotaNote:
      "On top of that, an app that has not been granted extended quota mode may only be used by accounts the developer has explicitly added, so a public deployment could not serve visitors anyway. Rather than offer a login that would fail — or worse, work in a way the policy forbids — the hosted build ships with the app disabled and the Spotify routes turned off.",
    screenshotsTitle: "Screenshots",
    screenshotsNote:
      "Captured from the app running locally, where the Spotify integration is fully enabled.",
    screenshots: {
      "create-ai": {
        title: "Describe a playlist in plain language",
        description:
          "The AI tab turns a prompt like “chill lo-fi beats for late night coding” into concrete genres, era and energy settings, then builds the playlist from Spotify search or from your saved songs.",
      },
      "create-filters": {
        title: "Or set the filters yourself",
        description:
          "Custom Filters exposes the same engine directly: up to five genres, mood, decades, tempo, energy and track count — no prompt in the middle.",
      },
    },
    setupTitle: "Run it yourself",
    setupNote:
      "The app is fully functional locally, where you are the only user of your own Spotify developer app.",
    setupSteps: [
      "git clone the repository and run npm install",
      "Copy .env.example to .env.local and fill in your own Spotify and AI keys",
      "Set NEXT_PUBLIC_APP_MODE=development so the app renders instead of this page",
      "Run npm run dev and open http://127.0.0.1:3000",
    ],
  },

  ru: {
    languageLabel: "Язык",
    badge: "Только предпросмотр",
    title: "Spotify organizer",
    lead:
      "Собирайте плейлисты Spotify из своей сохранённой библиотеки: опишите настроение одним предложением, и ИИ превратит его в фильтры, — или задайте жанры, десятилетия, темп и энергичность вручную.",
    note:
      "Этот сайт — обзор проекта, а не работающее приложение. Всё, что ниже, — скриншоты настоящего приложения, запущенного локально.",
    viewSource: "Открыть исходный код",
    readPolicy: "Читать политику Spotify",
    policyTitle: "Почему здесь нельзя войти",
    policyIntro: {
      before:
        "Spotify не разрешает стороннему размещённому сервису организовывать библиотеку пользователя от его имени. Их ",
      link: "Политика для разработчиков",
      after:
        " запрещает создавать приложение, повторяющее ключевой пользовательский опыт Spotify, и запрещает переносить данные пользователя в другой сервис:",
    },
    quotes: [
      {
        text:
          "«Не имитируйте, не копируйте и не пытайтесь заменить ключевой пользовательский опыт Spotify или компаний его группы без нашего предварительного письменного разрешения».",
        source: "— Политика для разработчиков, III.11",
      },
      {
        text:
          "«Не создавайте SDA, которое позволяет передавать данные в другой сервис, — кроме случаев, когда это нужно, чтобы пользователь мог перенести свои персональные данные или метаданные своих плейлистов в другой сервис».",
        source: "— Политика для разработчиков, III.9",
      },
    ],
    quotaNote:
      "К тому же приложением без режима расширенной квоты (extended quota mode) могут пользоваться только те аккаунты, которые разработчик добавил вручную, так что публичный деплой всё равно не смог бы обслуживать посетителей. Вместо входа, который заведомо не сработал бы — или, что хуже, сработал бы вопреки политике, — размещённая сборка идёт с отключённым приложением и выключенными маршрутами Spotify.",
    screenshotsTitle: "Скриншоты",
    screenshotsNote:
      "Сняты с приложения, запущенного локально, где интеграция со Spotify включена полностью.",
    screenshots: {
      "create-ai": {
        title: "Опишите плейлист обычными словами",
        description:
          "Вкладка AI превращает запрос вроде «спокойный lo-fi для ночного кодинга» в конкретные жанры, эпоху и уровень энергичности, а затем собирает плейлист из поиска Spotify или из ваших сохранённых треков.",
      },
      "create-filters": {
        title: "Или задайте фильтры сами",
        description:
          "Вкладка «Custom Filters» открывает тот же движок напрямую: до пяти жанров, настроение, десятилетия, темп, энергичность и количество треков — без промпта посередине.",
      },
    },
    setupTitle: "Запустите сами",
    setupNote:
      "Локально приложение работает полностью: там вы единственный пользователь своего собственного приложения Spotify для разработчиков.",
    setupSteps: [
      "Клонируйте репозиторий (git clone) и выполните npm install",
      "Скопируйте .env.example в .env.local и впишите свои ключи Spotify и ИИ",
      "Задайте NEXT_PUBLIC_APP_MODE=development, чтобы вместо этой страницы отображалось приложение",
      "Выполните npm run dev и откройте http://127.0.0.1:3000",
    ],
  },
};

/** Narrows an unknown string (localStorage, navigator.language) to a locale. */
export const resolvePreviewLocale = (
  value: string | null | undefined
): PreviewLocale | null => {
  if (!value) return null;
  const tag = value.toLowerCase().split("-")[0];
  return PREVIEW_LOCALES.find((locale) => locale === tag) ?? null;
};
