import { GetServerSideProps } from "next";
import { supabase } from "@/lib/db";
import { decrypt } from "@/lib/crypto/aesGcm";
import { useEffect, useState } from "react";

const MASTER_KEY = Buffer.from(process.env.MASTER_KEY!, "hex");
const HOST = process.env.NEXT_PUBLIC_HOST || "http://localhost:3000";

type Props = {
  message: string;
  expiresAt: string | null;
  destroyMode: "view" | "time";
  id: string;
};

export const getServerSideProps: GetServerSideProps<Props> = async ({
  params,
}) => {
  const id = params?.id as string;
  if (!id) return { notFound: true };

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return { notFound: true };

  if (data.destroy_mode === "time" && data.expires_at) {
    const expireTime = new Date(data.expires_at);
    if (expireTime < new Date()) {
      await supabase.from("messages").delete().eq("id", id);
      return { notFound: true };
    }
  }

  // Decrypt message
  let message: string;
  try {
    message = decrypt(data.ciphertext, data.iv, data.tag, MASTER_KEY);
  } catch {
    return { notFound: true };
  }

  if (data.destroy_mode === "view") {
    await supabase.from("messages").delete().eq("id", id);
  }

  return {
    props: {
      message,
      expiresAt: data.expires_at || null,
      destroyMode: data.destroy_mode,
      id,
    },
  };
};

export default function MessagePage({ message, expiresAt, destroyMode, id }: Props) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const messageLink = `${HOST}/message/${id}`;

  useEffect(() => {
    setTimeout(() => setRevealed(true), 100);

    if (!expiresAt || destroyMode !== "time") return;

    const expireTime = new Date(expiresAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = expireTime - now;
      if (diff <= 0) {
        clearInterval(interval);
        setVisible(false);
      } else {
        setRemaining(diff);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [expiresAt, destroyMode]);

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
    return `${seconds}s`;
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(messageLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!visible) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Message Destroyed</h1>
          <p className="text-slate-600">This secret message has self-destructed and is no longer accessible.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className={`max-w-2xl w-full transition-all duration-700 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {destroyMode === "view" && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 backdrop-blur-sm">
            <span className="text-sm font-medium text-amber-400">This message will self-destruct after reading</span>
          </div>
        )}

        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50">
              <p className="text-slate-100 text-lg leading-relaxed whitespace-pre-wrap break-words">{message}</p>
            </div>
          </div>

          {destroyMode === "time" && remaining !== null && (
            <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-600/50">
              <span className="font-mono font-semibold text-slate-300">{formatTime(remaining)}</span>
            </div>
          )}

          <div className="p-4 border-t border-slate-700/50 flex justify-between items-center">
            <span className="text-slate-400 text-sm">
              {destroyMode === "view" ? "Deleted after reading" : "Will delete when timer expires"}
            </span>
            <button
              onClick={copyToClipboard}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
