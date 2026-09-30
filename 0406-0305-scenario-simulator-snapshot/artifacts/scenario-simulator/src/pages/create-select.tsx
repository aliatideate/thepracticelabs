import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

export type CreateSelectOption = { value: string; label: string };

const NONE = "__none__";

/**
 * Creator-styled dropdown (Radix). Matches the light field design;
 * avoids the native OS options menu.
 */
export function CreateSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  triggerClassName = "",
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: CreateSelectOption[];
  placeholder?: string;
  triggerClassName?: string;
}) {
  const radixValue = value === "" ? NONE : value;

  return (
    <Select
      value={radixValue}
      onValueChange={(next) => onValueChange(next === NONE ? "" : next)}
    >
      <SelectTrigger
        id={id}
        className={[
          "h-auto w-full rounded-xl border border-[#E7E4DD] bg-white px-4 py-3 text-[16px] font-normal text-[#1A1A1A]",
          "shadow-none ring-offset-0 focus:ring-1 focus:ring-[#301CA0]",
          "[&>span]:line-clamp-none [&>svg]:h-4 [&>svg]:w-4 [&>svg]:opacity-100 [&>svg]:text-[#1A1A1A]",
          triggerClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className="rounded-xl border border-[#E7E4DD] bg-white text-[#1A1A1A] shadow-[0_12px_32px_rgba(26,15,88,0.12)]"
        position="popper"
      >
        {options.map((opt) => (
          <SelectItem
            key={opt.value === "" ? NONE : opt.value}
            value={opt.value === "" ? NONE : opt.value}
            className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[15px] focus:bg-[#EAE8F6] focus:text-[#301CA0] data-[highlighted]:bg-[#EAE8F6] data-[highlighted]:text-[#301CA0]"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
