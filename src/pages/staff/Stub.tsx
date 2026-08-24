import { StaffShell } from "@/components/staff/StaffShell";
import { SfCard } from "@/components/staff/SfCard";

export default function StaffStub({ title, blurb }: { title: string; blurb: string }) {
  return (
    <StaffShell>
      <h1 className="text-2xl font-semibold mb-1">{title}</h1>
      <p className="text-sm text-muted-foreground mb-6">{blurb}</p>
      <SfCard>
        <p className="text-sm text-muted-foreground">This screen is coming soon. In the meantime, head back to the Dashboard.</p>
      </SfCard>
    </StaffShell>
  );
}
