"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      className="w-full"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await createClient().auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
      }}
    >
      {loading ? "Redirigiendo…" : "Entrar con Google"}
    </Button>
  );
}
