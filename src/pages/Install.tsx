import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QRCodeSVG } from "qrcode.react";
import { 
  Smartphone, 
  Download, 
  Share2, 
  Plus, 
  MoreVertical,
  CheckCircle2,
  ArrowRight,
  Monitor
} from "lucide-react";
import { Link } from "react-router-dom";

type DeviceType = "ios" | "android" | "desktop" | "unknown";

const Install = () => {
  const [deviceType, setDeviceType] = useState<DeviceType>("unknown");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Detect device type
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType("ios");
    } else if (/android/.test(userAgent)) {
      setDeviceType("android");
    } else {
      setDeviceType("desktop");
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const appUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-hero py-16 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6 shadow-lg glow-primary">
            <span className="text-3xl font-black text-primary-foreground">SF</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Install SF:Team Hub
          </h1>
          <p className="text-muted-foreground text-lg">
            Your workday, made easier. Add to your home screen for quick access.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {isInstalled ? (
          <Card className="card-industrial text-center py-10">
            <CardContent>
              <CheckCircle2 className="w-16 h-16 text-status-on-site mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Already Installed!</h2>
              <p className="text-muted-foreground mb-6">
                SF:Team Hub is installed on your device. You can access it from your home screen.
              </p>
              <Link to="/app">
                <Button size="lg" className="gap-2">
                  Open App
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Native Install Button */}
            {deferredPrompt && (
              <Card className="card-industrial border-primary/50">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Download className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        Quick Install Available
                      </h3>
                      <p className="text-muted-foreground">
                        Click the button to install the app directly
                      </p>
                    </div>
                    <Button size="lg" onClick={handleInstallClick} className="gap-2">
                      <Download className="w-5 h-5" />
                      Install Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Device-specific instructions */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* iOS Instructions */}
              <Card className={`card-industrial ${deviceType === "ios" ? "ring-2 ring-primary" : ""}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Smartphone className="w-6 h-6 text-primary" />
                    iPhone / iPad
                    {deviceType === "ios" && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Your device
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>Safari browser required</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Open in Safari</p>
                      <p className="text-sm text-muted-foreground">
                        Make sure you're viewing this page in Safari
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        Tap the Share button
                        <Share2 className="w-4 h-4 text-muted-foreground" />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        At the bottom of your screen
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        Tap "Add to Home Screen"
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Scroll down in the share menu to find it
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Tap "Add"</p>
                      <p className="text-sm text-muted-foreground">
                        The app icon will appear on your home screen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Android Instructions */}
              <Card className={`card-industrial ${deviceType === "android" ? "ring-2 ring-primary" : ""}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Smartphone className="w-6 h-6 text-status-on-site" />
                    Android
                    {deviceType === "android" && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        Your device
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>Chrome browser recommended</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Open in Chrome</p>
                      <p className="text-sm text-muted-foreground">
                        Make sure you're viewing this page in Chrome
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        Tap the menu button
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Three dots in the top right corner
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-sm font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        Tap "Install app" or "Add to Home screen"
                      </p>
                      <p className="text-sm text-muted-foreground">
                        You may see either option
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-status-on-site flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Confirm Installation</p>
                      <p className="text-sm text-muted-foreground">
                        The app will be added to your home screen
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Desktop */}
            {deviceType === "desktop" && !deferredPrompt && (
              <Card className="card-industrial">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Monitor className="w-6 h-6 text-status-remote" />
                    Desktop Browser
                  </CardTitle>
                  <CardDescription>Chrome, Edge, or Brave recommended</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Look for the install icon in your browser's address bar, or use the menu to find "Install SF:Team Hub" option.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* QR Code */}
            <Card className="card-industrial">
              <CardHeader className="text-center">
                <CardTitle>Share with Others</CardTitle>
                <CardDescription>
                  Scan this QR code to open the install page on another device
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeSVG value={`${appUrl}/install`} size={180} />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer */}
        <div className="text-center pt-6">
          <Link to="/auth">
            <Button variant="outline" size="lg">
              Continue to Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

// Type for beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default Install;
