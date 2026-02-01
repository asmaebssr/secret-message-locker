import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "time">("view");
  const [ttl, setTtl] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const submitMessage = async () => {
    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }

    setLoading(true);
    setError(null);
    setLink(null);

    try {
      const res = await fetch("/api/messages/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          mode,
          ttl: mode === "time" ? ttl : null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create secret link");
      }

      const data = await res.json();
      const fullLink = data.link.startsWith("http")
      ? data.link
      : `${window.location.origin}${data.link}`;

      setLink(fullLink);

      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!link) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (err) {
        console.warn("Clipboard API failed, falling back", err);
      }
    }

    const textarea = document.createElement("textarea");
    textarea.value = link;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
  };


  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-xl mx-auto pt-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Secret Message Locker
            </h1>
          </div>

          <textarea
            className="w-full border border-slate-200 rounded-lg p-4 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none resize-none text-slate-700 placeholder-slate-400"
            rows={5}
            placeholder="Write your secret message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={loading}
          />

          <div className="mt-6 space-y-3">
            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                checked={mode === "view"}
                onChange={() => setMode("view")}
                className="w-4 h-4 text-slate-900 focus:ring-slate-900"
                disabled={loading}
              />
              <span className="text-slate-700 font-medium">Delete after first read</span>
            </label>

            <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
              <input
                type="radio"
                checked={mode === "time"}
                onChange={() => setMode("time")}
                className="w-4 h-4 text-slate-900 focus:ring-slate-900"
                disabled={loading}
              />
              <span className="text-slate-700 font-medium">Delete after time</span>
            </label>
          </div>

          {mode === "time" && (
            <select
              className="mt-4 w-full border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none text-slate-700"
              value={ttl}
              onChange={(e) => setTtl(Number(e.target.value))}
              disabled={loading}
            >
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>1 minute</option>
              <option value={300}>5 minutes</option>
            </select>
          )}

          <button
            className="mt-6 w-full px-6 py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-900 disabled:active:scale-100"
            onClick={submitMessage}
            disabled={loading || !message.trim()}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </span>
            ) : (
              "Create Secret Link"
            )}
          </button>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-900">
                {error}
              </p>
            </div>
          )}

          {link && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900 mb-2">
                Your secret link is ready:
              </p>
              <div className="flex gap-2">
                <a 
                  className="flex-1 text-green-700 hover:text-green-800 underline break-all font-mono text-sm"
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link}
                </a>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors flex-shrink-0"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}