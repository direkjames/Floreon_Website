// Admin site settings. Same Supabase project as the public site.
// The publishable key is public by design; the database rules decide who can edit.
// NEVER put the secret key (sb_secret_...) here.
export const SUPABASE = {
  url: "https://wvsjszvoengmjhnrksxw.supabase.co",
  publishableKey: "sb_publishable_Lb_s7UI4vUOWOLqg3ZftTA_qf6Y3gi-",
  imageBucket: "site-images"
};

// Where "View site" links go. Change to https://floreon.garden once the domain is connected.
export const PUBLIC_SITE = "https://floreon.netlify.app";

// Upload limits for the media library
export const UPLOAD = {
  maxSide: 1920,        // longest side in pixels; bigger pictures are scaled down
  maxFileMB: 15,        // files bigger than this are refused before resizing
  quality: 0.86         // WebP quality for photos
};
