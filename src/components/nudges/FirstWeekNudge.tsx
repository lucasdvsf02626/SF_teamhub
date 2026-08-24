import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { differenceInDays } from "date-fns";

interface FirstWeekNudgeProps {
  /** User's account creation date (ISO string) */
  createdAt: string | undefined;
}

const nudges = [
  {
    day: 0,
    text: "Tip: You can check in using your phone or a kiosk – use whichever suits your day.",
  },
  {
    day: 1,
    text: "Did you know? Shift updates appear automatically so you don't need to chase information.",
  },
  {
    day: 2,
    text: "Quick win: Booking holiday here updates everything in one go – no follow-ups needed.",
  },
  {
    day: 4,
    text: "Good to know: You can always see what's been logged for you.",
  },
];

export function FirstWeekNudge({ createdAt }: FirstWeekNudgeProps) {
  const [dismissed, setDismissed] = useState(false);
  const [nudgeText, setNudgeText] = useState<string | null>(null);

  useEffect(() => {
    if (!createdAt) return;

    const daysSinceCreation = differenceInDays(new Date(), new Date(createdAt));

    // Only show during first 5 days
    if (daysSinceCreation > 4) return;

    // Check which nudges have been dismissed
    const dismissedNudges = JSON.parse(
      localStorage.getItem("sf_dismissed_nudges") || "[]"
    ) as number[];

    // Find the appropriate nudge for today
    const applicableNudge = nudges.find(
      (n) => daysSinceCreation >= n.day && !dismissedNudges.includes(n.day)
    );

    // Show the most recent applicable nudge
    if (applicableNudge) {
      setNudgeText(applicableNudge.text);
    }
  }, [createdAt]);

  const handleDismiss = () => {
    if (!createdAt) return;
    const daysSinceCreation = differenceInDays(new Date(), new Date(createdAt));
    const dismissedNudges = JSON.parse(
      localStorage.getItem("sf_dismissed_nudges") || "[]"
    ) as number[];
    
    // Dismiss current day's nudge
    const currentNudge = nudges.find((n) => daysSinceCreation >= n.day);
    if (currentNudge) {
      dismissedNudges.push(currentNudge.day);
      localStorage.setItem("sf_dismissed_nudges", JSON.stringify(dismissedNudges));
    }
    
    setDismissed(true);
  };

  if (dismissed || !nudgeText) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
      <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
      <p className="text-sm text-foreground flex-1">{nudgeText}</p>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        aria-label="Dismiss tip"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
