"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase";
import { isOwnerEmail } from "@/lib/product-catalog";

const fieldLabelClass =
  "grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61]";

const fieldControlClass =
  "min-h-12 w-full min-w-0 rounded-md border border-white/14 bg-black/28 px-4 text-base font-normal normal-case tracking-[0] text-white outline-none transition focus:border-[#d6a25f]";

export function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    getFirebaseAuth()
      .then(async (auth) => {
        if (!auth) {
          return;
        }

        const { onAuthStateChanged } = await import("firebase/auth");

        unsubscribe = onAuthStateChanged(auth, (user) => {
          if (isOwnerEmail(user?.email)) {
            router.replace("/");
          }
        });
      })
      .catch((error) => {
        console.warn("Owner login could not initialize.", error);
      });

    return () => unsubscribe?.();
  }, [router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      setStatus("error");
      setMessage("Enter the owner email and password.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const auth = await getFirebaseAuth();

      if (!auth) {
        throw new Error("Firebase Auth unavailable.");
      }

      const { signInWithEmailAndPassword, signOut } = await import(
        "firebase/auth"
      );
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim().toLowerCase(),
        password,
      );

      if (!isOwnerEmail(credential.user.email)) {
        await signOut(auth);
        throw new Error("That account is not authorized to edit this site.");
      }

      router.push("/");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The owner login did not work. Check the email and password.",
      );
    }
  };

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#050403] px-6 pb-24 pt-36 text-[#f7f1e8] sm:px-10 sm:pt-40 lg:px-12 lg:pb-32 lg:pt-44">
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_20%,rgba(214,162,95,0.15),transparent_30%),radial-gradient(circle_at_20%_80%,rgba(43,140,134,0.12),transparent_30%),linear-gradient(180deg,#050403_0%,#090604_48%,#050403_100%)]"
      />

      <section className="mx-auto grid max-w-[72rem] gap-10 lg:grid-cols-[0.82fr_1fr] lg:items-center">
        <div>
          <p className="inline-flex items-center gap-4 text-[0.82rem] font-bold uppercase tracking-[0.24em] text-[#e7ad61] sm:text-[0.95rem]">
            <LockKeyhole size={30} strokeWidth={1.45} aria-hidden="true" />
            <span>Owner Login</span>
          </p>
          <h1 className="font-display mt-7 text-6xl font-semibold leading-[0.92] text-[#f8f2e9] sm:text-7xl">
            Edit the live site.
          </h1>
          <div className="my-8 h-[3px] w-16 bg-[#d6a25f]" />
          <p className="max-w-xl text-lg leading-8 text-[#d8cabc]">
            Sign in with the Upgrade Aprons owner account. The website will
            open with owner editing enabled for copy, images, and products.
          </p>
        </div>

        <form
          className="rounded-lg border border-white/14 bg-[#0e0906]/78 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-8"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-5">
            <label className={fieldLabelClass}>
              Email
              <input
                autoComplete="email"
                className={fieldControlClass}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (status !== "idle") {
                    setStatus("idle");
                    setMessage("");
                  }
                }}
                required
                type="email"
                value={email}
              />
            </label>

            <label className={fieldLabelClass}>
              Password
              <input
                autoComplete="current-password"
                className={fieldControlClass}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (status !== "idle") {
                    setStatus("idle");
                    setMessage("");
                  }
                }}
                required
                type="password"
                value={password}
              />
            </label>

            <button
              className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-7 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] shadow-[0_0_30px_rgba(214,162,95,0.26)] transition duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
              disabled={status === "submitting"}
              type="submit"
            >
              <Mail size={18} aria-hidden="true" />
              {status === "submitting" ? "Signing In" : "Sign In"}
            </button>

            {message ? (
              <p aria-live="polite" className="text-sm font-semibold text-[#f0a6a6]">
                {message}
              </p>
            ) : null}
          </div>

          <Link
            className="mt-6 inline-flex text-sm font-semibold uppercase tracking-[0.16em] text-[#e7ad61] transition hover:text-white"
            href="/"
          >
            Back to site
          </Link>
        </form>
      </section>
    </main>
  );
}
