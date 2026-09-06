import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CATEGORIES = ["announcement", "lesson_plan", "resource"] as const;

export const getPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: roles }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("display_name, username, contact_email, reminders_enabled").eq("id", userId).maybeSingle(),
    ]);

    const isTeacher = (roles ?? []).some((r) => r.role === "teacher");
    if (!isTeacher) {
      return { isTeacher: false as const, profile: profile ?? null, posts: [], events: [] };
    }

    const [{ data: posts }, { data: events }] = await Promise.all([
      supabase
        .from("portal_posts")
        .select("id, author_id, category, title, body, link_url, pinned, created_at")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("portal_events")
        .select("id, created_by, title, description, starts_at, ends_at, meet_url, remind_daily, remind_until")
        .order("starts_at", { ascending: true })
        .limit(200),
    ]);

    return { isTeacher: true as const, profile: profile ?? null, posts: posts ?? [], events: events ?? [] };
  });

export const joinAsTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ contactEmail: z.string().email().max(200) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error: roleErr } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "teacher" }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);

    const { error: profErr } = await supabase
      .from("profiles")
      .update({ contact_email: data.contactEmail.trim().toLowerCase(), reminders_enabled: true })
      .eq("id", userId);
    if (profErr) throw new Error(profErr.message);
    return { ok: true };
  });

export const updateReminderPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ contactEmail: z.string().email().max(200), remindersEnabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ contact_email: data.contactEmail.trim().toLowerCase(), reminders_enabled: data.remindersEnabled })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const savePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        category: z.enum(CATEGORIES),
        title: z.string().min(1).max(160),
        body: z.string().max(20000).default(""),
        linkUrl: z.string().url().max(500).optional().or(z.literal("")),
        pinned: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const row = {
      author_id: context.userId,
      category: data.category,
      title: data.title,
      body: data.body,
      link_url: data.linkUrl ? data.linkUrl : null,
      pinned: data.pinned,
    };
    const q = data.id
      ? context.supabase.from("portal_posts").update(row).eq("id", data.id)
      : context.supabase.from("portal_posts").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("portal_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().min(1).max(160),
        description: z.string().max(4000).optional(),
        startsAt: z.string().min(1),
        endsAt: z.string().optional(),
        meetUrl: z.string().url().max(500).optional().or(z.literal("")),
        remindDaily: z.boolean().default(false),
        remindUntil: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const row = {
      created_by: context.userId,
      title: data.title,
      description: data.description ?? null,
      starts_at: new Date(data.startsAt).toISOString(),
      ends_at: data.endsAt ? new Date(data.endsAt).toISOString() : null,
      meet_url: data.meetUrl ? data.meetUrl : null,
      remind_daily: data.remindDaily,
      remind_until: data.remindUntil ? data.remindUntil : null,
    };
    const q = data.id
      ? context.supabase.from("portal_events").update(row).eq("id", data.id)
      : context.supabase.from("portal_events").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("portal_events").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
