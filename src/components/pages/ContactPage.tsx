"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Mail, MessageSquare, Phone, Ruler, Send } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useState, type FormEvent } from "react";
import { getFirebaseFirestore } from "@/lib/firebase";

type DirectMessageForm = {
  name: string;
  email: string;
  phone: string;
  preferredContact: string;
  message: string;
};

const initialForm: DirectMessageForm = {
  name: "",
  email: "",
  phone: "",
  preferredContact: "Email",
  message: "",
};

const easeOut = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.78, ease: easeOut },
  },
};

const fieldLabelClass =
  "grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#e7ad61]";

const fieldControlClass =
  "min-h-12 w-full min-w-0 rounded-md border border-white/14 bg-black/28 px-4 text-base font-normal normal-case tracking-[0] text-white outline-none transition focus:border-[#d6a25f]";

const selectControlClass = `${fieldControlClass} appearance-none pr-14`;

const textareaClass =
  "min-h-36 w-full min-w-0 rounded-md border border-white/14 bg-black/28 px-4 py-3 text-base font-normal normal-case tracking-[0] text-white outline-none transition focus:border-[#d6a25f]";

export function ContactPage() {
  const reduceMotion = useReducedMotion();
  const [form, setForm] = useState<DirectMessageForm>(initialForm);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  const updateField = (field: keyof DirectMessageForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));

    if (status !== "idle") {
      setStatus("idle");
      setMessage("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus("error");
      setMessage("Please include your name, email, and message.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const db = await getFirebaseFirestore();

      if (!db) {
        throw new Error("Firestore unavailable");
      }

      const { addDoc, collection, serverTimestamp } = await import(
        "firebase/firestore"
      );

      await addDoc(collection(db, "directMessages"), {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        preferredContact: form.preferredContact,
        message: form.message.trim(),
        source: "contact-page",
        emailStatus: "pending",
        createdAt: serverTimestamp(),
      });

      setForm(initialForm);
      setStatus("success");
      setMessage("Your message was sent.");
    } catch {
      setStatus("error");
      setMessage(
        "The message could not send right now. You can still email upgrade@whidbey.com.",
      );
    }
  };

  return (
    <main className="bg-[#050403] text-[#f7f1e8]">
      <section className="relative isolate overflow-hidden px-6 pb-24 pt-36 sm:px-10 sm:pt-40 lg:px-12 lg:pb-32 lg:pt-44">
        <Image
          alt=""
          aria-hidden="true"
          className="pointer-events-none -z-10 object-cover object-center opacity-72"
          fill
          priority
          sizes="100vw"
          src="/images/story-leather-bg.png"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,4,3,0.94)_0%,rgba(5,4,3,0.82)_48%,rgba(5,4,3,0.96)_100%)]"
        />

        <motion.div
          animate={reduceMotion ? undefined : "visible"}
          className="mx-auto grid max-w-[112rem] gap-12 lg:grid-cols-[0.74fr_1fr] lg:items-start lg:gap-16"
          initial={reduceMotion ? false : "hidden"}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <p className="inline-flex items-center gap-4 text-[0.82rem] font-bold uppercase tracking-[0.24em] text-[#e7ad61] sm:text-[0.95rem]">
              <MessageSquare size={30} strokeWidth={1.45} aria-hidden="true" />
              <span>Message Directly</span>
            </p>
            <h1 className="font-display mt-7 text-6xl font-semibold leading-[0.92] text-[#f8f2e9] sm:text-7xl lg:text-8xl">
              Start the apron conversation.
            </h1>
            <div className="my-8 h-[3px] w-16 bg-[#d6a25f]" />
            <p className="max-w-[42rem] text-lg leading-8 text-[#d8cabc] sm:text-xl">
              Send a quick note, question, custom idea, or anything else that
              can get the conversation started. Crispin will reply with the
              next practical step.
            </p>
            <div className="mt-10 grid gap-5 text-base leading-7 text-[#d8cabc]">
              <div className="flex gap-4">
                <Ruler
                  className="mt-1 flex-none text-[#e7ad61]"
                  size={20}
                  strokeWidth={1.55}
                  aria-hidden="true"
                />
                <p>
                  Custom builds depend on the leathers currently in stock, so
                  exact colors and textures are confirmed before payment.
                </p>
              </div>
              <div className="flex gap-4">
                <Mail
                  className="mt-1 flex-none text-[#e7ad61]"
                  size={20}
                  strokeWidth={1.55}
                  aria-hidden="true"
                />
                <p>
                  Messages from this form are sent to
                  {" "}
                  <span className="text-white">upgrade@whidbey.com</span>.
                </p>
              </div>
              <div className="flex gap-4">
                <Phone
                  className="mt-1 flex-none text-[#e7ad61]"
                  size={20}
                  strokeWidth={1.55}
                  aria-hidden="true"
                />
                <p>
                  Call{" "}
                  <a
                    className="text-white underline decoration-[#e7ad61]/50 underline-offset-4 transition hover:text-[#e7ad61]"
                    href="tel:+13602214404"
                  >
                    360-221-4404
                  </a>
                  . This is a landline phone number and cannot receive texts.
                </p>
              </div>
            </div>
            <Link
              className="mt-10 inline-flex min-h-14 items-center justify-center gap-3 rounded-md border border-[#d6a25f]/70 px-6 text-sm font-semibold uppercase tracking-[0.16em] text-[#e7ad61] transition duration-200 hover:-translate-y-0.5 hover:bg-[#d6a25f]/10 hover:text-white"
              href="/custom#designer"
            >
              <Ruler size={18} aria-hidden="true" />
              Open Designer
            </Link>
          </motion.div>

          <motion.form
            className="rounded-lg border border-white/12 bg-[#0c0805]/86 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] backdrop-blur-md sm:p-7"
            onSubmit={handleSubmit}
            variants={fadeUp}
          >
            <div className="grid min-w-0 gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                  Name
                  <input
                    className={fieldControlClass}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="Your name"
                    required
                    type="text"
                    value={form.name}
                  />
                </label>
                <label className={fieldLabelClass}>
                  Email
                  <input
                    className={fieldControlClass}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="you@example.com"
                    required
                    type="email"
                    value={form.email}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={fieldLabelClass}>
                  Phone
                  <input
                    className={fieldControlClass}
                    onChange={(event) => updateField("phone", event.target.value)}
                    placeholder="Optional"
                    type="tel"
                    value={form.phone}
                  />
                </label>
                <label className={fieldLabelClass}>
                  Preferred Reply
                  <span className="relative block">
                    <select
                      className={selectControlClass}
                      onChange={(event) =>
                        updateField("preferredContact", event.target.value)
                      }
                      value={form.preferredContact}
                    >
                      <option>Email</option>
                      <option>Phone</option>
                      <option>Text</option>
                    </select>
                    <ChevronDown
                      aria-hidden="true"
                      className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-[#e7ad61]"
                      size={18}
                    />
                  </span>
                </label>
              </div>

              <label className={fieldLabelClass}>
                Message
                <textarea
                  className={textareaClass}
                  onChange={(event) => updateField("message", event.target.value)}
                  placeholder="Share a question, custom idea, order note, or anything Crispin should know."
                  required
                  value={form.message}
                />
              </label>

              <button
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-md bg-[linear-gradient(135deg,#efbd75,#c7802e)] px-7 text-sm font-semibold uppercase tracking-[0.18em] !text-[#050403] shadow-[0_0_30px_rgba(214,162,95,0.26)] transition duration-200 hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
                disabled={status === "submitting"}
                type="submit"
              >
                <Send size={19} aria-hidden="true" />
                {status === "submitting" ? "Sending" : "Send Message"}
              </button>

              {message ? (
                <p
                  aria-live="polite"
                  className={`text-sm font-semibold ${
                    status === "success" ? "text-[#e7ad61]" : "text-[#f0a6a6]"
                  }`}
                >
                  {message}
                </p>
              ) : null}
            </div>
          </motion.form>
        </motion.div>
      </section>
    </main>
  );
}
