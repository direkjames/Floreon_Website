// Public site settings. Everything else (pages, menu, settings, lists) is edited on the staff site.
// The publishable key is public by design; the database rules decide what it can do.
// NEVER put the secret key (sb_secret_...) here.
export const SUPABASE = {
  url: "https://wvsjszvoengmjhnrksxw.supabase.co",
  publishableKey: "sb_publishable_Lb_s7UI4vUOWOLqg3ZftTA_qf6Y3gi-"
};

// If the database doesn't answer within this many milliseconds, the built-in copy is shown instead.
export const LOAD_TIMEOUT = 8000;
