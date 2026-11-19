import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";
import { LoginButton } from "./login-button";

async function LoginError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  if (!error) return null;
  return <p className="text-sm text-muted-foreground">No se pudo iniciar sesión. Intenta de nuevo.</p>;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Panel de Vida</CardTitle>
          <CardDescription>Tu día en una sola página.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <LoginButton />
          <Suspense>
            <LoginError searchParams={searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  );
}
