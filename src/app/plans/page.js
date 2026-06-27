"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  getPlansProgress, 
  getSavedPlans, 
  toggleSavePlan 
} from "@/data/userState";
import { devotionals } from "@/data/devotionals";
import { getMe } from "@/app/actions/authActions";
import { 
  getDevotionalProgress as getDevotionalProgressDb, 
  getSavedPlans as getSavedPlansDb, 
  toggleSavedPlan as toggleSavedPlanDb 
} from "@/app/actions/dbActions";

const CATEGORIES = [
  "All",
  "Gratitude",
  "Love",
  "Anxiety",
  "Healing",
  "Anger",
  "Hope",
  "Depression",
  "Fear",
  "Peace",
  "Stress",
  "Patience",
  "Loss",
  "Jealousy",
  "Joy",
  "Temptation",
  "Pride",
  "Doubt"
];

// Helper to resolve images for dynamic categories so they look consistent
const getCategoryImage = (category) => {
  switch (category) {
    case "Love": return "/assets/images/tags/travel-tag.jpg";
    case "Gratitude": return "/assets/images/tags/food-tag.jpg";
    case "Joy": return "/assets/images/tags/technology-tag.jpg";
    case "Patience": return "/assets/images/tags/health-tag.jpg";
    case "Hope": return "/assets/images/tags/nature-tag.jpg";
    case "Healing":
    case "Stress":
    case "Anxiety":
    case "Anger":
    case "Depression":
    case "Fear":
    case "Peace":
    case "Loss":
    case "Jealousy":
    case "Temptation":
    case "Pride":
    case "Doubt":
    default:
      return "/assets/images/tags/fitness-tag.jpg";
  }
};

export default function PlansDashboard() {
  const [activeTab, setActiveTab] = useState("my-plans"); // "my-plans" or "find-plans"
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [progress, setProgress] = useState({});
  const [savedPlans, setSavedPlans] = useState([]);
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function loadPlansState() {
      const currentUser = await getMe();
      setUser(currentUser);
      
      if (currentUser) {
        const dbProgress = await getDevotionalProgressDb();
        const dbSaved = await getSavedPlansDb();
        setProgress(dbProgress || {});
        setSavedPlans(dbSaved || []);
      } else {
        setProgress(getPlansProgress());
        setSavedPlans(getSavedPlans());
      }
    }
    loadPlansState();
  }, [updateTrigger]);

  const handleToggleSave = async (e, planId) => {
    e.preventDefault(); // Prevent navigating to detail page if clicking bookmark button
    if (user) {
      await toggleSavedPlanDb(planId);
    } else {
      toggleSavePlan(planId);
    }
    setUpdateTrigger(prev => prev + 1);
  };

  // ---------------- MY PLANS SPLITS ----------------
  const plansList = Object.values(devotionals);

  // 1. In Progress
  const inProgressPlans = plansList.filter(plan => {
    const prog = progress[plan.id];
    return prog && !prog.isCompleted;
  });

  // 2. Saved
  const bookmarkedPlans = plansList.filter(plan => {
    return savedPlans.includes(plan.id);
  });

  // 3. Completed
  const completedPlans = plansList.filter(plan => {
    const prog = progress[plan.id];
    return prog && prog.isCompleted;
  });

  // ---------------- FIND PLANS FILTERS ----------------
  const filteredFindPlans = selectedCategory === "All"
    ? plansList
    : plansList.filter(plan => plan.category === selectedCategory);

  return (
    <section className="section" style={{ minHeight: "80vh", paddingBlock: "4rem" }}>
      <div className="container" style={{ maxWidth: "1000px" }}>
        
        {/* Banner */}
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h2 style={{ fontSize: "var(--font-size-lg)", color: "var(--light-color)", marginBottom: "0.5rem" }}>
            Devotional Plans
          </h2>
          <p style={{ fontSize: "1.4rem", color: "var(--light-color-alt)" }}>
            Strengthen your daily scripture habits with structured topical plans.
          </p>
        </div>

        {/* Sub-Header Menu Tabs */}
        <div 
          style={{ 
            display: "flex", 
            justifyContent: "center",
            background: "var(--secondary-background-color)", 
            padding: "0.5rem", 
            borderRadius: "30px", 
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            maxWidth: "400px",
            margin: "0 auto 4rem",
            border: "1px solid var(--transparent-light-color)"
          }}
        >
          <button
            onClick={() => setActiveTab("my-plans")}
            style={{
              flex: 1,
              padding: "1rem 2rem",
              borderRadius: "25px",
              cursor: "pointer",
              fontSize: "1.4rem",
              fontWeight: "700",
              transition: "all 0.25s",
              background: activeTab === "my-plans" ? "var(--accent-color)" : "transparent",
              color: activeTab === "my-plans" ? "white" : "var(--light-color-alt)"
            }}
          >
            My Plans
          </button>
          <button
            onClick={() => setActiveTab("find-plans")}
            style={{
              flex: 1,
              padding: "1rem 2rem",
              borderRadius: "25px",
              cursor: "pointer",
              fontSize: "1.4rem",
              fontWeight: "700",
              transition: "all 0.25s",
              background: activeTab === "find-plans" ? "var(--accent-color)" : "transparent",
              color: activeTab === "find-plans" ? "white" : "var(--light-color-alt)"
            }}
          >
            Find Plans
          </button>
        </div>

        {/* ==================== TAB CONTENT: MY PLANS ==================== */}
        {activeTab === "my-plans" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4rem" }}>
            
            {/* 1. In Progress Section */}
            <div>
              <h3 style={{ fontSize: "1.8rem", color: "var(--light-color)", borderBottom: "1px solid var(--transparent-light-color)", paddingBottom: "1rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <i className="ri-play-circle-line" style={{ color: "#fad648" }}></i> In Progress
              </h3>
              
              {inProgressPlans.length === 0 ? (
                <div style={{ background: "var(--secondary-background-color)", padding: "3rem", borderRadius: "10px", textAlign: "center", color: "var(--light-color-alt)" }}>
                  <p style={{ fontSize: "1.4rem" }}>No plans in progress. Go to "Find Plans" to enroll in a devotional.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2.5rem" }}>
                  {inProgressPlans.map((plan) => {
                    const prog = progress[plan.id];
                    const percent = Math.round((prog.completedDays.length / plan.days.length) * 100);
                    return (
                      <PlanCard 
                        key={plan.id} 
                        plan={plan} 
                        percent={percent} 
                        completed={prog.completedDays.length}
                        isSaved={savedPlans.includes(plan.id)}
                        onToggleSave={(e) => handleToggleSave(e, plan.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Saved Plans Section */}
            <div>
              <h3 style={{ fontSize: "1.8rem", color: "var(--light-color)", borderBottom: "1px solid var(--transparent-light-color)", paddingBottom: "1rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <i className="ri-bookmark-fill" style={{ color: "#12bcfe" }}></i> Saved Plans
              </h3>
              
              {bookmarkedPlans.length === 0 ? (
                <div style={{ background: "var(--secondary-background-color)", padding: "3rem", borderRadius: "10px", textAlign: "center", color: "var(--light-color-alt)" }}>
                  <p style={{ fontSize: "1.4rem" }}>Your saved plans will show up here. Click the bookmark icon on any plan card to save it.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2.5rem" }}>
                  {bookmarkedPlans.map((plan) => {
                    const prog = progress[plan.id];
                    const percent = prog ? Math.round((prog.completedDays.length / plan.days.length) * 100) : null;
                    return (
                      <PlanCard 
                        key={plan.id} 
                        plan={plan} 
                        percent={percent} 
                        completed={prog ? prog.completedDays.length : 0}
                        isSaved={true}
                        onToggleSave={(e) => handleToggleSave(e, plan.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. Completed Plans Section */}
            <div>
              <h3 style={{ fontSize: "1.8rem", color: "var(--light-color)", borderBottom: "1px solid var(--transparent-light-color)", paddingBottom: "1rem", marginBottom: "2rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <i className="ri-checkbox-circle-fill" style={{ color: "var(--accent-color)" }}></i> Completed Plans
              </h3>
              
              {completedPlans.length === 0 ? (
                <div style={{ background: "var(--secondary-background-color)", padding: "3rem", borderRadius: "10px", textAlign: "center", color: "var(--light-color-alt)" }}>
                  <p style={{ fontSize: "1.4rem" }}>You haven't completed any plans yet. Complete all days of a plan to finish it.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2.5rem" }}>
                  {completedPlans.map((plan) => (
                    <PlanCard 
                      key={plan.id} 
                      plan={plan} 
                      percent={100} 
                      completed={plan.days.length}
                      isSaved={savedPlans.includes(plan.id)}
                      onToggleSave={(e) => handleToggleSave(e, plan.id)}
                      isCompleted={true}
                    />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ==================== TAB CONTENT: FIND PLANS ==================== */}
        {activeTab === "find-plans" && (
          <div>
            {/* Category Pills Row */}
            <div 
              style={{ 
                display: "flex", 
                gap: "1rem", 
                overflowX: "auto", 
                paddingBottom: "1.5rem",
                marginBottom: "3rem",
                scrollbarWidth: "thin",
                msOverflowStyle: "none"
              }}
            >
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "0.8rem 2rem",
                    borderRadius: "20px",
                    cursor: "pointer",
                    fontSize: "1.3rem",
                    fontWeight: "600",
                    whiteSpace: "nowrap",
                    transition: "all 0.25s",
                    border: `1px solid ${selectedCategory === cat ? "var(--light-color)" : "var(--transparent-light-color)"}`,
                    background: selectedCategory === cat ? "var(--transparent-light-color)" : "var(--secondary-background-color)",
                    color: selectedCategory === cat ? "var(--light-color)" : "var(--light-color-alt)"
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Catalog Grid */}
            {filteredFindPlans.length === 0 ? (
              <div style={{ background: "var(--secondary-background-color)", padding: "5rem", borderRadius: "12px", textAlign: "center", color: "var(--light-color-alt)" }}>
                <p style={{ fontSize: "1.5rem" }}>We don't have any plans in the "{selectedCategory}" category yet.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2.5rem" }}>
                {filteredFindPlans.map((plan) => {
                  const prog = progress[plan.id];
                  const percent = prog ? Math.round((prog.completedDays.length / plan.days.length) * 100) : null;
                  return (
                    <PlanCard 
                      key={plan.id} 
                      plan={plan} 
                      percent={percent}
                      completed={prog ? prog.completedDays.length : 0}
                      isSaved={savedPlans.includes(plan.id)}
                      onToggleSave={(e) => handleToggleSave(e, plan.id)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  );
}

// Reusable Plan Card component
function PlanCard({ plan, percent, completed, isSaved, onToggleSave, isCompleted = false }) {
  const cardImg = getCategoryImage(plan.category);

  return (
    <div 
      style={{
        background: "var(--secondary-background-color)",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        border: "1px solid var(--transparent-light-color)",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.25s, box-shadow 0.25s",
        position: "relative"
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,0,0,0.2)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
      }}
    >
      {/* Plan Image Header */}
      <div style={{ height: "120px", position: "relative", overflow: "hidden" }}>
        <img 
          src={cardImg} 
          alt={plan.title} 
          style={{ width: "100%", height: "100%", objectFit: "cover" }} 
        />
        <div style={{
          position: "absolute",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          background: "linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.65))",
          display: "flex",
          alignItems: "flex-end",
          padding: "1.5rem"
        }}>
          <span style={{ color: "#fad648", fontWeight: "700", fontSize: "1.1rem", letterSpacing: "1px" }}>
            {plan.category.toUpperCase()}
          </span>
        </div>

        {/* Bookmark Ribbon on Card */}
        <button
          onClick={(e) => onToggleSave(e, plan.id)}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "rgba(0,0,0,0.6)",
            color: isSaved ? "#12bcfe" : "white",
            border: "none",
            borderRadius: "50%",
            width: "3.2rem",
            height: "3.2rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 5px rgba(0,0,0,0.25)",
            zIndex: 10
          }}
          title={isSaved ? "Saved" : "Save Plan"}
        >
          <i className={isSaved ? "ri-bookmark-fill" : "ri-bookmark-line"} style={{ fontSize: "1.6rem" }}></i>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "2rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontSize: "1.8rem", color: "var(--light-color)", marginBottom: "0.8rem", lineHeight: "1.3" }}>
            {plan.title}
          </h3>
          <p style={{ fontSize: "1.3rem", lineHeight: "1.4", color: "var(--light-color-alt)", marginBottom: "1.5rem" }}>
            {plan.days[0].reflection.substring(0, 80)}...
          </p>
        </div>

        {/* Progress / Button */}
        <div>
          {percent !== null ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                <span>PROGRESS</span>
                <span>{completed} / {plan.days.length} DAYS ({percent}%)</span>
              </div>
              <div className="progress-bar-container" style={{ margin: "0" }}>
                <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", fontWeight: "600", marginBottom: "1.5rem" }}>
              {plan.days.length} DAYS DEVOTIONAL
            </div>
          )}

          <Link 
            href={`/plans/${plan.id}`}
            style={{
              display: "block",
              background: isCompleted ? "transparent" : percent !== null ? "transparent" : "var(--accent-color)",
              border: isCompleted ? "2px solid var(--accent-color)" : percent !== null ? "2px solid var(--light-color)" : "none",
              color: isCompleted ? "var(--accent-color)" : "#fff",
              borderRadius: "30px",
              padding: "0.8rem",
              textAlign: "center",
              fontSize: "1.3rem",
              fontWeight: "700",
              transition: "opacity 0.2s"
            }}
          >
            {isCompleted ? "✓ Completed" : percent !== null ? "Continue Reading" : "Start Plan"}
          </Link>
        </div>
      </div>

    </div>
  );
}
