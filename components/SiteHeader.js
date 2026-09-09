import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default function SiteHeader({ user }) {
  return (
    <header className="site-header">
      <Link className="logo" href="/" aria-label="MedPhysio Tutorials home">
        <span className="logo-mark">
          M<span>+</span>
        </span>
        <span className="logo-copy">
          <strong>MedPhysio</strong>
          <small>Tutorials</small>
        </span>
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
