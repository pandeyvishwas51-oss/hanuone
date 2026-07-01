import type { Metadata } from "next";
import JsonLd from "@/components/JsonLd";
import AnswerBlock from "@/components/AnswerBlock";
import FaqSection from "@/components/FaqSection";
import AiDoctorModes from "@/components/AiDoctorModes";
import { breadcrumbJsonLd, faqJsonLd, medicalWebPageJsonLd, speakableJsonLd, abs } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Health Assistant — free symptom checker | HanuONE",
  description:
    "Chat with Dr. Hanu, HanuONE's free AI health assistant. Describe your symptoms and get instant guidance on what it could be, which doctor to consult, recommended tests and how urgent it is. Not a diagnosis — always confirm with a licensed doctor.",
  alternates: { canonical: abs("/ai-doctor") }
};

const FAQS = [
  {
    q: "Is the HanuONE AI Health Assistant free?",
    a: "Yes. Dr. Hanu, the HanuONE AI Health Assistant, is free to use. You can describe your symptoms and get instant guidance on possible causes, which specialist to consult and recommended tests."
  },
  {
    q: "Can the AI assistant diagnose my illness?",
    a: "No. The AI assistant offers guidance and symptom triage only — it is not a medical diagnosis. It helps you understand what your symptoms might mean and routes you to the right doctor on HanuONE for proper evaluation."
  },
  {
    q: "What should I do in a medical emergency?",
    a: "For emergency symptoms like chest pain, difficulty breathing, severe bleeding, stroke signs or loss of consciousness, do not use the chatbot — call 108 (ambulance in India) or go to the nearest hospital immediately."
  },
  {
    q: "Is my health conversation private?",
    a: "Your symptom conversation is used only to generate guidance in your session. HanuONE follows India's DPDP Act 2023 principles for any stored health data, with consent, export and erasure controls."
  }
];

export default function AiDoctorPage() {
  return (
    <div className="container-page py-8">
      <JsonLd data={medicalWebPageJsonLd({ url: "/ai-doctor", name: "AI Health Assistant — HanuONE", description: metadata.description as string })} />
      <JsonLd data={speakableJsonLd("/ai-doctor")} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", href: "/" }, { name: "AI Health Assistant" }])} />
      <JsonLd data={faqJsonLd(FAQS)} />

      <div className="mx-auto max-w-3xl text-center">
        <span className="inline-block rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          AI-Powered Health Guidance
        </span>
        <h1 className="h1 mt-3">Meet Dr. Hanu, your AI Health Assistant</h1>
        <p className="mt-2 text-sm font-medium text-primary">Trusted Healthcare, Right at Home.</p>
      </div>

      <div className="mx-auto mt-4 max-w-3xl">
        <AnswerBlock
          question="What is the HanuONE AI Health Assistant?"
          answer="HanuONE's AI Health Assistant (Dr. Hanu) is a free symptom checker for families in India. Describe how you feel and it asks focused questions like a doctor would, then tells you what your symptoms could mean, which specialist to consult, which lab tests may help and how urgent it is — then lets you book a verified doctor on HanuONE. It is guidance, not a diagnosis."
        />
      </div>

      <div className="mt-6">
        <AiDoctorModes />
      </div>

      <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-muted">
        ⚠️ For emergencies (chest pain, breathing difficulty, severe bleeding, stroke signs, fainting), call{" "}
        <a href="tel:108" className="font-semibold text-rose-600">108</a> or go to the nearest hospital immediately.
      </p>

      <div className="mt-10">
        <FaqSection faqs={FAQS} />
      </div>
    </div>
  );
}
