import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, HardDrive, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type FileRow = { name: string; size: number; updated: string };

export function TeacherStorage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const list = async (uid: string) => {
    const { data, error } = await supabase.storage.from("teacher-files").list(uid, {
      limit: 200,
      sortBy: { column: "updated_at", order: "desc" },
    });
    if (error) return toast.error("Could not load your files.");
    setFiles(
      (data ?? [])
        .filter((f) => f.id)
        .map((f) => ({
          name: f.name,
          size: (f.metadata as any)?.size ?? 0,
          updated: f.updated_at ?? f.created_at ?? "",
        })),
    );
  };

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      setUserId(data.user.id);
      await list(data.user.id);
    })();
  }, []);

  const upload = async (fileList: FileList | null) => {
    if (!fileList || !userId) return;
    setBusy(true);
    try {
      for (const file of Array.from(fileList)) {
        const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
        const { error } = await supabase.storage.from("teacher-files").upload(path, file);
        if (error) throw new Error(error.message);
      }
      toast.success("Uploaded.");
      await list(userId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const open = async (name: string) => {
    if (!userId) return;
    const { data, error } = await supabase.storage.from("teacher-files").createSignedUrl(`${userId}/${name}`, 3600);
    if (error || !data) return toast.error("Could not open this file.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const remove = async (name: string) => {
    if (!userId) return;
    const { error } = await supabase.storage.from("teacher-files").remove([`${userId}/${name}`]);
    if (error) return toast.error("Could not delete this file.");
    await list(userId);
  };

  return (
    <div className="space-y-4">
      <div className="glass rounded-3xl p-6 text-center">
        <div className="h-12 w-12 mx-auto rounded-2xl grid place-items-center neon-glow mb-3" style={{ background: "var(--gradient-neon)" }}>
          <HardDrive className="h-6 w-6 text-white" />
        </div>
        <h3 className="font-display text-xl font-bold mb-1">Your private storage</h3>
        <p className="text-sm text-muted-foreground mb-5">Worksheets, slides, marksheets and photos — only you can see these files.</p>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => void upload(e.target.files)} />
        <button onClick={() => inputRef.current?.click()} disabled={busy || !userId}
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white neon-glow disabled:opacity-50"
          style={{ background: "var(--gradient-neon)" }}>
          <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload files"}
        </button>
        <div className="mt-2 text-[11px] text-muted-foreground">Up to 25 MB per file</div>
      </div>

      {files.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">No files yet.</div>
      ) : (
        files.map((f) => (
          <div key={f.name} className="glass rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{f.name.replace(/^\d+-/, "")}</div>
              <div className="text-[11px] text-muted-foreground">
                {(f.size / 1024).toFixed(0)} KB{f.updated ? ` · ${new Date(f.updated).toLocaleDateString()}` : ""}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => void open(f.name)} className="glass rounded-lg h-8 w-8 grid place-items-center hover:bg-white/10" aria-label="Open">
                <Download className="h-4 w-4" />
              </button>
              <button onClick={() => void remove(f.name)} className="glass rounded-lg h-8 w-8 grid place-items-center hover:bg-white/10" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
