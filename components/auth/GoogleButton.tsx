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
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            config: Record<string, unknown>
          ) => void;
          prompt: () => void;
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
  const hiddenButtonRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const [googleLoginMutation] = useGoogleLoginMutation();

  const handleGoogleCredential = useCallback(
    async (response: { credential: string }) => {
      console.log("[GoogleButton] Credential received, length:", response.credential?.length);
      try {
        const session = await googleLoginMutation({
          credential: response.credential,
        }).unwrap();

        console.log("[GoogleButton] Login success:", session.user?.email);
        dispatch(setSession({ session, rememberMe: false }));
        toast.success("Google login successful");
        router.push("/dashboard");
      } catch (apiError: unknown) {
        console.error("[GoogleButton] API error:", apiError);
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
    if (!clientId) {
      console.error("[GoogleButton] NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set");
      return;
    }
    console.log("[GoogleButton] Loading GIS script, clientId:", clientId.substring(0, 20) + "...");

    // If script already loaded, initialize directly
    if (window.google) {
      console.log("[GoogleButton] GIS already loaded");
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("[GoogleButton] GIS script loaded");
      setScriptLoaded(true);
    };
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

  // Initialize Google button when script is loaded
  useEffect(() => {
    if (!scriptLoaded || !window.google || !hiddenButtonRef.current) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    console.log("[GoogleButton] Initializing Google Identity Services");

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
    });

    window.google.accounts.id.renderButton(hiddenButtonRef.current, {
      theme: "outline",
      size: "large",
      text: "signin_with",
      width: 250,
    });
  }, [scriptLoaded, handleGoogleCredential]);

  const handleClick = () => {
    console.log("[GoogleButton] Custom button clicked, looking for hidden Google button");
    // Find the hidden Google button iframe and trigger it
    if (hiddenButtonRef.current) {
      const googleBtn = hiddenButtonRef.current.querySelector(
        'div[role="button"]'
      ) as HTMLElement | null;
      if (googleBtn) {
        console.log("[GoogleButton] Triggering hidden Google button");
        googleBtn.click();
      } else {
        console.warn("[GoogleButton] Hidden Google button not found, trying prompt");
        window.google?.accounts.id.prompt();
      }
    }
  };

  return (
    <div className="w-full relative">
      {/* Hidden container for the real Google button */}
      <div
        ref={hiddenButtonRef}
        className="absolute opacity-0 pointer-events-none"
        style={{ width: "1px", height: "1px", overflow: "hidden" }}
        aria-hidden="true"
      />

      {/* Custom styled button */}
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
