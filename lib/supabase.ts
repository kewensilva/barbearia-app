import { createClient } from "@supabase/supabase-js";

// TODO: quando o schema.sql estiver aplicado no Supabase, essas variáveis
// já bastam para todas as telas funcionarem de verdade (hoje as telas usam
// dados mock para você ver o fluxo funcionando sem depender do banco ainda).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
