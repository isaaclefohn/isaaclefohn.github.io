/**
 * JWT authentication middleware.
 * Verifies Supabase JWT tokens from the Authorization header.
 */

// TODO: Uncomment when Supabase is configured
// import { createClient } from '@supabase/supabase-js';
//
// const supabase = createClient(
//   process.env.SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_KEY!
// );
//
// export async function authenticateUser(authHeader: string | undefined): Promise<string | null> {
//   if (!authHeader?.startsWith('Bearer ')) return null;
//   const token = authHeader.slice(7);
//
//   try {
//     const { data, error } = await supabase.auth.getUser(token);
//     if (error || !data.user) return null;
//     return data.user.id;
//   } catch {
//     return null;
//   }
// }

export {};
