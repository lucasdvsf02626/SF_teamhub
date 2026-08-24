/**
 * The signed-in person's rotating identity QR, on the app home screens.
 *
 * This is the same mechanism as the Hive's /my-qr page and the same edge
 * function (`user-qr`): the token is `HVQR1.<userId>.<window>.<sig>`, HMAC-signed
 * server-side, valid for a 5-minute window (plus the previous one for clock
 * skew), and **single-use** — the verify side records it in
 * `qr_token_consumptions` and refuses a second presentation. That is what makes
 * it usable as a signature rather than a name badge: a screenshot is worthless
 * once the window rolls or the code has been used once.
 *
 * The minting logic and the full-screen dialog live in QrQuickSheet.tsx and
 * are shared with the bottom-nav "My Code" button — this card is the always-on
 * embodiment of the same code.
 *
 * Scope note, deliberately reflected in the copy below: as of 5 Aug 2026 nothing
 * scans this yet — there is no terminal-side reader anywhere, and
 * `qr_token_consumptions` has never had a row. The card therefore says what the
 * code *is*, not what it can do. Widen the wording as each consuming flow
 * (clock-in, line checks, cleaning, engineering handover) actually ships.
 */
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { SfCard, SfCardHeader } from "@/components/staff/SfCard";
import { QrQuickSheet, useMyQrToken } from "@/components/QrQuickSheet";
import { Loader2, ShieldCheck, Maximize2, AlertTriangle } from "lucide-react";

export function MyQrCard({ name }: { name?: string | null }) {
  const { minted, error, mmss } = useMyQrToken(true);
  const [full, setFull] = useState(false);

  return (
    <>
      <SfCard>
        <SfCardHeader
          title="Your sign-in / sign-off code"
          subtitle="Clock in, and sign your name to checks on the floor"
          action={
            minted ? (
              <button
                type="button"
                onClick={() => setFull(true)}
                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                <Maximize2 className="h-3.5 w-3.5" /> Full screen
              </button>
            ) : undefined
          }
        />

        {error ? (
          <div className="flex items-start gap-2 py-6 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : !minted ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Generating…
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setFull(true)}
              className="rounded-xl bg-white p-3 leading-none"
              aria-label="Show my sign-in / sign-off code full screen"
            >
              <QRCodeSVG value={minted.token} size={168} level="M" />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--sf-green))]" />
              <span className="text-muted-foreground">New code in</span>
              <span className="font-mono font-semibold tabular-nums text-white">{mmss}</span>
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground text-center max-w-[15rem]">
              Rotates every 5 minutes and works once. Don't screenshot it or pass it on —
              anything signed with it is recorded as you.
            </p>
          </div>
        )}
      </SfCard>

      <QrQuickSheet open={full} onOpenChange={setFull} name={name} />
    </>
  );
}
