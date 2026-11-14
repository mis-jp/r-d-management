export const THEME_STORAGE_KEY = "theme";
export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/** Runs before hydration (inlined in <head>) so the first paint already uses the right theme. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p!=="light"&&matchMedia("${DARK_MEDIA_QUERY}").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light"}catch(_){}})()`;
