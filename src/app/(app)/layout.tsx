import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";

/**
 * Layout autenticado do app (Server Component).
 * Verifica sessão no servidor via cookie — evita fetch no cliente a cada navegação.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("moda-kl-session");

  // Sem sessão, redireciona para login no servidor (sem flash de loading)
  if (!session?.value) {
    redirect("/login");
  }

  // Decodifica o nome do usuário do cookie de sessão (JSON base64)
  let userName: string | undefined;
  try {
    const payload = JSON.parse(
      Buffer.from(session.value, "base64").toString("utf-8")
    );
    userName = payload.name;
  } catch {
    // Se o cookie não for JSON base64, busca via API como fallback
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: `moda-kl-session=${session.value}` },
        cache: "force-cache",
      });
      if (res.ok) {
        const data = await res.json();
        userName = data.name;
      }
    } catch {
      // Continua sem nome — não bloqueia a renderização
    }
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <Header userName={userName} />
      <main className="flex-1 px-4 py-4 pb-24 overflow-y-auto">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
