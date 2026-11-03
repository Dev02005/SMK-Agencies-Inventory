/**
 * True while the screens read the sample records in src/lib/data (with the firm's own records from local-data/).
 * When Supabase is connected the data functions switch to its queries; until then the "Sample data" label and the
 * sample PIN stay.
 */
export const usesSampleData = true;
