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
    const email = data.contactEmail.trim().toLowerCase();

    const { data: status, error: reqErr } = await supabase.rpc("request_teacher_access", {
      _contact_email: email,
    });
    if (reqErr) throw new Error(reqErr.message);

    const { error: profErr } = await supabase
      .from("profiles")
      .update({ contact_email: email, reminders_enabled: true })
      .eq("id", userId);
    if (profErr) throw new Error(profErr.message);

    return { ok: true, status: (status as string) ?? "pending" };
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

// ---------- AI teacher assistant ----------

async function callOrbit(system: string, user: string, json = false) {
  const apiKey = process.env['LOVABLE_API_KEY'];
  if (!apiKey) throw new Error("AI is not configured.");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("The assistant is busy right now — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted. Add credits to keep using the assistant.");
    console.error("Teacher bot gateway error", res.status, text);
    throw new Error("The assistant could not answer right now.");
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

async function assertTeacher(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "teacher");
  if (!data || data.length === 0) throw new Error("Teachers only.");
}

const TEACHER_SYSTEM =
  "You are Orbit Teach — an expert teaching assistant for school teachers. You write lesson plans, unit plans, worksheets, quizzes with answer keys, rubrics, differentiated activities, parent emails, IEP-friendly adaptations and classroom-management ideas. Always be practical, curriculum-aware and ready to use in class. Use clean markdown with headings, tables and bullet lists. Include objectives, materials, timings, steps, differentiation and assessment whenever you write a plan.";

export const askTeacherBot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        prompt: z.string().min(1).max(6000),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(8000) }))
          .max(20)
          .default([]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTeacher(context.supabase, context.userId);
    const transcript = data.history.map((m) => `${m.role === "user" ? "Teacher" : "Orbit Teach"}: ${m.content}`).join("\n\n");
    const user = transcript ? `${transcript}\n\nTeacher: ${data.prompt}` : data.prompt;
    return { reply: await callOrbit(TEACHER_SYSTEM, user) };
  });

// ---------- Grading simulator ----------

export const gradeSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        studentName: z.string().min(1).max(120),
        assignment: z.string().min(1).max(200),
        subject: z.string().max(120).optional(),
        rubric: z.string().max(6000).optional(),
        submission: z.string().min(1).max(20000),
        maxScore: z.number().min(1).max(1000).default(100),
        save: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertTeacher(context.supabase, context.userId);

    const raw = await callOrbit(
      "You are a fair, experienced grader. Grade the student's submission against the rubric (or against general subject standards if no rubric is given). Respond ONLY with JSON of the shape {\"score\": number, \"letter\": string, \"strengths\": string, \"improvements\": string, \"feedback\": string}. score is out of the given maximum. feedback is warm, specific, student-facing markdown.",
      JSON.stringify({
        assignment: data.assignment,
        subject: data.subject ?? "",
        maxScore: data.maxScore,
        rubric: data.rubric ?? "",
        submission: data.submission,
      }),
      true,
    );

    let parsedResult: { score: number; letter: string; strengths?: string; improvements?: string; feedback: string };
    try {
      const cleaned = raw.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "");
      const obj = JSON.parse(cleaned);
      parsedResult = {
        score: Math.max(0, Math.min(Number(obj.score) || 0, data.maxScore)),
        letter: String(obj.letter ?? ""),
        strengths: obj.strengths ? String(obj.strengths) : undefined,
        improvements: obj.improvements ? String(obj.improvements) : undefined,
        feedback: String(obj.feedback ?? raw),
      };
    } catch {
      parsedResult = { score: 0, letter: "", feedback: raw };
    }

    const fullFeedback = [
      parsedResult.feedback,
      parsedResult.strengths ? `\n\n**Strengths**\n${parsedResult.strengths}` : "",
      parsedResult.improvements ? `\n\n**Next steps**\n${parsedResult.improvements}` : "",
    ].join("");

    if (data.save) {
      const { error } = await context.supabase.from("portal_grades").insert({
        teacher_id: context.userId,
        student_name: data.studentName,
        assignment: data.assignment,
        subject: data.subject ?? null,
        rubric: data.rubric ?? null,
        submission: data.submission,
        score: parsedResult.score,
        max_score: data.maxScore,
        letter: parsedResult.letter || null,
        feedback: fullFeedback,
      });
      if (error) throw new Error(error.message);
    }

    return { ...parsedResult, feedback: fullFeedback, maxScore: data.maxScore };
  });

export const listGrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("portal_grades")
      .select("id, student_name, assignment, subject, score, max_score, letter, feedback, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteGrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("portal_grades").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
