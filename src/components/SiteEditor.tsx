"use client";

import { usePathname } from "next/navigation";
import {
  Check,
  LoaderCircle,
  LogOut,
  Pencil,
  Save,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  getFirebaseAuth,
  getFirebaseFirestore,
} from "@/lib/firebase";
import {
  PRODUCT_COLLECTION,
  isOwnerEmail,
  useProductCatalog,
} from "@/lib/product-catalog";
import { parseProductTextBinding, productTextPatch, type ProductTextBinding } from "@/lib/product-text";
import { apronProducts, type ApronProduct } from "@/lib/site-data";

const SITE_CONTENT_COLLECTION = "siteContent";
const HOLD_DELAY_MS = 650;
const HOLD_MOVE_TOLERANCE = 18;

type SiteContentRecord = {
  id: string;
  key: string;
  kind: "text" | "image";
  route: string;
  label: string;
  value: string;
  alt?: string;
  defaultValue: string;
  defaultAlt?: string;
};

type TextNodeTarget = {
  kind: "text";
  targetType: "text-node";
  id: string;
  key: string;
  route: string;
  label: string;
  node: Text;
  prefix: string;
  suffix: string;
  defaultValue: string;
  product?: ProductTextBinding;
};

type AttributeTextTarget = {
  kind: "text";
  targetType: "attribute";
  id: string;
  key: string;
  route: string;
  label: string;
  element: HTMLInputElement | HTMLTextAreaElement;
  attribute: "placeholder";
  defaultValue: string;
};

type TextTarget = TextNodeTarget | AttributeTextTarget;

type ImageTarget = {
  kind: "image";
  id: string;
  key: string;
  route: string;
  label: string;
  image: HTMLImageElement;
  defaultValue: string;
  defaultAlt: string;
};

type ContentTarget = TextTarget | ImageTarget;

type EditorSelection = { kind: "content"; target: TextTarget };

type ContentDraft = { value: string };

const excludedSelector = [
  "[data-site-editor]",
  "[data-site-static]",
  "script",
  "style",
  "noscript",
  "svg",
  "canvas",
  "input",
  "textarea",
  "select",
  "option",
].join(",");

const textareaClass =
  "min-h-28 w-full min-w-0 resize-y rounded-md border border-white/16 bg-black/34 px-3 py-3 text-base font-normal normal-case tracking-[0] text-white outline-none transition focus:border-[#d6a25f]";

function hashString(value: string, seed: number) {
  let hash = seed >>> 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  }

  return (hash >>> 0).toString(36);
}

function getContentId(key: string) {
  return `content-${hashString(key, 2166136261)}-${hashString(key, 3339675911)}`;
}

function getElementSegment(element: Element) {
  const tagName = element.tagName.toLowerCase();
  const parent = element.parentElement;

  if (!parent) {
    return tagName;
  }

  const sameTagSiblings = Array.from(parent.children).filter(
    (child) => child.tagName === element.tagName,
  );

  return `${tagName}:${sameTagSiblings.indexOf(element) + 1}`;
}

function getElementPath(element: Element, root: Element) {
  const segments: string[] = [];
  let current: Element | null = element;

  while (current && current !== root) {
    segments.unshift(getElementSegment(current));
    current = current.parentElement;
  }

  return segments.join("/") || getElementSegment(element);
}

function getTargetKey(element: Element, pathname: string, suffix: string) {
  const namedScope = element.closest<HTMLElement>("[data-site-scope]");
  const root = namedScope ?? element.closest("main") ?? document.body;
  const scope = namedScope?.dataset.siteScope
    ? `global:${namedScope.dataset.siteScope}`
    : `route:${pathname}`;

  return `${scope}|${getElementPath(element, root)}|${suffix}`;
}

function getTextParts(value: string) {
  const prefix = value.match(/^\s*/)?.[0] ?? "";
  const suffix = value.match(/\s*$/)?.[0] ?? "";

  return {
    prefix,
    suffix,
    text: value.slice(prefix.length, value.length - suffix.length),
  };
}

function shouldIncludeText(node: Text) {
  const parent = node.parentElement;
  const value = node.nodeValue ?? "";
  const text = value.trim();

  if (!parent || !text || parent.closest(excludedSelector)) {
    return false;
  }

  if (
    parent.closest('[aria-hidden="true"]')
  ) {
    return false;
  }

  return true;
}

function getLabel(value: string, fallback: string) {
  const compact = value.replace(/\s+/g, " ").trim();

  if (!compact) {
    return fallback;
  }

  return compact.length > 54 ? `${compact.slice(0, 51)}...` : compact;
}

function collectContentTargets(pathname: string) {
  const targets: ContentTarget[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let currentNode = walker.nextNode();

  while (currentNode) {
    const node = currentNode as Text;

    if (shouldIncludeText(node)) {
      const parent = node.parentElement as HTMLElement;
      const childIndex = Array.from(parent.childNodes).indexOf(node);
      const { prefix, suffix, text } = getTextParts(node.nodeValue ?? "");
      const key = getTargetKey(parent, pathname, `text:${childIndex}`);

      const fieldElement = parent.closest<HTMLElement>("[data-product-field]");
      const slug = fieldElement?.closest<HTMLElement>("[data-product-slug]")?.dataset.productSlug;
      const product = fieldElement && slug
        ? parseProductTextBinding(slug, fieldElement.dataset.productField ?? "", fieldElement.dataset.productIndex, fieldElement.dataset.productPart)
        : null;
      parent.dataset.siteEditable = "text";
      targets.push({
        kind: "text",
        targetType: "text-node",
        id: getContentId(key),
        key,
        route: pathname,
        label: getLabel(text, "Page text"),
        node,
        prefix,
        suffix,
        defaultValue: text,
        product: product ?? undefined,
      });
    }

    currentNode = walker.nextNode();
  }

  document
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input[placeholder], textarea[placeholder]",
    )
    .forEach((element) => {
      if (element.closest("[data-site-editor], [data-site-static], [data-product-slug]")) {
        return;
      }

      const placeholder = element.getAttribute("placeholder") ?? "";

      if (!placeholder.trim()) {
        return;
      }

      const key = getTargetKey(element, pathname, "attribute:placeholder");
      element.dataset.siteEditable = "text";
      targets.push({
        kind: "text",
        targetType: "attribute",
        id: getContentId(key),
        key,
        route: pathname,
        label: getLabel(`Placeholder: ${placeholder}`, "Field placeholder"),
        element,
        attribute: "placeholder",
        defaultValue: placeholder,
      });
    });

  document.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    if (image.closest(excludedSelector) || image.closest("[data-product-slug]")) {
      return;
    }

    const source = image.getAttribute("src") ?? image.currentSrc;

    if (!source) {
      return;
    }

    const key = getTargetKey(image, pathname, "image");
    // Keep applying saved image records, but never expose images as edit targets.
    targets.push({
      kind: "image",
      id: getContentId(key),
      key,
      route: pathname,
      label: getLabel(image.alt, "Site image"),
      image,
      defaultValue: source,
      defaultAlt: image.alt,
    });
  });

  return targets;
}

function applyContentRecord(target: ContentTarget, record?: SiteContentRecord) {
  if (!record || record.kind !== target.kind || (target.kind === "text" && target.targetType === "text-node" && target.product)) {
    return;
  }

  if (target.kind === "text") {
    if (target.targetType === "attribute") {
      if (target.element.getAttribute(target.attribute) !== record.value) {
        target.element.setAttribute(target.attribute, record.value);
      }

      return;
    }

    const nextValue = `${target.prefix}${record.value}${target.suffix}`;

    if (target.node.nodeValue !== nextValue) {
      target.node.nodeValue = nextValue;
    }

    const link = target.node.parentElement?.closest<HTMLAnchorElement>("a[href]");
    const currentHref = link?.getAttribute("href") ?? "";

    if (link && currentHref.startsWith("tel:")) {
      const phone = record.value.replace(/[^\d+]/g, "");

      if (phone.replace(/\D/g, "").length >= 7 && currentHref !== `tel:${phone}`) {
        link.setAttribute("href", `tel:${phone}`);
      }
    }

    if (
      link &&
      currentHref.startsWith("mailto:") &&
      record.value.includes("@") &&
      currentHref !== `mailto:${record.value.trim()}`
    ) {
      link.setAttribute("href", `mailto:${record.value.trim()}`);
    }

    return;
  }

  const nextAlt = record.alt ?? target.defaultAlt;

  if (target.image.getAttribute("src") !== record.value) {
    target.image.src = record.value;
  }

  if (target.image.hasAttribute("srcset")) {
    target.image.removeAttribute("srcset");
  }

  if (target.image.alt !== nextAlt) {
    target.image.alt = nextAlt;
  }
}

function editorTargetAtPoint(
  x: number,
  y: number,
  targetElement: Element | null,
  targets: ContentTarget[],
): EditorSelection | null {
  if (targetElement?.closest("img, [data-site-editor], [data-site-static]")) return null;

  const documentWithCaret = document as Document & {
    caretRangeFromPoint?: (clientX: number, clientY: number) => Range | null;
    caretPositionFromPoint?: (
      clientX: number,
      clientY: number,
    ) => { offsetNode: Node } | null;
  };
  const rangeNode =
    documentWithCaret.caretRangeFromPoint?.(x, y)?.startContainer ??
    documentWithCaret.caretPositionFromPoint?.(x, y)?.offsetNode;
  const textTarget = targets.find(
    (target): target is TextNodeTarget => {
      if (
        target.kind !== "text" ||
        target.targetType !== "text-node" ||
        target.node !== rangeNode
      ) {
        return false;
      }

      const range = document.createRange();
      range.selectNodeContents(target.node);
      return Array.from(range.getClientRects()).some((rect) =>
        x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom,
      );
    },
  );

  if (textTarget) {
    return { kind: "content", target: textTarget };
  }

  const directAttributeTarget = targets.find(
    (target): target is AttributeTextTarget =>
      target.kind === "text" &&
      target.targetType === "attribute" &&
      target.element === targetElement,
  );

  if (directAttributeTarget) {
    return { kind: "content", target: directAttributeTarget };
  }

  return null;
}

export function SiteEditor() {
  const pathname = usePathname();
  const { products } = useProductCatalog(apronProducts);
  const [isOwner, setIsOwner] = useState(false);
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [contentDraft, setContentDraft] = useState<ContentDraft>({
    value: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");
  const [contentRevision, setContentRevision] = useState(0);
  const [contentReady, setContentReady] = useState(false);
  const targetsRef = useRef<ContentTarget[]>([]);
  const defaultsRef = useRef(
    new Map<
      string,
      { kind: "text" | "image"; value: string; alt: string; label: string }
    >(),
  );
  const recordsRef = useRef(new Map<string, SiteContentRecord>());
  const pendingSeedKeysRef = useRef(new Set<string>());
  const holdRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    selection: EditorSelection;
    timer: number;
  } | null>(null);
  const suppressClickUntilRef = useRef(0);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    getFirebaseAuth()
      .then(async (auth) => {
        if (!auth) {
          return;
        }

        const { onAuthStateChanged } = await import("firebase/auth");
        unsubscribe = onAuthStateChanged(auth, (user) => {
          const owner = isOwnerEmail(user?.email);
          setIsOwner(owner);

          if (!owner) {
            setSelection(null);
          }
        });
      })
      .catch((error) => {
        console.warn("Site editor authentication could not initialize.", error);
      });

    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    document.body.dataset.ownerEditing = isOwner ? "true" : "false";

    return () => {
      delete document.body.dataset.ownerEditing;
    };
  }, [isOwner]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let active = true;

    getFirebaseFirestore()
      .then(async (db) => {
        if (!db || !active) {
          setContentReady(true);
          return;
        }

        const { collection, onSnapshot } = await import("firebase/firestore");
        unsubscribe = onSnapshot(
          collection(db, SITE_CONTENT_COLLECTION),
          (snapshot) => {
            const records = new Map<string, SiteContentRecord>();

            snapshot.docs.forEach((document) => {
              const data = document.data() as Partial<SiteContentRecord>;

              if (
                typeof data.key === "string" &&
                (data.kind === "text" || data.kind === "image") &&
                typeof data.value === "string"
              ) {
                records.set(data.key, {
                  id: document.id,
                  key: data.key,
                  kind: data.kind,
                  route: typeof data.route === "string" ? data.route : "",
                  label: typeof data.label === "string" ? data.label : "Site content",
                  value: data.value,
                  alt: typeof data.alt === "string" ? data.alt : undefined,
                  defaultValue:
                    typeof data.defaultValue === "string"
                      ? data.defaultValue
                      : data.value,
                  defaultAlt:
                    typeof data.defaultAlt === "string" ? data.defaultAlt : undefined,
                });
              }
            });

            recordsRef.current = records;
            setContentReady(true);
            setContentRevision((revision) => revision + 1);
          },
          (error) => {
            console.warn("Site content could not be loaded.", error);
            setContentReady(true);
          },
        );
      })
      .catch((error) => {
        console.warn("Site content could not be initialized.", error);
        setContentReady(true);
      });

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const seedMissingTargets = useCallback(async (targets: ContentTarget[]) => {
    const missingTargets = targets.filter(
      (target): target is TextTarget =>
        target.kind === "text" &&
        !(target.targetType === "text-node" && target.product) &&
        !recordsRef.current.has(target.key) &&
        !pendingSeedKeysRef.current.has(target.key),
    );

    if (!missingTargets.length) {
      return;
    }

    missingTargets.forEach((target) => pendingSeedKeysRef.current.add(target.key));

    try {
      const db = await getFirebaseFirestore();

      if (!db) {
        throw new Error("Firebase Firestore is unavailable.");
      }

      const { doc, serverTimestamp, writeBatch } = await import(
        "firebase/firestore"
      );

      for (let index = 0; index < missingTargets.length; index += 350) {
        const batch = writeBatch(db);

        missingTargets.slice(index, index + 350).forEach((target) => {
          batch.set(
            doc(db, SITE_CONTENT_COLLECTION, target.id),
            {
              key: target.key,
              kind: target.kind,
              route: target.route,
              label: target.label,
              value: target.defaultValue,
              defaultValue: target.defaultValue,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        });

        await batch.commit();
      }
    } catch (error) {
      console.warn("Site content could not be registered.", error);
    } finally {
      missingTargets.forEach((target) =>
        pendingSeedKeysRef.current.delete(target.key),
      );
    }
  }, []);

  const scanPage = useCallback(() => {
    const targets = collectContentTargets(pathname).map((target) => {
      const savedDefault = defaultsRef.current.get(target.key);

      if (savedDefault?.kind === target.kind) {
        return target.kind === "text"
          ? {
              ...target,
              label: savedDefault.label,
              defaultValue: savedDefault.value,
            }
          : {
              ...target,
              label: savedDefault.label,
              defaultValue: savedDefault.value,
              defaultAlt: savedDefault.alt,
            };
      }

      defaultsRef.current.set(target.key, {
        kind: target.kind,
        value: target.defaultValue,
        alt: target.kind === "image" ? target.defaultAlt : "",
        label: target.label,
      });

      return target;
    });
    targetsRef.current = targets;

    targets.forEach((target) =>
      applyContentRecord(target, recordsRef.current.get(target.key)),
    );

    if (isOwner && contentReady) {
      void seedMissingTargets(targets);
    }
  }, [contentReady, isOwner, pathname, seedMissingTargets]);

  useEffect(() => {
    let frame = window.requestAnimationFrame(scanPage);
    const scheduleScan = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(scanPage);
    };
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["alt", "href", "placeholder", "src", "srcset"],
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [contentRevision, scanPage]);

  const openSelection = useCallback(
    (nextSelection: EditorSelection) => {
      setStatus("idle");
      setMessage("");
      setSelection(nextSelection);

      const target = nextSelection.target;
      setContentDraft({ value: target.targetType === "attribute"
        ? target.element.getAttribute(target.attribute) ?? ""
        : getTextParts(target.node.nodeValue ?? "").text });
    },
    [],
  );

  useEffect(() => {
    if (!isOwner) {
      return;
    }

    const cancelHold = () => {
      if (holdRef.current) {
        window.clearTimeout(holdRef.current.timer);
        holdRef.current = null;
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (
        selection ||
        event.button !== 0 ||
        !(event.target instanceof Element) ||
        event.target.closest("[data-site-editor]")
      ) {
        return;
      }

      const nextSelection = editorTargetAtPoint(
        event.clientX,
        event.clientY,
        event.target,
        targetsRef.current,
      );

      if (!nextSelection) {
        return;
      }

      const timer = window.setTimeout(() => {
        suppressClickUntilRef.current = Date.now() + 900;
        openSelection(nextSelection);
        holdRef.current = null;
        window.navigator.vibrate?.(20);
      }, HOLD_DELAY_MS);

      holdRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        selection: nextSelection,
        timer,
      };
    };
    const handlePointerMove = (event: PointerEvent) => {
      const hold = holdRef.current;

      if (
        hold?.pointerId === event.pointerId &&
        Math.hypot(event.clientX - hold.x, event.clientY - hold.y) >
          HOLD_MOVE_TOLERANCE
      ) {
        cancelHold();
      }
    };
    const handleClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("[data-site-editor]")) return;
      if (Date.now() < suppressClickUntilRef.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const handleContextMenu = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || event.target.closest("[data-site-editor]")) {
        return;
      }

      const nextSelection = editorTargetAtPoint(
        event.clientX,
        event.clientY,
        event.target,
        targetsRef.current,
      );

      if (nextSelection) {
        event.preventDefault();
        cancelHold();
        suppressClickUntilRef.current = Date.now() + 900;
        openSelection(nextSelection);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointerup", cancelHold, true);
    document.addEventListener("pointercancel", cancelHold, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("contextmenu", handleContextMenu, true);

    return () => {
      cancelHold();
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerup", cancelHold, true);
      document.removeEventListener("pointercancel", cancelHold, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
    };
  }, [isOwner, openSelection, selection]);

  useEffect(() => {
    if (!selection) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelection(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selection]);

  const saveContent = async () => {
    if (!isOwner || selection?.kind !== "content" || selection.target.kind !== "text") {
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const db = await getFirebaseFirestore();

      if (!db) {
        throw new Error("Firebase Firestore is unavailable.");
      }

      const { doc, serverTimestamp, setDoc, runTransaction } = await import("firebase/firestore");
      const target = selection.target;
      if (target.targetType === "text-node" && target.product) {
        const binding = target.product;
        const fallback = products.find((product) => product.slug === binding.slug);
        if (!fallback) throw new Error("This product is no longer available.");
        const productRef = doc(db, PRODUCT_COLLECTION, binding.slug);
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(productRef);
          if (!snapshot.exists()) throw new Error("This product is no longer available.");
          const product = { ...fallback, ...snapshot.data() } as ApronProduct;
          transaction.update(productRef, {
            ...productTextPatch(product, binding, contentDraft.value),
            updatedAt: serverTimestamp(),
          });
        });
      } else {
        await setDoc(doc(db, SITE_CONTENT_COLLECTION, target.id), {
          key: target.key,
          kind: "text",
          route: target.route,
          label: target.label,
          value: contentDraft.value,
          defaultValue: target.defaultValue,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      setStatus("saved");
      setMessage("Saved to the live site.");
      setSelection((current) => current === selection ? null : current);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "This change could not be saved.");
    }
  };

  const signOutOwner = async () => {
    const auth = await getFirebaseAuth();

    if (auth) {
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
    }
  };

  const stopEditorPointer = (event: ReactPointerEvent) => {
    event.stopPropagation();
  };

  if (typeof document === "undefined" || !isOwner) {
    return null;
  }

  const dialog = selection ? (
    <div
      className="fixed inset-0 z-[220] flex items-end justify-center bg-black/66 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      data-site-editor
      onPointerDown={stopEditorPointer}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setSelection(null);
        }
      }}
    >
      <section
        aria-label="Edit text"
        aria-modal="true"
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-white/16 bg-[#0b0705] text-[#f7f1e8] shadow-[0_30px_90px_rgba(0,0,0,0.66)] sm:max-w-3xl sm:rounded-lg"
        role="dialog"
      >
        <header className="sticky top-0 z-10 flex items-center justify-end gap-4 bg-[#0b0705]/96 px-5 pt-4 backdrop-blur sm:px-6">
          <h2 className="sr-only">Edit text</h2>
          <button
            aria-label="Close editor"
            className="inline-flex size-11 flex-none items-center justify-center rounded-md border border-white/16 text-[#e7ad61] transition hover:border-[#d6a25f] hover:text-white"
            onClick={() => setSelection(null)}
            title="Close editor"
            type="button"
          >
            <X size={21} aria-hidden="true" />
          </button>
        </header>

        <div className="grid gap-6 p-5 sm:p-6">
          <textarea
            aria-label="Text"
            autoFocus
            className={`${textareaClass} min-h-44`}
            onChange={(event) => setContentDraft({ value: event.target.value })}
            value={contentDraft.value}
          />

            <div className="flex flex-wrap items-center gap-3 border-t border-white/12 pt-5">
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#d6a25f] px-5 text-sm font-semibold uppercase tracking-[0.14em] !text-[#050403] transition hover:bg-[#edbd7a] disabled:cursor-wait disabled:opacity-70"
                disabled={status === "saving"}
                onClick={saveContent}
                type="button"
              >
                {status === "saving" ? (
                  <LoaderCircle className="animate-spin" size={19} aria-hidden="true" />
                ) : status === "saved" ? (
                  <Check size={19} aria-hidden="true" />
                ) : (
                  <Save size={19} aria-hidden="true" />
                )}
                Save
              </button>
              {message ? (
                <p
                  aria-live="polite"
                  className={`text-sm font-semibold ${
                    status === "error" ? "text-[#f0a6a6]" : "text-[#c7dfbf]"
                  }`}
                >
                  {message}
                </p>
              ) : null}
            </div>
        </div>
      </section>
    </div>
  ) : null;

  return createPortal(
    <>
      <aside
        className="fixed bottom-4 right-4 z-[190] flex items-center gap-2 rounded-md border border-[#d6a25f]/70 bg-[#090604]/94 p-2 text-[#f7f1e8] shadow-[0_18px_46px_rgba(0,0,0,0.5)] backdrop-blur-md sm:bottom-6 sm:right-6"
        data-site-editor
        title="Hold text to edit"
      >
        <span className="inline-flex size-10 items-center justify-center rounded-md bg-[#d6a25f] text-[#050403]">
          <Pencil size={18} aria-hidden="true" />
        </span>
        <span className="hidden pr-1 text-xs font-bold uppercase tracking-[0.14em] sm:inline">
          Site editing
        </span>
        <button
          aria-label="Sign out of site editing"
          className="inline-flex size-10 items-center justify-center rounded-md border border-white/14 text-[#e7ad61] transition hover:border-[#d6a25f] hover:text-white"
          onClick={signOutOwner}
          title="Sign out"
          type="button"
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
      </aside>
      {dialog}
    </>,
    document.body,
  );
}
