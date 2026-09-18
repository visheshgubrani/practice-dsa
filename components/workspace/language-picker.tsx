"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES, type LanguageId } from "@/lib/languages";

const ITEMS = LANGUAGES.map((language) => ({
  value: language.id,
  label: language.label,
}));

export function LanguagePicker({
  value,
  onChange,
}: {
  value: LanguageId;
  onChange: (value: LanguageId) => void;
}) {
  return (
    <Select
      items={ITEMS}
      value={value}
      onValueChange={(next) => onChange(next as LanguageId)}
    >
      <SelectTrigger
        size="sm"
        aria-label="Language"
        className="border-transparent bg-transparent font-mono text-xs hover:bg-muted dark:bg-transparent dark:hover:bg-muted"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start">
        {ITEMS.map((item) => (
          <SelectItem key={item.value} value={item.value} className="font-mono text-xs">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
