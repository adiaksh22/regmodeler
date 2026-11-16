import {createClient} from '@supabase/supabase-js';
import {readPublicConfig} from './publicConfig';
import type {Database} from './database.types';
export const publicCatalogConfig=readPublicConfig(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
// Interactive reads have a single eight-second attempt. Section retries are
// explicit; SDK backoff must not silently extend that budget or multiply reads.
export const publicCatalogClient=publicCatalogConfig?createClient<Database>(publicCatalogConfig.url,publicCatalogConfig.publishableKey,{
 auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
 db:{retry:false},
 global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(8000)})},
}):null;
