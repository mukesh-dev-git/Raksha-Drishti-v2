import { getOffenderPhotoUrl } from "@/lib/offenderPhotos";

// -----------------------------------------------------------------------------
// Photo if one's been supplied (public/offenders/, see that folder's
// README), else an initials tile - same fallback pattern used by
// Slack/GitHub/Gmail for a person with no photo, not a placeholder that
// looks broken. Color is deterministic per personId (a stable hash into
// the same --dash-* accent tokens FeatureGrid.tsx already uses), so the
// same person always gets the same color across renders.
//
// Rendered as a squared-off PHOTO CARD (rounded-lg, not a circular
// "profile picture" crop) - the supplied images are full mugshot-style
// compositions (a height-chart backdrop, a booking placard), and a small
// circular avatar crop was cutting that framing off. A card reads as
// "an ID photo on a case file", which is what this page actually is.
// -----------------------------------------------------------------------------
const PALETTE = [
  { bg: "bg-dash-blue-bg", text: "text-dash-blue" },
  { bg: "bg-dash-teal-bg", text: "text-dash-teal" },
  { bg: "bg-dash-purple-bg", text: "text-dash-purple" },
  { bg: "bg-dash-pink-bg", text: "text-dash-pink" },
  { bg: "bg-dash-orange-bg", text: "text-dash-orange" },
];

function initials(name: string): string {
  const words = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  return (words[0]?.[0] ?? "?") + (words[1]?.[0] ?? "");
}

function colorFor(personId: string) {
  let hash = 0;
  for (let i = 0; i < personId.length; i++) hash = (hash * 31 + personId.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export default function OffenderAvatar({
  personId,
  name,
  size = 112,
}: {
  personId: string;
  name: string;
  size?: number;
}) {
  const photoUrl = getOffenderPhotoUrl(personId);

  if (photoUrl) {
    // Plain <img>, not next/image: these are demo files dropped straight
    // into public/ with no known dimensions ahead of time, and next/image
    // would need those declared.
    return (
      <img
        src={photoUrl}
        alt={`Photo of ${name}`}
        width={size}
        height={size}
        className="shrink-0 rounded-lg border border-line object-cover shadow-sm"
        style={{ width: size, height: size }}
      />
    );
  }

  const c = colorFor(personId);
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg border border-line font-semibold ${c.bg} ${c.text}`}
      style={{ width: size, height: size, fontSize: size * 0.3 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
