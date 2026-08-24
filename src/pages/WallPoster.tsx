import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
// The SOLID mark, not the white one the rest of this app uses (Lee, 12 Aug
// 2026: "Add the Supplement Factory Logo"). Everywhere else in Team Hub sits
// on a dark shell, so `sf-logo-white.png` is the house import — but this page
// is white and, more to the point, it gets PRINTED. The white mark would come
// off the printer as an invisible rectangle. Red roundel, black wordmark.
import sfLogo from "@/assets/sf-logo-solid.png";

// The door poster (Stacey's ask, 6 Aug 2026 — Hive issue #360 item 1).
// The QR is a GENERIC link, deliberately: it carries no identity. Whoever
// scans it lands on /clock?via=wall in their own signed-in session, and the
// attendance RLS pins person_id = auth.uid(), so the poster cannot clock
// anyone in by itself and nobody can be clocked in from someone else's phone.
// Print from any staff login; A4 portrait.
export default function WallPoster() {
  const url = `${window.location.origin}/clock?via=wall`;
  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-10 print:p-0 text-center">
      <div className="max-w-[560px] w-full space-y-8">
        <img
          src={sfLogo}
          alt="Supplement Factory"
          className="mx-auto w-[300px] max-w-[62%]"
        />
        <div>
          <div className="text-5xl font-extrabold tracking-tight">Clock in · Clock out</div>
          <div className="text-xl text-neutral-500 mt-2">SF Team Hub</div>
        </div>
        <div className="mx-auto w-fit p-6 rounded-3xl border-4 border-black">
          <QRCodeSVG value={url} size={320} level="M" />
        </div>
        <ol className="text-2xl font-semibold space-y-3 text-left mx-auto w-fit">
          <li>1. Scan with <u>your own</u> phone camera</li>
          <li>2. Tap <b>Confirm</b> in Team Hub</li>
        </ol>
        <p className="text-base text-neutral-500">
          Your phone is your identity — this poster can't clock anyone in or out by
          itself, and no one can scan you in from their phone.
        </p>
        <Button onClick={() => window.print()} className="print:hidden" size="lg">
          <Printer className="h-5 w-5 mr-2" /> Print poster
        </Button>
      </div>
    </div>
  );
}
