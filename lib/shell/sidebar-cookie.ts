/**
 * The cookie `components/ui/sidebar.tsx` writes when the desktop sidebar
 * collapses. The study layout reads it on the server so the first paint already
 * has the right width — a client-side read would flash the expanded rail first.
 *
 * It lives here rather than beside the shell because a server component cannot
 * import a value from a `"use client"` module: the import becomes a client
 * reference, not the string. Keep it in step with that component's
 * `SIDEBAR_COOKIE_NAME`.
 */
export const STUDY_SIDEBAR_COOKIE = "sidebar_state";
