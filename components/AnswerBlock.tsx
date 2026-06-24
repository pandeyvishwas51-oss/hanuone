import { Sparkles } from "lucide-react";

/**
 * AEO "citable answer block": a concise, fact-dense summary placed high on the
 * page. The `.answer-block` class is what Speakable schema points at, and the
 * format (direct question → 40–60 word answer) is what AI answer engines quote.
 */
export default function AnswerBlock({
  question,
  answer,
  updated
}: {
  question: string;
  answer: string;
  updated?: string;
}) {
  return (
    <section
      className="answer-block card border-l-4 border-l-primary bg-primary/[0.03] p-5"
      aria-label="Quick answer"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
        <Sparkles className="h-4 w-4" />
        Quick answer
      </div>
      <p className="mt-2 text-sm font-medium text-ink" data-answer-question>
        {question}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted" data-answer-text>
        {answer}
      </p>
      {updated ? (
        <p className="mt-2 text-[11px] text-muted/70">Last reviewed: {updated}</p>
      ) : null}
    </section>
  );
}
