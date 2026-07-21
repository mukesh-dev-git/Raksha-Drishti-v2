import { Phone } from "lucide-react";

// -----------------------------------------------------------------------------
// Emergency / helpline bar — a first-class, persistent UI element (not a footer
// afterthought). High contrast, click-to-call, always available at the top of
// every page. 112 is emphasised as the single all-in-one emergency number.
// -----------------------------------------------------------------------------

const HELPLINES = [
  { label: "Police", number: "100" },
  { label: "Women Helpline", number: "1091" },
  { label: "Child Helpline", number: "1098" },
  { label: "Ambulance", number: "108" },
];

export default function EmergencyBar() {
  return (
    <div className="bg-navy text-white" role="region" aria-label="Emergency helplines">
      <div className="mx-auto flex max-w-content flex-col gap-2 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Primary emergency number */}
        <a
          href="tel:112"
          className="flex items-center gap-2 font-semibold hover:underline"
        >
          <span
            className="flex h-6 w-6 items-center justify-center rounded-sm bg-danger"
            aria-hidden="true"
          >
            <Phone size={14} strokeWidth={2.5} />
          </span>
          <span>
            Emergency&nbsp;
            <span className="text-base">112</span>
          </span>
          <span className="hidden text-xs font-normal text-white/70 md:inline">
            All-in-one emergency response
          </span>
        </a>

        {/* Secondary helplines */}
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {HELPLINES.map((h) => (
            <li key={h.number}>
              <a
                href={`tel:${h.number}`}
                className="hover:underline"
              >
                <span className="text-white/75">{h.label}:</span>{" "}
                <span className="font-semibold">{h.number}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
