import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Clock, Layout, Smartphone, Eye } from "lucide-react";

interface OnboardingScreenProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Clock,
    title: "No more guesswork",
    description: "Your hours, shifts, and attendance are logged accurately without manual forms or follow-ups.",
  },
  {
    icon: Layout,
    title: "Everything in one place",
    description: "Shifts, holidays, and sickness reporting live in a single app that stays in sync automatically.",
  },
  {
    icon: Smartphone,
    title: "Works around your day",
    description: "Use your phone or a kiosk. Automatic check-in or QR scanning – whatever suits how you work.",
  },
  {
    icon: Eye,
    title: "Clear and transparent",
    description: "You can see what's recorded, when it's recorded, and what's coming up.",
  },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className="min-h-screen gradient-hero flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <h2 className="text-sm font-medium text-primary uppercase tracking-wider mb-8">
          Why you'll like using this app
        </h2>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-8 bg-primary"
                  : i < currentStep
                  ? "w-4 bg-primary/50"
                  : "w-4 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="card-industrial p-8 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Icon className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-3">{step.title}</h3>
          <p className="text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button onClick={handleNext} size="lg" className="w-full gap-2">
            {currentStep < steps.length - 1 ? (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Get Started
              </>
            )}
          </Button>
          {currentStep < steps.length - 1 && (
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip
            </button>
          )}
        </div>

        {/* Closing line on last step */}
        {currentStep === steps.length - 1 && (
          <p className="text-xs text-muted-foreground mt-6">
            Designed to support you at work – quietly, securely, and reliably.
            <br />
            <span className="text-green-400">Powered by Panacea.</span>
          </p>
        )}
      </div>
    </div>
  );
}
