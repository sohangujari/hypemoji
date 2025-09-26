import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "https://hypemoji-api.vercel.app";

function classNames(...cn) {
  return cn.filter(Boolean).join(" ");
}

function useQueryParams() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

function buildShareUrl(encrypted, key) {
  const url = new URL(window.location.href);
  url.searchParams.set("tab", "decrypt");
  url.searchParams.set("e", encrypted);
  url.searchParams.set("k", key);
  url.searchParams.set("auto", "1");
  return url.toString();
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
        <div className="px-3 py-2 rounded-md border border-white/15 bg-black/80 text-white text-sm shadow-md">
          {msg}
        </div>
      </div>
    ) : null;
  return { show: setMsg, Toast };
}

function TabSwitcher({ active, onChange }) {
  return (
    <div className="w-full flex justify-center mb-6">
      <div className="inline-flex items-center rounded-full border border-white/15 bg-black">
        {[
          { id: "encrypt", label: "Encrypt" },
          { id: "decrypt", label: "Decrypt" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={classNames(
              "px-5 py-2 text-sm transition-colors",
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
        "px-3 py-2 text-sm",
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
        "px-3 py-2 text-sm resize-y min-h-[88px]",
        props.className
      )}
    />
  );
}

function Button({ variant = "solid", className, ...props }) {
  const base =
    "px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "solid"
      ? "bg-white text-black hover:bg-white/90"
      : variant === "outline"
      ? "border border-white/20 text-white hover:border-white/40"
      : "text-white/80 hover:text-white";
  return <button {...props} className={classNames(base, styles, className)} />;
}

function Separator() {
  return <div className="h-px w-full bg-white/10 my-6" />;
}

function EncryptView() {
  const { show, Toast } = useToast();
  const [text, setText] = useState("");
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [encrypted, setEncrypted] = useState("");

  function onKeyChange(e) {
    const digitsOnly = e.target.value.replace(/\D+/g, "");
    setKey(digitsOnly);
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
      show("Encrypted");
    } catch (err) {
      console.error(err);
      show("Encryption failed");
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

  async function shareEncrypted() {
    if (!encrypted || !key) return;
    const url = buildShareUrl(encrypted, key);
    const shareData = {
      title: "Encrypted message",
      text: "Open to decrypt this message.",
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        show("Shared");
      } catch {
        // If user cancels share, do nothing
      }
    } else {
      // Fallback: copy the link
      try {
        await navigator.clipboard.writeText(url);
        show("Link copied");
      } catch {
        show("Share not supported");
      }
    }
  }

  // New: Copy Link (emoji + key in URL params)
  async function copyShareLink() {
    if (!encrypted || !key) {
      show("Nothing to copy");
      return;
    }
    const url = buildShareUrl(encrypted, key); // ?tab=decrypt&e=...&k=...&auto=1
    try {
      await navigator.clipboard.writeText(url);
      show("Link copied");
    } catch {
      show("Copy failed");
    }
  }

  function resetForm() {
    setText("");
    setKey("");
    setEncrypted("");
  }

  return (
    <div className="w-full max-w-xl mx-auto border border-white/10 rounded-2xl bg-black/40 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
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
          <TextInput
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter a number key"
            value={key}
            onChange={onKeyChange}
          />
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
        <>
          <Separator />
          <div className="space-y-3">
            <div className="text-sm text-white/70">Encrypted Emoji</div>
            <div className="w-full rounded-lg border border-white/15 bg-black px-3 py-3 text-base overflow-x-auto">
              <div className="select-all tracking-wide">{encrypted}</div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => copyValue(encrypted, "Emoji copied")}
              >
                Copy Emoji
              </Button>
              <Button variant="outline" onClick={copyShareLink}>
                Copy Link
              </Button>
              <Button onClick={shareEncrypted}>Share Link</Button>
            </div>
          </div>
        </>
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
    <div className="w-full max-w-xl mx-auto border border-white/10 rounded-2xl bg-black/40 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
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
        <>
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
        </>
      ) : null}

      <Toast />
    </div>
  );
}

export default function App() {
  const qp = useQueryParams();
  const tabFromUrl = qp.get("tab");
  const startOnDecrypt = tabFromUrl === "decrypt";
  const [active, setActive] = useState(startOnDecrypt ? "decrypt" : "encrypt");

  // Prefill from shared link
  const initialEmoji = qp.get("e") || "";
  const initialKey = qp.get("k") || "";
  const autoStart = qp.get("auto") === "1";

  useEffect(() => {
    // Keep URL tidy: update tab param without adding history entries
    const url = new URL(window.location.href);
    url.searchParams.set("tab", active);
    window.history.replaceState({}, "", url);
  }, [active]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="text-2xl font-semibold tracking-tight">Hypemoji</div>
        <div className="text-sm text-white/50 mt-1">
          Encrypt text ⇄ emoji with a numeric key
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

      <div className="mt-8 text-xs text-white/60">
        Crafted with ❤️‍🔥
      </div>
    </div>
  );
}