"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markSupportDone } from "./actions";

/** "Vybavené" — the request leaves the list of new ones. */
export function DoneButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => start(() => markSupportDone(id))}
    >
      <Check /> {label}
    </Button>
  );
}
