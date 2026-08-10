import { createClient } from "@supabase/supabase-js";

// Uso exclusivo em código server-side (API routes / server actions).
// A service role key ignora RLS, então todo filtro por org_id precisa
// ser feito explicitamente em cada query — nunca importar este arquivo
// em componentes "use client".
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  global: {
    // Next.js patches o fetch global e cacheia por padrão dentro de route handlers;
    // sem isso, queries a novos dados podem retornar respostas antigas em cache.
    fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
  },
});
