import {createClient} from "@supabase/supabase-js";
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const ready=Boolean(url&&key);
const sb=ready?createClient(url,key):null;
export const rpc=async(fn,args)=>{const{data,error}=await sb.rpc(fn,args);if(error)throw new Error(error.message);return data};
