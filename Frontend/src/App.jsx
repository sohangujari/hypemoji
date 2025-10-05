import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { HugeiconsIcon } from '@hugeicons/react';
import { ShuffleIcon,QrCodeIcon,Download01Icon,Share03Icon } from '@hugeicons/core-free-icons';
import Logo from './assets/3d-eye.png';

const API_BASE = "https://hypemoji-api.vercel.app";

function classNames(...cn) {
  return cn.filter(Boolean).join(" ");
}

function useQueryParams() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

// Clean /d route share URLs
function buildShareUrl(encrypted, key) {
  const url = new URL(window.location.href);
  url.pathname = "/d";
  url.search = "";
  url.searchParams.set("e", encrypted);
  url.searchParams.set("k", key);
  return url.toString();
}

// Attempt to shorten long URLs (CleanURI -> is.gd -> fallback)
async function shortenUrl(longUrl) {
  // 1) CleanURI
  try {
    const res = await fetch("https://cleanuri.com/api/v1/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: "url=" + encodeURIComponent(longUrl),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.result_url) return data.result_url;
    }
  } catch (_) {}
  // 2) is.gd
  try {
    const res = await fetch(
      "https://is.gd/create.php?format=simple&url=" + encodeURIComponent(longUrl)
    );
    if (res.ok) {
      const t = (await res.text()).trim();
      if (t && !t.toLowerCase().startsWith("error")) return t;
    }
  } catch (_) {}
  // 3) fallback
  return longUrl;
}

function useToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2000);
    return () => clearTimeout(t);
  }, [msg]);
  const Toast = () =>
    msg ? (
      <div className="fixed bottom-6 inset-x-0 flex justify-center z-50">
        <div className="px-3 py-2 rounded-md border border-white/15 bg-black/80 text-white text-sm shadow-md backdrop-blur">
          {msg}
        </div>
      </div>
    ) : null;
  return { show: setMsg, Toast };
}

function TabSwitcher({ active, onChange }) {
  return (
    <div className="w-full flex justify-center mb-6">
      <div className="inline-flex items-center rounded-full border border-white/15 bg-black shadow-sm">
        {[
          { id: "encrypt", label: "Encrypt" },
          { id: "decrypt", label: "Decrypt" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={classNames(
              "px-5 py-2 text-sm transition-all duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
              active === tab.id
                ? "bg-white text-black rounded-full"
                : "text-white/70 hover:text-white"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm text-white/80">{label}</label>
      {children}
      {hint ? <p className="text-xs text-white/40">{hint}</p> : null}
    </div>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={classNames(
        "w-full rounded-lg bg-black text-white placeholder-white/30",
        "border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/20",
        "px-3 py-2 text-sm transition-all duration-200",
        props.className
      )}
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className={classNames(
        "w-full rounded-lg bg-black text-white placeholder-white/30",
        "border border-white/15 focus:outline-none focus:ring-2 focus:ring-white/20",
        "px-3 py-2 text-sm resize-y min-h-[88px] transition-all duration-200",
        props.className
      )}
    />
  );
}

function Button({ variant = "solid", className, ...props }) {
  const base =
    "px-4 py-2 rounded-lg text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "solid"
      ? "bg-white text-black hover:bg-white/90 active:bg-white/80"
      : variant === "outline"
      ? "border border-white/20 text-white hover:border-white/40"
      : "text-white/80 hover:text-white";
  return <button {...props} className={classNames(base, styles, className)} />;
}

function IconButton({ title, onClick, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-md border border-white/15 text-white w-8 h-8 bg-black/40 hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="h-px w-full bg-white/10 my-6" />;
}

// Helpers
function randomKeyLen6to8() {
  const len = Math.floor(Math.random() * 4) + 1; // 1–4 digits
  let first = Math.floor(Math.random() * 9) + 1; // avoid leading 0
  let rest = "";
  for (let i = 1; i < len; i++) rest += Math.floor(Math.random() * 10);
  return String(first) + rest;
}

async function dataUrlToFile(dataUrl, filename) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/png" });
}

// Build an Instagram-Story-sized poster (1080x1920) with emoji + QR
async function buildStoryImageDataUrl({ encrypted, qrDataUrl }) {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = "600 56px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("Hypemoji", 64, 72);

  // Subtitle
  ctx.font = "400 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("Encrypted with a numeric key", 64, 140);

  // Emoji string sized to fit
  const maxEmojiWidth = W - 128;
  let fs = 240;
  ctx.textAlign = "center";
  while (fs > 36) {
    ctx.font = `700 ${fs}px "Apple Color Emoji","Segoe UI Emoji",ui-sans-serif`;
    if (ctx.measureText(encrypted).width <= maxEmojiWidth) break;
    fs -= 8;
  }
  ctx.fillStyle = "#fff";
  ctx.fillText(encrypted, W / 2, H * 0.42);

  // QR panel
  const qrImg = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = qrDataUrl;
  });

  const panelW = 540;
  const panelH = 540;
  const panelX = (W - panelW) / 2;
  const panelY = H - panelH - 180;

  // White panel
  ctx.fillStyle = "#fff";
  ctx.fillRect(panelX, panelY, panelW, panelH);

  // QR centered
  const qrSize = 480;
  ctx.drawImage(qrImg, panelX + (panelW - qrSize) / 2, panelY + 24, qrSize, qrSize);

  // Caption
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "600 28px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  ctx.fillText("Scan to decode", W / 2, panelY + panelH - 16);

  return canvas.toDataURL("image/png");
}

function EncryptView() {
  const { show, Toast } = useToast();
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [encrypted, setEncrypted] = useState("");

  const [shareUrl, setShareUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [storyDataUrl, setStoryDataUrl] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  function onKeyChange(e) {
    const digitsOnly = e.target.value.replace(/\D+/g, "");
    setKey(digitsOnly);
  }
  function onRandomKey() {
    const gen = randomKeyLen6to8();
    setKey(gen);
    show("Random key generated");
  }

  async function handleEncrypt(e) {
    e.preventDefault();
    if (!text.trim()) {
      show("Text is required");
      return;
    }
    if (!key.trim()) {
      show("Number key is required");
      return;
    }
    setLoading(true);
    setEncrypted("");
    setShareUrl("");
    setShortUrl("");
    setQrDataUrl("");
    setStoryDataUrl("");

    try {
      const res = await fetch(`${API_BASE}/encrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), custom_key: key.trim() }),
      });
      if (!res.ok) throw new Error("Failed to encrypt");
      const data = await res.json();
      if (!data?.encrypted) throw new Error("Invalid response");

      setEncrypted(data.encrypted);
      const long = buildShareUrl(data.encrypted, key.trim());
      setShareUrl(long);

      // Shorten in background
      shortenUrl(long)
        .then((short) => setShortUrl(short))
        .catch(() => setShortUrl(""));

      show("Encrypted");
    } catch (err) {
      console.error(err);
      show("Encryption failed");
    } finally {
      setLoading(false);
    }
  }

  // Generate QR whenever share link (short or long) becomes available
  const linkToUse = shortUrl || shareUrl;
  useEffect(() => {
    let cancelled = false;
    async function genQR() {
      if (!linkToUse) return;
      try {
        const d = await QRCode.toDataURL(linkToUse, {
          width: 512,
          margin: 1,
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(d);
      } catch (e) {
        console.error(e);
      }
    }
    genQR();
    return () => {
      cancelled = true;
    };
  }, [linkToUse]);

  // Generate Story poster once we have emoji + QR
  useEffect(() => {
    let cancelled = false;
    async function genStory() {
      if (!encrypted || !qrDataUrl) return;
      try {
        const d = await buildStoryImageDataUrl({ encrypted, qrDataUrl });
        if (!cancelled) setStoryDataUrl(d);
      } catch (e) {
        console.error(e);
      }
    }
    genStory();
    return () => {
      cancelled = true;
    };
  }, [encrypted, qrDataUrl]);

  async function copyValue(value, label = "Copied") {
    try {
      await navigator.clipboard.writeText(value);
      show(label);
    } catch {
      show("Copy failed");
    }
  }

  async function copyShareLink() {
    if (!linkToUse) {
      show("Nothing to copy");
      return;
    }
    try {
      await navigator.clipboard.writeText(linkToUse);
      show(shortUrl ? "Short link copied" : "Link copied");
    } catch {
      show("Copy failed");
    }
  }

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    show("Downloaded");
  }

  // One-tap share: tries to share a Story-sized image + URL via Web Share API
  async function shareUniversal() {
    if (!encrypted || !linkToUse) {
      show("Nothing to share");
      return;
    }
    try {
      // Ensure we have a story image ready; if not, build on demand
      let story = storyDataUrl;
      if (!story && qrDataUrl) {
        story = await buildStoryImageDataUrl({ encrypted, qrDataUrl });
        setStoryDataUrl(story);
      }

      // Prefer sharing the story image file (more IG-friendly), with text + URL
      if (story && navigator.canShare) {
        const file = await dataUrlToFile(story, "hypemoji-story.png");
        if (navigator.canShare({ files: [file] })) {
          const shareData = {
            title: "Hypemoji",
            text: `🔐 You've got a Hypemoji!\nTap the link to decode.`,
            files: [file],
            url: linkToUse, // some platforms ignore URL when files exist, but include anyway
          };
          await navigator.share(shareData);
          show("Shared");
          return;
        }
      }

      // Fallback: share link + text
      if (navigator.share) {
        await navigator.share({
          title: "Hypemoji",
          text: `🔐 You've got a Hypemoji!\nTap to decode:`,
          url: linkToUse,
        });
        show("Shared");
        return;
      }

      // Last resort: copy link
      await navigator.clipboard.writeText(linkToUse);
      show("Link copied");
    } catch (err) {
      // User canceled or unsupported
      console.warn(err);
    }
  }

  function resetForm() {
    setText("");
    setKey("");
    setEncrypted("");
    setShareUrl("");
    setShortUrl("");
    setQrDataUrl("");
    setStoryDataUrl("");
  }

  return (
    <div
      className={classNames(
        "w-full max-w-xl mx-auto border border-white/10 rounded-2xl bg-black/40 p-6",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
        "transition-all duration-300",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      )}
    >
      <form onSubmit={handleEncrypt} className="space-y-5">
        <Field label="Text">
          <TextArea
            placeholder="Type your message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Number key" hint="Digits only">
          <div className="relative">
            <TextInput
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter a number key"
              value={key}
              onChange={onKeyChange}
              className="pr-10"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <IconButton title="Generate random key (6–8 digits)" onClick={onRandomKey}>
                <HugeiconsIcon
                  icon={ShuffleIcon}
                  size={16}
                  color="#FFFFFF"
                  strokeWidth={1.5}
                />
              </IconButton>
            </div>
          </div>
        </Field>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Encrypting…" : "Encrypt"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={loading}
          >
            Reset
          </Button>
        </div>
      </form>

      {encrypted ? (
        <div className="transition-all duration-300 mt-6">
          <Separator />
          <div className="space-y-3">
            <div className="text-sm text-white/70">Encrypted Emoji</div>
            <div className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 text-base overflow-x-auto">
              <div className="select-all tracking-wide">{encrypted}</div>
            </div>

            {/* Primary actions */}
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => copyValue(encrypted, "Emoji copied")}>
                Copy Emoji
              </Button>
              <Button variant="outline" onClick={copyShareLink}>
                {shortUrl ? "Copy Short Link" : "Copy Link"}
              </Button>
              <Button onClick={shareUniversal}>
                <span className="inline-flex items-center gap-2">
                      <HugeiconsIcon
                        icon={Share03Icon}
                        size={16}
                        color="#000000"
                        strokeWidth={1.5}
                      /> Share
                </span>
              </Button>
            </div>

            {/* QR code section */}
            {qrDataUrl ? (
              <div className="mt-2 rounded-lg border border-white/10 p-3 bg-black/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-white/70 inline-flex items-center gap-2">
                        <HugeiconsIcon
                          icon={QrCodeIcon}
                          size={16}
                          color="#FFFFFF"
                          strokeWidth={1.5}
                        /> QR code — scan to decrypt
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => copyValue(linkToUse, "Link copied")}>
                      Copy URL
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => downloadDataUrl(qrDataUrl, "hypemoji-qr.png")}
                    >
                      <span className="inline-flex items-center gap-2">
                            <HugeiconsIcon
                              icon={Download01Icon}
                              size={16}
                              color="#FFFFFF"
                              strokeWidth={1.5}
                            /> QR
                      </span>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <img
                    src={qrDataUrl}
                    alt="QR code to decrypt"
                    className="w-40 h-40 rounded-md bg-white p-2"
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <Toast />
    </div>
  );
}

function DecryptView({ initialEmoji = "", initialKey = "", autoStart = false }) {
  const { show, Toast } = useToast();
  const [emoji, setEmoji] = useState(initialEmoji);
  const [key, setKey] = useState(initialKey.replace(/\D+/g, ""));
  const [loading, setLoading] = useState(false);
  const [decrypted, setDecrypted] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (autoStart && initialEmoji && initialKey) {
      handleDecrypt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  function onKeyChange(e) {
    setKey(e.target.value.replace(/\D+/g, ""));
  }

  async function handleDecrypt(e) {
    if (e) e.preventDefault();
    if (!emoji.trim()) {
      show("Emoji is required");
      return;
    }
    if (!key.trim()) {
      show("Number key is required");
      return;
    }
    setLoading(true);
    setDecrypted("");
    try {
      const res = await fetch(`${API_BASE}/decrypt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emoji_text: emoji.trim(),
          custom_key: key.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to decrypt");
      const data = await res.json();
      if (!data?.decrypted) throw new Error("Invalid response");
      setDecrypted(data.decrypted);
      show("Decrypted");
    } catch (err) {
      console.error(err);
      show("Decryption failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyValue(value, label = "Copied") {
    try {
      await navigator.clipboard.writeText(value);
      show(label);
    } catch {
      show("Copy failed");
    }
  }

  function resetForm() {
    setEmoji("");
    setKey("");
    setDecrypted("");
  }

  return (
    <div
      className={classNames(
        "w-full max-w-xl mx-auto border border-white/10 rounded-2xl bg-black/40 p-6",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03)]",
        "transition-all duration-300",
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
      )}
    >
      <form onSubmit={handleDecrypt} className="space-y-5">
        <Field label="Emoji">
          <TextArea
            placeholder="Paste encrypted emoji…"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
          />
        </Field>
        <Field label="Number key" hint="Digits only">
          <TextInput
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter the number key"
            value={key}
            onChange={onKeyChange}
          />
        </Field>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Decrypting…" : "Decrypt"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            disabled={loading}
          >
            Reset
          </Button>
        </div>
      </form>

      {decrypted ? (
        <div className="transition-all duration-300 mt-6">
          <Separator />
          <div className="space-y-3">
            <div className="text-sm text-white/70">Decrypted Text</div>
            <div className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 text-base">
              <div className="select-all whitespace-pre-wrap">{decrypted}</div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => copyValue(decrypted, "Text copied")}
              >
                Copy Text
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast />
    </div>
  );
}

// Shared route page: /d?e=...&k=...  -> auto-decrypts and shows ONLY the final text
function SharedDecryptPage() {
  const { show, Toast } = useToast();
  const qp = useMemo(() => new URLSearchParams(window.location.search), []);
  const emoji = qp.get("e") || "";
  const key = (qp.get("k") || "").replace(/\D+/g, "");

  const [loading, setLoading] = useState(true);
  const [decrypted, setDecrypted] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Hypemoji — Decrypted";
    return () => {
      document.title = "Hypemoji";
    };
  }, []);

  useEffect(() => {
    async function run() {
      if (!emoji || !key) {
        setError("Invalid or missing data in the link.");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/decrypt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji_text: emoji, custom_key: key }),
        });
        if (!res.ok) throw new Error("Failed to decrypt");
        const data = await res.json();
        if (!data?.decrypted) throw new Error("Invalid response");
        setDecrypted(data.decrypted);
      } catch (err) {
        console.error(err);
        setError("Decryption failed. The link may be broken.");
      } finally {
        setLoading(false);
      }
    }
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function copyText() {
    if (!decrypted) return;
    try {
      await navigator.clipboard.writeText(decrypted);
      show("Text copied");
    } catch {
      show("Copy failed");
    }
  }

  function goCreate() {
    const url = new URL(window.location.origin + "/");
    url.searchParams.set("tab", "encrypt");
    window.location.href = url.toString();
  }

  return (
    <div className="w-full max-w-xl mx-auto border border-white/10 rounded-2xl bg-black/40 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] transition-all duration-300">
      <div className="space-y-5">
        <div className="text-sm text-white/60">Decrypted Message</div>

        {loading ? (
          <div className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 text-base text-white/50">
            Decrypting…
          </div>
        ) : error ? (
          <div className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 text-base text-red-300">
            {error}
          </div>
        ) : (
          <>
            <div className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 text-base">
              <div className="select-all whitespace-pre-wrap">{decrypted}</div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={copyText}>
                Copy Text
              </Button>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-3">
          <div className="text-sm text-white/70">
            Make your message encrypt and share to your friends
          </div>
          <Button onClick={goCreate}>Create your own</Button>
        </div>
      </div>

      <Toast />
    </div>
  );
}

export default function App() {
  const isSharedRoute = window.location.pathname.startsWith("/d");

  if (isSharedRoute) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
        <div className="mb-8 text-center transition-all duration-300">
          <div className="text-2xl font-semibold tracking-tight">Hypemoji</div>
          <div className="text-sm text-white/50 mt-1">
            A fun way to share secret messages
          </div>
        </div>
        <SharedDecryptPage />
        <div className="mt-8 text-xs text-white/30">
          Black &amp; white, minimal, shadcn-inspired UI
        </div>
      </div>
    );
  }

  const qp = useQueryParams();
  const tabFromUrl = qp.get("tab");
  const startOnDecrypt = tabFromUrl === "decrypt";
  const [active, setActive] = useState(startOnDecrypt ? "decrypt" : "encrypt");

  // Prefill from shared link (legacy params supported if on main route)
  const initialEmoji = qp.get("e") || "";
  const initialKey = qp.get("k") || "";
  const autoStart = qp.get("auto") === "1";

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", active);
    window.history.replaceState({}, "", url);
  }, [active]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center transition-all duration-300">
        <img src={Logo} width="100px" className="mx-auto" alt="Hypemoji" />
        <div className="text-2xl font-semibold tracking-tight">Hypemoji</div>
        <div className="text-sm text-white/50 mt-1">
          Encrypt text ↔ emoji with a numeric key
        </div>
      </div>

      <TabSwitcher active={active} onChange={setActive} />

      {active === "encrypt" ? (
        <EncryptView />
      ) : (
        <DecryptView
          initialEmoji={initialEmoji}
          initialKey={initialKey}
          autoStart={autoStart && !!initialEmoji && !!initialKey}
        />
      )}

      <div className="mt-8 text-xs text-white/30">
        Crafted with ❤️‍🔥
      </div>
    </div>
  );
}
