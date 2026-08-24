/**
 * The full-screen presentation of the rotating identity QR, plus the minting
 * hook it shares with MyQrCard.
 *
 * Same mechanism as the Hive's /my-qr page and the same edge function
 * (`user-qr`): the token is `HVQR1.<userId>.<window>.<sig>`, HMAC-signed
 * server-side, valid for a 5-minute window (plus the previous one for clock
 * skew), and single-use on the verify side. The signing secret never leaves
 * the edge function — this code only asks for the current token and draws it.
 *
 * Extracted from MyQrCard (6 Aug 2026) so the bottom-nav "My Code" button can
 * open the exact same full-screen dialog from any page without duplicating the
 * mint/refresh logic. The hook is `enabled`-gated: the nav button only mints
 * while the sheet is actually open, whereas the dashboard card keeps a live
 * token on screen the whole time.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertTriangle, Loader2, QrCode } from "lucide-react";

export interface MintedQr {
  token: string;
  expires_at: string;
  window_secs: number;
}

export function useMyQrToken(enabled: boolean) {
  const [minted, setMinted] = useState<MintedQr | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("user-qr", {
        body: { action: "mint" },
      });
      if (fnErr) throw new Error(fnErr.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const m = data as MintedQr;
      setMinted(m);
      setError(null);
      // Re-mint just after this window rolls over, so the code on screen is
      // never the expired one.
      const ms = Math.max(1000, new Date(m.expires_at).getTime() - Date.now() + 500);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(refresh, ms);
    } catch (e: any) {
      setError(e?.message ?? "Could not generate your code");
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Drop the token when hidden: a code re-shown minutes later would be a
      // stale (possibly consumed) one — better a brief "Generating…" on reopen.
      setMinted(null);
      return;
    }
    refresh();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [enabled]);

  const remainingS = minted
    ? Math.max(0, Math.round((new Date(minted.expires_at).getTime() - nowMs) / 1000))
    : 0;
  const mmss = `${Math.floor(remainingS / 60)}:${String(remainingS % 60).padStart(2, "0")}`;

  return { minted, error, mmss };
}

/**
 * Full screen: a phone held up to a terminal camera needs the code big and
 * the screen bright, with nothing else competing for the lens.
 */
export function QrQuickSheet({
  open,
  onOpenChange,
  name,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name?: string | null;
}) {
  const { minted, error, mmss } = useMyQrToken(open);

  return (
    // modal={false}: the dock must stay visible and tappable under the code —
    // this is a glance-and-go identity sheet, and swallowing the footer read
    // as "the app lost its nav" in UAT (Lee, 6 Aug). Tab taps also dismiss.
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        hideOverlay
        className="max-w-sm bg-white border-0 p-6 bottom-24 top-auto translate-y-0 sm:bottom-auto sm:top-[50%] sm:translate-y-[-50%]"
        onInteractOutside={() => onOpenChange(false)}
      >
        <div className="text-left">
          <div className="text-lg font-extrabold text-neutral-900">Your sign-in / sign-off code</div>
          <div className="text-xs text-neutral-500">Clock in, and sign your name to checks on the floor</div>
        </div>
        <div className="flex flex-col items-center gap-4">
          {error ? (
            <div className="flex items-start gap-2 py-10 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : !minted ? (
            <div className="flex items-center justify-center gap-2 py-24 text-sm text-neutral-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </div>
          ) : (
            <QRCodeSVG value={minted.token} size={260} level="M" />
          )}
          <div className="text-center">
            {name && <p className="text-base font-semibold text-neutral-900">{name}</p>}
            <p className="text-xs text-neutral-500 mt-0.5 flex items-center justify-center gap-1.5">
              <QrCode className="h-3.5 w-3.5" /> New code in{" "}
              <span className="font-mono font-semibold tabular-nums">{mmss}</span>
            </p>
          </div>
          <p className="text-[11px] text-neutral-500 text-center">
            Rotates every 5 minutes and works once. Don't screenshot it or pass
            it on — anything signed with it is recorded as you.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
