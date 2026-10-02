import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const projectFields = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).nullable().optional(),
  icon: z.string().min(1).max(16).optional(),
  context: z.string().max(4000).nullable().optional(),
});

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("chat_projects")
      .select("id, name, description, icon, context, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => projectFields.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("chat_projects")
      .insert({ user_id: context.userId, ...data })
      .select("id, name, description, icon, context, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => projectFields.partial().extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("chat_projects")
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, name, description, icon, context, updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("chat_projects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPlugins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_plugins")
      .select("enabled, settings")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  });

export const savePlugins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        enabled: z.array(z.string().max(40)).max(30),
        settings: z.record(z.string(), z.record(z.string(), z.string().max(200))),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_plugins")
      .upsert({ user_id: context.userId, enabled: data.enabled, settings: data.settings, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
