"use client";

import axios, { AxiosError } from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { TokenIssueErrorResponse, TokenIssueResponse } from "./_lib/types";
import { saveTokens } from "@/lib/spotify-auth";
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

const CallbackContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code");
  const spotifyError = searchParams.get("error");

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (spotifyError) {
      setErrorMessage(spotifyError === "access_denied" ? "Access denied by user." : spotifyError);
      setStatus("error");
      return;
    }

    if (!code) {
      setErrorMessage("No authorization code received.");
      setStatus("error");
      return;
    }

    const getToken = async () => {
      const url = "https://accounts.spotify.com/api/token";
      const credentials = btoa(
        `${process.env.NEXT_PUBLIC_CLIENT_ID}:${process.env.NEXT_PUBLIC_CLIENT_SECRET}`
      );

      await axios<TokenIssueResponse>(url, {
        method: "POST",
        data: new URLSearchParams({
          code,
          redirect_uri: "http://127.0.0.1:3000/callback",
          grant_type: "authorization_code",
        }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${credentials}`,
        },
      })
        .then((res) => {
          saveTokens(res.data.access_token, res.data.refresh_token, res.data.expires_in);
          setStatus("success");
          setTimeout(() => router.replace("/"), 1500);
        })
        .catch((err: unknown) => {
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
              onClick={() => router.replace("/login")}
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
