import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import teamHubLogo from "@/assets/teamhub-logo.png";
import sfLogoWhite from "@/assets/sf-logo-white.png";
import {
  Clock,
  ArrowRight,
  Smartphone,
  Monitor,
  Users,
  CalendarCheck,
  Repeat,
  Heart,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Quote,
  CheckCircle2,
} from "lucide-react";

const trustLogos = ["Greene & Co.", "Northbar", "Hatton Hospitality", "Sablé Group", "Foundry & Fern"];

const testimonials = [
  {
    name: "Marcus Thompson",
    role: "Ops Director, Northbar",
    quote:
      "We replaced three spreadsheets and a WhatsApp group with Team Hub. Clock-in disputes went from weekly to never.",
  },
  {
    name: "Priya Shah",
    role: "GM, Hatton Hospitality",
    quote:
      "Time-off requests now take 20 seconds instead of 20 minutes. The team actually enjoys using it.",
  },
  {
    name: "Jamie Okafor",
    role: "People Lead, Greene & Co.",
    quote:
      "Real attendance data, no more guesswork on payroll. Worth every minute of the rollout.",
  },
];

const Index = () => {
  const { user } = useAuth();
  const appHref = user ? "/dashboard" : "/auth";

  // Cosmetic ticking clock
  const [seconds, setSeconds] = useState(13378);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const fmt = (n: number) =>
    `${String(Math.floor(n / 3600)).padStart(2, "0")}:${String(Math.floor((n % 3600) / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

  const [tIndex, setTIndex] = useState(0);
  const t = testimonials[tIndex];

  return (
    <div className="min-h-screen bg-black text-white">

      {/* HERO */}
      <section className="relative overflow-hidden bg-black">
        <div className="container mx-auto px-6 pt-20 pb-12 lg:pt-28 lg:pb-20 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-10">
              <div className="flex items-center gap-6">
                <img
                  src={teamHubLogo}
                  alt="TeamHub"
                  className="h-24 w-24 md:h-32 md:w-32 rounded-2xl"
                />
                <div className="border-l border-[hsl(var(--sf-border))] pl-6 text-left">
                  <h2 className="font-bold text-4xl md:text-5xl text-white leading-none">
                    Team Hub
                  </h2>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs md:text-sm uppercase tracking-[0.3em] text-muted-foreground font-medium">
                      Powered by
                    </span>
                    <span
                      className="text-xs md:text-sm uppercase tracking-[0.3em] text-green-400 animate-panacea-pulse cursor-default"
                      style={{ textShadow: "0 0 10px rgba(74,222,128,0.6)" }}
                    >
                      PANACEA
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-balance">
              Your workday,{" "}
              <span className="bg-gradient-to-r from-primary via-[hsl(37_91%_65%)] to-[hsl(28_95%_55%)] bg-clip-text text-transparent">
                made effortless.
              </span>
            </h1>

            <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
              Clock in, manage shifts, notify sickness, and book time off — all in one place.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-8">
              <Link to={appHref}>
                <Button
                  size="xl"
                  className="gap-2 px-12 h-16 rounded-full bg-gradient-to-tr from-orange-700 via-orange-500 to-yellow-400 text-black font-bold uppercase tracking-wider ring-2 ring-amber-300/70 ring-offset-2 ring-offset-black shadow-[0_10px_30px_-10px_hsl(24_95%_53%/0.7)] hover:brightness-110 active:scale-[0.99]"
                >
                  <Smartphone className="w-5 h-5" />
                  {user ? "Open App" : "Open App"}
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <img src={sfLogoWhite} alt="Supplement Factory" className="w-4/5 max-w-md mt-10" />
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};

export default Index;
