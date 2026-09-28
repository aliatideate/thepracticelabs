import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Download } from "lucide-react";

export function DownloadMenu({ onDownload }: { onDownload: (format: "csv" | "json") => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={root}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#301CA0] text-white text-[16px] font-semibold whitespace-nowrap px-5 py-2.5"
      >
        <Download className="h-4 w-4" strokeWidth={2.25} />
        Download
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={2.25} />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-full rounded-[22px] border border-[#E7E4DD] bg-white p-1 shadow-[0_8px_24px_rgba(29,29,36,0.08)]"
        >
          {(
            [
              ["csv", "Download CSV"],
              ["json", "Download JSON"],
            ] as const
          ).map(([format, label]) => (
            <li key={format} role="option">
              <button
                type="button"
                className="w-full rounded-full px-5 py-2 text-left text-[15px] font-semibold whitespace-nowrap text-[#301CA0] hover:bg-[#EAE8F6]"
                onClick={() => {
                  setOpen(false);
                  onDownload(format);
                }}
              >
                {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
