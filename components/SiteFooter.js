import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer>
      <Link className="logo footer-logo" href="/">
        <span className="logo-mark">
          M<span>+</span>
        </span>
        <span className="logo-copy">
          <strong>MedPhysio</strong>
          <small>Tutorials</small>
        </span>
      </Link>
      <p>Helping university and medical-school students understand Physiology&mdash;one mechanism at a time.</p>
      <div className="footer-links">
        <Link href="/#courses">Courses</Link>
        <Link href="/#method">How it works</Link>
        <Link href="/#about">About</Link>
        <Link href="/#contact">Contact</Link>
      </div>
      <small>&copy; {new Date().getFullYear()} MedPhysio Tutorials. Built for curious minds.</small>
    </footer>
  );
}
