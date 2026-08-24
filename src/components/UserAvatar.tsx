import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  firstName: string | null;
  surname: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function UserAvatar({ firstName, surname, avatarUrl, size = "md", className }: UserAvatarProps) {
  const initials = `${firstName?.[0] || ""}${surname?.[0] || ""}`.toUpperCase() || "?";
  
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
    xl: "h-20 w-20 text-2xl",
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={`${firstName} ${surname}`} />}
      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
