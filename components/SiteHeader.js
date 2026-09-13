import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function SiteHeader({ user, subscribed }) {
  return (
    <header className="site-header">
      <Link className="logo" href="/" aria-label="MedPhysio Tutorials home">
        <img src="/assets/img/logo.png" alt="MedPhysio Tutorials" className="logo-img" />
      </Link>
      <nav aria-label="Main navigation">
        <Link href="/#courses">Courses</Link>
        <Link href="/#method">How it works</Link>
        <Link href="/#about">About</Link>
        {user ? (
          <>
            <Link className="nav-login" href={user.role === "STUDENT" ? "/dashboard" : "/admin"}>
              {user.name.split(" ")[0]}&rsquo;s {user.role === "STUDENT" ? "dashboard" : "admin"}
            </Link>
            {user.role === "STUDENT" && !subscribed && (
              <Link className="upgrade-btn" href="/subscribe">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M5 18h14l1.5-9-5 3-3.5-6-3.5 6-5-3L5 18z" />
                </svg>
                Upgrade
              </Link>
            )}
            <LogoutButton className="button small" />
          </>
        ) : (
          <>
            <Link className="nav-login" href="/login">
              Student login
            </Link>
            <Link className="button small" href="/#courses">
              Start learning
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
