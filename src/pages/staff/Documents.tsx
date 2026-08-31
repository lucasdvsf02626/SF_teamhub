// My Documents (HR_V1, 19 Aug 2026 — Lee: every user uploads photo ID, proof
// of address, and right to work; camera capture with clear do/don't rules).
// Staff are signed in against the Hive database, so this page needs no edge
// function: RLS on hr_staff_documents allows self-insert only with paths
// under staff/{uid}/, and the hr-documents storage bucket enforces the same
// folder ownership. HR (Stacey, Karen) review in the Hive at /admin/hr.

import { useCallback, useEffect, useState } from "react";
import { StaffShell } from "@/components/staff/StaffShell";
import { SfCard } from "@/components/staff/SfCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Camera, CheckCircle2, Clock3, Loader2, Upload, XCircle } from "lucide-react";
import {
  DOC_GUIDANCE, IDENTITY_DOC_KEYS, PHOTO_RULES_OK, PHOTO_RULES_BAD,
  ACCEPTED_MIME, validateDocFile,
} from '@sf/core';

interface StaffDocRow {
  id: string;
  doc_key: string;
  file_path: string;
  uploaded_at: string;
  status: "submitted" | "approved" | "rejected";
  reject_reason: string | null;
}

export default function StaffDocuments() {
  const { user } = useAuth();
  const [rows, setRows] = useState<StaffDocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from("hr_staff_documents")
      .select("id, doc_key, file_path, uploaded_at, status, reject_reason")
      .eq("profile_id", user.id)
      .order("uploaded_at", { ascending: false });
    if (!error) setRows(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // newest row per doc type wins
  const latest = new Map<string, StaffDocRow>();
  rows.forEach((r) => { if (!latest.has(r.doc_key)) latest.set(r.doc_key, r); });

  const upload = async (docKey: string, file: File) => {
    if (!user) return;
    const problem = validateDocFile(file);
    if (problem) { setNotice(problem); return; }
    setUploading(docKey);
    setNotice(null);
    try {
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
      const path = `staff/${user.id}/${docKey}/${crypto.randomUUID()}-${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("hr-documents")
        .upload(path, file, { contentType: file.type || "application/octet-stream" });
      if (upErr) throw new Error("Upload failed - please try again");
      const { error: insErr } = await (supabase as any)
        .from("hr_staff_documents")
        .insert({ profile_id: user.id, doc_key: docKey, file_path: path });
      if (insErr) throw new Error("Could not record the upload - please try again");
      await load();
    } catch (e: any) {
      setNotice(e.message);
    } finally {
      setUploading(null);
    }
  };

  const chip = (r: StaffDocRow | undefined) => {
    if (!r) return <span className="inline-flex items-center gap-1 text-xs text-amber-400"><Clock3 className="h-3.5 w-3.5" /> Needed</span>;
    if (r.status === "approved") return <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Approved</span>;
    if (r.status === "rejected") return <span className="inline-flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3.5 w-3.5" /> Rejected</span>;
    return <span className="inline-flex items-center gap-1 text-xs text-sky-400"><CheckCircle2 className="h-3.5 w-3.5" /> With HR</span>;
  };

  return (
    <StaffShell>
      <h1 className="text-2xl font-semibold mb-1">My Documents</h1>
      <p className="text-sm text-muted-foreground mb-6">
        HR needs a copy of these three documents from everyone. Photograph the originals with your
        phone — they go straight to HR and nowhere else.
      </p>

      {notice && (
        <div className="mb-4 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm">{notice}</div>
      )}

      <SfCard className="mb-4">
        <div className="flex gap-2 items-start">
          <Camera className="h-4 w-4 mt-0.5 text-[hsl(var(--primary))] shrink-0" />
          <div className="text-sm space-y-2">
            <p className="font-medium text-white">Taking a good photo</p>
            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
              {PHOTO_RULES_OK.map((r) => <li key={r}>{r}</li>)}
            </ul>
            <p className="font-medium text-white pt-1">We cannot accept</p>
            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
              {PHOTO_RULES_BAD.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </div>
      </SfCard>

      <div className="space-y-4">
        {IDENTITY_DOC_KEYS.map((key) => {
          const guide = DOC_GUIDANCE[key];
          const row = latest.get(key);
          return (
            <SfCard key={key}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <h3 className="text-base font-semibold text-white">{guide.title}</h3>
                {loading ? null : chip(row)}
              </div>
              <ul className="text-xs text-muted-foreground space-y-0.5 mb-3">
                {guide.examples.map((e) => <li key={e}>• {e}</li>)}
              </ul>
              {row?.status === "rejected" && row.reject_reason && (
                <p className="text-xs text-red-400 mb-2">HR note: {row.reject_reason}</p>
              )}
              <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3.5 text-sm cursor-pointer hover:border-[hsl(var(--primary))] transition-colors">
                {uploading === key
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                  : row
                    ? <><Upload className="h-4 w-4" /> Upload a new copy</>
                    : <><Camera className="h-4 w-4" /> Take photo or choose file</>}
                <input
                  type="file"
                  accept={ACCEPTED_MIME}
                  capture="environment"
                  className="hidden"
                  disabled={!!uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(key, f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
              {row && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Last uploaded {new Date(row.uploaded_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </SfCard>
          );
        })}
      </div>
    </StaffShell>
  );
}
