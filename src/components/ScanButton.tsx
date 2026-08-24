/**
 * The one in-app QR scanner (#382 phase 1). Content-routed: it only ever acts
 * on codes we recognise, and never opens an arbitrary URL from a scan.
 *
 *  - Team Hub links (the door poster's /clock?via=wall) → internal navigation
 *    to the existing confirm sheet. This is native clock-in without waiting on
 *    App Store universal-link wiring.
 *  - HVQR1.* (someone's personal sign-in code) → explain, don't act: those are
 *    read by terminals, not phones.
 *  - Anything else → "not a Supplement Factory code".
 *
 * Native path uses ML Kit (already a project dependency); web/PWA falls back
 * to html5-qrcode in a dialog. Phase 2 (asset plates, lot labels) extends
 * routeScan() — add cases there, not new scanners.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ScanLine } from "lucide-react";

const INTERNAL_PATHS = ["/clock"]; // allowlist — scanned links may only land here

export function useScanRouter() {
  const navigate = useNavigate();
  return (raw: string): boolean => {
    const text = (raw ?? "").trim();
    if (!text) return false;
    if (text.startsWith("HVQR1.")) {
      toast({
        title: "That's a personal sign-in code",
        description: "Terminals read those — you don't need to scan your own. Use My Code to show yours.",
      });
      return true;
    }
    try {
      const url = new URL(text);
      if (INTERNAL_PATHS.includes(url.pathname)) {
        navigate(url.pathname + url.search);
        return true;
      }
    } catch {
      /* not a URL — fall through */
    }
    toast({ title: "Not a Supplement Factory code", description: "Nothing here for Team Hub to act on.", variant: "destructive" });
    return false;
  };
}

export function ScanButton({ className }: { className?: string }) {
  const [webOpen, setWebOpen] = useState(false);
  const route = useScanRouter();

  const scanNative = async () => {
    try {
      const { BarcodeScanner } = await import("@capacitor-mlkit/barcode-scanning");
      const perm = await BarcodeScanner.requestPermissions();
      if (perm.camera !== "granted" && perm.camera !== "limited") {
        toast({ title: "Camera permission needed", description: "Allow camera access in Settings to scan codes.", variant: "destructive" });
        return;
      }
      const { barcodes } = await BarcodeScanner.scan();
      const value = barcodes?.[0]?.rawValue;
      if (value) route(value);
    } catch (e: any) {
      toast({ title: "Couldn't scan", description: e?.message ?? "Camera unavailable on this device.", variant: "destructive" });
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Scan a code"
        onClick={() => (Capacitor.isNativePlatform() ? scanNative() : setWebOpen(true))}
        className={
          "h-9 w-9 grid place-items-center rounded-[10px] border border-[hsl(var(--sf-border))] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors " +
          (className ?? "")
        }
      >
        <ScanLine className="h-4 w-4" />
      </button>
      {webOpen && <WebScanDialog onClose={() => setWebOpen(false)} onResult={route} />}
    </>
  );
}

function WebScanDialog({ onClose, onResult }: { onClose: () => void; onResult: (text: string) => boolean }) {
  const regionId = "teamhub-scan-region";
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode(regionId);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded: string) => {
            scanner.stop().catch(() => undefined);
            onResult(decoded);
            onClose();
          },
          () => undefined
        );
      } catch (e: any) {
        toast({ title: "Couldn't open the camera", description: e?.message ?? "Check camera permissions.", variant: "destructive" });
        onClose();
      }
    })();
    return () => {
      cancelled = true;
      scannerRef.current?.stop?.().catch(() => undefined);
    };
  }, [onClose, onResult]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm rounded-[20px]">
        <DialogHeader>
          <DialogTitle>Scan a code</DialogTitle>
          <DialogDescription>Point at the clock-in poster by the door.</DialogDescription>
        </DialogHeader>
        <div id={regionId} className="w-full overflow-hidden rounded-[14px] bg-black min-h-[240px]" />
      </DialogContent>
    </Dialog>
  );
}
