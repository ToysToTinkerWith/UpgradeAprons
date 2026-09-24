import type { Metadata } from "next";
import { LoginPage } from "@/components/pages/LoginPage";

export const metadata: Metadata = {
  title: "Owner Login | Upgrade Aprons",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Login() {
  return <LoginPage />;
}
