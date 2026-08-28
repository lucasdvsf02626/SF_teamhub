import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { ServiceRingAvatar, getInitials } from "@/components/ServiceRingAvatar";
import { UserAvatar } from "@/components/UserAvatar";
import { Mail, Phone, Cake, Palmtree, ThermometerSnowflake, Award } from "lucide-react";
import { calculateYearsOfService } from '@sf/core';
import type { PresenceStatus } from "@/types";

interface TeamMemberDetailDialogProps {
  member: {
    id: string;
    display_name: string | null;
    first_name: string | null;
    surname: string | null;
    avatar_url: string | null;
    job_title: string | null;
    department: string | null;
    email: string | null;
    phone: string | null;
    bio: string | null;
    birthday: string | null;
    start_date: string | null;
    status: PresenceStatus;
    site: string | null;
    currentLeaveType: 'sick' | 'annual' | null;
    isBirthday: boolean;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TeamMemberDetailDialog({ member, open, onOpenChange }: TeamMemberDetailDialogProps) {
  if (!member) return null;

  const getName = () => {
    return member.display_name || `${member.first_name || ""} ${member.surname || ""}`.trim() || "Unknown";
  };

  const formatBirthday = () => {
    if (!member.birthday) return null;
    const date = new Date(member.birthday);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  };

  const yearsOfService = member.start_date ? calculateYearsOfService(member.start_date) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Team Member Profile</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center text-center pt-2">
          {/* Avatar - with service ring if we have start_date */}
          <div className="mb-4">
            {member.start_date && yearsOfService !== null ? (
              <ServiceRingAvatar
                src={member.avatar_url}
                fallback={getInitials(member.first_name, member.surname)}
                yearsOfService={yearsOfService}
                size="xl"
              />
            ) : (
              <UserAvatar
                firstName={member.first_name}
                surname={member.surname}
                avatarUrl={member.avatar_url}
                size="xl"
              />
            )}
          </div>

          {/* Name and badges */}
          <h2 className="text-xl font-bold text-foreground">{getName()}</h2>
          
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {member.isBirthday && (
              <Badge className="bg-pink-500 hover:bg-pink-600 text-white gap-1">
                <Cake className="h-3 w-3" />
                Birthday Today!
              </Badge>
            )}
            {member.currentLeaveType === 'sick' && (
              <Badge variant="destructive" className="gap-1">
                <ThermometerSnowflake className="h-3 w-3" />
                Off Sick
              </Badge>
            )}
            {member.currentLeaveType === 'annual' && (
              <Badge className="bg-blue-500 hover:bg-blue-600 text-white gap-1">
                <Palmtree className="h-3 w-3" />
                On Holiday
              </Badge>
            )}
          </div>

          {/* Job info */}
          <p className="text-muted-foreground mt-2">{member.job_title || "No title"}</p>
          <p className="text-sm text-muted-foreground">{member.department || "No department"}</p>

          {/* Years of service badge */}
          {yearsOfService !== null && yearsOfService >= 0 && (
            <div className="mt-3">
              <Badge variant="outline" className="gap-1">
                <Award className="h-3 w-3" />
                {yearsOfService + 1} year{yearsOfService !== 0 ? 's' : ''} of service
              </Badge>
            </div>
          )}

          {/* Status (if not on leave) */}
          {!member.currentLeaveType && (
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={member.status} size="sm" />
              {member.site && (
                <span className="text-xs text-muted-foreground">@ {member.site}</span>
              )}
            </div>
          )}

          {/* Bio */}
          {member.bio && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg w-full text-left">
              <p className="text-sm text-muted-foreground italic">"{member.bio}"</p>
            </div>
          )}

          {/* Birthday display */}
          {member.birthday && !member.isBirthday && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Cake className="h-4 w-4" />
              <span>Birthday: {formatBirthday()}</span>
            </div>
          )}

          {/* Contact buttons */}
          <div className="mt-6 flex gap-3 w-full">
            {member.email && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = `mailto:${member.email}`}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            )}
            {member.phone && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.location.href = `tel:${member.phone}`}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
