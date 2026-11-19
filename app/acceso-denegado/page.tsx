import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccesoDenegado() {
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Acceso denegado</CardTitle>
          <CardDescription>
            Esta aplicación es de uso personal y tu cuenta no tiene permiso para entrar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm underline underline-offset-4">
            Volver al inicio de sesión
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
