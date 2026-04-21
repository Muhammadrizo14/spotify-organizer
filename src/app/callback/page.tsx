"use client";

/**
 * /callback — OAuth callback page.
 *
 * FLOW:
 * 1. User clicks "Login with Spotify" → redirected to Spotify's consent screen
 * 2. After approval, Spotify redirects back here with ?code=... in the URL
 * 3. This page sends the code to the app's server route
 * 4. The server exchanges it with Spotify and returns access + refresh tokens
 * 5. Tokens are saved to localStorage via saveTokens()
 * 6. User is redirected to the home page
 */

import axios, { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { TokenIssueErrorResponse, TokenIssueResponse } from "./_lib/types";
import { saveTokens } from "@/lib/spotify-auth";
import { getSpotifyAuthUrl } from "@/lib/spotify-login";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error";

type ApiTokenError = TokenIssueErrorResponse & { error?: string };

const CallbackContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get("code");
  const spotifyError = searchParams.get("error");
  const initialErrorMessage = spotifyError
    ? spotifyError === "access_denied"
      ? "Access denied by user."
      : spotifyError
    : code === null
      ? "No authorization code received."
      : null;

  const [status, setStatus] = useState<Status>(initialErrorMessage ? "error" : "loading");
  const [errorMessage, setErrorMessage] = useState<string>(initialErrorMessage ?? "");
  const exchangeStarted = useRef(false);

  useEffect(() => {
    const shouldRequestToken = typeof code === "string" && spotifyError === null;

    if (!shouldRequestToken || exchangeStarted.current) {
      return;
    }
    exchangeStarted.current = true;

    const getToken = async () => {
      await axios.post<TokenIssueResponse>("/api/spotify/token", { code })
        .then((res) => {
          if (res.data.refresh_token === undefined) {
            throw new Error("Spotify did not return a refresh token.");
          }

          saveTokens(res.data.access_token, res.data.refresh_token, res.data.expires_in);
          setStatus("success");
          setTimeout(() => router.replace("/"), 1500);
        })
        .catch((err: unknown) => {
          const msg = axios.isAxiosError(err)
            ? (err as AxiosError<ApiTokenError>).response?.data.error_description
              ?? (err as AxiosError<ApiTokenError>).response?.data.error
              ?? err.message
              ?? "Authentication failed."
            : err instanceof Error
              ? err.message
              : "An unexpected error occurred.";

          setErrorMessage(msg);
          setStatus("error");
        });
    };

    getToken();
  }, [code, spotifyError, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="mx-auto w-full max-w-sm">
          <CardHeader>
            <CardTitle>Authenticating...</CardTitle>
            <CardDescription>Please wait while we log you in.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="mx-auto w-full max-w-sm">
          <CardHeader>
            <CardTitle>Authentication Failed</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => { window.location.href = getSpotifyAuthUrl(); }}
            >
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>You are all set!</CardTitle>
          <CardDescription>Redirecting you home...</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => router.replace("/")}
          >
            Go Home
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const Page = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Card className="mx-auto w-full max-w-sm">
            <CardHeader>
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
};

export default Page;
