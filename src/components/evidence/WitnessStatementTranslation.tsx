"use client";

import { useState } from "react";
import TranslateButton from "@/components/ui/TranslateButton";

// -----------------------------------------------------------------------------
// P7.3 - real English -> Kannada translation of a witness statement, via
// /api/translate (Zia Trained NLP Models Text Translation). Self-contained
// client component so the surrounding case-detail page (a server
// component) doesn't need "use client" itself - same pattern
// StatementAudioPlayer.tsx (P7.1) already established for this exact
// section.
//
// The seeded statementText is English prose (see witnessStatements.ts's own
// module comment - there is no Kannada-source field in the synthetic
// dataset), so this translates the real English statement INTO Kannada -
// the reverse direction from CreateCaseForm's Brief facts translator, and a
// genuine exercise of the same real API on real case text, not a second
// copy of the same demo.
// -----------------------------------------------------------------------------
export default function WitnessStatementTranslation({ text }: { text: string }) {
  const [translated, setTranslated] = useState<string | null>(null);

  return (
    <div className="mt-2">
      <TranslateButton
        text={text}
        sourceLanguage="en"
        targetLanguage="kn"
        label="Translate to Kannada"
        onTranslated={setTranslated}
      />
      {translated && (
        <p className="mt-2 rounded-md border border-line bg-surface-2 p-2 text-[13px] leading-relaxed text-ink">
          &ldquo;{translated}&rdquo;
        </p>
      )}
    </div>
  );
}
