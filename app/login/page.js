import Link from "next/link";
import { Suspense } from "react";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSessionUser } from "../../lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getSessionUser();
  return (
    <main>
      <SiteHeader user={user} />
      <section className="join" style={{ maxWidth: 520 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <span className="kicker">Welcome back</span>
          <h2>Log in to MedPhysio</h2>
          <p>Access your courses, progress and the lesson AI assistant.</p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
          <p style={{ fontSize: 12, marginTop: 18 }}>
            New here? <Link href="/register" style={{ color: "var(--teal)", fontWeight: 700 }}>Create an account</Link>
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
