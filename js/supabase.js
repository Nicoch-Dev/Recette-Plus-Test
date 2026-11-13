const SUPABASE_URL =
    "https://iltjdgtfavmfdbshygye.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_kOw9KpBKcJG6Hc_P4TkpbA_-jDAA58R";


const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


    console.log("Supabase chargé");
    console.log(supabaseClient);