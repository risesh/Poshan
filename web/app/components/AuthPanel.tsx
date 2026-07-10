"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { sanitizeReturnTo } from "@/lib/return-path";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Tab = "signin" | "signup" | "about" | "check-email";

export default function AuthPanel({
  returnTo: rawReturnTo,
  initialView,
}: {
  returnTo: string;
  initialView?: "about";
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const returnTo = sanitizeReturnTo(rawReturnTo);

  const [tab, setTab] = useState<Tab>(initialView === "about" ? "about" : "signin");
  const [welcomeName, setWelcomeName] = useState("");

  // Sign in
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");
  const [signinError, setSigninError] = useState<string | null>(null);
  const [signinBusy, setSigninBusy] = useState(false);

  // Sign up
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupTerms, setSignupTerms] = useState(false);
  const [signupTouched, setSignupTouched] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupErrorTitle, setSignupErrorTitle] = useState(
    "Please check the highlighted fields below."
  );
  const [signupBusy, setSignupBusy] = useState(false);

  // About you (post sign-up)
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [gender, setGender] = useState("");

  const finish = () => router.push(returnTo);

  const saveAbout = async (skip: boolean) => {
    if (!skip) {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        const dob =
          dobDay && dobMonth && dobYear
            ? `${dobYear}-${String(MONTHS.indexOf(dobMonth) + 1).padStart(2, "0")}-${dobDay.padStart(2, "0")}`
            : null;
        await supabase
          .from("profiles")
          .update({ date_of_birth: dob, gender: gender || null })
          .eq("id", data.user.id);
      }
    }
    finish();
  };

  const handleGoogle = async () => {
    const next = encodeURIComponent(returnTo);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    });
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = signinEmail.trim();
    if (!EMAIL_RE.test(email) || signinPassword.length === 0) {
      setSigninError("Enter a valid email and password.");
      return;
    }
    setSigninBusy(true);
    setSigninError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: signinPassword,
    });
    setSigninBusy(false);
    if (error) {
      setSigninError(error.message);
      return;
    }
    finish();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupTouched(true);
    const name = signupName.trim();
    const email = signupEmail.trim();
    const emailOk = EMAIL_RE.test(email);
    const passwordOk =
      signupPassword.length >= 8 && /[0-9]/.test(signupPassword) && /[a-zA-Z]/.test(signupPassword);
    const failCount = [emailOk, passwordOk, signupTerms].filter((ok) => !ok).length;

    if (failCount > 0) {
      setSignupErrorTitle("Please check the highlighted fields below.");
      setSignupError(
        `${failCount} field${failCount === 1 ? "" : "s"} need${failCount === 1 ? "s" : ""} attention before we can create your account.`
      );
      return;
    }

    setSignupBusy(true);
    setSignupError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: signupPassword,
      options: { data: { full_name: name } },
    });
    setSignupBusy(false);

    if (error) {
      // Not a field-validation failure — Supabase rejected the account
      // itself (e.g. "User already registered"), so the highlighted-fields
      // framing below would be misleading; none of the fields are invalid.
      setSignupErrorTitle(
        error.message.toLowerCase().includes("already registered")
          ? "This email is already registered."
          : "We couldn't create your account."
      );
      setSignupError(
        error.message.toLowerCase().includes("already registered")
          ? "Try signing in instead, or use a different email."
          : error.message
      );
      return;
    }

    if (!data.session) {
      // Email confirmation is required by the Supabase project's settings —
      // there's no session yet to attach the "about you" step to.
      setTab("check-email");
      return;
    }

    setWelcomeName(name ? `Welcome, ${name.split(" ")[0]}` : "Welcome");
    setTab("about");
  };

  return (
    <div className="auth-panel">
      {(tab === "signin" || tab === "signup") && (
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tabs__tab${tab === "signin" ? " is-active" : ""}`}
            onClick={() => setTab("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tabs__tab${tab === "signup" ? " is-active" : ""}`}
            onClick={() => setTab("signup")}
          >
            Create account
          </button>
        </div>
      )}

      <div id="auth-content">
        {tab === "signin" && (
          <div>
            <h1 className="auth-form__title">Welcome back</h1>
            <p className="auth-form__subtitle">Sign in to view your orders and batch labels.</p>

            {signinError && (
              <div className="auth-error">
                <svg
                  className="auth-error__icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C1502E"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div>
                  <div className="auth-error__title">We couldn&apos;t sign you in.</div>
                  <div className="auth-error__text">{signinError}</div>
                </div>
              </div>
            )}

            <div className="auth-social">
              <button
                type="button"
                className="auth-social__btn auth-social__btn--google"
                onClick={handleGoogle}
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </div>

            <div className="auth-divider">
              <div className="auth-divider__line"></div>
              <span className="auth-divider__text">OR WITH EMAIL</span>
              <div className="auth-divider__line"></div>
            </div>

            <form className="auth-form" onSubmit={handleSignin}>
              <div>
                <label className="auth-field__label" htmlFor="signin-email">
                  Email
                </label>
                <input
                  type="email"
                  id="signin-email"
                  className="auth-field__input"
                  placeholder="you@example.com"
                  value={signinEmail}
                  onChange={(e) => setSigninEmail(e.target.value)}
                />
              </div>
              <div>
                <div className="auth-field__label-row">
                  <label className="auth-field__label" htmlFor="signin-password">
                    Password
                  </label>
                  <a href="#" className="auth-field__forgot">
                    Forgot?
                  </a>
                </div>
                <input
                  type="password"
                  id="signin-password"
                  className="auth-field__input"
                  placeholder="••••••••"
                  value={signinPassword}
                  onChange={(e) => setSigninPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="auth-submit" disabled={signinBusy}>
                {signinBusy ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="auth-switch">
              New to Poषण?{" "}
              <button type="button" onClick={() => setTab("signup")}>
                Create an account
              </button>{" "}
              to save your ingredient notebook.
            </p>
          </div>
        )}

        {tab === "signup" && (
          <div>
            <h1 className="auth-form__title auth-form__title--italic">
              Begin your journey towards a healthy life
            </h1>
            <p className="auth-form__subtitle">&nbsp;</p>

            {signupError && (
              <div className="auth-error">
                <svg
                  className="auth-error__icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#C1502E"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div>
                  <div className="auth-error__title">{signupErrorTitle}</div>
                  <div className="auth-error__text">{signupError}</div>
                </div>
              </div>
            )}

            <div className="auth-social">
              <button
                type="button"
                className="auth-social__btn auth-social__btn--google"
                onClick={handleGoogle}
              >
                <GoogleIcon />
                Sign up with Google
              </button>
            </div>

            <div className="auth-divider">
              <div className="auth-divider__line"></div>
              <span className="auth-divider__text">OR WITH EMAIL</span>
              <div className="auth-divider__line"></div>
            </div>

            <form className="auth-form" onSubmit={handleSignup}>
              <div>
                <label className="auth-field__label" htmlFor="signup-name">
                  Full name
                </label>
                <input
                  type="text"
                  id="signup-name"
                  className="auth-field__input"
                  placeholder="Riya Sharma"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label
                  className={`auth-field__label${signupTouched && !EMAIL_RE.test(signupEmail.trim()) ? " is-error" : ""}`}
                  htmlFor="signup-email"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="signup-email"
                  className={`auth-field__input${signupTouched && !EMAIL_RE.test(signupEmail.trim()) ? " is-error" : ""}`}
                  placeholder="you@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                />
                {signupTouched && !EMAIL_RE.test(signupEmail.trim()) && (
                  <div className="auth-field__hint">This doesn&apos;t look like a complete email address.</div>
                )}
              </div>
              <div>
                {(() => {
                  const passwordOk =
                    signupPassword.length >= 8 &&
                    /[0-9]/.test(signupPassword) &&
                    /[a-zA-Z]/.test(signupPassword);
                  const showWeak = signupTouched && !passwordOk;
                  return (
                    <>
                      <label
                        className={`auth-field__label${showWeak ? " is-error" : ""}`}
                        htmlFor="signup-password"
                      >
                        Password
                      </label>
                      <input
                        type="password"
                        id="signup-password"
                        className={`auth-field__input${showWeak ? " is-error" : ""}`}
                        placeholder="At least 8 characters"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                      />
                      {showWeak && (
                        <div className="auth-strength">
                          <div className="auth-strength__bar is-filled"></div>
                          <div className="auth-strength__bar"></div>
                          <div className="auth-strength__bar"></div>
                          <div className="auth-strength__bar"></div>
                        </div>
                      )}
                      <div className={`auth-field__hint${showWeak ? " is-error" : ""}`}>
                        {showWeak
                          ? "Too short — needs at least 8 characters and one number."
                          : "8+ characters, with one number and one letter."}
                      </div>
                    </>
                  );
                })()}
              </div>

              <label
                className={`auth-terms${signupTouched && !signupTerms ? " is-error" : ""}`}
              >
                <input
                  type="checkbox"
                  className="auth-terms__checkbox"
                  checked={signupTerms}
                  onChange={(e) => setSignupTerms(e.target.checked)}
                />
                <span>
                  {signupTouched && !signupTerms ? (
                    <>Please accept the <a href="#">terms</a> and <a href="#">privacy policy</a> to continue.</>
                  ) : (
                    <>I agree to the <a href="#">terms</a> and <a href="#">privacy policy</a>.</>
                  )}
                </span>
              </label>

              <button type="submit" className="auth-submit" disabled={signupBusy}>
                {signupBusy ? "Creating account…" : "Create account"}
              </button>
            </form>

            <p className="auth-switch">
              Already have an account?{" "}
              <button type="button" onClick={() => setTab("signin")}>
                Sign in
              </button>
              .
            </p>
          </div>
        )}

        {tab === "check-email" && (
          <div>
            <h1 className="auth-form__title">Check your email</h1>
            <p className="auth-form__subtitle">
              We&apos;ve sent a confirmation link to {signupEmail.trim()}. Click it to activate
              your account, then come back and sign in.
            </p>
            <button type="button" className="auth-submit" onClick={() => setTab("signin")}>
              Back to sign in
            </button>
          </div>
        )}

        {tab === "about" && (
          <div>
            <div className="auth-progress">
              <div className="auth-progress__step">
                <div className="auth-progress__dot auth-progress__dot--done">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="auth-progress__label">Account created</span>
              </div>
              <div className="auth-progress__line"></div>
              <div className="auth-progress__step">
                <div className="auth-progress__dot auth-progress__dot--current">2</div>
                <span className="auth-progress__label auth-progress__label--current">A little about you</span>
              </div>
            </div>

            <h1 className="auth-about__title">{welcomeName || "Welcome"}</h1>
            <p className="auth-about__desc">
              Two small questions for us to understand you better. Takes under a minute —
              you&apos;ll only see this once.
            </p>
            <p className="auth-about__meta">Optional · Skip anytime</p>

            <div className="auth-callout">
              <svg
                className="auth-callout__icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#E4A335"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-8H4v8"></path>
                <path d="M2 13h20"></path>
                <path d="M12 13V6"></path>
                <path d="M9 6a3 3 0 0 1 3-3 3 3 0 0 1 3 3c0 1.5-1 3-3 3s-3-1.5-3-3z"></path>
              </svg>
              <div>
                <div className="auth-callout__title">Share your birthday, we&apos;ll make it special.</div>
                <div className="auth-callout__text">A birthday discount/gift every year tailored to your preferences</div>
              </div>
            </div>

            <div className="auth-about__fields">
              <div>
                <label className="auth-field__label">
                  Date of birth<span className="auth-field__optional">optional</span>
                </label>
                <div className="auth-dob">
                  <input
                    type="text"
                    placeholder="DD"
                    maxLength={2}
                    className="auth-dob__input"
                    value={dobDay}
                    onChange={(e) => setDobDay(e.target.value.replace(/\D/g, ""))}
                  />
                  <select
                    className="auth-dob__select"
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value)}
                  >
                    <option value="">Month</option>
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="YYYY"
                    maxLength={4}
                    className="auth-dob__input"
                    value={dobYear}
                    onChange={(e) => setDobYear(e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </div>

              <div>
                <label className="auth-field__label">
                  Gender <span className="auth-field__optional">optional</span>
                </label>
                <div className="auth-gender">
                  {[
                    ["woman", "Woman"],
                    ["man", "Man"],
                    ["non-binary", "Non-binary"],
                    ["prefer-not-to-say", "Prefer not to say"],
                  ].map(([value, label]) => (
                    <label className="auth-gender__option" key={value}>
                      <input
                        type="radio"
                        name="about-gender"
                        value={value}
                        checked={gender === value}
                        onChange={() => setGender(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="auth-about__actions">
                <button type="button" className="auth-about__skip" onClick={() => saveAbout(true)}>
                  Skip for now
                </button>
                <button type="button" className="auth-about__save" onClick={() => saveAbout(false)}>
                  Save &amp; continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
    </svg>
  );
}
