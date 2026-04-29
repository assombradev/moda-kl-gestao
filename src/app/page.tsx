import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Página raiz: verifica se há sessão e redireciona.
 * Se cookie "moda-kl-session" existe → /dashboard
 * Senão → /login
 */
export default async function RootPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get("moda-kl-session");

  if (session?.value) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
