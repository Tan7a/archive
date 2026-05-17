"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { connectBlocks, disconnectBlocks } from "@/app/admin/actions";
import BlockPicker, { type PickableBlock } from "./BlockPicker";

type Props = {
  blockId: string;
  initial: PickableBlock[];
};

/**
 * The "Connected blocks" sub-section of the BlockDetail right column.
 * Holds local state for the picker + optimistically maintains the list so
 * the click feels instant; router.refresh() pulls in any server-side derived
 * state (e.g. graph revalidation).
 */
export default function BlockConnections({ blockId, initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<PickableBlock[]>(initial);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "error"; message: string } | null>(null);

  async function handlePick(b: PickableBlock) {
    if (items.some((x) => x.id === b.id)) {
      setPicking(false);
      return;
    }
    setBusy(true);
    setToast(null);
    const result = await connectBlocks(blockId, b.id);
    setBusy(false);
    if (result.success) {
      setItems((prev) =>
        prev.some((x) => x.id === b.id) ? prev : [...prev, b]
      );
      setPicking(false);
      router.refresh();
    } else {
      setToast({ kind: "error", message: result.error });
    }
  }

  async function handleDisconnect(otherId: string) {
    setBusy(true);
    setToast(null);
    const result = await disconnectBlocks(blockId, otherId);
    setBusy(false);
    if (result.success) {
      setItems((prev) => prev.filter((x) => x.id !== otherId));
      router.refresh();
    } else {
      setToast({ kind: "error", message: result.error });
    }
  }

  return (
    <div className="text-xs">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-neutral-500">
          Connected blocks{" "}
          <span className="ml-0.5 text-neutral-600">{items.length}</span>
        </span>
        <button
          type="button"
          onClick={() => setPicking((p) => !p)}
          disabled={busy}
          className="text-neutral-500 hover:text-neutral-200 disabled:opacity-40"
        >
          {picking ? "cancel" : "+ connect block"}
        </button>
      </div>

      {picking && (
        <div className="mb-2">
          <BlockPicker
            excludeId={blockId}
            excludeIds={items.map((i) => i.id)}
            onPick={handlePick}
            busy={busy}
          />
        </div>
      )}

      {items.length === 0 && !picking ? (
        <p className="text-neutral-600">No block connections yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((b) => (
            <li key={b.id} className="flex items-center gap-2">
              <Link
                href={`/block/${b.id}`}
                className="flex flex-1 items-center gap-2 truncate text-neutral-200 hover:underline"
              >
                <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-sm border border-neutral-800 bg-neutral-950">
                  {b.image_url ? (
                    <Image
                      src={b.image_url}
                      alt=""
                      fill
                      sizes="24px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] text-neutral-600">
                      {b.kind === "text" ? "T" : b.kind === "link" ? "↗" : "•"}
                    </span>
                  )}
                </span>
                <span className="truncate">{b.title || "Untitled"}</span>
              </Link>
              <button
                type="button"
                onClick={() => handleDisconnect(b.id)}
                disabled={busy}
                aria-label={`Disconnect ${b.title || "block"}`}
                className="text-neutral-600 hover:text-neutral-300 disabled:opacity-40"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {toast && (
        <p
          className={`mt-2 ${
            toast.kind === "error" ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {toast.message}
        </p>
      )}
    </div>
  );
}
