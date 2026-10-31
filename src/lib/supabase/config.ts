export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
/** The project's publishable key (or the legacy anon key) from Supabase → Project settings → API keys. */
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Until both are set, screens run on the sample data in src/lib/data. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);
