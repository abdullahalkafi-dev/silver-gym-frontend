"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useGoogleLoginMutation } from "@/redux/features/auth/authApi";
import { useAppDispatch } from "@/redux/hooks";
import { setSession } from "@/redux/features/auth/authSlice";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: string;
            callback: (response: { code: string }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

interface GoogleButtonProps {
  text: string;
}

export default function GoogleButton({ text }: GoogleButtonProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const clientRef = useRef<{ requestCode: () => void } | null>(null);

  const [googleLoginMutation] = useGoogleLoginMutation();

  const handleGoogleCode = useCallback(
    async (response: { code: string }) => {
      try {
        const session = await googleLoginMutation({
          code: response.code,
        }).unwrap();

        dispatch(setSession({ session, rememberMe: false }));
        toast.success("Google login successful");
        router.push("/dashboard");
      } catch (apiError: unknown) {
        const message =
          apiError && typeof apiError === "object" && "data" in apiError
            ? (apiError.data as { message?: string })?.message
            : undefined;
        toast.error(message || "Google login failed. Please try again.");
      }
    },
    [googleLoginMutation, dispatch, router]
  );

  // Load Google Identity Services script
  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    if (window.google) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      console.error("[GoogleButton] Failed to load GIS script");
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Initialize OAuth2 Code Client when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !window.google) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    clientRef.current = window.google.accounts.oauth2.initCodeClient({
      client_id: clientId,
      scope: "email profile openid",
      ux_mode: "popup",
      callback: handleGoogleCode,
    });
  }, [scriptLoaded, handleGoogleCode]);

  const handleClick = () => {
    if (clientRef.current) {
      clientRef.current.requestCode();
    }
  };

  return (
    <div className="w-full relative">
      {scriptLoaded ? (
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
          className="w-full h-14 rounded-lg border-2 text-base font-medium hover:bg-accent transition-colors flex items-center justify-center gap-3"
        >
          <Image
            src="https://www.google.com/favicon.ico"
            alt="Google"
            width={20}
            height={20}
          />
          {text}
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled
          className="w-full h-14 rounded-lg border-2 text-base font-medium transition-colors flex items-center justify-center gap-3 opacity-50"
        >
          <Image
            src="https://www.google.com/favicon.ico"
            alt="Google"
            width={20}
            height={20}
          />
          {text}
        </Button>
      )}
    </div>
  );
}
