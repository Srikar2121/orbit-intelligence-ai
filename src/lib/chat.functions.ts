import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listThreads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_threads")
      .select("id, title, mode, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ title: z.string().min(1).max(80).default("New chat"), mode: z.enum(["default", "genz", "codey"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("chat_threads")
      .insert({ user_id: context.userId, title: data.title, mode: data.mode })
      .select("id, title, mode, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("chat_threads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const renameThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), title: z.string().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("chat_threads")
      .update({ title: data.title })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const loadMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ threadId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("thread_id", data.threadId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const saveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        threadId: z.string().uuid(),
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(20000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("chat_messages").insert({
      thread_id: data.threadId,
      user_id: context.userId,
      role: data.role,
      content: data.content,
    });
    if (error) throw new Error(error.message);
    await context.supabase
      .from("chat_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", data.threadId);
    return { ok: true };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, username, avatar_url, birth_date")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        username: z.string().min(2).max(40),
        birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        avatar_url: z.string().url().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").upsert({
      id: context.userId,
      username: data.username,
      birth_date: data.birth_date,
      avatar_url: data.avatar_url ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ avatar_url: z.string().url().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: data.avatar_url })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const consumeQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ model: z.enum(["default", "genz", "codey", "fast"]) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("consume_chat_quota", { _model: data.model });
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    return row as { allowed: boolean; used: number; quota: number; plan: string };
  });

export const getPlanStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: profile }, { data: usage }] = await Promise.all([
      context.supabase.from("profiles").select("plan, plan_expires_at").eq("id", context.userId).maybeSingle(),
      context.supabase.from("chat_usage").select("model, count").eq("user_id", context.userId).eq("day", today),
    ]);
    const isPlus =
      profile?.plan === "plus" && (!profile.plan_expires_at || new Date(profile.plan_expires_at) > new Date());
    return {
      plan: isPlus ? "plus" : "free",
      quota: isPlus ? 30 : 20,
      usage: (usage ?? []) as { model: string; count: number }[],
    };
  });
