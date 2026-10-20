import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://wzlsvmdojnhqfotpskof.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_9eQ6bF9uNmsJWJTq1hhBzg_Y9TDZk6D';

export const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);