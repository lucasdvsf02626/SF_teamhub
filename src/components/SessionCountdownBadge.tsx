import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionCountdownBadgeProps {
  secondsRemaining: number;
  showWarning: boolean;
  onExtend: () => Promise<boolean>;
}

export function SessionCountdownBadge({ 
  secondsRemaining, 
  showWarning,
  onExtend 
}: SessionCountdownBadgeProps) {
  if (!showWarning || secondsRemaining <= 0) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isUrgent = secondsRemaining <= 30;

  return (
    <button
      onClick={onExtend}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all animate-pulse cursor-pointer",
        isUrgent 
          ? "bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30" 
          : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
      )}
      title="Click to extend session"
    >
      <Clock className="w-3.5 h-3.5" />
      <span className="tabular-nums">{formatTime(secondsRemaining)}</span>
    </button>
  );
}
