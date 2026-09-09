"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton({ className }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <button className={className} type="button" onClick={handleLogout}>
      Log out
    </button>
  );
}
