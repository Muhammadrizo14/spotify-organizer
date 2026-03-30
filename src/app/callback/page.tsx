"use client";

/**
 * /callback — OAuth callback page.
 *
 * FLOW:
 * 1. User clicks "Login with Spotify" → redirected to Spotify's consent screen
 * 2. After approval, Spotify redirects back here with ?code=... in the URL
 * 3. This page exchanges the authorization code for access + refresh tokens
 * 4. Tokens are saved to localStorage via saveTokens()
 * 5. User is redirected to the home page
 *
 * ERROR CASES:
 * - User denied access → ?error=access_denied → shows "Access denied" with retry button
 * - No code in URL → shows error
 * - Token exchange fails → shows error with retry button
 *
 * NOTE: The redirect_uri here MUST match the one registered in the Spotify Developer Dashboard
 * and the one used in getSpotifyAuthUrl() (currently http://127.0.0.1:3000/callback).
 */

import axios, { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { TokenIssueErrorResponse, TokenIssueResponse } from "./_lib/types";
import { saveTokens } from "@/lib/spotify-auth";
import { getSpotifyAuthUrl } from "@/lib/spotify-login";
import { toast } from "sonner";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error";

/**
 * Inner component that reads URL search params and handles the token exchange.
 * Wrapped in Suspense because useSearchParams() requires it in Next.js App Router.
 */
const CallbackContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Spotify sends either ?code=... (success) or ?error=... (user denied)
  const code = searchParams.get("code");
  const spotifyError = searchParams.get("error");

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    // Handle case where user denied access on Spotify's consent screen
    if (spotifyError) {
      setErrorMessage(spotifyError === "access_denied" ? "Access denied by user." : spotifyError);
      setStatus("error");
      return;
    }

    // No code means something went wrong with the redirect
    if (!code) {
      setErrorMessage("No authorization code received.");
      setStatus("error");
      return;
    }

    /**
     * Exchange the authorization code for access + refresh tokens.
     * This is the "Authorization Code Flow" from the OAuth 2.0 spec.
     * Docs: https://developer.spotify.com/documentation/web-api/tutorials/code-flow
     */
    const getToken = async () => {
      const url = "https://accounts.spotify.com/api/token";

      // Build Basic auth header: base64(client_id:client_secret)
      const credentials = btoa(
        `${process.env.NEXT_PUBLIC_CLIENT_ID}:${process.env.NEXT_PUBLIC_CLIENT_SECRET}`
      );

      await axios<TokenIssueResponse>(url, {
        method: "POST",
        data: new URLSearchParams({
          code,                                          // the authorization code from the URL
          redirect_uri: "http://127.0.0.1:3000/callback", // must match the one in getSpotifyAuthUrl()
          grant_type: "authorization_code",
        }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
      })
        .then((res) => {
          // Save tokens to localStorage so other pages can use them
          saveTokens(res.data.access_token, res.data.refresh_token, res.data.expires_in);
          setStatus("success");
          // Brief delay so the user sees the success message before redirect
          setTimeout(() => router.replace("/"), 1500);
        })
        .catch((err: unknown) => {
          // Extract error message from Spotify's response
          const msg =
            axios.isAxiosError(err)
              ? (err as AxiosError<TokenIssueErrorResponse>).response?.data.error_description ?? "Authentication failed."
              : "An unexpected error occurred.";
          setErrorMessage(msg);
          setStatus("error");
        });
    };

    getToken();
  }, [code, spotifyError]);

  // ---- Render based on status ----

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
            {/* Retry button restarts the entire OAuth flow */}
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

  // status === "success"
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

/**
 * Page wrapper with Suspense boundary.
 * Required because useSearchParams() in CallbackContent triggers client-side rendering.
 */
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
