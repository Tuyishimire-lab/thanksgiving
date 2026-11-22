"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
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
  updateCustomDevotional,
  deleteCustomDevotional,
} from "@/app/actions/adminActions";
import { getCustomDevotionals } from "@/app/actions/dbActions";
import { devotionals as staticDevotionals } from "@/data/devotionals";
import {
  ADMIN_PLAN_CATEGORIES,
  getDefaultPlanCover,
  isSafeImageUrl,
} from "@/components/admin/adminConstants";
import {
  ConfirmActionModal,
  TestimonyPreviewModal,
  PrayerPreviewModal,
  CommentPreviewModal,
  PlanPreviewModal,
} from "@/components/admin/AdminModals";
import AdminPlanForm from "@/components/admin/AdminPlanForm";

function createEmptyDay(dayNum = 1) {
  return {
    day: dayNum,
    title: "",
    verseText: "",
    verseTag: "",
    verseId: "",
    reflection: "",
  };
}

function createEmptyPlanForm() {
  return {
    title: "",
    category: "Gratitude",
    image: getDefaultPlanCover("Gratitude"),
    days: [createEmptyDay(1)],
  };
}

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [referenceNow, setReferenceNow] = useState(null);
  const [statsRefreshTick, setStatsRefreshTick] = useState(0);
  const [refreshingStats, setRefreshingStats] = useState(false);

  // Toast & confirmation modal state (replaces window.alert / window.confirm)
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const toastTimerRef = useRef(null);
  const planFormRef = useRef(null);

  // Stats and activities
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    activeThisWeek: 0,
    totalTestimonies: 0,
    totalComments: 0,
    totalPrayers: 0,
    activePlans: 0,
    completedPlans: 0,
  });
  const [activities, setActivities] = useState([]);

  // Admin tabs & collections data
  const [activeTab, setActiveTab] = useState("dashboard");
  const [tabLoading, setTabLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [testimonies, setTestimonies] = useState([]);
  const [comments, setComments] = useState([]);
  const [prayers, setPrayers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [planCategoryFilter, setPlanCategoryFilter] = useState("All");
  const [planSourceFilter, setPlanSourceFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);

  // Previews & plan builder state
  const [previewTestimony, setPreviewTestimony] = useState(null);
  const [previewPrayer, setPreviewPrayer] = useState(null);
  const [previewComment, setPreviewComment] = useState(null);
  const [customPlans, setCustomPlans] = useState([]);
  const [previewPlan, setPreviewPlan] = useState(null);
  const [showCreatePlanForm, setShowCreatePlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [newPlanData, setNewPlanData] = useState(createEmptyPlanForm);
  const [scrollFormTick, setScrollFormTick] = useState(0);

  useEffect(() => {
    if (!scrollFormTick || !showCreatePlanForm) return;
    planFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollFormTick, showCreatePlanForm]);

  const showToast = (tone, message) => {
    setToast({ tone, message });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // Authenticate admin on mount
  useEffect(() => {
    let active = true;
    async function checkAuth() {
      try {
        const user = await getMe();
        if (!active) return;
        if (!user || user.role !== "admin") {
          setLoading(false);
          return;
        }
        setReferenceNow(Date.now());
        setCurrentUser(user);
      } catch (err) {
        console.error("Failed to authenticate admin:", err);
      } finally {
        if (active) setLoading(false);
      }
    }
    checkAuth();
    return () => {
      active = false;
    };
  }, []);

  // Load and refresh dashboard stats & custom plans
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    async function loadStats() {
      try {
        const [statsRes, plansRes] = await Promise.all([
          getAdminStats(),
          getCustomDevotionals(),
        ]);
        if (!active) return;
        if (statsRes.success) {
          setStats(statsRes.stats);
          setActivities(statsRes.activityStream);
        }
        if (plansRes.success) {
          setCustomPlans(plansRes.plans);
        }
        setReferenceNow(Date.now());
      } catch (err) {
        console.error("Failed to load admin stats:", err);
      } finally {
        if (active) setRefreshingStats(false);
      }
    }
    loadStats();
    return () => {
      active = false;
    };
  }, [currentUser, statsRefreshTick]);

  // Keep reference timestamp periodically refreshed for relative activity timestamps
  useEffect(() => {
    if (!currentUser) return;
    const intervalId = setInterval(() => {
      setReferenceNow(Date.now());
    }, 60000);
    return () => clearInterval(intervalId);
  }, [currentUser]);

  // Fetch collections on-demand when active tab switches
  useEffect(() => {
    if (!currentUser || activeTab === "dashboard") return;
    let active = true;

    async function loadTabData() {
      try {
        if (activeTab === "users") {
          const res = await getAdminUsers();
          if (active && res.success) setUsers(res.users);
        } else if (activeTab === "testimonies") {
          const res = await getAdminTestimonies();
          if (active && res.success) setTestimonies(res.testimonies);
        } else if (activeTab === "comments") {
          const res = await getAdminComments();
          if (active && res.success) setComments(res.comments);
        } else if (activeTab === "prayers") {
          const res = await getAdminPrayers();
          if (active && res.success) setPrayers(res.prayers);
        } else if (activeTab === "plans") {
          const res = await getCustomDevotionals();
          if (active && res.success) setCustomPlans(res.plans);
        }
        if (active) {
          setReferenceNow(Date.now());
        }
      } catch (error) {
        console.error("Error loading tab data:", error);
      } finally {
        if (active) setTabLoading(false);
      }
    }
    loadTabData();
    return () => {
      active = false;
    };
  }, [activeTab, currentUser]);

  // Refresh general stats & logs helper
  const refreshStats = () => {
    setRefreshingStats(true);
    setStatsRefreshTick((prev) => prev + 1);
  };

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) return;
    setSearchQuery("");
    if (nextTab !== "dashboard") {
      setTabLoading(true);
    } else {
      setTabLoading(false);
    }
    setActiveTab(nextTab);
  };

  // --- Administrative Moderation Handlers ---

  const handleToggleUserRole = (user) => {
    if (user.id === currentUser.id) {
      showToast("error", "You cannot demote your own administrator account.");
      return;
    }
    const nextRole = user.role === "admin" ? "user" : "admin";
    setConfirmDialog({
      title: user.role === "admin" ? "Demote Administrator" : "Promote to Administrator",
      message: `Change ${user.name || user.email}'s role to ${nextRole}?`,
      confirmLabel: user.role === "admin" ? "Demote User" : "Promote User",
      tone: "gold",
      icon: "ri-exchange-line",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const res = await toggleUserRole(user.id, user.role);
          if (res?.error) {
            showToast("error", res.error);
          } else if (res?.success) {
            setUsers((prev) =>
              prev.map((u) => (u.id === user.id ? { ...u, role: res.newRole } : u))
            );
            showToast("ok", `Updated role to ${res.newRole}.`);
            refreshStats();
          } else {
            showToast("error", "Unexpected server response while updating role.");
          }
        } catch (err) {
          showToast("error", `Client error: ${err.message}`);
        } finally {
          setActionLoading(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleDeleteUser = (user) => {
    if (user.id === currentUser.id) {
      showToast("error", "You cannot delete your own administrator account.");
      return;
    }
    setConfirmDialog({
      title: "Delete User Account",
      message: `Permanently delete ${user.name || user.email}? This removes their profile, streak history, notes, highlights, and associated data irreversibly.`,
      confirmLabel: "Delete User",
      tone: "danger",
      icon: "ri-user-unfollow-line",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const res = await deleteUser(user.id);
          if (res?.error) {
            showToast("error", res.error);
          } else if (res?.success) {
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
            showToast("ok", "User account deleted permanently.");
            refreshStats();
          } else {
            showToast("error", "Unexpected server response while deleting user.");
          }
        } catch (err) {
          showToast("error", `Client error: ${err.message}`);
        } finally {
          setActionLoading(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleDeleteTestimony = (id, title = "") => {
    setConfirmDialog({
      title: "Delete Testimony Post",
      message: `Delete ${title ? `"${title}"` : "this testimony post"}? All likes and comments belonging to it will also be deleted.`,
      confirmLabel: "Delete Post",
      tone: "danger",
      icon: "ri-delete-bin-line",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const res = await deleteTestimony(id);
          if (res?.error) {
            showToast("error", res.error);
          } else if (res?.success) {
            setTestimonies((prev) => prev.filter((t) => t.id !== id));
            showToast("ok", "Testimony post deleted.");
            refreshStats();
          } else {
            showToast("error", "Unexpected server response while deleting post.");
          }
        } catch (err) {
          showToast("error", `Client error: ${err.message}`);
        } finally {
          setActionLoading(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleDeleteComment = (id) => {
    setConfirmDialog({
      title: "Delete Comment",
      message: "Are you sure you want to permanently remove this comment?",
      confirmLabel: "Delete Comment",
      tone: "danger",
      icon: "ri-chat-delete-line",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const res = await deleteComment(id);
          if (res?.error) {
            showToast("error", res.error);
          } else if (res?.success) {
            setComments((prev) => prev.filter((c) => c.id !== id));
            showToast("ok", "Comment deleted.");
            refreshStats();
          } else {
            showToast("error", "Unexpected server response while deleting comment.");
          }
        } catch (err) {
          showToast("error", `Client error: ${err.message}`);
        } finally {
          setActionLoading(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleDeletePrayer = (id, title = "") => {
    setConfirmDialog({
      title: "Delete Prayer Request",
      message: `Are you sure you want to permanently delete ${title ? `"${title}"` : "this prayer request"}?`,
      confirmLabel: "Delete Request",
      tone: "danger",
      icon: "ri-heart-pulse-line",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const res = await deletePrayer(id);
          if (res?.error) {
            showToast("error", res.error);
          } else if (res?.success) {
            setPrayers((prev) => prev.filter((p) => p.id !== id));
            showToast("ok", "Prayer request deleted.");
            refreshStats();
          } else {
            showToast("error", "Unexpected server response while deleting prayer.");
          }
        } catch (err) {
          showToast("error", `Client error: ${err.message}`);
        } finally {
          setActionLoading(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleDeleteCustomDevotional = (plan) => {
    const isOverride = Boolean(plan.isOverridden);
    setConfirmDialog({
      title: isOverride ? "Restore System Plan" : "Delete Custom Devotional Plan",
      message: isOverride
        ? `Delete this override for "${plan.title}" and restore the default system plan?`
        : `Permanently delete "${plan.title}"? This will also remove all user progress and reflection notes for this plan.`,
      confirmLabel: isOverride ? "Restore Default" : "Delete Plan",
      tone: "danger",
      icon: isOverride ? "ri-arrow-go-back-line" : "ri-delete-bin-line",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const res = await deleteCustomDevotional(plan.id);
          if (res?.error) {
            showToast("error", res.error);
          } else if (res?.success) {
            setCustomPlans((prev) => prev.filter((p) => p.id !== plan.id));
            showToast(
              "ok",
              isOverride ? "System default plan restored." : "Custom devotional plan deleted."
            );
            refreshStats();
          } else {
            showToast("error", "Unexpected server response while deleting plan.");
          }
        } catch (err) {
          showToast("error", `Client error: ${err.message}`);
        } finally {
          setActionLoading(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  const handleAddDayToNewPlan = () => {
    setNewPlanData((prev) => ({
      ...prev,
      days: [...prev.days, createEmptyDay(prev.days.length + 1)],
    }));
  };

  const handleRemoveDayFromNewPlan = (index) => {
    if (newPlanData.days.length <= 1) return;
    const updatedDays = newPlanData.days
      .filter((_, idx) => idx !== index)
      .map((day, idx) => ({
        ...day,
        day: idx + 1,
      }));
    setNewPlanData((prev) => ({
      ...prev,
      days: updatedDays,
    }));
  };

  const handleDayFieldChange = (index, field, value) => {
    setNewPlanData((prev) => {
      const updatedDays = [...prev.days];
      updatedDays[index] = {
        ...updatedDays[index],
        [field]: value,
      };
      if (field === "verseTag") {
        updatedDays[index].verseId = value
          .replace(/[^a-zA-Z0-9]+/g, "_")
          .replace(/(^_+|_+$)/g, "");
      }
      return {
        ...prev,
        days: updatedDays,
      };
    });
  };

  const handleToggleCreateForm = () => {
    if (!showCreatePlanForm) {
      setEditingPlanId(null);
      setNewPlanData(createEmptyPlanForm());
      setShowCreatePlanForm(true);
      setScrollFormTick((t) => t + 1);
    } else {
      setShowCreatePlanForm(false);
      setEditingPlanId(null);
    }
  };

  const handleEditPlan = (plan) => {
    setEditingPlanId(plan.id);
    setNewPlanData({
      title: plan.title,
      category: plan.category,
      image: isSafeImageUrl(plan.image)
        ? plan.image.trim()
        : getDefaultPlanCover(plan.category),
      days:
        Array.isArray(plan.days) && plan.days.length > 0
          ? plan.days
          : [createEmptyDay(1)],
    });
    setShowCreatePlanForm(true);
    setScrollFormTick((t) => t + 1);
  };

  const handleCancelPlanForm = () => {
    setShowCreatePlanForm(false);
    setEditingPlanId(null);
    setNewPlanData(createEmptyPlanForm());
  };

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (
      !newPlanData.title.trim() ||
      newPlanData.days.some(
        (d) =>
          !d.title.trim() ||
          !d.verseText.trim() ||
          !d.verseTag.trim() ||
          !d.reflection.trim()
      )
    ) {
      showToast("error", "Please fill in all plan details and complete every day card.");
      return;
    }

    try {
      setActionLoading(true);
      const res = editingPlanId
        ? await updateCustomDevotional(
            editingPlanId,
            newPlanData.title,
            newPlanData.category,
            newPlanData.days,
            newPlanData.image
          )
        : await createCustomDevotional(
            newPlanData.title,
            newPlanData.category,
            newPlanData.days,
            newPlanData.image
          );

      if (res?.error) {
        showToast("error", res.error);
      } else if (res?.success) {
        showToast(
          "ok",
          editingPlanId
            ? "Devotional plan updated successfully."
            : "Custom devotional plan published."
        );
        setShowCreatePlanForm(false);
        setEditingPlanId(null);
        setNewPlanData(createEmptyPlanForm());
        refreshStats();
      } else {
        showToast("error", "Unexpected server response while saving plan.");
      }
    } catch (err) {
      showToast("error", `Client error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // --- Filtering Lists ---
  const normalizedQuery = searchQuery.toLowerCase();

  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(normalizedQuery) ||
      u.email?.toLowerCase().includes(normalizedQuery) ||
      u.role?.toLowerCase().includes(normalizedQuery)
  );

  const filteredTestimonies = testimonies.filter(
    (t) =>
      t.title?.toLowerCase().includes(normalizedQuery) ||
      t.author_name?.toLowerCase().includes(normalizedQuery) ||
      t.tag?.toLowerCase().includes(normalizedQuery)
  );

  const filteredComments = comments.filter(
    (c) =>
      c.author_name?.toLowerCase().includes(normalizedQuery) ||
      c.content?.toLowerCase().includes(normalizedQuery) ||
      (c.testimony_title && c.testimony_title.toLowerCase().includes(normalizedQuery))
  );

  const filteredPrayers = prayers.filter(
    (p) =>
      p.author_name?.toLowerCase().includes(normalizedQuery) ||
      p.title?.toLowerCase().includes(normalizedQuery) ||
      p.content?.toLowerCase().includes(normalizedQuery)
  );

  const customPlanIds = new Set(customPlans.map((p) => p.id));
  const staticPlanKeys = new Set(Object.keys(staticDevotionals));
  const combinedPlans = [
    ...Object.values(staticDevotionals)
      .filter((p) => !customPlanIds.has(p.id))
      .map((p) => ({ ...p, isCustom: false, isOverridden: false })),
    ...customPlans.map((p) => ({
      ...p,
      isCustom: true,
      isOverridden: staticPlanKeys.has(p.id),
    })),
  ];

  const filteredPlans = combinedPlans.filter((p) => {
    if (planCategoryFilter !== "All" && p.category !== planCategoryFilter) {
      return false;
    }
    if (planSourceFilter === "system" && p.isCustom) return false;
    if (planSourceFilter === "custom" && (!p.isCustom || p.isOverridden)) return false;
    if (planSourceFilter === "override" && (!p.isCustom || !p.isOverridden)) return false;

    if (!normalizedQuery) return true;
    const sourceLabel = p.isOverridden
      ? "system override"
      : p.isCustom
      ? "custom"
      : "system";
    return (
      p.title?.toLowerCase().includes(normalizedQuery) ||
      p.category?.toLowerCase().includes(normalizedQuery) ||
      sourceLabel.includes(normalizedQuery)
    );
  });

  if (loading) {
    return (
      <section className="sanc-page">
        <div className="sanc-container">
          <div className="sanc-admin-loading">
            <i
              className="ri-loader-4-line sanc-spin"
              style={{ fontSize: "2.8rem", color: "var(--sanc-gold)" }}
              aria-hidden="true"
            ></i>
            <span>Verifying administrator credentials...</span>
          </div>
        </div>
      </section>
    );
  }

  if (!currentUser) {
    return (
      <section className="sanc-page">
        <div className="sanc-container">
          <div className="sanc-admin-denied">
            <div className="sanc-admin-denied-icon" aria-hidden="true">
              <i className="ri-shield-keyhole-line"></i>
            </div>
            <h1 className="sanc-title" style={{ fontSize: "2.6rem" }}>
              Access Denied
            </h1>
            <p className="sanc-subtitle" style={{ margin: 0 }}>
              This page is restricted to application administrators. Please log in with an authorized administrator account to access this panel.
            </p>
            <Link href="/profile" className="sanc-btn-primary">
              Go to Profile
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const todayDateStr = referenceNow ? new Date(referenceNow).toDateString() : "";

  const formatActivityTime = (isoString) => {
    try {
      const date = new Date(isoString);
      if (Number.isNaN(date.getTime())) return "Recently";
      const diffMs = (referenceNow ?? date.getTime()) - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return `${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return "Recently";
    }
  };

  const tabs = [
    { id: "dashboard", label: "Overview Dashboard", icon: "ri-dashboard-3-line" },
    {
      id: "users",
      label: "Users Management",
      icon: "ri-group-line",
      count: stats.totalUsers,
    },
    {
      id: "testimonies",
      label: "Testimony Feed",
      icon: "ri-chat-quote-line",
      count: stats.totalTestimonies,
    },
    {
      id: "comments",
      label: "Comment Mod",
      icon: "ri-chat-3-line",
      count: stats.totalComments,
    },
    {
      id: "prayers",
      label: "Prayer Wall",
      icon: "ri-heart-pulse-line",
      count: stats.totalPrayers,
    },
    {
      id: "plans",
      label: "Devotional Plans",
      icon: "ri-book-open-line",
      count: combinedPlans.length,
    },
  ];

  const kpiCards = [
    {
      title: "TOTAL USERS",
      value: stats.totalUsers,
      subtitle: "Registered accounts",
      icon: "ri-group-line",
      variant: "gold",
      targetTab: "users",
    },
    {
      title: "ACTIVE TODAY",
      value: stats.activeToday,
      subtitle: `${stats.activeThisWeek} this week`,
      icon: "ri-user-follow-line",
      variant: "emerald",
      targetTab: "users",
    },
    {
      title: "TESTIMONIES",
      value: stats.totalTestimonies,
      subtitle: "Feed posts shared",
      icon: "ri-chat-quote-line",
      variant: "sky",
      targetTab: "testimonies",
    },
    {
      title: "PRAYER REQUESTS",
      value: stats.totalPrayers,
      subtitle: "Intercessions requested",
      icon: "ri-heart-pulse-line",
      variant: "danger",
      targetTab: "prayers",
    },
    {
      title: "COMMENTS & REPLIES",
      value: stats.totalComments,
      subtitle: "Engagement entries",
      icon: "ri-chat-3-line",
      variant: "violet",
      targetTab: "comments",
    },
    {
      title: "DEVOTIONAL PLANS",
      value: stats.activePlans,
      subtitle: `${stats.completedPlans} completed`,
      icon: "ri-compass-3-line",
      variant: "gold",
      targetTab: "plans",
    },
  ];

  return (
    <section className="sanc-page">
      <div className="sanc-container">
        {/* Inline Toast Banner */}
        {toast && (
          <div
            className={`sanc-admin-toast ${toast.tone === "error" ? "error" : "ok"}`}
            role="status"
            aria-live="polite"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
              <i
                className={
                  toast.tone === "error"
                    ? "ri-error-warning-line"
                    : "ri-checkbox-circle-line"
                }
                aria-hidden="true"
              ></i>
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              className="sanc-modal-close"
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
            >
              <i className="ri-close-line" aria-hidden="true"></i>
            </button>
          </div>
        )}

        {/* Admin Hero Header */}
        <header className="sanc-admin-hero">
          <div>
            <span className="sanc-badge gold" style={{ marginBottom: "0.9rem" }}>
              <i className="ri-shield-line" aria-hidden="true"></i>
              SECURE ACCESS
            </span>
            <h1 className="sanc-title">
              Control Panel &amp; <span className="sanc-title-accent">Moderation</span>
            </h1>
            <p className="sanc-subtitle">
              Monitor system activities, analyze metrics, and moderate community contributions.
            </p>
            <div className="sanc-admin-hero-meta">
              <span className="sanc-badge emerald">
                <i className="ri-user-star-line" aria-hidden="true"></i>
                Signed in as {currentUser.name || currentUser.email}
              </span>
              <span className="sanc-badge">
                <i className="ri-book-open-line" aria-hidden="true"></i>
                {combinedPlans.length} Devotional Plans
              </span>
            </div>
          </div>

          <div className="sanc-admin-hero-actions">
            <Link href="/plans" className="sanc-btn-secondary">
              <i className="ri-external-link-line" aria-hidden="true"></i>
              View Site
            </Link>
            <button
              type="button"
              className="sanc-btn-secondary"
              onClick={refreshStats}
              disabled={refreshingStats}
            >
              <i
                className={`ri-refresh-line ${refreshingStats ? "sanc-spin" : ""}`}
                aria-hidden="true"
              ></i>
              {refreshingStats ? "Refreshing..." : "Refresh Stats"}
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="sanc-admin-tabs" role="tablist" aria-label="Admin sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`sanc-admin-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <i className={tab.icon} aria-hidden="true"></i>
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span className="sanc-admin-tab-count">{tab.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* --- 1. OVERVIEW DASHBOARD VIEW --- */}
        {activeTab === "dashboard" && (
          <div className="sanc-stack" style={{ gap: "2.4rem" }}>
            <div className="sanc-admin-kpi-grid">
              {kpiCards.map((card) => (
                <button
                  key={card.title}
                  type="button"
                  className="sanc-admin-kpi"
                  onClick={() => handleTabChange(card.targetTab)}
                >
                  <div className="sanc-admin-kpi-watermark" aria-hidden="true">
                    <i className={card.icon}></i>
                  </div>
                  <div className="sanc-admin-kpi-top">
                    <span className="sanc-admin-kpi-label">{card.title}</span>
                    <span className={`sanc-stat-icon ${card.variant}`} aria-hidden="true">
                      <i className={card.icon}></i>
                    </span>
                  </div>
                  <span className="sanc-admin-kpi-value">{card.value}</span>
                  <span className="sanc-admin-kpi-sub">{card.subtitle}</span>
                </button>
              ))}
            </div>

            <div className="sanc-card sanc-card-pad">
              <div className="sanc-section-head">
                <div>
                  <h2 className="sanc-section-title">Recent Activity Stream</h2>
                  <p className="sanc-subtitle" style={{ marginTop: "0.4rem" }}>
                    Real-time log of community posts, registrations, intercessions, and feedback.
                  </p>
                </div>
                <span className="sanc-badge emerald">LIVE UPDATES</span>
              </div>

              {activities.length === 0 ? (
                <div className="sanc-empty">
                  <i className="ri-inbox-line" aria-hidden="true"></i>
                  <p style={{ margin: 0 }}>No activity registered yet.</p>
                </div>
              ) : (
                <div className="sanc-admin-activity-list">
                  {activities.map((act) => {
                    let typeLabel = "Activity";
                    let badgeTone = "";
                    let iconVariant = "gold";
                    let typeIcon = "ri-compass-line";

                    if (act.type === "user_registered") {
                      typeLabel = "USER SIGNUP";
                      badgeTone = "gold";
                      iconVariant = "gold";
                      typeIcon = "ri-user-add-line";
                    } else if (act.type === "testimony_created") {
                      typeLabel = "FEED POST";
                      badgeTone = "emerald";
                      iconVariant = "emerald";
                      typeIcon = "ri-chat-quote-line";
                    } else if (act.type === "comment_added") {
                      typeLabel = "COMMENT";
                      badgeTone = "violet";
                      iconVariant = "violet";
                      typeIcon = "ri-chat-3-line";
                    } else if (act.type === "prayer_requested") {
                      typeLabel = "PRAYER REQUEST";
                      badgeTone = "danger";
                      iconVariant = "danger";
                      typeIcon = "ri-heart-pulse-line";
                    }

                    return (
                      <div key={act.id} className="sanc-admin-activity-item">
                        <div className="sanc-admin-activity-main">
                          <span className={`sanc-stat-icon ${iconVariant}`} aria-hidden="true">
                            <i className={typeIcon}></i>
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: "1.4rem",
                                color: "var(--sanc-text)",
                                lineHeight: 1.45,
                                margin: 0,
                              }}
                            >
                              <strong>{act.user}</strong> {act.details}
                            </p>
                            {act.email && (
                              <span style={{ fontSize: "1.2rem", color: "var(--sanc-muted)" }}>
                                {act.email}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="sanc-admin-activity-meta">
                          <span className={`sanc-badge ${badgeTone}`}>{typeLabel}</span>
                          <span>{formatActivityTime(act.timestamp)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toolbar for Management Tabs */}
        {activeTab !== "dashboard" && (
          <div className="sanc-admin-toolbar">
            <div className="sanc-admin-search">
              <div className="sanc-input-wrap">
                <i className="ri-search-line sanc-input-icon" aria-hidden="true"></i>
                <input
                  type="text"
                  className="sanc-input has-icon"
                  placeholder={`Search in ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={`Search ${activeTab}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="sanc-btn-ghost sanc-btn-sm"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    style={{
                      position: "absolute",
                      right: "0.6rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  >
                    <i className="ri-close-circle-fill" aria-hidden="true"></i>
                  </button>
                )}
              </div>
            </div>

            {activeTab === "plans" && (
              <div className="sanc-admin-filters">
                <select
                  className="sanc-select"
                  aria-label="Filter plans by category"
                  value={planCategoryFilter}
                  onChange={(e) => setPlanCategoryFilter(e.target.value)}
                  style={{ width: "auto", minWidth: "15rem" }}
                >
                  <option value="All">All Categories</option>
                  {ADMIN_PLAN_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  className="sanc-select"
                  aria-label="Filter plans by source"
                  value={planSourceFilter}
                  onChange={(e) => setPlanSourceFilter(e.target.value)}
                  style={{ width: "auto", minWidth: "15rem" }}
                >
                  <option value="all">All Sources</option>
                  <option value="system">System Plans</option>
                  <option value="custom">Custom Plans</option>
                  <option value="override">System Overrides</option>
                </select>

                <button
                  type="button"
                  className={showCreatePlanForm ? "sanc-btn-danger" : "sanc-btn-primary"}
                  onClick={handleToggleCreateForm}
                >
                  <i
                    className={showCreatePlanForm ? "ri-close-line" : "ri-add-line"}
                    aria-hidden="true"
                  ></i>
                  {showCreatePlanForm ? "Cancel Form" : "Create New Plan"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- 2. USERS MANAGEMENT VIEW --- */}
        {activeTab === "users" && (
          <div className="sanc-admin-table-card">
            {tabLoading ? (
              <div className="sanc-admin-loading" style={{ margin: "2rem auto", border: "none", boxShadow: "none" }}>
                <i className="ri-loader-4-line sanc-spin" aria-hidden="true"></i>
                <span>Loading user accounts...</span>
              </div>
            ) : (
              <div className="sanc-admin-table-wrap">
                <table className="sanc-admin-table">
                  <thead>
                    <tr>
                      <th>User Info</th>
                      <th>Account Email</th>
                      <th>Activity Status</th>
                      <th>Current Streak</th>
                      <th>System Role</th>
                      <th style={{ textAlign: "right" }}>Moderation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ padding: "4rem", textAlign: "center", color: "var(--sanc-muted)" }}
                        >
                          No user accounts match search query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id}>
                          <td>
                            <div className="sanc-admin-user-cell">
                              <span className="sanc-avatar" aria-hidden="true">
                                {(u.name || u.email || "U").substring(0, 2).toUpperCase()}
                              </span>
                              <span style={{ fontWeight: 600 }}>{u.name}</span>
                            </div>
                          </td>
                          <td style={{ color: "var(--sanc-muted)" }}>{u.email}</td>
                          <td>
                            {u.last_active === todayDateStr ? (
                              <span
                                style={{
                                  color: "var(--sanc-emerald)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.6rem",
                                  fontWeight: 700,
                                }}
                              >
                                <span className="sanc-admin-status-dot online" aria-hidden="true"></span>
                                Active Today
                              </span>
                            ) : (
                              <span style={{ color: "var(--sanc-muted)" }}>
                                {u.last_active
                                  ? `Active ${u.last_active.split(" ").slice(1, 3).join(" ")}`
                                  : "Inactive"}
                              </span>
                            )}
                          </td>
                          <td style={{ fontWeight: 700 }}>
                            <i
                              className="ri-fire-fill"
                              style={{ color: "var(--sanc-gold)", marginRight: "0.45rem" }}
                              aria-hidden="true"
                            ></i>
                            {u.streak_count || 0} Days
                          </td>
                          <td>
                            <span className={`sanc-badge ${u.role === "admin" ? "gold" : ""}`}>
                              {u.role?.toUpperCase() || "USER"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className="sanc-admin-actions">
                              <button
                                type="button"
                                className="sanc-btn-secondary sanc-btn-sm"
                                disabled={actionLoading || u.id === currentUser.id}
                                onClick={() => handleToggleUserRole(u)}
                                title={
                                  u.role === "admin"
                                    ? "Demote user to normal role"
                                    : "Promote user to administrator"
                                }
                              >
                                <i className="ri-exchange-line" aria-hidden="true"></i>
                                {u.role === "admin" ? "Demote" : "Promote"}
                              </button>
                              <button
                                type="button"
                                className="sanc-admin-icon-action danger"
                                disabled={actionLoading || u.id === currentUser.id}
                                onClick={() => handleDeleteUser(u)}
                                title="Permanently remove user"
                                aria-label={`Delete ${u.name || u.email}`}
                              >
                                <i className="ri-delete-bin-line" aria-hidden="true"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- 3. TESTIMONY FEED VIEW --- */}
        {activeTab === "testimonies" && (
          <div className="sanc-admin-table-card">
            {tabLoading ? (
              <div className="sanc-admin-loading" style={{ margin: "2rem auto", border: "none", boxShadow: "none" }}>
                <i className="ri-loader-4-line sanc-spin" aria-hidden="true"></i>
                <span>Loading testimonies...</span>
              </div>
            ) : (
              <div className="sanc-admin-table-wrap">
                <table className="sanc-admin-table">
                  <thead>
                    <tr>
                      <th>Testimony Post</th>
                      <th>Author</th>
                      <th>Category</th>
                      <th>Date Published</th>
                      <th>Likes / Comments</th>
                      <th style={{ textAlign: "right" }}>Moderation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTestimonies.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ padding: "4rem", textAlign: "center", color: "var(--sanc-muted)" }}
                        >
                          No testimonies found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredTestimonies.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                              <span style={{ fontWeight: 700 }}>{t.title}</span>
                              <span
                                className="sanc-admin-truncate"
                                style={{ fontSize: "1.2rem", color: "var(--sanc-muted)" }}
                              >
                                {t.excerpt}
                              </span>
                            </div>
                          </td>
                          <td style={{ color: "var(--sanc-muted)" }}>{t.author_name}</td>
                          <td>
                            <span className="sanc-badge sky">{t.tag}</span>
                          </td>
                          <td style={{ color: "var(--sanc-muted)" }}>
                            {t.created_at &&
                            (t.created_at.includes("-") || t.created_at.includes(":"))
                              ? new Date(t.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : t.created_at}
                          </td>
                          <td>
                            <span style={{ marginRight: "1.4rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                              <i
                                className="ri-heart-line"
                                style={{ color: "var(--sanc-error)" }}
                                aria-hidden="true"
                              ></i>
                              {t.likes_count}
                            </span>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                              <i
                                className="ri-chat-3-line"
                                style={{ color: "var(--sanc-violet)" }}
                                aria-hidden="true"
                              ></i>
                              {t.comments_count}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className="sanc-admin-actions">
                              <button
                                type="button"
                                className="sanc-admin-icon-action"
                                onClick={() => setPreviewTestimony(t)}
                                title="Preview testimony content"
                                aria-label={`Preview ${t.title}`}
                              >
                                <i className="ri-eye-line" aria-hidden="true"></i>
                              </button>
                              <button
                                type="button"
                                className="sanc-admin-icon-action danger"
                                disabled={actionLoading}
                                onClick={() => handleDeleteTestimony(t.id, t.title)}
                                title="Delete testimony post"
                                aria-label={`Delete ${t.title}`}
                              >
                                <i className="ri-delete-bin-line" aria-hidden="true"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- 4. COMMENTS MODERATION VIEW --- */}
        {activeTab === "comments" && (
          <div className="sanc-admin-table-card">
            {tabLoading ? (
              <div className="sanc-admin-loading" style={{ margin: "2rem auto", border: "none", boxShadow: "none" }}>
                <i className="ri-loader-4-line sanc-spin" aria-hidden="true"></i>
                <span>Loading comments...</span>
              </div>
            ) : (
              <div className="sanc-admin-table-wrap">
                <table className="sanc-admin-table">
                  <thead>
                    <tr>
                      <th>Comment Text</th>
                      <th>Author</th>
                      <th>Testimony Post Context</th>
                      <th>Date Written</th>
                      <th style={{ textAlign: "right" }}>Moderation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComments.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          style={{ padding: "4rem", textAlign: "center", color: "var(--sanc-muted)" }}
                        >
                          No comments found matching query.
                        </td>
                      </tr>
                    ) : (
                      filteredComments.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div
                              className="sanc-admin-truncate"
                              style={{ fontStyle: "italic" }}
                            >
                              &quot;{c.content}&quot;
                            </div>
                          </td>
                          <td style={{ color: "var(--sanc-muted)" }}>{c.author_name}</td>
                          <td style={{ color: "var(--sanc-muted)" }}>
                            {c.testimony_title ? (
                              <strong style={{ color: "var(--sanc-text)" }}>
                                {c.testimony_title}
                              </strong>
                            ) : (
                              <span style={{ fontSize: "1.2rem", fontStyle: "italic" }}>
                                Post deleted
                              </span>
                            )}
                          </td>
                          <td style={{ color: "var(--sanc-muted)" }}>
                            {c.created_at &&
                            (c.created_at.includes("-") || c.created_at.includes(":"))
                              ? new Date(c.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : c.created_at}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className="sanc-admin-actions">
                              <button
                                type="button"
                                className="sanc-admin-icon-action"
                                onClick={() => setPreviewComment(c)}
                                title="Preview comment"
                                aria-label="Preview comment"
                              >
                                <i className="ri-eye-line" aria-hidden="true"></i>
                              </button>
                              <button
                                type="button"
                                className="sanc-admin-icon-action danger"
                                disabled={actionLoading}
                                onClick={() => handleDeleteComment(c.id)}
                                title="Delete comment permanently"
                                aria-label="Delete comment"
                              >
                                <i className="ri-delete-bin-line" aria-hidden="true"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- 5. PRAYER WALL MODERATION VIEW --- */}
        {activeTab === "prayers" && (
          <div className="sanc-admin-table-card">
            {tabLoading ? (
              <div className="sanc-admin-loading" style={{ margin: "2rem auto", border: "none", boxShadow: "none" }}>
                <i className="ri-loader-4-line sanc-spin" aria-hidden="true"></i>
                <span>Loading prayer requests...</span>
              </div>
            ) : (
              <div className="sanc-admin-table-wrap">
                <table className="sanc-admin-table">
                  <thead>
                    <tr>
                      <th>Prayer Request</th>
                      <th>Author</th>
                      <th>Visibility</th>
                      <th>Date Requested</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Moderation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPrayers.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{ padding: "4rem", textAlign: "center", color: "var(--sanc-muted)" }}
                        >
                          No prayer requests match search query.
                        </td>
                      </tr>
                    ) : (
                      filteredPrayers.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                              <span style={{ fontWeight: 700 }}>{p.title}</span>
                              <span
                                className="sanc-admin-truncate"
                                style={{ fontSize: "1.2rem", color: "var(--sanc-muted)" }}
                              >
                                {p.content}
                              </span>
                            </div>
                          </td>
                          <td style={{ color: "var(--sanc-muted)" }}>
                            {p.is_anonymous === 1 ? "Anonymous" : p.author_name}
                          </td>
                          <td>
                            {p.is_anonymous === 1 ? (
                              <span className="sanc-badge">
                                <i className="ri-eye-off-line" aria-hidden="true"></i>
                                Anonymous
                              </span>
                            ) : (
                              <span className="sanc-badge emerald">
                                <i className="ri-eye-line" aria-hidden="true"></i>
                                Public
                              </span>
                            )}
                          </td>
                          <td style={{ color: "var(--sanc-muted)" }}>
                            {p.created_at &&
                            (p.created_at.includes("-") || p.created_at.includes(":"))
                              ? new Date(p.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : p.created_at}
                          </td>
                          <td>
                            <span
                              className={`sanc-badge ${
                                p.status === "answered" ? "violet" : "emerald"
                              }`}
                            >
                              {p.status?.toUpperCase() || "ACTIVE"}
                            </span>
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div className="sanc-admin-actions">
                              <button
                                type="button"
                                className="sanc-admin-icon-action"
                                onClick={() => setPreviewPrayer(p)}
                                title="Preview prayer request"
                                aria-label={`Preview ${p.title}`}
                              >
                                <i className="ri-eye-line" aria-hidden="true"></i>
                              </button>
                              <button
                                type="button"
                                className="sanc-admin-icon-action danger"
                                disabled={actionLoading}
                                onClick={() => handleDeletePrayer(p.id, p.title)}
                                title="Delete prayer request permanently"
                                aria-label={`Delete ${p.title}`}
                              >
                                <i className="ri-delete-bin-line" aria-hidden="true"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- 6. DEVOTIONAL PLANS VIEW --- */}
        {activeTab === "plans" && (
          <div className="sanc-stack" style={{ gap: "2.2rem" }}>
            <div ref={planFormRef} style={{ scrollMarginTop: "8.5rem" }}>
              {showCreatePlanForm && (
                <AdminPlanForm
                  planData={newPlanData}
                  editingPlanId={editingPlanId}
                  busy={actionLoading}
                  onUpdateField={(field, value) =>
                    setNewPlanData((prev) => ({ ...prev, [field]: value }))
                  }
                  onAddDay={handleAddDayToNewPlan}
                  onRemoveDay={handleRemoveDayFromNewPlan}
                  onChangeDayField={handleDayFieldChange}
                  onSubmit={handleCreatePlan}
                  onCancel={handleCancelPlanForm}
                />
              )}
            </div>

            <div className="sanc-admin-table-card">
              {tabLoading ? (
                <div className="sanc-admin-loading" style={{ margin: "2rem auto", border: "none", boxShadow: "none" }}>
                  <i className="ri-loader-4-line sanc-spin" aria-hidden="true"></i>
                  <span>Loading devotional plans...</span>
                </div>
              ) : (
                <div className="sanc-admin-table-wrap">
                  <table className="sanc-admin-table">
                    <thead>
                      <tr>
                        <th>Plan Title</th>
                        <th>Category</th>
                        <th>Days Count</th>
                        <th>Source Type</th>
                        <th style={{ textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPlans.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            style={{ padding: "4rem", textAlign: "center", color: "var(--sanc-muted)" }}
                          >
                            No devotional plans match the active filters.
                          </td>
                        </tr>
                      ) : (
                        filteredPlans.map((p) => {
                          const thumbSrc = isSafeImageUrl(p.image)
                            ? p.image.trim()
                            : getDefaultPlanCover(p.category);
                          const isExternal = !thumbSrc.startsWith("/");

                          return (
                            <tr key={p.id}>
                              <td>
                                <div className="sanc-admin-plan-cell">
                                  <div className="sanc-admin-plan-thumb">
                                    <Image
                                      src={thumbSrc}
                                      alt={p.title}
                                      fill
                                      sizes="60px"
                                      unoptimized={isExternal}
                                      style={{ objectFit: "cover" }}
                                    />
                                  </div>
                                  <span style={{ fontWeight: 600 }}>{p.title}</span>
                                </div>
                              </td>
                              <td>
                                <span className="sanc-badge gold">{p.category}</span>
                              </td>
                              <td style={{ color: "var(--sanc-muted)" }}>
                                {p.days ? p.days.length : 0} Days
                              </td>
                              <td>
                                {p.isCustom ? (
                                  <span
                                    className={`sanc-badge ${
                                      p.isOverridden ? "sky" : "emerald"
                                    }`}
                                  >
                                    {p.isOverridden ? "System Override" : "Custom"}
                                  </span>
                                ) : (
                                  <span className="sanc-badge">System</span>
                                )}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div className="sanc-admin-actions">
                                  <button
                                    type="button"
                                    className="sanc-admin-icon-action"
                                    onClick={() => setPreviewPlan(p)}
                                    title="Preview plan content"
                                    aria-label={`Preview ${p.title}`}
                                  >
                                    <i className="ri-eye-line" aria-hidden="true"></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="sanc-admin-icon-action gold"
                                    onClick={() => handleEditPlan(p)}
                                    title="Edit plan details and cover picture"
                                    aria-label={`Edit ${p.title}`}
                                  >
                                    <i className="ri-edit-line" aria-hidden="true"></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="sanc-admin-icon-action danger"
                                    disabled={actionLoading || !p.isCustom}
                                    onClick={() => handleDeleteCustomDevotional(p)}
                                    title={
                                      p.isCustom
                                        ? p.isOverridden
                                          ? "Restore default plan (delete override)"
                                          : "Delete plan permanently"
                                        : "System plan cannot be deleted"
                                    }
                                    aria-label={
                                      p.isOverridden
                                        ? `Restore ${p.title}`
                                        : `Delete ${p.title}`
                                    }
                                  >
                                    <i className="ri-delete-bin-line" aria-hidden="true"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation & Preview Modals */}
      <ConfirmActionModal
        dialog={confirmDialog}
        busy={actionLoading}
        onCancel={() => {
          if (!actionLoading) setConfirmDialog(null);
        }}
        onConfirm={() => confirmDialog?.onConfirm?.()}
      />

      <TestimonyPreviewModal
        testimony={previewTestimony}
        busy={actionLoading}
        onClose={() => setPreviewTestimony(null)}
        onRequestDelete={(t) => {
          setPreviewTestimony(null);
          handleDeleteTestimony(t.id, t.title);
        }}
      />

      <PrayerPreviewModal
        prayer={previewPrayer}
        busy={actionLoading}
        onClose={() => setPreviewPrayer(null)}
        onRequestDelete={(p) => {
          setPreviewPrayer(null);
          handleDeletePrayer(p.id, p.title);
        }}
      />

      <CommentPreviewModal
        comment={previewComment}
        busy={actionLoading}
        onClose={() => setPreviewComment(null)}
        onRequestDelete={(c) => {
          setPreviewComment(null);
          handleDeleteComment(c.id);
        }}
      />

      <PlanPreviewModal
        plan={previewPlan}
        busy={actionLoading}
        onClose={() => setPreviewPlan(null)}
        onEdit={(plan) => {
          setPreviewPlan(null);
          handleEditPlan(plan);
        }}
        onRequestDelete={(plan) => {
          setPreviewPlan(null);
          handleDeleteCustomDevotional(plan);
        }}
      />
    </section>
  );
}
