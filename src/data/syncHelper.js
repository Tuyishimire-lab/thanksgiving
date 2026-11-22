import { syncLocalData } from "@/app/actions/dbActions";

/**
 * Collects all PraisePage data from localStorage, syncs it to the DB,
 * then cleans up the local keys.
 *
 * Call this after a successful login or signup.
 * No-op if running server-side or if there is no local data to sync.
 */
export async function syncAndClearLocalData() {
  if (typeof window === "undefined") return;

  try {
    const savedPlans = JSON.parse(localStorage.getItem("praisepage_saved_plans") || "[]");
    const plansProgress = JSON.parse(localStorage.getItem("praisepage_plans_progress") || "{}");
    const reflections = JSON.parse(localStorage.getItem("praisepage_plan_reflections") || "{}");
    const highlights = JSON.parse(localStorage.getItem("praisepage_highlights") || "{}");
    const notes = JSON.parse(localStorage.getItem("praisepage_notes") || "{}");
    const localTestimonies = JSON.parse(localStorage.getItem("praisepage_local_testimonies") || "[]");
    const journalEntries = JSON.parse(localStorage.getItem("praisepage_journal") || "[]");
    const unlockedBadges = JSON.parse(localStorage.getItem("praisepage_badges") || "[]");

    const hasLocalData =
      savedPlans.length > 0 ||
      Object.keys(plansProgress).length > 0 ||
      Object.keys(reflections).length > 0 ||
      Object.keys(highlights).length > 0 ||
      Object.keys(notes).length > 0 ||
      localTestimonies.length > 0 ||
      journalEntries.length > 0 ||
      unlockedBadges.length > 0;

    if (hasLocalData) {
      const res = await syncLocalData({
        savedPlans,
        plansProgress,
        reflections,
        highlights,
        notes,
        localTestimonies,
        journalEntries,
        unlockedBadges,
      });

      if (res?.success) {
        // Clean up local items only after confirmed DB sync
        localStorage.removeItem("praisepage_saved_plans");
        localStorage.removeItem("praisepage_plans_progress");
        localStorage.removeItem("praisepage_plan_reflections");
        localStorage.removeItem("praisepage_highlights");
        localStorage.removeItem("praisepage_notes");
        localStorage.removeItem("praisepage_local_testimonies");
        localStorage.removeItem("praisepage_journal");
        localStorage.removeItem("praisepage_badges");
      }
    }
  } catch (storageError) {
    console.error("Local data sync failed:", storageError);
  }
}
