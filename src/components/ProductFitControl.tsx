"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase";
import { isOwnerEmail, PRODUCT_COLLECTION } from "@/lib/product-catalog";
import { normalizeMeasurements, normalizeStandardSize } from "@/lib/product-sizing";
import type { ApronProduct } from "@/lib/site-data";

export function ProductFitControl({ product, catalogReady }: { product: ApronProduct; catalogReady: boolean }) {
  const [owner, setOwner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void getFirebaseAuth().then(async auth => {
      if (!auth || !active) return;
      const { onAuthStateChanged } = await import("firebase/auth");
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, user => { if (active) setOwner(isOwnerEmail(user?.email)); });
    }).catch(() => { if (active) setOwner(false); });
    return () => { active = false; unsubscribe?.(); };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!owner || !catalogReady || inFlight.current) return;
    const form = new FormData(event.currentTarget);
    const width = String(form.get("bodyWidth") ?? "").trim();
    const length = String(form.get("bodyLength") ?? "").trim();
    const measurements = normalizeMeasurements({ bodyWidthInches: Number(width), bodyLengthInches: Number(length) });
    const standardSize = normalizeStandardSize(form.get("standardSize"));
    if ((width || length) && !measurements) {
      setMessage("Enter both measurements between 0 and 100 inches, or leave both blank.");
      return;
    }
    inFlight.current = true;
    setSaving(true);
    setMessage("");
    try {
      const auth = await getFirebaseAuth();
      if (!isOwnerEmail(auth?.currentUser?.email)) throw new Error("Owner login required");
      const db = await getFirebaseFirestore();
      if (!db) throw new Error("Catalog unavailable");
      const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      await updateDoc(doc(db, PRODUCT_COLLECTION, product.slug), {
        measurements,
        ...(product.categorySlug === "standard" ? {
          standardSize,
          standardSizeEstimated: Boolean(standardSize && form.get("sizeConfirmed") !== "on"),
        } : {}),
        updatedAt: serverTimestamp(),
      });
      setMessage("Size and measurements saved.");
    } catch {
      setMessage("Could not save. Check your connection and try again.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  if (!owner) return null;
  const inputClass = "mt-2 min-h-12 w-full rounded border border-white/25 bg-[#141210] px-3 text-base text-white";
  return (
    <details className="mt-5 border-t border-white/20 py-4 text-[#d8cabc]" data-site-static>
      <summary className="cursor-pointer py-2 font-semibold text-[#e7ad61]">Edit size &amp; measurements</summary>
      <form onSubmit={save} className="mt-4 grid gap-4" key={`${product.standardSize}:${product.standardSizeEstimated}:${product.measurements?.bodyWidthInches}:${product.measurements?.bodyLengthInches}`}>
        <p className="text-sm leading-6">Enter measured body dimensions in inches, excluding straps. Leave both blank until measured. Size does not change the price.</p>
        <fieldset disabled={saving || !catalogReady} className="grid gap-4 disabled:opacity-60">
          {product.categorySlug === "standard" && <label className="text-sm">Standard size<select name="standardSize" defaultValue={product.standardSize ?? ""} className={inputClass}><option value="">Not yet confirmed</option><option value="small">Small</option><option value="large">Large</option></select></label>}
          {product.categorySlug === "standard" && <label className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" name="sizeConfirmed" defaultChecked={Boolean(product.standardSize && !product.standardSizeEstimated)} className="h-5 w-5 accent-[#d6a25f]" />Size confirmed from the apron or maker</label>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Body width (inches)<input name="bodyWidth" type="number" min="0.01" max="100" step="any" defaultValue={product.measurements?.bodyWidthInches ?? ""} className={inputClass} /></label>
            <label className="text-sm">Body length (inches)<input name="bodyLength" type="number" min="0.01" max="100" step="any" defaultValue={product.measurements?.bodyLengthInches ?? ""} className={inputClass} /></label>
          </div>
          <button type="submit" className="flex min-h-12 w-fit items-center gap-2 rounded border border-[#d6a25f] px-4 text-sm font-semibold text-[#e7ad61]"><Save size={18} aria-hidden="true" />{saving ? "Saving..." : "Save measurements"}</button>
        </fieldset>
        <p role="status" className="text-sm">{!catalogReady ? "Waiting for the product catalog..." : message}</p>
      </form>
    </details>
  );
}
