import { AlertTriangle, TrendingUp, Calendar, Activity, FileText, Paperclip } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SicknessMetrics, PatternWarning } from '@sf/core';

interface ManagerPatternAlertProps {
  userId: string;
  employeeName: string;
  currentMetrics: SicknessMetrics;
  warnings: PatternWarning[];
  certificateUrl?: string | null;
  certificateFilename?: string | null;
}

export function ManagerPatternAlert({
  userId,
  employeeName,
  currentMetrics,
  warnings,
  certificateUrl,
  certificateFilename,
}: ManagerPatternAlertProps) {
  const getSeverityColor = (severity: PatternWarning["severity"]) => {
    switch (severity) {
      case "critical":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "warning":
        return "bg-amber-500/10 text-amber-600 border-amber-500/30";
      case "info":
        return "bg-blue-500/10 text-blue-600 border-blue-500/30";
    }
  };

  const getBradfordColor = (score: number) => {
    if (score >= 200) return "text-destructive";
    if (score >= 50) return "text-amber-600";
    return "text-muted-foreground";
  };

  return (
    <div className="mt-4 p-4 bg-secondary/30 rounded-lg border border-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Sickness Pattern Analysis</span>
        </div>
        {/* Full absence report lives in the Hive admin now. */}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-background/50 rounded-lg p-2">
          <p className={`text-lg font-bold ${getBradfordColor(currentMetrics.bradfordScore)}`}>
            {currentMetrics.bradfordScore}
          </p>
          <p className="text-xs text-muted-foreground">Bradford Score</p>
        </div>
        <div className="bg-background/50 rounded-lg p-2">
          <p className="text-lg font-bold text-foreground">{currentMetrics.totalDays}</p>
          <p className="text-xs text-muted-foreground">Total Days</p>
        </div>
        <div className="bg-background/50 rounded-lg p-2">
          <p className="text-lg font-bold text-foreground">{currentMetrics.spells}</p>
          <p className="text-xs text-muted-foreground">Spells</p>
        </div>
      </div>

      {/* Certificate Attachment */}
      {certificateUrl && (
        <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg p-2">
          <Paperclip className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground flex-1">
            Certificate attached: {certificateFilename || "Document"}
          </span>
          <a
            href={certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View
          </a>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.slice(0, 3).map((warning, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 p-2 rounded-lg border ${getSeverityColor(warning.severity)}`}
            >
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{warning.message}</p>
              </div>
            </div>
          ))}
          {warnings.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              +{warnings.length - 3} more patterns detected
            </p>
          )}
        </div>
      )}

      {warnings.length === 0 && currentMetrics.totalDays > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          No concerning patterns detected
        </p>
      )}
    </div>
  );
}
