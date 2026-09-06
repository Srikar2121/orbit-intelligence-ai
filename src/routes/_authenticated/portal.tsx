import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Files,
  Megaphone,
  Pin,
  Plus,
  Trash2,
  Video,
  Mail,
} from "lucide-react";
import { Blobs } from "@/components/Blobs";
import {
  getPortal,
  joinAsTeacher,
  savePost,
  deletePost,
  saveEvent,
  deleteEvent,
  updateReminderPrefs,
} from "@/lib/portal.functions";

export const Route = createFileRoute("/_authenticated/portal")({
  head: () => ({
    meta: [
      { title: "Teachers' Portal · OrbitIntelligenceAI" },
      { name: "description", content: "Post lesson plans, resources and announcements, and manage the school event calendar." },
      { property: "og:title", content: "Teachers' Portal · OrbitIntelligenceAI" },
      { property: "og:description", content: "A private staff space for lesson plans, resources, announcements and events." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortalPage,
});

type Tab = "announcement" | "lesson_plan" | "resource" | "calendar";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "announcement", label: "Announcements", icon: Megaphone },
  { id: "lesson_plan", label: "Lesson plans", icon: BookOpen },
  { id: "resource", label: "Resources", icon: Files },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
];

type PortalData = Awaited<ReturnType<typeof getPortal>>;

function PortalPage() {
  const load = useServerFn(getPortal);
  const join = useServerFn(joinAsTeacher);
  const postSave = useServerFn(savePost);
  const postDelete = useServerFn(deletePost);
  const eventSave = useServerFn(saveEvent);
  const eventDelete = useServerFn(deleteEvent);
  const prefsSave = useServerFn(updateReminderPrefs);

  const [data, setData] = useState<PortalData | null>(null);
  const [tab, setTab] = useState<Tab>("announcement");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      setData(await load({}));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load the portal.");
    }
  };
  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    return (
      <Shell>
        <div className="glass rounded-3xl p-10 text-center text-sm text-muted-foreground">Loading your portal…</div>
      </Shell>
    );
  }

  if (!data.isTeacher) {
    return (
      <Shell>
        <JoinCard
          busy={busy}
          onJoin={async (email) => {
            setBusy(true);
            try {
              await join({ data: { contactEmail: email } });
              toast.success("You're in — welcome, teacher ✨");
              await refresh();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not join.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </Shell>
    );
  }

  const posts = data.posts.filter((p) => p.category === tab);

  return (
    <Shell>
      <div className="flex flex-wrap gap-1 glass rounded-2xl p-1 mb-6">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                active ? "text-white neon-glow" : "text-muted-foreground hover:text-white"
              }`}
              style={active ? { background: "var(--gradient-neon)" } : undefined}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "calendar" ? (
        <CalendarTab
          events={data.events}
          profile={data.profile}
          onSave={async (payload) => {
            await eventSave({ data: payload });
            await refresh();
          }}
          onDelete={async (id) => {
            await eventDelete({ data: { id } });
            await refresh();
          }}
          onPrefs={async (contactEmail, remindersEnabled) => {
            await prefsSave({ data: { contactEmail, remindersEnabled } });
            toast.success("Reminder settings saved.");
            await refresh();
          }}
        />
      ) : (
        <PostsTab
          category={tab}
          posts={posts}
          onSave={async (payload) => {
            await postSave({ data: payload });
            await refresh();
          }}
          onDelete={async (id) => {
            await postDelete({ data: { id } });
            await refresh();
          }}
        />
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen mode-genz">
      <Blobs variant="genz" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link to="/" className="glass rounded-xl h-10 px-3 flex items-center gap-2 text-sm hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold gradient-text">Teachers' Portal</h1>
          <Link to="/chat" className="glass rounded-xl h-10 px-3 flex items-center text-sm hover:bg-white/10">
            Chat
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}

function JoinCard({ busy, onJoin }: { busy: boolean; onJoin: (email: string) => void }) {
  const [email, setEmail] = useState("");
  return (
    <div className="glass gradient-border rounded-3xl p-8 max-w-lg mx-auto text-center">
      <div className="h-12 w-12 mx-auto rounded-2xl grid place-items-center neon-glow mb-4" style={{ background: "var(--gradient-neon)" }}>
        <BookOpen className="h-6 w-6 text-white" />
      </div>
      <h2 className="font-display text-2xl font-bold mb-2">Join as a teacher</h2>
      <p className="text-sm text-muted-foreground mb-6">
        The portal is for teachers only. Add the email address where you'd like event reminders, and you're in.
      </p>
      <div className="glass rounded-xl flex items-center gap-2 px-3 mb-4">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@school.com"
          className="bg-transparent flex-1 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <button
        disabled={busy || !email}
        onClick={() => onJoin(email)}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-white neon-glow disabled:opacity-50"
        style={{ background: "var(--gradient-neon)" }}
      >
        {busy ? "…" : "Enter the portal"}
      </button>
    </div>
  );
}

type Post = PortalData["posts"][number];

function PostsTab({
  category,
  posts,
  onSave,
  onDelete,
}: {
  category: "announcement" | "lesson_plan" | "resource";
  posts: Post[];
  onSave: (p: { id?: string; category: typeof category; title: string; body: string; linkUrl?: string; pinned: boolean }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setTitle("");
    setBody("");
    setLinkUrl("");
    setPinned(false);
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      {open ? (
        <div className="glass rounded-2xl p-5 space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the details…"
            rows={5}
            className="w-full glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none resize-y"
          />
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="Optional link (https://…)"
            className="w-full glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to the top
          </label>
          <div className="flex gap-2">
            <button
              disabled={busy || !title}
              onClick={async () => {
                setBusy(true);
                try {
                  await onSave({ category, title, body, linkUrl: linkUrl || undefined, pinned });
                  toast.success("Posted.");
                  reset();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not save.");
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white neon-glow disabled:opacity-50"
              style={{ background: "var(--gradient-neon)" }}
            >
              Publish
            </button>
            <button onClick={reset} className="glass rounded-xl px-4 py-2 text-sm hover:bg-white/10">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white neon-glow"
          style={{ background: "var(--gradient-neon)" }}
        >
          <Plus className="h-4 w-4" /> New {category === "lesson_plan" ? "lesson plan" : category === "resource" ? "resource" : "announcement"}
        </button>
      )}

      {posts.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">Nothing here yet.</div>
      )}

      {posts.map((p) => (
        <div key={p.id} className="glass rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {p.pinned && <Pin className="h-3.5 w-3.5 text-cyan-accent" />}
                <h3 className="font-semibold">{p.title}</h3>
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {new Date(p.created_at).toLocaleString()}
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  await onDelete(p.id);
                } catch {
                  toast.error("Only the author can delete this.");
                }
              }}
              className="glass rounded-lg h-8 w-8 grid place-items-center hover:bg-white/10"
              aria-label="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {p.body && <p className="mt-3 text-sm whitespace-pre-wrap text-foreground/90">{p.body}</p>}
          {p.link_url && (
            <a href={p.link_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-xs underline text-cyan-accent">
              {p.link_url}
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

type EventRow = PortalData["events"][number];

function CalendarTab({
  events,
  profile,
  onSave,
  onDelete,
  onPrefs,
}: {
  events: EventRow[];
  profile: PortalData["profile"];
  onSave: (p: {
    title: string;
    description?: string;
    startsAt: string;
    endsAt?: string;
    meetUrl?: string;
    remindDaily: boolean;
    remindUntil?: string;
  }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPrefs: (email: string, enabled: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", startsAt: "", endsAt: "", meetUrl: "", remindDaily: false, remindUntil: "" });
  const [email, setEmail] = useState(profile?.contact_email ?? "");
  const [enabled, setEnabled] = useState(profile?.reminders_enabled ?? true);
  const [busy, setBusy] = useState(false);

  const upcoming = useMemo(
    () => [...events].sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
    [events],
  );

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Mail className="h-4 w-4 text-cyan-accent" />
          <h3 className="font-semibold text-sm">Reminder emails</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@school.com"
            className="flex-1 glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none"
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground px-2">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Daily reminders
          </label>
          <button
            onClick={() => void onPrefs(email, enabled)}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white neon-glow"
            style={{ background: "var(--gradient-neon)" }}
          >
            Save
          </button>
        </div>
      </div>

      {open ? (
        <div className="glass rounded-2xl p-5 space-y-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Event title"
            className="w-full glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3}
            className="w-full glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none resize-y" />
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">Starts
              <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none mt-1" />
            </label>
            <label className="text-xs text-muted-foreground">Ends
              <input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
                className="w-full glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none mt-1" />
            </label>
          </div>
          <input value={form.meetUrl} onChange={(e) => setForm({ ...form, meetUrl: e.target.value })} placeholder="Meet link (https://meet.google.com/…)"
            className="w-full glass rounded-xl px-3 py-2.5 text-sm bg-transparent outline-none" />
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={form.remindDaily} onChange={(e) => setForm({ ...form, remindDaily: e.target.checked })} /> Daily reminder email
            </label>
            <label className="text-xs text-muted-foreground flex items-center gap-2">
              until
              <input type="date" value={form.remindUntil} onChange={(e) => setForm({ ...form, remindUntil: e.target.value })}
                className="glass rounded-xl px-3 py-2 text-sm bg-transparent outline-none" />
            </label>
          </div>
          <div className="flex gap-2">
            <button
              disabled={busy || !form.title || !form.startsAt}
              onClick={async () => {
                setBusy(true);
                try {
                  await onSave({
                    title: form.title,
                    description: form.description || undefined,
                    startsAt: form.startsAt,
                    endsAt: form.endsAt || undefined,
                    meetUrl: form.meetUrl || undefined,
                    remindDaily: form.remindDaily,
                    remindUntil: form.remindUntil || undefined,
                  });
                  toast.success("Event added.");
                  setForm({ title: "", description: "", startsAt: "", endsAt: "", meetUrl: "", remindDaily: false, remindUntil: "" });
                  setOpen(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not save.");
                } finally {
                  setBusy(false);
                }
              }}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white neon-glow disabled:opacity-50"
              style={{ background: "var(--gradient-neon)" }}
            >
              Add event
            </button>
            <button onClick={() => setOpen(false)} className="glass rounded-xl px-4 py-2 text-sm hover:bg-white/10">Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white neon-glow"
          style={{ background: "var(--gradient-neon)" }}>
          <Plus className="h-4 w-4" /> New event
        </button>
      )}

      {upcoming.map((ev) => (
        <div key={ev.id} className="glass rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold">{ev.title}</h3>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {new Date(ev.starts_at).toLocaleString()}
                {ev.ends_at ? ` – ${new Date(ev.ends_at).toLocaleTimeString()}` : ""}
              </div>
            </div>
            <button onClick={() => void onDelete(ev.id)} className="glass rounded-lg h-8 w-8 grid place-items-center hover:bg-white/10" aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {ev.description && <p className="mt-3 text-sm text-foreground/90 whitespace-pre-wrap">{ev.description}</p>}
          {ev.meet_url && (
            <a href={ev.meet_url} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white neon-glow"
              style={{ background: "var(--gradient-neon)" }}>
              <Video className="h-4 w-4" /> Join meet
            </a>
          )}
          {ev.remind_daily && (
            <div className="mt-2 text-[11px] text-muted-foreground">
              Daily reminders{ev.remind_until ? ` until ${new Date(ev.remind_until).toLocaleDateString()}` : ""}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
