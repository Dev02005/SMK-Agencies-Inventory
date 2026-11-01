export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
/** The project's publishable key (or the legacy anon key) from Supabase → Project settings → API keys. */
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** Both keys are set, so the app can reach the Supabase project. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

/**
 * True while the screens read the sample records in src/lib/data. Having the keys is not enough: the data functions
 * still have to be switched to Supabase queries. Until then the "Sample data" label and the sample PIN stay.
 */
export const usesSampleData = true;
