import { isUAE } from "@propertyx/shared";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AssistantChat } from "@/components/ai/assistant-chat";

export const metadata: Metadata = {
  title: "AI Property Assistant",
  description: isUAE
    ? "Describe the home you want in plain words — budget in AED, size in sq ft, community — and get live matching properties with clear explanations."
    : "Describe the home you want in plain words — budget in crore or lakh, size in marla — and get live matching properties with clear explanations.",
  alternates: { canonical: "/ai" },
};

export default function AiPage() {
  return (
    <div className="container-px py-6">
      <Suspense>
        <AssistantChat />
      </Suspense>
    </div>
  );
}
