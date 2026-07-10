import Image from "next/image";
import AuthPanel from "@/app/components/AuthPanel";

export const metadata = {
  title: "Sign in — Poषण",
  description: "Sign in or create a Poषण account.",
};

export default async function SignInPage(props: PageProps<"/signin">) {
  const params = await props.searchParams;
  const returnTo = typeof params.return === "string" ? params.return : "/";
  const initialView = params.view === "about" ? "about" : undefined;

  return (
    <div className="auth-split">
      <div className="auth-hero">
        <div className="auth-hero__inner">
          <Image src="/logo-icon.png" alt="Poषण" width={115} height={117} className="hero__logo" />
          <h1 className="hero__title">
            Po<span>षण</span>
          </h1>
          <h2 className="hero__subtitle">foods that heal</h2>
          <p className="hero__tag">Made for daily life</p>
        </div>
      </div>

      <AuthPanel returnTo={returnTo} initialView={initialView} />
    </div>
  );
}
