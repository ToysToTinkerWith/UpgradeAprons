"use client";

import { useEffect, useRef, useState } from "react";
import { getFirebaseAuth, getFirebaseFirestore } from "@/lib/firebase";
import { isOwnerEmail, PRODUCT_COLLECTION } from "@/lib/product-catalog";
import type { ApronProduct } from "@/lib/site-data";

export function ProductSoldControl({ product, catalogReady }: {
  product: ApronProduct;
  catalogReady: boolean;
}) {
  const [isOwner, setIsOwner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void getFirebaseAuth().then(async (auth) => {
      if (!auth || !active) return;
      const { onAuthStateChanged } = await import("firebase/auth");
      if (!active) return;
      unsubscribe = onAuthStateChanged(auth, (user) => {
        if (active) setIsOwner(isOwnerEmail(user?.email));
      });
    }).catch(() => { if (active) setIsOwner(false); });
    return () => { active = false; unsubscribe?.(); };
  }, []);

  const saveSold = async (sold: boolean) => {
    if (!isOwner || !catalogReady || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setMessage("");
    try {
      const auth = await getFirebaseAuth();
      if (!isOwnerEmail(auth?.currentUser?.email)) throw new Error("Owner login required");
      const db = await getFirebaseFirestore();
      if (!db) throw new Error("Product catalog unavailable");
      const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      // Patch only availability so concurrent text edits and product images stay intact.
      await updateDoc(doc(db, PRODUCT_COLLECTION, product.slug), {
        sold,
        updatedAt: serverTimestamp(),
      });
      setMessage(sold ? "Marked as sold." : "Marked as available.");
    } catch {
      setMessage("Could not save the sold status. Please try again.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  if (!isOwner) return null;

  return (
    <div className="mt-5" data-site-static>
      <label className="inline-flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-[#d6a25f]/60 bg-black/25 px-4 py-3 text-sm font-semibold text-[#f7f1e8]">
        <input
          type="checkbox"
          checked={Boolean(product.sold)}
          disabled={saving || !catalogReady}
          onChange={(event) => void saveSold(event.target.checked)}
          className="size-5 accent-[#d6a25f] disabled:cursor-wait"
        />
        Sold
      </label>
      <p role="status" className="mt-2 min-h-5 text-sm text-[#e7ad61]">
        {saving ? "Saving..." : !catalogReady ? "Waiting for the product catalog..." : message}
      </p>
    </div>
  );
}
