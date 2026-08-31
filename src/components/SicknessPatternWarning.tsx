import { AlertTriangle, Info, AlertCircle, TrendingUp } from "lucide-react";
import { PatternWarning, SicknessMetrics } from '@sf/core';

interface SicknessPatternWarningProps {
  currentMetrics: SicknessMetrics;
  projectedMetrics: SicknessMetrics;
  warnings: PatternWarning[];
  isLoading?: boolean;
}

export function SicknessPatternWarning({
  currentMetrics,
  projectedMetrics,
  warnings,
  isLoading,
}: SicknessPatternWarningProps) {
  if (isLoading) {
    return null;
  }

  // Show summary even if no warnings
  const hasWarnings = warnings.length > 0;
  const hasCritical = warnings.some((w) => w.severity === "critical");
  const hasWarning = warnings.some((w) => w.severity === "warning");

  const getSeverityStyles = (severity: "info" | "warning" | "critical") => {
    switch (severity) {
      case "critical":
        return "bg-destructive/10 border-destructive/30 text-destructive";
      case "warning":
        return "bg-amber-500/10 border-amber-500/30 text-amber-600";
      default:
        return "bg-blue-500/10 border-blue-500/30 text-blue-600";
    }
  };

  const getSeverityIcon = (severity: "info" | "warning" | "critical") => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-4 h-4 flex-shrink-0" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 flex-shrink-0" />;
      default:
        return <Info className="w-4 h-4 flex-shrink-0" />;
    }
  };

  const containerStyles = hasCritical
    ? "bg-destructive/5 border-destructive/20"
    : hasWarning
    ? "bg-amber-500/5 border-amber-500/20"
    : "bg-muted/50 border-border";

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${containerStyles}`}>
      {/* Summary Header */}
      <div className="flex items-center gap-2 text-sm">
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">
          Sickness this year:{" "}
          <span className="font-medium text-foreground">
            {currentMetrics.totalDays} days across {currentMetrics.spells} spell
            {currentMetrics.spells !== 1 ? "s" : ""}
          </span>
        </span>
      </div>

      {/* Pattern Warnings */}
      {hasWarnings && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pattern Detection
          </p>
          {warnings.map((warning, index) => (
            <div
              key={`${warning.type}-${index}`}
              className={`flex items-start gap-2 p-2.5 rounded-md border text-sm ${getSeverityStyles(
                warning.severity
              )}`}
            >
              {getSeverityIcon(warning.severity)}
              <div className="space-y-0.5">
                <p className="font-medium">{warning.message}</p>
                <p className="text-xs opacity-90">{warning.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className="text-xs text-muted-foreground">
        This information helps you understand how absence patterns are tracked. You can still submit
        your request.
      </p>
    </div>
  );
}
