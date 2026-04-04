import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Savings Goals",
};

export default function SavingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
