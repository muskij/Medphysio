import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import SiteFooter from "../../components/SiteFooter";
import { getSessionUser } from "../../lib/auth";
import RegisterForm from "./RegisterForm";

export default async function RegisterPage() {
  const user = await getSessionUser();
  return (
    <main>
      <SiteHeader user={user} />
      <section className="join" style={{ maxWidth: 520 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <span className="kicker">Join for free</span>
          <h2>Create your student account</h2>
          <p>Track your progress, take quizzes and ask the lesson AI assistant questions.</p>
          <RegisterForm />
          <p style={{ fontSize: 12, marginTop: 18 }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--teal)", fontWeight: 700 }}>
              Log in
            </Link>
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
