// Helper logic for local storage state management (SSR-safe)
import { parseContentBlocks } from "./utils";

const isClient = () => typeof window !== "undefined";

const getFromStorage = (key, defaultValue) => {
  if (!isClient()) return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  if (!isClient()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
  }
};

// ================= STREAK MANAGEMENT =================

export const getStreak = () => {
  return getFromStorage("praisepage_streak", { count: 0, lastActive: null, freezes: 1 });
};

export const updateStreak = () => {
  if (!isClient()) return { count: 0, lastActive: null, freezes: 1 };
  const streak = getStreak();
  const todayStr = new Date().toDateString(); // E.g., "Fri Jun 26 2026"
  
  if (streak.lastActive === todayStr) {
    return streak; // Already visited today
  }

  const newStreak = { ...streak };
  if (newStreak.freezes === undefined) {
    newStreak.freezes = 1;
  }

  if (streak.lastActive) {
    const lastDate = new Date(streak.lastActive);
    const todayDate = new Date(todayStr);
    
    // Calculate difference in days
    const diffTime = Math.abs(todayDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Visited yesterday, increment streak
      newStreak.count += 1;
    } else if (diffDays > 1 && newStreak.freezes > 0) {
      // Consume streak freeze locally
      newStreak.freezes = Math.max(0, newStreak.freezes - 1);
      newStreak.count += 1; // Preserve streak
      newStreak.freezeUsed = true;
    } else if (diffDays > 1) {
      // Skipped a day and no freezes, reset streak to 1
      newStreak.count = 1;
    }
  } else {
    // First visit ever
    newStreak.count = 1;
  }

  newStreak.lastActive = todayStr;
  saveToStorage("praisepage_streak", newStreak);
  return newStreak;
};

// ================= HIGHLIGHTS MANAGEMENT =================

export const getHighlights = () => {
  return getFromStorage("praisepage_highlights", {});
};

export const toggleHighlight = (verseId, color) => {
  const highlights = getHighlights();
  if (highlights[verseId] === color || !color) {
    delete highlights[verseId];
  } else {
    highlights[verseId] = color;
  }
  saveToStorage("praisepage_highlights", highlights);
  return highlights;
};

// ================= NOTES MANAGEMENT =================

export const getNotes = () => {
  return getFromStorage("praisepage_notes", {});
};

export const saveNote = (verseId, text) => {
  const notes = getNotes();
  if (!text || text.trim() === "") {
    delete notes[verseId];
  } else {
    notes[verseId] = {
      text,
      timestamp: new Date().toLocaleDateString()
    };
  }
  saveToStorage("praisepage_notes", notes);
  return notes;
};

// ================= DEVOTIONAL PLANS MANAGEMENT =================

export const getPlansProgress = () => {
  return getFromStorage("praisepage_plans_progress", {});
};

export const startPlan = (planId) => {
  const progress = getPlansProgress();
  if (!progress[planId]) {
    progress[planId] = {
      planId,
      currentDay: 1,
      completedDays: [],
      isCompleted: false,
      startDate: new Date().toLocaleDateString(),
      lastCompletedDate: null
    };
    saveToStorage("praisepage_plans_progress", progress);
  }
  return progress[planId];
};

export const completePlanDay = (planId, dayNumber, totalDays = 5, lastCompletedDate) => {
  const progress = getPlansProgress();
  if (!progress[planId]) {
    startPlan(planId);
  }
  
  const planProg = progress[planId] || getPlansProgress()[planId];
  if (!planProg.completedDays.includes(dayNumber)) {
    planProg.completedDays.push(dayNumber);
  }

  planProg.lastCompletedDate = lastCompletedDate || new Date().toLocaleDateString();

  if (planProg.completedDays.length >= totalDays) {
    planProg.isCompleted = true;
  } else {
    // Increment to the next uncompleted day
    planProg.currentDay = Math.min(totalDays, planProg.currentDay + 1);
  }

  progress[planId] = planProg;
  saveToStorage("praisepage_plans_progress", progress);
  return progress;
};

// ================= LOCAL TESTIMONIES =================

export const getLocalTestimonies = () => {
  return getFromStorage("praisepage_local_testimonies", []);
};

export const saveTestimony = (title, author, contentText, tag = "Gratitude") => {
  const testimonies = getLocalTestimonies();
  const newPost = {
    id: `local_${Date.now()}`,
    title,
    date: new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }),
    readTime: "2 Min read",
    author: author || "Grateful Heart",
    image: "/assets/images/featured/featured-2.jpg", // Default placeholder image from project assets
    excerpt: contentText.substring(0, 100) + "...",
    tag,
    content: parseContentBlocks(contentText)
  };
  
  testimonies.unshift(newPost);
  saveToStorage("praisepage_local_testimonies", testimonies);
  return testimonies;
};

// ================= SAVED/BOOKMARKED PLANS =================

export const getSavedPlans = () => {
  return getFromStorage("praisepage_saved_plans", []);
};

export const toggleSavePlan = (planId) => {
  const saved = getSavedPlans();
  let updated;
  if (saved.includes(planId)) {
    updated = saved.filter(id => id !== planId);
  } else {
    updated = [...saved, planId];
  }
  saveToStorage("praisepage_saved_plans", updated);
  return updated;
};

// ================= PLAN REFLECTIONS =================

export const getPlanReflections = () => {
  return getFromStorage("praisepage_plan_reflections", {});
};

export const savePlanReflection = (planId, dayNumber, text) => {
  const reflections = getPlanReflections();
  const key = `${planId}_${dayNumber}`;
  if (!text || text.trim() === "") {
    delete reflections[key];
  } else {
    reflections[key] = {
      text,
      timestamp: new Date().toLocaleDateString()
    };
  }
  saveToStorage("praisepage_plan_reflections", reflections);
  return reflections;
};

// ================= GRATITUDE JOURNAL (LOCAL) =================

export const getLocalJournalEntries = () => {
  return getFromStorage("praisepage_journal", []);
};

export const saveLocalJournalEntry = (prompt, text) => {
  const entries = getLocalJournalEntries();
  const newEntry = {
    id: `local_journal_${Date.now()}`,
    prompt,
    text,
    date: new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }),
    created_at: new Date().toISOString()
  };
  entries.unshift(newEntry);
  saveToStorage("praisepage_journal", entries);
  
  // Try checking local badges
  checkLocalBadges();

  return entries;
};

// ================= BADGES (LOCAL) =================

export const getLocalBadges = () => {
  return getFromStorage("praisepage_badges", []);
};

export const saveLocalBadge = (badgeId) => {
  const badges = getLocalBadges();
  const dateStr = new Date().toLocaleDateString();
  if (!badges.some(b => b.badgeId === badgeId)) {
    badges.push({ badgeId, unlockedAt: dateStr });
    saveToStorage("praisepage_badges", badges);
    
    // Reward freeze
    if (badgeId === "first_journal" || badgeId === "streak_7") {
      const streak = getStreak();
      streak.freezes = (streak.freezes || 0) + 1;
      saveToStorage("praisepage_streak", streak);
    }
  }
  return badges;
};

export const checkLocalBadges = () => {
  const notes = getNotes();
  const journal = getLocalJournalEntries();
  const plans = getPlansProgress();
  const streak = getStreak();

  const notesCount = Object.keys(notes).length;
  const journalCount = journal.length;
  const completedPlansCount = Object.keys(plans).filter(id => plans[id].isCompleted).length;
  const streakCount = streak.count;

  if (journalCount >= 1) saveLocalBadge("first_journal");
  if (streakCount >= 7) saveLocalBadge("streak_7");
  if (notesCount >= 1) saveLocalBadge("first_note");
  if (completedPlansCount >= 1) saveLocalBadge("devotional_complete");
};

