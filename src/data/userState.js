// Helper logic for local storage state management (SSR-safe)

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
  return getFromStorage("thanksgiving_streak", { count: 0, lastActive: null });
};

export const updateStreak = () => {
  if (!isClient()) return { count: 0, lastActive: null };
  const streak = getStreak();
  const todayStr = new Date().toDateString(); // E.g., "Fri Jun 26 2026"
  
  if (streak.lastActive === todayStr) {
    return streak; // Already visited today
  }

  const newStreak = { ...streak };

  if (streak.lastActive) {
    const lastDate = new Date(streak.lastActive);
    const todayDate = new Date(todayStr);
    
    // Calculate difference in days
    const diffTime = Math.abs(todayDate - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Visited yesterday, increment streak
      newStreak.count += 1;
    } else if (diffDays > 1) {
      // Skipped a day, reset streak to 1
      newStreak.count = 1;
    }
  } else {
    // First visit ever
    newStreak.count = 1;
  }

  newStreak.lastActive = todayStr;
  saveToStorage("thanksgiving_streak", newStreak);
  return newStreak;
};

// ================= HIGHLIGHTS MANAGEMENT =================

export const getHighlights = () => {
  return getFromStorage("thanksgiving_highlights", {});
};

export const toggleHighlight = (verseId, color) => {
  const highlights = getHighlights();
  if (highlights[verseId] === color || !color) {
    delete highlights[verseId];
  } else {
    highlights[verseId] = color;
  }
  saveToStorage("thanksgiving_highlights", highlights);
  return highlights;
};

// ================= NOTES MANAGEMENT =================

export const getNotes = () => {
  return getFromStorage("thanksgiving_notes", {});
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
  saveToStorage("thanksgiving_notes", notes);
  return notes;
};

// ================= DEVOTIONAL PLANS MANAGEMENT =================

export const getPlansProgress = () => {
  return getFromStorage("thanksgiving_plans_progress", {});
};

export const startPlan = (planId) => {
  const progress = getPlansProgress();
  if (!progress[planId]) {
    progress[planId] = {
      planId,
      currentDay: 1,
      completedDays: [],
      isCompleted: false,
      startDate: new Date().toLocaleDateString()
    };
    saveToStorage("thanksgiving_plans_progress", progress);
  }
  return progress[planId];
};

export const completePlanDay = (planId, dayNumber, totalDays = 5) => {
  const progress = getPlansProgress();
  if (!progress[planId]) {
    startPlan(planId);
  }
  
  const planProg = progress[planId] || getPlansProgress()[planId];
  if (!planProg.completedDays.includes(dayNumber)) {
    planProg.completedDays.push(dayNumber);
  }

  if (planProg.completedDays.length >= totalDays) {
    planProg.isCompleted = true;
  } else {
    // Increment to the next uncompleted day
    planProg.currentDay = Math.min(totalDays, planProg.currentDay + 1);
  }

  progress[planId] = planProg;
  saveToStorage("thanksgiving_plans_progress", progress);
  return progress;
};

// ================= LOCAL TESTIMONIES =================

export const getLocalTestimonies = () => {
  return getFromStorage("thanksgiving_local_testimonies", []);
};

export const saveTestimony = (title, author, contentText) => {
  const testimonies = getLocalTestimonies();
  const newPost = {
    id: `local_${Date.now()}`,
    title,
    date: new Date().toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }),
    readTime: "2 Min read",
    author: author || "Grateful Heart",
    image: "/assets/images/featured/featured-2.jpg", // Default placeholder image from project assets
    excerpt: contentText.substring(0, 100) + "...",
    content: [
      {
        type: "paragraph",
        text: contentText
      }
    ]
  };
  
  testimonies.unshift(newPost);
  saveToStorage("thanksgiving_local_testimonies", testimonies);
  return testimonies;
};
