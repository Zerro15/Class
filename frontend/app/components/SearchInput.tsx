"use client";

import { useEffect, useState } from "react";

export function SearchInput({
  placeholder,
  value,
  onChange,
  delay = 250,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  delay?: number;
}) {
  const [inner, setInner] = useState(value);

  useEffect(() => {
    setInner(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => onChange(inner), delay);
    return () => clearTimeout(timer);
  }, [delay, inner, onChange]);

  return (
    <input
      className="w-full rounded border px-3 py-2"
      placeholder={placeholder}
      value={inner}
      onChange={(event) => setInner(event.target.value)}
    />
  );
}
