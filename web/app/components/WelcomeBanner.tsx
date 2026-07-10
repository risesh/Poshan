"use client";

import { useAuth } from "@/lib/auth-context";
import { firstNameOf } from "@/lib/user-display-name";

// Authored, not sourced — the design mockup was never built with a signed-in
// homepage state. Kept deliberately small/unobtrusive rather than touching
// the pixel-verified hero. Renders nothing until auth resolves client-side
// (matches SSR output, no hydration flash of the wrong state).
export default function WelcomeBanner() {
  const { user } = useAuth();
  if (!user) return null;

  const firstName = firstNameOf(user);

  return (
    <div className="welcome-banner">{firstName ? `Welcome back, ${firstName}` : "Welcome back"}</div>
  );
}
