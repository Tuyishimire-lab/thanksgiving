"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMe } from "@/app/actions/authActions";
import {
  getAdminStats,
  getAdminUsers,
  getAdminTestimonies,
  getAdminComments,
  getAdminPrayers,
  deleteUser,
  toggleUserRole,
  deleteTestimony,
  deleteComment,
  deletePrayer,
  createCustomDevotional,
  deleteCustomDevotional
} from "@/app/actions/adminActions";
import { getCustomDevotionals } from "@/app/actions/dbActions";
import { devotionals as staticDevotionals } from "@/data/devotionals";

export default function AdminPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Stats and activities
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    activeThisWeek: 0,
    totalTestimonies: 0,
    totalComments: 0,
    totalPrayers: 0,
    activePlans: 0,
    completedPlans: 0
  });
  const [activities, setActivities] = useState([]);

  // Admin tabs & collections data
  const [activeTab, setActiveTab] = useState("dashboard");
  const [users, setUsers] = useState([]);
  const [testimonies, setTestimonies] = useState([]);
  const [comments, setComments] = useState([]);
  const [prayers, setPrayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [previewTestimony, setPreviewTestimony] = useState(null);
  const [previewPrayer, setPreviewPrayer] = useState(null);
  const [previewComment, setPreviewComment] = useState(null);
  const [customPlans, setCustomPlans] = useState([]);
  const [previewPlan, setPreviewPlan] = useState(null);
  const [showCreatePlanForm, setShowCreatePlanForm] = useState(false);
  const [newPlanData, setNewPlanData] = useState({
    title: "",
    category: "Gratitude",
    days: [
      {
        day: 1,
        title: "",
        verseText: "",
        verseTag: "",
        verseId: "",
        reflection: ""
      }
    ]
  });

  // Authenticate admin and load initial stats
  useEffect(() => {
    async function checkAuthAndLoad() {
      try {
        const user = await getMe();
        if (!user || user.role !== "admin") {
          setLoading(false);
          return;
        }
        setCurrentUser(user);
        
        const statsRes = await getAdminStats();
        if (statsRes.success) {
          setStats(statsRes.stats);
          setActivities(statsRes.activityStream);
        }
      } catch (err) {
        console.error("Failed to authenticate admin:", err);
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndLoad();
  }, []);

  // Fetch collections on-demand when active tab switches
  useEffect(() => {
    if (!currentUser) return;
    
    async function loadTabData() {
      try {
        if (activeTab === "users") {
          const res = await getAdminUsers();
          if (res.success) setUsers(res.users);
        } else if (activeTab === "testimonies") {
          const res = await getAdminTestimonies();
          if (res.success) setTestimonies(res.testimonies);
        } else if (activeTab === "comments") {
          const res = await getAdminComments();
          if (res.success) setComments(res.comments);
        } else if (activeTab === "prayers") {
          const res = await getAdminPrayers();
          if (res.success) setPrayers(res.prayers);
        } else if (activeTab === "plans") {
          const res = await getCustomDevotionals();
          if (res.success) setCustomPlans(res.plans);
        }
        setSearchQuery("");
      } catch (error) {
        console.error("Error loading tab data:", error);
      }
    }
    loadTabData();
  }, [activeTab, currentUser]);

  // Refresh general stats & logs helper
  const refreshStats = async () => {
    const statsRes = await getAdminStats();
    if (statsRes.success) {
      setStats(statsRes.stats);
      setActivities(statsRes.activityStream);
    }
    const res = await getCustomDevotionals();
    if (res.success) setCustomPlans(res.plans);
  };

  // --- Administrative Moderation Handlers ---
  
  const handleToggleUserRole = async (userId, currentRole) => {
    if (userId === currentUser.id) {
      alert("You cannot demote yourself!");
      return;
    }
    if (!confirm(`Are you sure you want to change this user's role to ${currentRole === "admin" ? "user" : "admin"}?`)) return;
    
    try {
      setActionLoading(true);
      const res = await toggleUserRole(userId, currentRole);
      if (res && res.error) {
        alert("Error: " + res.error);
      } else if (res && res.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: res.newRole } : u));
        refreshStats();
      } else {
        alert("Unexpected response: " + JSON.stringify(res));
      }
    } catch (err) {
      alert("Client error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUser.id) {
      alert("You cannot delete yourself!");
      return;
    }
    if (!confirm("WARNING: Deleting a user will permanently remove their profile, streak history, notes, highlights, and all associated items. This action is irreversible. Proceed?")) {
      return;
    }
    
    try {
      setActionLoading(true);
      const res = await deleteUser(userId);
      if (res && res.error) {
        alert("Error: " + res.error);
      } else if (res && res.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        refreshStats();
      } else {
        alert("Unexpected response: " + JSON.stringify(res));
      }
    } catch (err) {
      alert("Client error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTestimony = async (id) => {
    if (!confirm("Are you sure you want to delete this testimony post? Any likes and comments belonging to this post will also be deleted.")) return;
    
    try {
      setActionLoading(true);
      const res = await deleteTestimony(id);
      if (res && res.error) {
        alert("Error: " + res.error);
      } else if (res && res.success) {
        setTestimonies(prev => prev.filter(t => t.id !== id));
        refreshStats();
      } else {
        alert("Unexpected response: " + JSON.stringify(res));
      }
    } catch (err) {
      alert("Client error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteComment = async (id) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;
    
    try {
      setActionLoading(true);
      const res = await deleteComment(id);
      if (res && res.error) {
        alert("Error: " + res.error);
      } else if (res && res.success) {
        setComments(prev => prev.filter(c => c.id !== id));
        refreshStats();
      } else {
        alert("Unexpected response: " + JSON.stringify(res));
      }
    } catch (err) {
      alert("Client error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePrayer = async (id) => {
    if (!confirm("Are you sure you want to delete this prayer request?")) return;
    
    try {
      setActionLoading(true);
      const res = await deletePrayer(id);
      if (res && res.error) {
        alert("Error: " + res.error);
      } else if (res && res.success) {
        setPrayers(prev => prev.filter(p => p.id !== id));
        refreshStats();
      } else {
        alert("Unexpected response: " + JSON.stringify(res));
      }
    } catch (err) {
      alert("Client error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCustomDevotional = async (id) => {
    if (!confirm("Are you sure you want to delete this custom devotional plan permanently? This will also delete all user progress and reflection notes on this plan.")) return;
    
    try {
      setActionLoading(true);
      const res = await deleteCustomDevotional(id);
      if (res && res.error) {
        alert("Error: " + res.error);
      } else if (res && res.success) {
        setCustomPlans(prev => prev.filter(p => p.id !== id));
        refreshStats();
      } else {
        alert("Unexpected response: " + JSON.stringify(res));
      }
    } catch (err) {
      alert("Client error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddDayToNewPlan = () => {
    setNewPlanData(prev => ({
      ...prev,
      days: [
        ...prev.days,
        {
          day: prev.days.length + 1,
          title: "",
          verseText: "",
          verseTag: "",
          verseId: "",
          reflection: ""
        }
      ]
    }));
  };

  const handleRemoveDayFromNewPlan = (index) => {
    if (newPlanData.days.length <= 1) return;
    const updatedDays = newPlanData.days.filter((_, idx) => idx !== index).map((day, idx) => ({
      ...day,
      day: idx + 1
    }));
    setNewPlanData(prev => ({
      ...prev,
      days: updatedDays
    }));
  };

  const handleDayFieldChange = (index, field, value) => {
    const updatedDays = [...newPlanData.days];
    updatedDays[index] = {
      ...updatedDays[index],
      [field]: value
    };
    if (field === "verseTag") {
      updatedDays[index].verseId = value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/(^_+|_+$)/g, "");
    }
    setNewPlanData(prev => ({
      ...prev,
      days: updatedDays
    }));
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!newPlanData.title || newPlanData.days.some(d => !d.title || !d.verseText || !d.verseTag || !d.reflection)) {
      alert("Please fill in all plan details and complete every day card.");
      return;
    }

    try {
      setActionLoading(true);
      const res = await createCustomDevotional(newPlanData.title, newPlanData.category, newPlanData.days);
      if (res && res.error) {
        alert("Error: " + res.error);
      } else if (res && res.success) {
        alert("Custom Devotional Plan successfully created!");
        setShowCreatePlanForm(false);
        setNewPlanData({
          title: "",
          category: "Gratitude",
          days: [
            {
              day: 1,
              title: "",
              verseText: "",
              verseTag: "",
              verseId: "",
              reflection: ""
            }
          ]
        });
        refreshStats();
      } else {
        alert("Unexpected response: " + JSON.stringify(res));
      }
    } catch (err) {
      alert("Client error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Filtering Lists ---
  
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredTestimonies = testimonies.filter(t => 
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.author_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.tag?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredComments = comments.filter(c => 
    c.author_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.testimony_title && c.testimony_title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredPrayers = prayers.filter(p => 
    p.author_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPlans = [
    ...Object.values(staticDevotionals).map(p => ({ ...p, isCustom: false })),
    ...customPlans.map(p => ({ ...p, isCustom: true }))
  ].filter(p => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.isCustom ? "custom" : "system").includes(searchQuery.toLowerCase())
  );

  const renderTestimonyContent = (content) => {
    if (!content) return null;
    
    if (content.startsWith("[") || content.startsWith("{")) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          return parsed.map((item, idx) => {
            if (item && typeof item === "object") {
              if (item.type === "paragraph") {
                return (
                  <p 
                    key={idx} 
                    style={{ fontSize: "1.45rem", lineHeight: "1.7", color: "var(--light-color-alt)", marginBottom: "1.5rem" }}
                    dangerouslySetInnerHTML={{ __html: item.text }}
                  />
                );
              }
              if (item.type === "blockquote") {
                return (
                  <blockquote 
                    key={idx} 
                    style={{ 
                      borderLeft: "4px solid var(--accent-color)", 
                      paddingLeft: "1.5rem", 
                      marginBlock: "2rem", 
                      fontSize: "1.5rem", 
                      fontStyle: "italic", 
                      color: "var(--light-color)",
                      lineHeight: "1.6" 
                    }}
                    dangerouslySetInnerHTML={{ __html: item.text }}
                  />
                );
              }
              if (item.type === "list") {
                return (
                  <ul key={idx} style={{ paddingLeft: "2rem", marginBottom: "1.5rem", listStyleType: "disc" }}>
                    {item.items.map((li, lIdx) => (
                      <li 
                        key={lIdx} 
                        style={{ fontSize: "1.4rem", lineHeight: "1.7", color: "var(--light-color-alt)", marginBottom: "0.8rem" }}
                        dangerouslySetInnerHTML={{ __html: li }}
                      />
                    ))}
                  </ul>
                );
              }
            } else if (typeof item === "string") {
              return (
                <p key={idx} style={{ fontSize: "1.45rem", lineHeight: "1.7", color: "var(--light-color-alt)", marginBottom: "1.5rem" }}>
                  {item}
                </p>
              );
            }
            return null;
          });
        }
      } catch (e) {
        // Fall through
      }
    }
    
    return (
      <p style={{ fontSize: "1.45rem", lineHeight: "1.7", color: "var(--light-color-alt)" }}>
        {content}
      </p>
    );
  };

  if (loading) {
    return (
      <div className="place-items-center" style={{ width: "100%", height: "80vh", color: "var(--light-color-alt)" }}>
        Verifying administrator credentials...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <section className="section" style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", paddingBlock: "4rem" }}>
        <div 
          style={{
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            background: "var(--secondary-background-color)",
            padding: "5rem 4rem",
            borderRadius: "16px",
            boxShadow: "0 10px 45px rgba(0,0,0,0.15)",
            border: "1px solid var(--transparent-light-color)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "2.5rem"
          }}
        >
          <div 
            style={{ 
              width: "8.5rem", 
              height: "8.5rem", 
              borderRadius: "50%", 
              background: "rgba(255, 94, 98, 0.15)",
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              fontSize: "4.2rem",
              color: "#ff5e62",
              border: "1px solid rgba(255, 94, 98, 0.2)"
            }}
          >
            <i className="ri-shield-keyhole-line"></i>
          </div>
          <div>
            <h2 style={{ fontSize: "2.4rem", color: "var(--light-color)", fontWeight: "700", marginBottom: "1rem" }}>
              Access Denied
            </h2>
            <p style={{ fontSize: "1.5rem", color: "var(--light-color-alt)", lineHeight: "1.6", margin: "0 auto" }}>
              This page is restricted to application administrators. Please log in with an authorized administrator account to access this panel.
            </p>
          </div>
          <Link 
            href="/profile" 
            style={{ 
              background: "var(--accent-color)", 
              color: "#131417", 
              padding: "1.2rem 4rem", 
              borderRadius: "30px", 
              fontWeight: "700", 
              fontSize: "1.4rem",
              boxShadow: "0 4px 15px rgba(79, 207, 112, 0.2)"
            }}
          >
            Go to Profile
          </Link>
        </div>
      </section>
    );
  }

  const formatActivityTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 600);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHrs < 24) return `${Math.floor(diffMins / 60)}h ago`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "Recently";
    }
  };

  return (
    <section className="section" style={{ minHeight: "90vh", paddingBlock: "4rem" }}>
      <div className="container" style={{ maxWidth: "1200px" }}>
        
        {/* Admin Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "2rem",
          marginBottom: "3.5rem",
          borderBottom: "1px solid var(--transparent-light-color)",
          paddingBottom: "2rem"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
              <span style={{
                background: "rgba(250, 214, 72, 0.12)",
                color: "#fad648",
                padding: "0.2rem 1rem",
                borderRadius: "20px",
                fontSize: "1.1rem",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <i className="ri-shield-line"></i>
                SECURE ACCESS
              </span>
            </div>
            <h2 style={{ fontSize: "var(--font-size-lg)", color: "var(--light-color)", fontWeight: "700" }}>
              Control Panel & Moderation
            </h2>
            <p style={{ fontSize: "1.4rem", color: "var(--light-color-alt)" }}>
              Monitor system activities, analyze metrics, and moderate community contributions.
            </p>
          </div>
          <button 
            onClick={refreshStats}
            style={{
              padding: "1rem 2rem",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--transparent-light-color)",
              color: "var(--light-color)",
              borderRadius: "30px",
              fontSize: "1.3rem",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              transition: "all 0.2s"
            }}
          >
            <i className="ri-refresh-line"></i> Refresh Stats
          </button>
        </div>

        {/* Tab Controls */}
        <div style={{
          display: "flex",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px solid var(--transparent-light-color)",
          borderRadius: "12px",
          padding: "0.6rem",
          marginBottom: "3.5rem",
          overflowX: "auto",
          gap: "0.5rem",
          scrollbarWidth: "none"
        }} className="no-scrollbar">
          {[
            { id: "dashboard", label: "Overview Dashboard", icon: "ri-dashboard-3-line" },
            { id: "users", label: "Users Management", icon: "ri-group-line" },
            { id: "testimonies", label: "Testimony Feed", icon: "ri-chat-quote-line" },
            { id: "comments", label: "Comment Mod", icon: "ri-chat-3-line" },
            { id: "prayers", label: "Prayer Wall", icon: "ri-heart-pulse-line" },
            { id: "plans", label: "Devotional Plans", icon: "ri-book-open-line" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: activeTab === tab.id ? "var(--secondary-background-color)" : "transparent",
                color: activeTab === tab.id ? "var(--light-color)" : "var(--light-color-alt)",
                border: "none",
                padding: "1rem 1.8rem",
                borderRadius: "8px",
                fontSize: "1.3rem",
                fontWeight: activeTab === tab.id ? "700" : "500",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.8rem",
                transition: "all 0.25s",
                whiteSpace: "nowrap",
                outline: "none"
              }}
            >
              <i className={tab.icon} style={{ color: activeTab === tab.id ? "var(--accent-color)" : "inherit" }}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* --- 1. OVERVIEW DASHBOARD VIEW --- */}
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "3.5rem" }}>
            
            {/* Aggregate Stats Grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "2.5rem"
            }}>
              {[
                { title: "TOTAL USERS", value: stats.totalUsers, subtitle: "Registered accounts", icon: "ri-group-line", color: "#fad648", bg: "rgba(250, 214, 72, 0.08)" },
                { title: "ACTIVE TODAY", value: stats.activeToday, subtitle: `${stats.activeThisWeek} this week`, icon: "ri-user-follow-line", color: "#4fcf70", bg: "rgba(79, 207, 112, 0.08)" },
                { title: "TESTIMONIES", value: stats.totalTestimonies, subtitle: "Feed posts shared", icon: "ri-chat-quote-line", color: "#12bcfe", bg: "rgba(18, 188, 254, 0.08)" },
                { title: "PRAYERS REQUESTS", value: stats.totalPrayers, subtitle: "Intercessions requested", icon: "ri-heart-pulse-line", color: "#ff5e62", bg: "rgba(255, 94, 98, 0.08)" },
                { title: "COMMENTS & REPLIES", value: stats.totalComments, subtitle: "Engagement entries", icon: "ri-chat-3-line", color: "#a767e5", bg: "rgba(167, 103, 229, 0.08)" },
                { title: "DEVOTIONAL PLANS", value: stats.activePlans, subtitle: `${stats.completedPlans} completed`, icon: "ri-compass-3-line", color: "#ffa07a", bg: "rgba(255, 160, 122, 0.08)" }
              ].map((card, i) => (
                <div 
                  key={i}
                  style={{
                    background: "var(--secondary-background-color)",
                    padding: "2.5rem",
                    borderRadius: "12px",
                    border: "1px solid var(--transparent-light-color)",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    overflow: "hidden"
                  }}
                >
                  <div style={{
                    position: "absolute",
                    right: "-10px",
                    bottom: "-10px",
                    fontSize: "8rem",
                    color: "rgba(255,255,255,0.02)",
                    pointerEvents: "none"
                  }}>
                    <i className={card.icon}></i>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                    <span style={{ fontSize: "1.1rem", fontWeight: "700", color: "var(--light-color-alt)", letterSpacing: "1.5px" }}>
                      {card.title}
                    </span>
                    <div style={{
                      width: "3.6rem",
                      height: "3.6rem",
                      borderRadius: "50%",
                      background: card.bg,
                      color: card.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.8rem"
                    }}>
                      <i className={card.icon}></i>
                    </div>
                  </div>
                  <h3 style={{ fontSize: "3.2rem", fontWeight: "700", color: "var(--light-color)", marginBottom: "0.2rem" }}>
                    {card.value}
                  </h3>
                  <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
                    {card.subtitle}
                  </span>
                </div>
              ))}
            </div>

            {/* Activities and Details Row */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "3rem"
            }}>
              
              {/* Unified Recent Activity Log */}
              <div style={{
                background: "var(--secondary-background-color)",
                padding: "3.5rem 3rem",
                borderRadius: "16px",
                border: "1px solid var(--transparent-light-color)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.05)"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--light-color)" }}>
                      Recent Activity Stream
                    </h3>
                    <p style={{ fontSize: "1.3rem", color: "var(--light-color-alt)" }}>
                      Real-time log of community posts, registrations, intercessions, and feedback.
                    </p>
                  </div>
                  <span style={{
                    background: "rgba(79, 207, 112, 0.12)",
                    color: "#4fcf70",
                    padding: "0.4rem 1.2rem",
                    borderRadius: "30px",
                    fontSize: "1.1rem",
                    fontWeight: "700"
                  }}>
                    LIVE UPDATES
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.8rem" }}>
                  {activities.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "4rem", color: "var(--light-color-alt)" }}>
                      <i className="ri-inbox-line" style={{ fontSize: "4rem", display: "block", marginBottom: "1rem" }}></i>
                      No activity registered yet.
                    </div>
                  ) : (
                    activities.map((act) => {
                      let typeLabel = "Activity";
                      let typeColor = "#afb6cd";
                      let typeBg = "rgba(175, 182, 205, 0.1)";
                      let typeIcon = "ri-compass-line";

                      if (act.type === "user_registered") {
                        typeLabel = "USER SIGNUP";
                        typeColor = "#fad648";
                        typeBg = "rgba(250, 214, 72, 0.1)";
                        typeIcon = "ri-user-add-line";
                      } else if (act.type === "testimony_created") {
                        typeLabel = "FEED POST";
                        typeColor = "#4fcf70";
                        typeBg = "rgba(79, 207, 112, 0.1)";
                        typeIcon = "ri-chat-quote-line";
                      } else if (act.type === "comment_added") {
                        typeLabel = "COMMENT";
                        typeColor = "#a767e5";
                        typeBg = "rgba(167, 103, 229, 0.1)";
                        typeIcon = "ri-chat-3-line";
                      } else if (act.type === "prayer_requested") {
                        typeLabel = "PRAYER REQUEST";
                        typeColor = "#ff5e62";
                        typeBg = "rgba(255, 94, 98, 0.1)";
                        typeIcon = "ri-heart-pulse-line";
                      }

                      return (
                        <div 
                          key={act.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "1.8rem",
                            borderRadius: "10px",
                            background: "rgba(255,255,255,0.015)",
                            border: "1px solid var(--transparent-light-color)",
                            gap: "1.5rem"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", minWidth: 0 }}>
                            <div style={{
                              width: "4.2rem",
                              height: "4.2rem",
                              borderRadius: "10px",
                              background: typeBg,
                              color: typeColor,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "2rem",
                              flexShrink: 0
                            }}>
                              <i className={typeIcon}></i>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: "1.4rem", color: "var(--light-color)", lineHeight: "1.4" }}>
                                <strong style={{ fontWeight: "700" }}>{act.user}</strong> {act.details}
                              </p>
                              {act.email && (
                                <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)" }}>{act.email}</span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <span style={{
                              display: "inline-block",
                              fontSize: "1rem",
                              fontWeight: "700",
                              color: typeColor,
                              border: `1px solid ${typeColor}40`,
                              padding: "0.2rem 0.8rem",
                              borderRadius: "12px",
                              marginBottom: "0.5rem"
                            }}>
                              {typeLabel}
                            </span>
                            <span style={{ display: "block", fontSize: "1.1rem", color: "var(--light-color-alt)" }}>
                              {formatActivityTime(act.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Bar for Management Tabs */}
        {activeTab !== "dashboard" && (
          <div style={{
            background: "var(--secondary-background-color)",
            padding: "2rem",
            borderRadius: "12px",
            border: "1px solid var(--transparent-light-color)",
            marginBottom: "3rem",
            display: "flex",
            alignItems: "center",
            gap: "1.5rem"
          }}>
            <i className="ri-search-line" style={{ fontSize: "2rem", color: "var(--light-color-alt)" }}></i>
            <input
              type="text"
              placeholder={`Search in ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                color: "var(--light-color)",
                outline: "none"
              }}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")} 
                style={{ background: "none", color: "var(--light-color-alt)", border: "none", cursor: "pointer", fontSize: "1.6rem" }}
              >
                <i className="ri-close-circle-fill"></i>
              </button>
            )}
          </div>
        )}

        {/* --- 2. USERS MANAGEMENT VIEW --- */}
        {activeTab === "users" && (
          <div style={{ background: "var(--secondary-background-color)", borderRadius: "16px", border: "1px solid var(--transparent-light-color)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "1.45rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--transparent-light-color)" }}>
                    <th style={{ padding: "2rem" }}>User Info</th>
                    <th style={{ padding: "2rem" }}>Account Email</th>
                    <th style={{ padding: "2rem" }}>Activity Status</th>
                    <th style={{ padding: "2rem" }}>Current Streak</th>
                    <th style={{ padding: "2rem" }}>System Role</th>
                    <th style={{ padding: "2rem", textAlign: "right" }}>Moderation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: "4rem", textAlign: "center", color: "var(--light-color-alt)" }}>
                        No user accounts match search query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr 
                        key={u.id}
                        style={{
                          borderBottom: "1px solid var(--transparent-light-color)",
                          transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.01)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <td style={{ padding: "2rem", fontWeight: "600", color: "var(--light-color)" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <div style={{
                              width: "3.2rem",
                              height: "3.2rem",
                              borderRadius: "50%",
                              background: "rgba(255,255,255,0.05)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "1.4rem",
                              color: "var(--light-color)"
                            }}>
                              {u.name?.substring(0, 2).toUpperCase()}
                            </div>
                            <span>{u.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: "2rem", color: "var(--light-color-alt)" }}>{u.email}</td>
                        <td style={{ padding: "2rem" }}>
                          {u.last_active === new Date().toDateString() ? (
                            <span style={{ color: "#4fcf70", display: "inline-flex", alignItems: "center", gap: "0.5rem", fontWeight: "700" }}>
                              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4fcf70" }}></span> Active Today
                            </span>
                          ) : (
                            <span style={{ color: "var(--light-color-alt)" }}>
                              {u.last_active ? `Active ${u.last_active.split(" ").slice(1, 3).join(" ")}` : "Inactive"}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "2rem", fontWeight: "700", color: "var(--light-color)" }}>
                          <i className="ri-fire-fill" style={{ color: "#fad648", marginRight: "0.4rem" }}></i>
                          {u.streak_count || 0} Days
                        </td>
                        <td style={{ padding: "2rem" }}>
                          <span style={{
                            background: u.role === "admin" ? "rgba(250, 214, 72, 0.15)" : "rgba(255,255,255,0.05)",
                            color: u.role === "admin" ? "#fad648" : "var(--light-color-alt)",
                            padding: "0.4rem 1.2rem",
                            borderRadius: "15px",
                            fontSize: "1.1rem",
                            fontWeight: "700"
                          }}>
                            {u.role?.toUpperCase() || "USER"}
                          </span>
                        </td>
                        <td style={{ padding: "2rem", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button
                              disabled={actionLoading || u.id === currentUser.id}
                              onClick={() => handleToggleUserRole(u.id, u.role)}
                              title={u.role === "admin" ? "Demote user to normal role" : "Promote user to administrator"}
                              style={{
                                padding: "0.6rem 1.2rem",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid var(--transparent-light-color)",
                                color: "var(--light-color-alt)",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "1.2rem",
                                opacity: u.id === currentUser.id ? 0.3 : 1
                              }}
                            >
                              <i className="ri-exchange-line" style={{ marginRight: "0.4rem" }}></i>
                              {u.role === "admin" ? "Demote" : "Promote"}
                            </button>
                            <button
                              disabled={actionLoading || u.id === currentUser.id}
                              onClick={() => handleDeleteUser(u.id)}
                              title="Permanently remove user"
                              style={{
                                padding: "0.6rem 1.2rem",
                                background: "rgba(255, 94, 98, 0.1)",
                                border: "1px solid rgba(255, 94, 98, 0.2)",
                                color: "#ff5e62",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "1.2rem",
                                opacity: u.id === currentUser.id ? 0.3 : 1
                              }}
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 3. TESTIMONY FEED VIEW --- */}
        {activeTab === "testimonies" && (
          <div style={{ background: "var(--secondary-background-color)", borderRadius: "16px", border: "1px solid var(--transparent-light-color)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "1.45rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--transparent-light-color)" }}>
                    <th style={{ padding: "2rem" }}>Testimony Post</th>
                    <th style={{ padding: "2rem" }}>Author</th>
                    <th style={{ padding: "2rem" }}>Category</th>
                    <th style={{ padding: "2rem" }}>Date Published</th>
                    <th style={{ padding: "2rem" }}>Likes / Comments</th>
                    <th style={{ padding: "2rem", textAlign: "right" }}>Moderation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTestimonies.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: "4rem", textAlign: "center", color: "var(--light-color-alt)" }}>
                        No testimonies found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredTestimonies.map((t) => (
                      <tr 
                        key={t.id}
                        style={{
                          borderBottom: "1px solid var(--transparent-light-color)",
                          transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.01)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <td style={{ padding: "2rem", maxWidth: "350px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <span style={{ fontWeight: "700", color: "var(--light-color)" }}>{t.title}</span>
                            <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                              {t.excerpt}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "2rem", color: "var(--light-color-alt)" }}>{t.author_name}</td>
                        <td style={{ padding: "2rem" }}>
                          <span style={{
                            background: "rgba(18, 188, 254, 0.08)",
                            color: "#12bcfe",
                            padding: "0.3rem 1rem",
                            borderRadius: "20px",
                            fontSize: "1.1rem",
                            fontWeight: "600"
                          }}>
                            {t.tag}
                          </span>
                        </td>
                        <td style={{ padding: "2rem", color: "var(--light-color-alt)" }}>
                          {t.created_at && (t.created_at.includes("-") || t.created_at.includes(":"))
                            ? new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : t.created_at}
                        </td>
                        <td style={{ padding: "2rem", color: "var(--light-color)" }}>
                          <span style={{ marginRight: "1.5rem" }}><i className="ri-heart-line" style={{ color: "#ff5e62", marginRight: "0.4rem", verticalAlign: "middle" }}></i>{t.likes_count}</span>
                          <span><i className="ri-chat-3-line" style={{ color: "#a767e5", marginRight: "0.4rem", verticalAlign: "middle" }}></i>{t.comments_count}</span>
                        </td>
                        <td style={{ padding: "2rem", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => setPreviewTestimony(t)}
                              title="Preview testimony content"
                              style={{
                                padding: "0.6rem 1.2rem",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid var(--transparent-light-color)",
                                color: "var(--light-color-alt)",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "1.2rem"
                              }}
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleDeleteTestimony(t.id)}
                              title="Delete testimony post"
                              style={{
                                padding: "0.6rem 1.2rem",
                                background: "rgba(255, 94, 98, 0.1)",
                                border: "1px solid rgba(255, 94, 98, 0.2)",
                                color: "#ff5e62",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "1.2rem"
                              }}
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 4. COMMENTS MODERATION VIEW --- */}
        {activeTab === "comments" && (
          <div style={{ background: "var(--secondary-background-color)", borderRadius: "16px", border: "1px solid var(--transparent-light-color)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "1.45rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--transparent-light-color)" }}>
                    <th style={{ padding: "2rem" }}>Comment Text</th>
                    <th style={{ padding: "2rem" }}>Author</th>
                    <th style={{ padding: "2rem" }}>Testimony Post Context</th>
                    <th style={{ padding: "2rem" }}>Date Written</th>
                    <th style={{ padding: "2rem", textAlign: "right" }}>Moderation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComments.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ padding: "4rem", textAlign: "center", color: "var(--light-color-alt)" }}>
                        No comments found matching query.
                      </td>
                    </tr>
                  ) : (
                    filteredComments.map((c) => (
                      <tr 
                        key={c.id}
                        style={{
                          borderBottom: "1px solid var(--transparent-light-color)",
                          transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.01)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <td style={{ padding: "2rem", maxWidth: "400px", color: "var(--light-color)" }}>
                          <div style={{ fontStyle: "italic", wordBreak: "break-word" }}>
                            &quot;{c.content}&quot;
                          </div>
                        </td>
                        <td style={{ padding: "2rem", color: "var(--light-color-alt)" }}>{c.author_name}</td>
                        <td style={{ padding: "2rem", color: "var(--light-color-alt)" }}>
                          {c.testimony_title ? (
                            <strong style={{ color: "var(--light-color)" }}>{c.testimony_title}</strong>
                          ) : (
                            <span style={{ fontSize: "1.2rem", fontStyle: "italic" }}>Post deleted</span>
                          )}
                        </td>
                        <td style={{ padding: "2rem", color: "var(--light-color-alt)" }}>
                          {c.created_at && (c.created_at.includes("-") || c.created_at.includes(":"))
                            ? new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                            : c.created_at}
                        </td>
                        <td style={{ padding: "2rem", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => setPreviewComment(c)}
                              title="Preview comment"
                              style={{
                                padding: "0.6rem 1.2rem",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid var(--transparent-light-color)",
                                color: "var(--light-color-alt)",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "1.2rem"
                              }}
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleDeleteComment(c.id)}
                              title="Delete comment permanently"
                              style={{
                                padding: "0.6rem 1.2rem",
                                background: "rgba(255, 94, 98, 0.1)",
                                border: "1px solid rgba(255, 94, 98, 0.2)",
                                color: "#ff5e62",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "1.2rem"
                              }}
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 5. PRAYER WALL MODERATION VIEW --- */}
        {activeTab === "prayers" && (
          <div style={{ background: "var(--secondary-background-color)", borderRadius: "16px", border: "1px solid var(--transparent-light-color)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "1.45rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--transparent-light-color)" }}>
                    <th style={{ padding: "2rem" }}>Prayer Request</th>
                    <th style={{ padding: "2rem" }}>Author</th>
                    <th style={{ padding: "2rem" }}>Visibility</th>
                    <th style={{ padding: "2rem" }}>Date Requested</th>
                    <th style={{ padding: "2rem" }}>Status</th>
                    <th style={{ padding: "2rem", textAlign: "right" }}>Moderation</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPrayers.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ padding: "4rem", textAlign: "center", color: "var(--light-color-alt)" }}>
                        No prayer requests match search query.
                      </td>
                    </tr>
                  ) : (
                    filteredPrayers.map((p) => (
                      <tr 
                        key={p.id}
                        style={{
                          borderBottom: "1px solid var(--transparent-light-color)",
                          transition: "background-color 0.2s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.01)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                      >
                        <td style={{ padding: "2rem", maxWidth: "350px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            <span style={{ fontWeight: "700", color: "var(--light-color)" }}>{p.title}</span>
                            <span style={{ fontSize: "1.25rem", color: "var(--light-color-alt)", wordBreak: "break-word" }}>
                              {p.content}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "2rem", color: "var(--light-color-alt)" }}>
                          {p.is_anonymous === 1 ? "Anonymous" : p.author_name}
                        </td>
                        <td style={{ padding: "2rem" }}>
                          {p.is_anonymous === 1 ? (
                            <span style={{ color: "#afb6cd", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                              <i className="ri-eye-off-line"></i> Anonymous
                            </span>
                          ) : (
                            <span style={{ color: "#4fcf70", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                              <i className="ri-eye-line"></i> Public
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "2rem", color: "var(--light-color-alt)" }}>
                          {p.created_at && (p.created_at.includes("-") || p.created_at.includes(":"))
                            ? new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                            : p.created_at}
                        </td>
                        <td style={{ padding: "2rem" }}>
                          <span style={{
                            background: "rgba(79, 207, 112, 0.12)",
                            color: "#4fcf70",
                            padding: "0.3rem 1rem",
                            borderRadius: "15px",
                            fontSize: "1.1rem",
                            fontWeight: "700"
                          }}>
                            {p.status?.toUpperCase() || "ACTIVE"}
                          </span>
                        </td>
                        <td style={{ padding: "2rem", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => setPreviewPrayer(p)}
                              title="Preview prayer request"
                              style={{
                                padding: "0.6rem 1.2rem",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid var(--transparent-light-color)",
                                color: "var(--light-color-alt)",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "1.2rem"
                              }}
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleDeletePrayer(p.id)}
                              title="Delete prayer request permanently"
                              style={{
                                padding: "0.6rem 1.2rem",
                                background: "rgba(255, 94, 98, 0.1)",
                                border: "1px solid rgba(255, 94, 98, 0.2)",
                                color: "#ff5e62",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "1.2rem"
                              }}
                            >
                              <i className="ri-delete-bin-line"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- 6. DEVOTIONAL PLANS VIEW --- */}
        {activeTab === "plans" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
            
            {/* Action Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
              <h3 style={{ fontSize: "1.8rem", color: "var(--light-color)", fontWeight: "700", margin: 0 }}>
                Devotional Plans Registry
              </h3>
              <button
                onClick={() => setShowCreatePlanForm(!showCreatePlanForm)}
                style={{
                  padding: "1rem 2rem",
                  background: showCreatePlanForm ? "rgba(255, 94, 98, 0.15)" : "var(--accent-color)",
                  color: showCreatePlanForm ? "#ff5e62" : "#131417",
                  border: showCreatePlanForm ? "1px solid rgba(255, 94, 98, 0.3)" : "none",
                  borderRadius: "30px",
                  fontSize: "1.3rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.8rem",
                  transition: "all 0.2s"
                }}
              >
                {showCreatePlanForm ? (
                  <>
                    <i className="ri-close-line"></i> Cancel Form
                  </>
                ) : (
                  <>
                    <i className="ri-add-line"></i> Create New Plan
                  </>
                )}
              </button>
            </div>

            {/* Plan Creator Form */}
            {showCreatePlanForm && (
              <form 
                onSubmit={handleCreatePlan}
                style={{
                  background: "var(--secondary-background-color)",
                  borderRadius: "16px",
                  border: "1px solid var(--transparent-light-color)",
                  padding: "2.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2rem",
                  animation: "fadeIn 0.25s ease-out"
                }}
              >
                <h4 style={{ fontSize: "1.6rem", color: "var(--accent-color)", fontWeight: "700", margin: 0 }}>
                  Create Custom Devotional Plan
                </h4>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "1.15rem", color: "var(--light-color-alt)", fontWeight: "600" }}>PLAN TITLE</label>
                    <input 
                      type="text"
                      placeholder="e.g. Victory in Trials"
                      value={newPlanData.title}
                      onChange={(e) => setNewPlanData(prev => ({ ...prev, title: e.target.value }))}
                      required
                      style={{
                        padding: "1.2rem",
                        background: "var(--primary-background-color)",
                        border: "2px solid var(--transparent-light-color)",
                        borderRadius: "6px",
                        color: "var(--light-color)",
                        outline: "none"
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <label style={{ fontSize: "1.15rem", color: "var(--light-color-alt)", fontWeight: "600" }}>CATEGORY / TOPIC</label>
                    <select
                      value={newPlanData.category}
                      onChange={(e) => setNewPlanData(prev => ({ ...prev, category: e.target.value }))}
                      style={{
                        padding: "1.2rem",
                        background: "var(--primary-background-color)",
                        border: "2px solid var(--transparent-light-color)",
                        borderRadius: "6px",
                        color: "var(--light-color)",
                        outline: "none",
                        cursor: "pointer"
                      }}
                    >
                      {["Gratitude", "Love", "Anxiety", "Healing", "Anger", "Hope", "Depression", "Fear", "Peace", "Stress", "Patience", "Loss", "Jealousy", "Joy", "Temptation", "Pride", "Doubt"].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "1.2rem", color: "var(--light-color)", fontWeight: "700" }}>PLAN DAYS & DAILY CONTENT</label>
                    <button
                      type="button"
                      onClick={handleAddDayToNewPlan}
                      style={{
                        padding: "0.6rem 1.4rem",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid var(--transparent-light-color)",
                        color: "var(--accent-color)",
                        borderRadius: "20px",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                        fontWeight: "600"
                      }}
                    >
                      + Add Day
                    </button>
                  </div>

                  {newPlanData.days.map((day, idx) => (
                    <div 
                      key={idx}
                      style={{
                        background: "rgba(0,0,0,0.15)",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.02)",
                        padding: "2rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.5rem"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "1.3rem", fontWeight: "700", color: "#fad648" }}>Day {day.day}</span>
                        {newPlanData.days.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDayFromNewPlan(idx)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#ff5e62",
                              cursor: "pointer",
                              fontSize: "1.2rem"
                            }}
                          >
                            Remove Day
                          </button>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <input 
                            type="text"
                            placeholder="Day Subtitle (e.g. Walking in Grace)"
                            value={day.title}
                            onChange={(e) => handleDayFieldChange(idx, "title", e.target.value)}
                            required
                            style={{
                              padding: "1rem",
                              background: "var(--primary-background-color)",
                              border: "1px solid var(--transparent-light-color)",
                              borderRadius: "6px",
                              color: "var(--light-color)",
                              outline: "none",
                              fontSize: "1.3rem"
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <input 
                            type="text"
                            placeholder="Scripture Citation (e.g. Psalm 23:1)"
                            value={day.verseTag}
                            onChange={(e) => handleDayFieldChange(idx, "verseTag", e.target.value)}
                            required
                            style={{
                              padding: "1rem",
                              background: "var(--primary-background-color)",
                              border: "1px solid var(--transparent-light-color)",
                              borderRadius: "6px",
                              color: "var(--light-color)",
                              outline: "none",
                              fontSize: "1.3rem"
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <textarea
                          placeholder="Scripture Text (e.g. The Lord is my shepherd; I shall not want...)"
                          value={day.verseText}
                          onChange={(e) => handleDayFieldChange(idx, "verseText", e.target.value)}
                          required
                          rows="2"
                          style={{
                            padding: "1rem",
                            background: "var(--primary-background-color)",
                            border: "1px solid var(--transparent-light-color)",
                            borderRadius: "6px",
                            color: "var(--light-color)",
                            outline: "none",
                            fontSize: "1.3rem",
                            resize: "vertical"
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <textarea
                          placeholder="Daily Reflection text..."
                          value={day.reflection}
                          onChange={(e) => handleDayFieldChange(idx, "reflection", e.target.value)}
                          required
                          rows="3"
                          style={{
                            padding: "1rem",
                            background: "var(--primary-background-color)",
                            border: "1px solid var(--transparent-light-color)",
                            borderRadius: "6px",
                            color: "var(--light-color)",
                            outline: "none",
                            fontSize: "1.3rem",
                            resize: "vertical"
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => setShowCreatePlanForm(false)}
                    style={{
                      padding: "1rem 2rem",
                      background: "transparent",
                      border: "1px solid var(--transparent-light-color)",
                      color: "var(--light-color-alt)",
                      borderRadius: "30px",
                      fontSize: "1.3rem",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{
                      padding: "1rem 2.5rem",
                      background: "var(--accent-color)",
                      color: "#131417",
                      border: "none",
                      borderRadius: "30px",
                      fontSize: "1.3rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      opacity: actionLoading ? 0.7 : 1
                    }}
                  >
                    {actionLoading ? "Publishing..." : "Publish Devotional Plan"}
                  </button>
                </div>
              </form>
            )}

            {/* Plans List Table */}
            <div style={{ background: "var(--secondary-background-color)", borderRadius: "16px", border: "1px solid var(--transparent-light-color)", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "1.45rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--transparent-light-color)" }}>
                      <th style={{ padding: "2rem" }}>Plan Title</th>
                      <th style={{ padding: "2rem" }}>Category</th>
                      <th style={{ padding: "2rem" }}>Days Count</th>
                      <th style={{ padding: "2rem" }}>Source Type</th>
                      <th style={{ padding: "2rem", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlans.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ padding: "4rem", textAlign: "center", color: "var(--light-color-alt)" }}>
                          No devotional plans match search query.
                        </td>
                      </tr>
                    ) : (
                      filteredPlans.map((p) => (
                        <tr 
                          key={p.id}
                          style={{
                            borderBottom: "1px solid var(--transparent-light-color)",
                            transition: "background-color 0.2s"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.01)"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          <td style={{ padding: "2rem", fontWeight: "600", color: "var(--light-color)" }}>{p.title}</td>
                          <td style={{ padding: "2rem", color: "var(--light-color-alt)" }}>{p.category}</td>
                          <td style={{ padding: "2rem", color: "var(--light-color-alt)" }}>
                            {p.days ? p.days.length : 0} Days
                          </td>
                          <td style={{ padding: "2rem" }}>
                            {p.isCustom ? (
                              <span style={{
                                background: "rgba(18, 188, 254, 0.08)",
                                color: "#12bcfe",
                                padding: "0.3rem 0.8rem",
                                borderRadius: "20px",
                                fontSize: "1.1rem",
                                fontWeight: "600"
                              }}>
                                Custom
                              </span>
                            ) : (
                              <span style={{
                                background: "rgba(175, 182, 205, 0.12)",
                                color: "#afb6cd",
                                padding: "0.3rem 0.8rem",
                                borderRadius: "20px",
                                fontSize: "1.1rem",
                                fontWeight: "600"
                              }}>
                                System
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "2rem", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "1rem", justifyContent: "flex-end" }}>
                              <button
                                onClick={() => setPreviewPlan(p)}
                                title="Preview plan content"
                                style={{
                                  padding: "0.6rem 1.2rem",
                                  background: "rgba(255,255,255,0.05)",
                                  border: "1px solid var(--transparent-light-color)",
                                  color: "var(--light-color-alt)",
                                  borderRadius: "8px",
                                  cursor: "pointer",
                                  fontSize: "1.2rem"
                                }}
                              >
                                <i className="ri-eye-line"></i>
                              </button>
                              <button
                                disabled={actionLoading || !p.isCustom}
                                onClick={() => handleDeleteCustomDevotional(p.id)}
                                title={p.isCustom ? "Delete plan permanently" : "System plan cannot be deleted"}
                                style={{
                                  padding: "0.6rem 1.2rem",
                                  background: p.isCustom ? "rgba(255, 94, 98, 0.1)" : "rgba(255,255,255,0.02)",
                                  border: p.isCustom ? "1px solid rgba(255, 94, 98, 0.2)" : "1px solid transparent",
                                  color: p.isCustom ? "#ff5e62" : "rgba(255,255,255,0.15)",
                                  borderRadius: "8px",
                                  cursor: p.isCustom ? "pointer" : "not-allowed",
                                  fontSize: "1.2rem"
                                }}
                              >
                                <i className="ri-delete-bin-line"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Testimony Preview Modal Overlay */}
      {previewTestimony && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewTestimony(null);
          }}
        >
          <div style={{
            background: "var(--secondary-background-color)",
            borderRadius: "16px",
            border: "1px solid var(--transparent-light-color)",
            width: "100%",
            maxWidth: "650px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "2rem",
              borderBottom: "1px solid var(--transparent-light-color)"
            }}>
              <h3 style={{ fontSize: "1.8rem", color: "var(--light-color)", margin: 0, fontWeight: "700" }}>
                Testimony Preview
              </h3>
              <button 
                onClick={() => setPreviewTestimony(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--light-color-alt)",
                  fontSize: "2.2rem",
                  cursor: "pointer",
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: "2rem",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem"
            }}>
              <h4 style={{ fontSize: "2rem", color: "var(--accent-color)", margin: 0, fontWeight: "700", lineHeight: "1.3" }}>
                {previewTestimony.title}
              </h4>

              {/* Meta Row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
                  <div style={{
                    width: "2.8rem",
                    height: "2.8rem",
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "1.2rem",
                    color: "var(--light-color)"
                  }}>
                    {previewTestimony.author_name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color)" }}>
                      {previewTestimony.author_name}
                    </span>
                    <span style={{ fontSize: "1rem", color: "var(--light-color-alt)" }}>
                      {previewTestimony.created_at && (previewTestimony.created_at.includes("-") || previewTestimony.created_at.includes(":"))
                        ? new Date(previewTestimony.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : previewTestimony.created_at}
                    </span>
                  </div>
                </div>

                <span style={{
                  background: "rgba(18, 188, 254, 0.08)",
                  color: "#12bcfe",
                  padding: "0.3rem 1rem",
                  borderRadius: "20px",
                  fontSize: "1.1rem",
                  fontWeight: "600"
                }}>
                  {previewTestimony.tag}
                </span>
              </div>

              {/* Post Content */}
              <div style={{
                fontSize: "1.45rem",
                color: "var(--light-color-alt)",
                lineHeight: "1.7",
                whiteSpace: "pre-wrap",
                background: "rgba(0,0,0,0.2)",
                padding: "1.5rem",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.02)"
              }}>
                {renderTestimonyContent(previewTestimony.content)}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "1.5rem 2rem",
              borderTop: "1px solid var(--transparent-light-color)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "1rem",
              background: "rgba(0,0,0,0.15)"
            }}>
              <button
                onClick={() => setPreviewTestimony(null)}
                style={{
                  padding: "0.8rem 1.6rem",
                  background: "transparent",
                  border: "1px solid var(--transparent-light-color)",
                  color: "var(--light-color-alt)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1.3rem"
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  const id = previewTestimony.id;
                  setPreviewTestimony(null);
                  handleDeleteTestimony(id);
                }}
                disabled={actionLoading}
                style={{
                  padding: "0.8rem 1.6rem",
                  background: "#ff5e62",
                  border: "none",
                  color: "#fff",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1.3rem",
                  fontWeight: "600"
                }}
              >
                Delete Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prayer Preview Modal Overlay */}
      {previewPrayer && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewPrayer(null);
          }}
        >
          <div style={{
            background: "var(--secondary-background-color)",
            borderRadius: "16px",
            border: "1px solid var(--transparent-light-color)",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "2rem",
              borderBottom: "1px solid var(--transparent-light-color)"
            }}>
              <h3 style={{ fontSize: "1.8rem", color: "var(--light-color)", margin: 0, fontWeight: "700" }}>
                Prayer Request Preview
              </h3>
              <button 
                onClick={() => setPreviewPrayer(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--light-color-alt)",
                  fontSize: "2.2rem",
                  cursor: "pointer",
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: "2rem",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem"
            }}>
              <h4 style={{ fontSize: "2rem", color: "var(--accent-color)", margin: 0, fontWeight: "700", lineHeight: "1.3" }}>
                {previewPrayer.title}
              </h4>

              {/* Info Row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
                  Requested by: <strong>{previewPrayer.is_anonymous === 1 ? "Anonymous" : previewPrayer.author_name}</strong>
                </span>
                <span style={{
                  background: "rgba(79, 207, 112, 0.12)",
                  color: "#4fcf70",
                  padding: "0.3rem 1rem",
                  borderRadius: "15px",
                  fontSize: "1.1rem",
                  fontWeight: "700"
                }}>
                  {previewPrayer.status?.toUpperCase() || "ACTIVE"}
                </span>
              </div>

              {/* Content */}
              <div style={{
                fontSize: "1.45rem",
                color: "var(--light-color-alt)",
                lineHeight: "1.7",
                whiteSpace: "pre-wrap",
                background: "rgba(0,0,0,0.2)",
                padding: "1.5rem",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.02)"
              }}>
                {previewPrayer.content}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "1.5rem 2rem",
              borderTop: "1px solid var(--transparent-light-color)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "1rem",
              background: "rgba(0,0,0,0.15)"
            }}>
              <button
                onClick={() => setPreviewPrayer(null)}
                style={{
                  padding: "0.8rem 1.6rem",
                  background: "transparent",
                  border: "1px solid var(--transparent-light-color)",
                  color: "var(--light-color-alt)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1.3rem"
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  const id = previewPrayer.id;
                  setPreviewPrayer(null);
                  handleDeletePrayer(id);
                }}
                disabled={actionLoading}
                style={{
                  padding: "0.8rem 1.6rem",
                  background: "#ff5e62",
                  border: "none",
                  color: "#fff",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1.3rem",
                  fontWeight: "600"
                }}
              >
                Delete Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Preview Modal Overlay */}
      {previewComment && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewComment(null);
          }}
        >
          <div style={{
            background: "var(--secondary-background-color)",
            borderRadius: "16px",
            border: "1px solid var(--transparent-light-color)",
            width: "100%",
            maxWidth: "600px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "2rem",
              borderBottom: "1px solid var(--transparent-light-color)"
            }}>
              <h3 style={{ fontSize: "1.8rem", color: "var(--light-color)", margin: 0, fontWeight: "700" }}>
                Comment Preview
              </h3>
              <button 
                onClick={() => setPreviewComment(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--light-color-alt)",
                  fontSize: "2.2rem",
                  cursor: "pointer",
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: "2rem",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem"
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
                  Written by: <strong>{previewComment.author_name}</strong>
                </span>
                <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
                  On post: <strong style={{ color: "var(--accent-color)" }}>{previewComment.testimony_title || "Deleted Post"}</strong>
                </span>
              </div>

              {/* Content */}
              <div style={{
                fontSize: "1.45rem",
                color: "var(--light-color)",
                lineHeight: "1.7",
                whiteSpace: "pre-wrap",
                background: "rgba(0,0,0,0.2)",
                padding: "1.5rem",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.02)",
                fontStyle: "italic"
              }}>
                &quot;{previewComment.content}&quot;
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "1.5rem 2rem",
              borderTop: "1px solid var(--transparent-light-color)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "1rem",
              background: "rgba(0,0,0,0.15)"
            }}>
              <button
                onClick={() => setPreviewComment(null)}
                style={{
                  padding: "0.8rem 1.6rem",
                  background: "transparent",
                  border: "1px solid var(--transparent-light-color)",
                  color: "var(--light-color-alt)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1.3rem"
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  const id = previewComment.id;
                  setPreviewComment(null);
                  handleDeleteComment(id);
                }}
                disabled={actionLoading}
                style={{
                  padding: "0.8rem 1.6rem",
                  background: "#ff5e62",
                  border: "none",
                  color: "#fff",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1.3rem",
                  fontWeight: "600"
                }}
              >
                Delete Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Devotional Plan Preview Modal Overlay */}
      {previewPlan && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            zIndex: 3000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem"
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewPlan(null);
          }}
        >
          <div style={{
            background: "var(--secondary-background-color)",
            borderRadius: "16px",
            border: "1px solid var(--transparent-light-color)",
            width: "100%",
            maxWidth: "650px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "2rem",
              borderBottom: "1px solid var(--transparent-light-color)"
            }}>
              <div>
                <h3 style={{ fontSize: "1.8rem", color: "var(--light-color)", margin: 0, fontWeight: "700" }}>
                  Devotional Plan Preview
                </h3>
                <span style={{ fontSize: "1.15rem", color: "var(--light-color-alt)" }}>
                  {previewPlan.isCustom ? "Admin Created Custom Plan" : "System Core Plan"}
                </span>
              </div>
              <button 
                onClick={() => setPreviewPlan(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--light-color-alt)",
                  fontSize: "2.2rem",
                  cursor: "pointer",
                  lineHeight: 1
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{
              padding: "2rem",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "2rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h4 style={{ fontSize: "2.2rem", color: "var(--accent-color)", margin: 0, fontWeight: "700" }}>
                  {previewPlan.title}
                </h4>
                <span style={{
                  background: "rgba(18, 188, 254, 0.08)",
                  color: "#12bcfe",
                  padding: "0.4rem 1.2rem",
                  borderRadius: "20px",
                  fontSize: "1.2rem",
                  fontWeight: "600"
                }}>
                  {previewPlan.category}
                </span>
              </div>

              {/* Day lists */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {previewPlan.days?.map((d) => (
                  <div 
                    key={d.day}
                    style={{
                      background: "rgba(0,0,0,0.15)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.02)",
                      padding: "1.8rem"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                      <span style={{ fontWeight: "700", color: "#fad648" }}>Day {d.day}: {d.title}</span>
                      <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>{d.verseTag}</span>
                    </div>
                    <blockquote style={{
                      borderLeft: "3px solid var(--accent-color)",
                      paddingLeft: "1.2rem",
                      fontSize: "1.35rem",
                      color: "var(--light-color-alt)",
                      marginBlock: "1rem",
                      fontStyle: "italic"
                    }}>
                      &quot;{d.verseText}&quot;
                    </blockquote>
                    <p style={{ fontSize: "1.35rem", color: "var(--light-color)", margin: 0 }}>
                      {d.reflection}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: "1.5rem 2rem",
              borderTop: "1px solid var(--transparent-light-color)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "1rem",
              background: "rgba(0,0,0,0.15)"
            }}>
              <button
                onClick={() => setPreviewPlan(null)}
                style={{
                  padding: "0.8rem 1.6rem",
                  background: "transparent",
                  border: "1px solid var(--transparent-light-color)",
                  color: "var(--light-color-alt)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1.3rem"
                }}
              >
                Close
              </button>
              {previewPlan.isCustom && (
                <button
                  onClick={() => {
                    const id = previewPlan.id;
                    setPreviewPlan(null);
                    handleDeleteCustomDevotional(id);
                  }}
                  disabled={actionLoading}
                  style={{
                    padding: "0.8rem 1.6rem",
                    background: "#ff5e62",
                    border: "none",
                    color: "#fff",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "1.3rem",
                    fontWeight: "600"
                  }}
                >
                  Delete Plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
