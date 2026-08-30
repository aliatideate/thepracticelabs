import React from "react";
import type { EvidenceBlock } from "../lib/scenario";
import { withMarketFlags } from "../lib/constants";

export function DocumentPanel({
  title,
  subtitle,
  sourceLabel,
  blocks,
}: {
  title: string;
  subtitle: string;
  sourceLabel: string;
  blocks: EvidenceBlock[];
}) {
  return (
    <article className="bg-white border border-[#E7E4DD] shadow-sm rounded-sm p-8 md:p-10 text-[#1D1D24]">
      <header className="border-b border-[#E7E4DD] pb-4 mb-6">
        <div className="text-[14px] text-[#6C6975] uppercase tracking-wide">{sourceLabel}</div>
        <h2 className="text-[28px] mt-2 mb-1">{title}</h2>
        <p className="text-[16px] text-[#6C6975] m-0">{subtitle}</p>
      </header>
      <div className="space-y-5">
        {blocks.map((block, i) => (
          <Block key={i} block={block} />
        ))}
      </div>
    </article>
  );
}

function Block({ block }: { block: EvidenceBlock }) {
  switch (block.type) {
    case "heading": {
      const level = block.level ?? 2;
      if (level <= 1) return <h3 className="text-[24px] mt-2 mb-0">{block.text}</h3>;
      return <h4 className="text-[20px] font-serif mt-2 mb-0 text-[#1A0F58]">{block.text}</h4>;
    }
    case "paragraph":
      return <p className="text-[16px] leading-relaxed m-0">{withMarketFlags(block.text)}</p>;
    case "table":
      return (
        <figure className="m-0 overflow-x-auto">
          <table className="w-full text-[15px] border-collapse">
            <thead>
              <tr>
                {block.columns.map((c) => (
                  <th
                    key={c}
                    className="text-left border-b-2 border-[#1D1D24] py-2 pr-4 font-semibold"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-[#E7E4DD]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-2 pr-4 align-top">
                      {withMarketFlags(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {block.caption && (
            <figcaption className="text-[14px] text-[#6C6975] mt-2">{block.caption}</figcaption>
          )}
        </figure>
      );
    case "keyValue":
      return (
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 m-0">
          {block.items.map((item) => (
            <div key={item.label}>
              <dt className="text-[14px] text-[#6C6975]">{item.label}</dt>
              <dd className="m-0 text-[16px] font-medium">{withMarketFlags(item.value)}</dd>
            </div>
          ))}
        </dl>
      );
    case "callout":
      return (
        <aside className="border-l-4 border-[#301CA0] bg-[#EAE8F6] px-4 py-3">
          {block.label && (
            <div className="text-[14px] font-semibold text-[#301CA0] mb-1">{block.label}</div>
          )}
          <p className="m-0 text-[16px]">{withMarketFlags(block.text)}</p>
        </aside>
      );
    case "list": {
      const List = block.ordered ? "ol" : "ul";
      return (
        <List className={`text-[16px] leading-relaxed m-0 pl-5 ${block.ordered ? "list-decimal" : "list-disc"}`}>
          {block.items.map((item) => (
            <li key={item} className="mb-1">
              {withMarketFlags(item)}
            </li>
          ))}
        </List>
      );
    }
    case "quote":
      return (
        <blockquote className="m-0 border-l-4 border-[#84C5B1] pl-4">
          <p className="text-[16px] italic m-0">“{withMarketFlags(block.text)}”</p>
          <footer className="text-[14px] text-[#6C6975] mt-1">— {withMarketFlags(block.attribution)}</footer>
        </blockquote>
      );
    default:
      return null;
  }
}
