import { GetServerSideProps } from "next";
import { supabase } from "@/lib/db";
import { decrypt } from "@/lib/crypto/aesGcm";
import { useEffect, useState } from "react";

const MASTER_KEY = Buffer.from(process.env.MASTER_KEY!, "hex");

type Props = {
  message: string;
  expiresAt: string | null;
  destroyMode: "view" | "time";
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

  // Decrypt
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
    },
  };
};

export default function MessagePage({ message, expiresAt, destroyMode }: Props) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [visible, setVisible] = useState(true);
  const [revealed, setRevealed] = useState(false);

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

  if (!visible) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
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
            <div className="flex items-center gap-2 text-amber-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium">This message will self-destruct after reading</span>
            </div>
          </div>
        )}

        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 p-6 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Secret Message</h1>
                  <p className="text-sm text-slate-400">Encrypted and secure</p>
                </div>
              </div>

              {remaining !== null && (
                <div className="flex items-center gap-2 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-600/50">
                  <svg className={`w-5 h-5 ${remaining < 10000 ? 'text-red-400' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className={`font-mono font-semibold ${remaining < 10000 ? 'text-red-400' : 'text-slate-300'}`}>
                    {formatTime(remaining)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="p-8">
            <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700/50">
              <p className="text-slate-100 text-lg leading-relaxed whitespace-pre-wrap break-words">
                {message}
              </p>
            </div>
          </div>

          <div className="bg-slate-900/30 p-4 border-t border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                {destroyMode === "view" 
                  ? "This message has been deleted from our servers" 
                  : "This message will be automatically deleted when the timer expires"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}