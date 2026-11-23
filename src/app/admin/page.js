"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { getMe } from "@/app/actions/authActions";
import {
  getAdminStats,
  getAdminUsers,
  getAdminUserDetails,
  grantUserStreakFreeze,
  getAdminTestimonies,
  updateTestimonyMeta,
  getAdminComments,
  getAdminPrayers,
  togglePrayerStatus,
  getAdminPrayerEncouragements,
  deletePrayerEncouragement,
  getAdminSystemData,
  purgeExpiredSessions,
  sendAdminPushBroadcast,
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
  TESTIMONY_CATEGORIES,
  getDefaultPlanCover,
  isSafeImageUrl,
  exportRowsToCsv,
} from "@/components/admin/adminConstants";
import {
  ConfirmActionModal,
  TestimonyPreviewModal,
  TestimonyEditModal,
  PrayerPreviewModal,
  CommentPreviewModal,
  PlanPreviewModal,
  UserDetailModal,
} from "@/components/admin/AdminModals";
import AdminPlanForm from "@/components/admin/AdminPlanForm";
import AdminSystemTab from "@/components/admin/AdminSystemTab";

const PAGE_SIZE = 15;

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

function getPagedSlice(items, page) {
  const safeItems = Array.isArray(items) ? items : [];
  const totalItems = safeItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalItems);
  return {
    slice: safeItems.slice(startIndex, endIndex),
    totalItems,
    totalPages,
    currentPage,
    startNum: totalItems === 0 ? 0 : startIndex + 1,
    endNum: endIndex,
  };
}

function formatAdminDate(value, withTime = false) {
  if (!value) return "";
  const str = String(value);
  if (str.includes("-") || str.includes(":")) {
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) {
      return withTime
        ? parsed.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : parsed.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
    }
  }
  return str;
}

function AdminPagination({ pageInfo, onPageChange }) {
  if (!pageInfo || pageInfo.totalItems === 0) return null;
  const { currentPage, totalPages, startNum, endNum, totalItems } = pageInfo;
  return (
    <div className="sanc-admin-pagination">
      <span>
        Showing {startNum}&ndash;{endNum} of {totalItems}
      </span>
      <div className="sanc-admin-page-btns">
        <button
          type="button"
          className="sanc-btn-secondary sanc-btn-sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Prev
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          className="sanc-btn-secondary sanc-btn-sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [referenceNow, setReferenceNow] = useState(null);
  const [statsRefreshTick, setStatsRefreshTick] = useState(0);
  const [refreshingStats, setRefreshingStats] = useState(false);

  // Toast & confirmation modal state
  const [toast, setToast] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const toastTimerRef = useRef(null);
  const planFormRef = useRef(null);
  const isMountedRef = useRef(true);
  const userDetailReqRef = useRef(0);

  // Stats, overview bento, and activities
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    activeThisWeek: 0,
    totalTestimonies: 0,
    totalComments: 0,
    totalPrayers: 0,
    activePrayers: 0,
    answeredPrayers: 0,
    totalPrayerEncouragements: 0,
    pushSubscribers: 0,
    expiredSessions: 0,
    totalSessions: 0,
    journalEntries: 0,
    activePlans: 0,
    completedPlans: 0,
  });
  const [activities, setActivities] = useState([]);
  const [topPlans, setTopPlans] = useState([]);
  const [planAnalytics, setPlanAnalytics] = useState({});
  const [activityFilter, setActivityFilter] = useState("all");

  // Tabs, filters & pagination
  const [activeTab, setActiveTab] = useState("dashboard");
  const [tabLoading, setTabLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [testimonies, setTestimonies] = useState([]);
  const [comments, setComments] = useState([]);
  const [encouragements, setEncouragements] = useState([]);
  const [prayers, setPrayers] = useState([]);
  const [customPlans, setCustomPlans] = useState([]);
  const [systemData, setSystemData] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [userFilter, setUserFilter] = useState("all");
  const [userSort, setUserSort] = useState("newest");
  const [testimonyTagFilter, setTestimonyTagFilter] = useState("All");
  const [testimonySort, setTestimonySort] = useState("newest");
  const [commentsSubTab, setCommentsSubTab] = useState("feed");
  const [prayerFilter, setPrayerFilter] = useState("all");
  const [planCategoryFilter, setPlanCategoryFilter] = useState("All");
  const [planSourceFilter, setPlanSourceFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState(false);

  // Previews, inspector & plan builder state
  const [selectedUserForDetail, setSelectedUserForDetail] = useState(null);
  const [userDetailsData, setUserDetailsData] = useState(null);
  const [userDetailsLoading, setUserDetailsLoading] = useState(false);
  const [previewTestimony, setPreviewTestimony] = useState(null);
  const [editingTestimony, setEditingTestimony] = useState(null);
  const [previewPrayer, setPreviewPrayer] = useState(null);
  const [previewComment, setPreviewComment] = useState(null);
  const [previewPlan, setPreviewPlan] = useState(null);
  const [showCreatePlanForm, setShowCreatePlanForm] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [newPlanData, setNewPlanData] = useState(createEmptyPlanForm);
  const [scrollFormTick, setScrollFormTick] = useState(0);

  const showToast = (tone, message) => {
    setToast({ tone, message });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) setToast(null);
    }, 4500);
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!scrollFormTick || !showCreatePlanForm) return;
    planFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [scrollFormTick, showCreatePlanForm]);

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
        if (statsRes?.success) {
          setStats((prev) => ({ ...prev, ...(statsRes.stats || {}) }));
          setActivities(statsRes.activityStream || []);
          setTopPlans(statsRes.topPlans || []);
          setPlanAnalytics(statsRes.planAnalytics || {});
        }
        if (plansRes?.success) {
          setCustomPlans(plansRes.plans || []);
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
          if (active && res?.success) setUsers(res.users || []);
        } else if (activeTab === "testimonies") {
          const res = await getAdminTestimonies();
          if (active && res?.success) setTestimonies(res.testimonies || []);
        } else if (activeTab === "comments") {
          const [commRes, encRes] = await Promise.all([
            getAdminComments(),
            getAdminPrayerEncouragements(),
          ]);
          if (active) {
            if (commRes?.success) setComments(commRes.comments || []);
            if (encRes?.success) setEncouragements(encRes.encouragements || []);
          }
        } else if (activeTab === "prayers") {
          const res = await getAdminPrayers();
          if (active && res?.success) setPrayers(res.prayers || []);
        } else if (activeTab === "plans") {
          const res = await getCustomDevotionals();
          if (active && res?.success) setCustomPlans(res.plans || []);
        } else if (activeTab === "system") {
          const res = await getAdminSystemData();
          if (active && res?.success) setSystemData(res);
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

  const refreshStats = () => {
    setRefreshingStats(true);
    setStatsRefreshTick((prev) => prev + 1);
  };

  const handleRefreshSystem = async () => {
    setTabLoading(true);
    try {
      const res = await getAdminSystemData();
      if (!isMountedRef.current) return;
      if (res?.success) {
        setSystemData(res);
      } else if (res?.error) {
        showToast("error", res.error);
      }
    } catch (err) {
      if (isMountedRef.current) showToast("error", `Failed to refresh system data: ${err.message}`);
    } finally {
      if (isMountedRef.current) setTabLoading(false);
    }
  };

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) return;
    setSearchQuery("");
    setCurrentPage(1);
    setTabLoading(nextTab !== "dashboard");
    setActiveTab(nextTab);
  };

  // --- User Inspection & Freeze Handlers ---

  const closeUserDetailModal = () => {
    userDetailReqRef.current += 1;
    setSelectedUserForDetail(null);
    setUserDetailsData(null);
    setUserDetailsLoading(false);
  };

  const viewUserDetails = async (user) => {
    const reqId = ++userDetailReqRef.current;
    setSelectedUserForDetail(user);
    setUserDetailsData(null);
    setUserDetailsLoading(true);

    try {
      const res = await getAdminUserDetails(user.id);
      if (!isMountedRef.current || userDetailReqRef.current !== reqId) return;
      if (res?.success) {
        setUserDetailsData(res);
      } else {
        showToast("error", res?.error || "Could not load user details.");
      }
    } catch (err) {
      if (isMountedRef.current && userDetailReqRef.current === reqId) {
        showToast("error", `Client error: ${err.message}`);
      }
    } finally {
      if (isMountedRef.current && userDetailReqRef.current === reqId) {
        setUserDetailsLoading(false);
      }
    }
  };

  const handleGrantUserFreeze = async (user) => {
    try {
      setActionLoading(true);
      const res = await grantUserStreakFreeze(user.id, 1);
      if (!isMountedRef.current) return;
      if (res?.error) {
        showToast("error", res.error);
      } else if (res?.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, streak_freezes_count: res.newFreezes } : u
          )
        );
        setUserDetailsData((prev) =>
          prev && prev.user?.id === user.id
            ? {
                ...prev,
                user: { ...prev.user, streak_freezes_count: res.newFreezes },
              }
            : prev
        );
        showToast(
          "ok",
          `Granted +1 streak freeze to ${user.name || user.email} (now ${res.newFreezes}).`
        );
      } else {
        showToast("error", "Unexpected server response while granting freeze.");
      }
    } catch (err) {
      if (isMountedRef.current) showToast("error", `Client error: ${err.message}`);
    } finally {
      if (isMountedRef.current) setActionLoading(false);
    }
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

  const handleSaveTestimonyMeta = async (testimonyId, title, tag, image) => {
    try {
      setActionLoading(true);
      const res = await updateTestimonyMeta(testimonyId, title, tag, image);
      if (!isMountedRef.current) return;
      if (res?.error) {
        showToast("error", res.error);
      } else if (res?.success) {
        setTestimonies((prev) =>
          prev.map((t) =>
            t.id === testimonyId
              ? { ...t, title: res.title, tag: res.tag, image: res.image }
              : t
          )
        );
        setPreviewTestimony((prev) =>
          prev && prev.id === testimonyId
            ? { ...prev, title: res.title, tag: res.tag, image: res.image }
            : prev
        );
        setEditingTestimony(null);
        showToast("ok", "Testimony title, topic, and cover updated.");
        refreshStats();
      } else {
        showToast("error", "Unexpected server response while updating testimony.");
      }
    } catch (err) {
      if (isMountedRef.current) showToast("error", `Client error: ${err.message}`);
    } finally {
      if (isMountedRef.current) setActionLoading(false);
    }
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
      message: "Are you sure you want to permanently remove this feed comment?",
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

  const handleDeletePrayerEncouragement = (id) => {
    setConfirmDialog({
      title: "Delete Prayer Encouragement",
      message: "Are you sure you want to permanently remove this encouragement reply?",
      confirmLabel: "Delete Reply",
      tone: "danger",
      icon: "ri-chat-delete-line",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const res = await deletePrayerEncouragement(id);
          if (res?.error) {
            showToast("error", res.error);
          } else if (res?.success) {
            setEncouragements((prev) => prev.filter((enc) => enc.id !== id));
            showToast("ok", "Prayer encouragement deleted.");
            refreshStats();
          } else {
            showToast("error", "Unexpected server response while deleting encouragement.");
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

  const handleTogglePrayerStatus = async (prayer) => {
    try {
      setActionLoading(true);
      const res = await togglePrayerStatus(prayer.id, prayer.status);
      if (!isMountedRef.current) return;
      if (res?.error) {
        showToast("error", res.error);
      } else if (res?.success) {
        setPrayers((prev) =>
          prev.map((p) => (p.id === prayer.id ? { ...p, status: res.newStatus } : p))
        );
        setPreviewPrayer((prev) =>
          prev && prev.id === prayer.id ? { ...prev, status: res.newStatus } : prev
        );
        showToast(
          "ok",
          res.newStatus === "answered"
            ? "Marked prayer request as answered."
            : "Reopened prayer request as active."
        );
        refreshStats();
      } else {
        showToast("error", "Unexpected server response while toggling prayer status.");
      }
    } catch (err) {
      if (isMountedRef.current) showToast("error", `Client error: ${err.message}`);
    } finally {
      if (isMountedRef.current) setActionLoading(false);
    }
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
      icon: isOverride ? "ri-restart-line" : "ri-delete-bin-line",
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

  // --- System Tab Handlers (Sessions & Push) ---

  const handlePurgeSessions = (expiredCount) => {
    setConfirmDialog({
      title: "Purge Expired Sessions",
      message: `Remove ${expiredCount} expired authentication session(s) from the database? Active sessions will remain untouched.`,
      confirmLabel: "Purge Sessions",
      tone: "danger",
      icon: "ri-delete-bin-line",
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const res = await purgeExpiredSessions();
          if (res?.error) {
            showToast("error", res.error);
          } else if (res?.success) {
            showToast("ok", `Purged ${res.purgedCount} expired session(s).`);
            refreshStats();
            await handleRefreshSystem();
          } else {
            showToast("error", "Unexpected server response while purging sessions.");
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

  const executeBroadcast = async (payload, onSuccessReset) => {
    try {
      setActionLoading(true);
      const res = await sendAdminPushBroadcast(payload);
      if (!isMountedRef.current) return;
      if (res?.error) {
        showToast("error", res.error);
      } else if (res?.success) {
        const cleanedNote = res.cleaned ? ` (${res.cleaned} stale removed)` : "";
        showToast(
          "ok",
          `Sent push notification to ${res.sent} of ${res.total} device(s)${cleanedNote}.`
        );
        onSuccessReset?.();
        refreshStats();
        await handleRefreshSystem();
      } else {
        showToast("error", "Unexpected server response while sending push broadcast.");
      }
    } catch (err) {
      if (isMountedRef.current) showToast("error", `Client error: ${err.message}`);
    } finally {
      if (isMountedRef.current) setActionLoading(false);
    }
  };

  const handleSendBroadcast = (payload, onSuccessReset) => {
    if (payload.audience === "self") {
      showToast("ok", "Sending test push notification to your registered devices...");
      executeBroadcast(payload, onSuccessReset);
      return;
    }

    setConfirmDialog({
      title: "Send Push Broadcast",
      message: `Send "${payload.title}" to "${payload.audience}" push subscribers (${payload.url || "/"})?`,
      confirmLabel: "Send Broadcast",
      tone: "primary",
      icon: "ri-notification-3-line",
      onConfirm: async () => {
        await executeBroadcast(payload, onSuccessReset);
        if (isMountedRef.current) setConfirmDialog(null);
      },
    });
  };

  // --- Devotional Builder Handlers ---

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

  const handleDuplicatePlan = (plan) => {
    setEditingPlanId(null);
    setNewPlanData({
      title: `${plan.title} (Copy)`,
      category: plan.category,
      image: isSafeImageUrl(plan.image)
        ? plan.image.trim()
        : getDefaultPlanCover(plan.category),
      days:
        Array.isArray(plan.days) && plan.days.length > 0
          ? plan.days.map((d, idx) => ({ ...d, day: idx + 1 }))
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

  // --- Auth Guard Views ---

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

  // --- Derived Lists, Filters & Pagination ---
  const todayDateStr = referenceNow ? new Date(referenceNow).toDateString() : "";
  const normalizedQuery = searchQuery.toLowerCase();

  const filteredActivities =
    activityFilter === "all"
      ? activities
      : activities.filter((act) => act.type === activityFilter);

  const filteredUsers = users
    .filter((u) => {
      if (userFilter === "admin" && u.role !== "admin") return false;
      if (userFilter === "activeToday" && u.last_active !== todayDateStr) return false;
      if (userFilter === "inactive" && u.last_active === todayDateStr) return false;
      if (!normalizedQuery) return true;
      return (
        u.name?.toLowerCase().includes(normalizedQuery) ||
        u.email?.toLowerCase().includes(normalizedQuery) ||
        u.role?.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => {
      if (userSort === "streak") {
        return Number(b.streak_count ?? 0) - Number(a.streak_count ?? 0);
      }
      if (userSort === "name") {
        return String(a.name || a.email || "").localeCompare(
          String(b.name || b.email || "")
        );
      }
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

  const filteredTestimonies = testimonies
    .filter((t) => {
      if (testimonyTagFilter !== "All" && t.tag !== testimonyTagFilter) return false;
      if (!normalizedQuery) return true;
      return (
        t.title?.toLowerCase().includes(normalizedQuery) ||
        t.author_name?.toLowerCase().includes(normalizedQuery) ||
        t.tag?.toLowerCase().includes(normalizedQuery)
      );
    })
    .sort((a, b) => {
      if (testimonySort === "likes") {
        return Number(b.likes_count ?? 0) - Number(a.likes_count ?? 0);
      }
      if (testimonySort === "comments") {
        return Number(b.comments_count ?? 0) - Number(a.comments_count ?? 0);
      }
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });

  const filteredComments = comments.filter(
    (c) =>
      !normalizedQuery ||
      c.author_name?.toLowerCase().includes(normalizedQuery) ||
      c.content?.toLowerCase().includes(normalizedQuery) ||
      (c.testimony_title && c.testimony_title.toLowerCase().includes(normalizedQuery))
  );

  const filteredEncouragements = encouragements.filter(
    (enc) =>
      !normalizedQuery ||
      enc.author_name?.toLowerCase().includes(normalizedQuery) ||
      enc.content?.toLowerCase().includes(normalizedQuery) ||
      (enc.prayer_title && enc.prayer_title.toLowerCase().includes(normalizedQuery))
  );

  const filteredPrayers = prayers.filter((p) => {
    if (prayerFilter === "active" && p.status !== "active") return false;
    if (prayerFilter === "answered" && p.status !== "answered") return false;
    if (prayerFilter === "anonymous" && p.is_anonymous !== 1) return false;
    if (!normalizedQuery) return true;
    return (
      p.author_name?.toLowerCase().includes(normalizedQuery) ||
      p.title?.toLowerCase().includes(normalizedQuery) ||
      p.content?.toLowerCase().includes(normalizedQuery)
    );
  });

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
  const plansByIdMap = new Map(combinedPlans.map((p) => [p.id, p]));

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

  const usersPageInfo = getPagedSlice(filteredUsers, currentPage);
  const testimoniesPageInfo = getPagedSlice(filteredTestimonies, currentPage);
  const commentsPageInfo = getPagedSlice(filteredComments, currentPage);
  const encouragementsPageInfo = getPagedSlice(filteredEncouragements, currentPage);
  const prayersPageInfo = getPagedSlice(filteredPrayers, currentPage);
  const plansPageInfo = getPagedSlice(filteredPlans, currentPage);

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
    { id: "dashboard", label: "Overview", icon: "ri-dashboard-3-line" },
    { id: "users", label: "Users", icon: "ri-group-line", count: stats.totalUsers },
    {
      id: "testimonies",
      label: "Testimonies",
      icon: "ri-chat-quote-line",
      count: stats.totalTestimonies,
    },
    {
      id: "comments",
      label: "Comments",
      icon: "ri-chat-3-line",
      count: (stats.totalComments || 0) + (stats.totalPrayerEncouragements || 0),
    },
    {
      id: "prayers",
      label: "Prayers",
      icon: "ri-heart-pulse-line",
      count: stats.totalPrayers,
    },
    {
      id: "plans",
      label: "Plans",
      icon: "ri-book-open-line",
      count: combinedPlans.length,
    },
    {
      id: "system",
      label: "System & Push",
      icon: "ri-settings-4-line",
      count: stats.pushSubscribers,
    },
  ];

  const kpiCards = [
    {
      title: "Users",
      value: stats.totalUsers,
      subtitle: `${stats.activeToday} today`,
      icon: "ri-group-line",
      variant: "gold",
      targetTab: "users",
    },
    {
      title: "Active Week",
      value: stats.activeThisWeek,
      subtitle: "Active 7d",
      icon: "ri-user-follow-line",
      variant: "emerald",
      targetTab: "users",
    },
    {
      title: "Testimonies",
      value: stats.totalTestimonies,
      subtitle: "Feed posts",
      icon: "ri-chat-quote-line",
      variant: "sky",
      targetTab: "testimonies",
    },
    {
      title: "Prayers",
      value: stats.totalPrayers,
      subtitle: `${stats.answeredPrayers} answered`,
      icon: "ri-heart-pulse-line",
      variant: "danger",
      targetTab: "prayers",
    },
    {
      title: "Replies",
      value: (stats.totalComments || 0) + (stats.totalPrayerEncouragements || 0),
      subtitle: `${stats.totalComments} feed / ${stats.totalPrayerEncouragements} enc`,
      icon: "ri-chat-3-line",
      variant: "violet",
      targetTab: "comments",
    },
    {
      title: "Enrollments",
      value: stats.activePlans,
      subtitle: `${stats.completedPlans} done`,
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

        {/* Slim Command Hero Header */}
        <header className="sanc-admin-hero">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
              <span className="sanc-badge gold">
                <i className="ri-shield-line" aria-hidden="true"></i>
                ADMIN
              </span>
              <h1 className="sanc-admin-hero-title">Control Panel &amp; Moderation</h1>
            </div>
            <div className="sanc-admin-hero-meta">
              <span className="sanc-badge emerald">
                <i className="ri-user-star-line" aria-hidden="true"></i>
                {currentUser.name || currentUser.email}
              </span>
              <span className="sanc-badge">
                <i className="ri-book-open-line" aria-hidden="true"></i>
                {combinedPlans.length} Plans
              </span>
              <span className="sanc-badge sky">
                <i className="ri-notification-3-line" aria-hidden="true"></i>
                {stats.pushSubscribers} Push Subs
              </span>
            </div>
          </div>

          <div className="sanc-admin-hero-actions">
            <Link href="/plans" className="sanc-btn-secondary sanc-btn-sm">
              <i className="ri-external-link-line" aria-hidden="true"></i>
              View Site
            </Link>
            <button
              type="button"
              className="sanc-btn-secondary sanc-btn-sm"
              onClick={refreshStats}
              disabled={refreshingStats}
            >
              <i
                className={`ri-refresh-line ${refreshingStats ? "sanc-spin" : ""}`}
                aria-hidden="true"
              ></i>
              {refreshingStats ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {/* Single-Row Tab Bar */}
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

        {/* --- 1. OVERVIEW BENTO DASHBOARD --- */}
        {activeTab === "dashboard" && (
          <div>
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
                    <span
                      className={`sanc-stat-icon ${card.variant} sanc-admin-kpi-icon`}
                      aria-hidden="true"
                    >
                      <i className={card.icon}></i>
                    </span>
                  </div>
                  <span className="sanc-admin-kpi-value">{card.value}</span>
                  <span className="sanc-admin-kpi-sub">{card.subtitle}</span>
                </button>
              ))}
            </div>

            <div className="sanc-admin-bento">
              {/* Left: Recent Activity Stream */}
              <div className="sanc-admin-panel">
                <div className="sanc-admin-panel-head">
                  <h2 className="sanc-admin-panel-title">
                    <i className="ri-pulse-line" aria-hidden="true"></i>
                    Recent Activity Stream
                  </h2>
                  <span className="sanc-badge emerald">LIVE</span>
                </div>

                <div className="sanc-admin-chip-row" role="group" aria-label="Filter activity stream">
                  {[
                    { id: "all", label: "All" },
                    { id: "user_registered", label: "Signups" },
                    { id: "testimony_created", label: "Feed" },
                    { id: "comment_added", label: "Comments" },
                    { id: "prayer_requested", label: "Prayers" },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`sanc-admin-chip ${activityFilter === chip.id ? "active" : ""}`}
                      onClick={() => setActivityFilter(chip.id)}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {filteredActivities.length === 0 ? (
                  <div className="sanc-empty" style={{ padding: "3rem 1.5rem" }}>
                    <i className="ri-inbox-line" aria-hidden="true"></i>
                    <p style={{ margin: 0 }}>No activity matching this filter.</p>
                  </div>
                ) : (
                  <div className="sanc-admin-activity-list">
                    {filteredActivities.map((act) => {
                      let typeLabel = "Activity";
                      let badgeTone = "";
                      let iconVariant = "gold";
                      let typeIcon = "ri-compass-line";

                      if (act.type === "user_registered") {
                        typeLabel = "SIGNUP";
                        badgeTone = "gold";
                        iconVariant = "gold";
                        typeIcon = "ri-user-add-line";
                      } else if (act.type === "testimony_created") {
                        typeLabel = "FEED";
                        badgeTone = "emerald";
                        iconVariant = "emerald";
                        typeIcon = "ri-chat-quote-line";
                      } else if (act.type === "comment_added") {
                        typeLabel = "COMMENT";
                        badgeTone = "violet";
                        iconVariant = "violet";
                        typeIcon = "ri-chat-3-line";
                      } else if (act.type === "prayer_requested") {
                        typeLabel = "PRAYER";
                        badgeTone = "danger";
                        iconVariant = "danger";
                        typeIcon = "ri-heart-pulse-line";
                      }

                      return (
                        <div key={act.id} className="sanc-admin-activity-item">
                          <div className="sanc-admin-activity-main">
                            <span
                              className={`sanc-stat-icon ${iconVariant} sanc-admin-kpi-icon`}
                              aria-hidden="true"
                            >
                              <i className={typeIcon}></i>
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <p
                                style={{
                                  fontSize: "1.32rem",
                                  color: "var(--sanc-text)",
                                  lineHeight: 1.4,
                                  margin: 0,
                                }}
                              >
                                <strong>{act.user}</strong> {act.details}
                              </p>
                              {act.email && (
                                <span style={{ fontSize: "1.14rem", color: "var(--sanc-muted)" }}>
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

              {/* Right: Platform Health & Top Plans */}
              <div className="sanc-stack">
                <div className="sanc-admin-panel">
                  <div className="sanc-admin-panel-head">
                    <h2 className="sanc-admin-panel-title">
                      <i className="ri-heart-pulse-line" aria-hidden="true"></i>
                      Platform Health &amp; Audience
                    </h2>
                  </div>

                  <div className="sanc-admin-health-list">
                    <div className="sanc-admin-health-row">
                      <span>Prayers</span>
                      <span className="sanc-badge emerald">
                        {stats.activePrayers} active / {stats.answeredPrayers} answered
                      </span>
                    </div>
                    <div className="sanc-admin-health-row">
                      <span>Push Subscribers</span>
                      <span className="sanc-badge sky">{stats.pushSubscribers}</span>
                    </div>
                    <div className="sanc-admin-health-row">
                      <span>Prayer Encouragements</span>
                      <span className="sanc-badge violet">
                        {stats.totalPrayerEncouragements}
                      </span>
                    </div>
                    <div className="sanc-admin-health-row">
                      <span>Journal Entries</span>
                      <span className="sanc-badge gold">{stats.journalEntries}</span>
                    </div>
                    <div className="sanc-admin-health-row">
                      <span>Expired Sessions</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span
                          className={`sanc-badge ${stats.expiredSessions > 0 ? "danger" : ""}`}
                        >
                          {stats.expiredSessions}
                        </span>
                        <button
                          type="button"
                          className="sanc-btn-secondary sanc-btn-sm"
                          onClick={() => handleTabChange("system")}
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sanc-admin-panel">
                  <div className="sanc-admin-panel-head">
                    <h2 className="sanc-admin-panel-title">
                      <i className="ri-compass-3-line" aria-hidden="true"></i>
                      Top Enrolled Plans
                    </h2>
                    <button
                      type="button"
                      className="sanc-btn-ghost sanc-btn-sm"
                      onClick={() => handleTabChange("plans")}
                    >
                      View All
                    </button>
                  </div>

                  {topPlans.length === 0 ? (
                    <p style={{ fontSize: "1.3rem", color: "var(--sanc-muted)", margin: 0 }}>
                      No reading plan enrollments recorded yet.
                    </p>
                  ) : (
                    <div className="sanc-admin-health-list">
                      {topPlans.map((item) => {
                        const planMeta = plansByIdMap.get(item.planId);
                        return (
                          <div key={item.planId} className="sanc-admin-health-row">
                            <span
                              style={{
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {planMeta?.title || item.planId}
                            </span>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                              <span className="sanc-badge gold">{item.enrolled} enrolled</span>
                              <span className="sanc-badge emerald">{item.completed} done</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters Toolbar (for Management Tabs except System) */}
        {activeTab !== "dashboard" && activeTab !== "system" && (
          <div className="sanc-admin-toolbar">
            <div className="sanc-admin-search">
              <div className="sanc-input-wrap">
                <i className="ri-search-line sanc-input-icon" aria-hidden="true"></i>
                <input
                  type="text"
                  className="sanc-input has-icon"
                  placeholder={`Search in ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label={`Search ${activeTab}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="sanc-btn-ghost sanc-btn-sm"
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
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

            {activeTab === "users" && (
              <div className="sanc-admin-filters">
                <div className="sanc-admin-chip-row" role="group" aria-label="Filter users">
                  {[
                    { id: "all", label: "All" },
                    { id: "admin", label: "Admins" },
                    { id: "activeToday", label: "Active Today" },
                    { id: "inactive", label: "Inactive" },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`sanc-admin-chip ${userFilter === chip.id ? "active" : ""}`}
                      onClick={() => {
                        setUserFilter(chip.id);
                        setCurrentPage(1);
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <select
                  className="sanc-select"
                  aria-label="Sort users"
                  value={userSort}
                  onChange={(e) => {
                    setUserSort(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "auto", minWidth: "13rem" }}
                >
                  <option value="newest">Newest</option>
                  <option value="streak">Highest Streak</option>
                  <option value="name">Name A&ndash;Z</option>
                </select>

                <button
                  type="button"
                  className="sanc-btn-secondary sanc-btn-sm"
                  disabled={filteredUsers.length === 0}
                  onClick={() =>
                    exportRowsToCsv(
                      "praisepage-users",
                      [
                        { key: "name", label: "Name" },
                        { key: "email", label: "Email" },
                        { key: "role", label: "Role" },
                        { key: "streak_count", label: "Streak" },
                        { key: "streak_freezes_count", label: "Freezes" },
                        { key: "last_active", label: "Last Active" },
                        { key: "created_at", label: "Created At" },
                      ],
                      filteredUsers
                    )
                  }
                >
                  <i className="ri-download-2-line" aria-hidden="true"></i>
                  Export CSV
                </button>
              </div>
            )}

            {activeTab === "testimonies" && (
              <div className="sanc-admin-filters">
                <select
                  className="sanc-select"
                  aria-label="Filter testimonies by topic"
                  value={testimonyTagFilter}
                  onChange={(e) => {
                    setTestimonyTagFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "auto", minWidth: "14rem" }}
                >
                  <option value="All">All Topics</option>
                  {TESTIMONY_CATEGORIES.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag}
                    </option>
                  ))}
                </select>

                <select
                  className="sanc-select"
                  aria-label="Sort testimonies"
                  value={testimonySort}
                  onChange={(e) => {
                    setTestimonySort(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "auto", minWidth: "13rem" }}
                >
                  <option value="newest">Newest</option>
                  <option value="likes">Most Liked</option>
                  <option value="comments">Most Commented</option>
                </select>

                <button
                  type="button"
                  className="sanc-btn-secondary sanc-btn-sm"
                  disabled={filteredTestimonies.length === 0}
                  onClick={() =>
                    exportRowsToCsv(
                      "praisepage-testimonies",
                      [
                        { key: "title", label: "Title" },
                        { key: "author_name", label: "Author" },
                        { key: "tag", label: "Topic" },
                        { key: "likes_count", label: "Likes" },
                        { key: "comments_count", label: "Comments" },
                        { key: "created_at", label: "Published" },
                      ],
                      filteredTestimonies
                    )
                  }
                >
                  <i className="ri-download-2-line" aria-hidden="true"></i>
                  Export CSV
                </button>
              </div>
            )}

            {activeTab === "prayers" && (
              <div className="sanc-admin-filters">
                <div className="sanc-admin-chip-row" role="group" aria-label="Filter prayers">
                  {[
                    { id: "all", label: "All" },
                    { id: "active", label: "Active" },
                    { id: "answered", label: "Answered" },
                    { id: "anonymous", label: "Anonymous" },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      className={`sanc-admin-chip ${prayerFilter === chip.id ? "active" : ""}`}
                      onClick={() => {
                        setPrayerFilter(chip.id);
                        setCurrentPage(1);
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="sanc-btn-secondary sanc-btn-sm"
                  disabled={filteredPrayers.length === 0}
                  onClick={() =>
                    exportRowsToCsv(
                      "praisepage-prayers",
                      [
                        { key: "title", label: "Title" },
                        { key: "author", label: "Author" },
                        { key: "visibility", label: "Visibility" },
                        { key: "status", label: "Status" },
                        { key: "content", label: "Request" },
                        { key: "created_at", label: "Requested At" },
                      ],
                      filteredPrayers.map((p) => ({
                        ...p,
                        author: p.is_anonymous === 1 ? "Anonymous" : p.author_name,
                        visibility: p.is_anonymous === 1 ? "Anonymous" : "Public",
                      }))
                    )
                  }
                >
                  <i className="ri-download-2-line" aria-hidden="true"></i>
                  Export CSV
                </button>
              </div>
            )}

            {activeTab === "plans" && (
              <div className="sanc-admin-filters">
                <select
                  className="sanc-select"
                  aria-label="Filter plans by category"
                  value={planCategoryFilter}
                  onChange={(e) => {
                    setPlanCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
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
                  onChange={(e) => {
                    setPlanSourceFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "auto", minWidth: "15rem" }}
                >
                  <option value="all">All Sources</option>
                  <option value="system">System Plans</option>
                  <option value="custom">Custom Plans</option>
                  <option value="override">System Overrides</option>
                </select>

                <button
                  type="button"
                  className={showCreatePlanForm ? "sanc-btn-danger sanc-btn-sm" : "sanc-btn-primary sanc-btn-sm"}
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
              <>
                <div className="sanc-admin-table-wrap">
                  <table className="sanc-admin-table">
                    <thead>
                      <tr>
                        <th>User Info</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Streak &amp; Freezes</th>
                        <th>Role</th>
                        <th style={{ textAlign: "right" }}>Moderation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersPageInfo.slice.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{ padding: "4rem", textAlign: "center", color: "var(--sanc-muted)" }}
                          >
                            No user accounts match the current filters.
                          </td>
                        </tr>
                      ) : (
                        usersPageInfo.slice.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <div className="sanc-admin-user-cell">
                                <span className="sanc-admin-avatar-sm" aria-hidden="true">
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
                                    gap: "0.55rem",
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
                            <td>
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 700 }}>
                                  <i
                                    className="ri-fire-fill"
                                    style={{ color: "var(--sanc-gold)", marginRight: "0.35rem" }}
                                    aria-hidden="true"
                                  ></i>
                                  {u.streak_count || 0}d
                                </span>
                                <span className="sanc-badge sky">
                                  <i className="ri-snowflake-line" aria-hidden="true"></i>
                                  {u.streak_freezes_count ?? 1}
                                </span>
                              </div>
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
                                  className="sanc-admin-icon-action"
                                  onClick={() => viewUserDetails(u)}
                                  title="Inspect user details"
                                  aria-label={`Inspect ${u.name || u.email}`}
                                >
                                  <i className="ri-user-search-line" aria-hidden="true"></i>
                                </button>
                                <button
                                  type="button"
                                  className="sanc-admin-icon-action gold"
                                  disabled={actionLoading}
                                  onClick={() => handleGrantUserFreeze(u)}
                                  title="Grant +1 streak freeze"
                                  aria-label={`Grant freeze to ${u.name || u.email}`}
                                >
                                  <i className="ri-snowflake-line" aria-hidden="true"></i>
                                </button>
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
                <AdminPagination pageInfo={usersPageInfo} onPageChange={setCurrentPage} />
              </>
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
              <>
                <div className="sanc-admin-table-wrap">
                  <table className="sanc-admin-table">
                    <thead>
                      <tr>
                        <th>Testimony Post</th>
                        <th>Author</th>
                        <th>Topic</th>
                        <th>Published</th>
                        <th>Engagement</th>
                        <th style={{ textAlign: "right" }}>Moderation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testimoniesPageInfo.slice.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{ padding: "4rem", textAlign: "center", color: "var(--sanc-muted)" }}
                          >
                            No testimonies found matching the current filters.
                          </td>
                        </tr>
                      ) : (
                        testimoniesPageInfo.slice.map((t) => (
                          <tr key={t.id}>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                <span style={{ fontWeight: 700 }}>{t.title}</span>
                                <span
                                  className="sanc-admin-truncate"
                                  style={{ fontSize: "1.18rem", color: "var(--sanc-muted)" }}
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
                              {formatAdminDate(t.created_at)}
                            </td>
                            <td>
                              <span
                                style={{
                                  marginRight: "1.2rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                }}
                              >
                                <i
                                  className="ri-heart-line"
                                  style={{ color: "var(--sanc-error)" }}
                                  aria-hidden="true"
                                ></i>
                                {t.likes_count}
                              </span>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                }}
                              >
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
                                  className="sanc-admin-icon-action gold"
                                  onClick={() => setEditingTestimony(t)}
                                  title="Edit title and topic"
                                  aria-label={`Edit metadata for ${t.title}`}
                                >
                                  <i className="ri-edit-line" aria-hidden="true"></i>
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
                <AdminPagination pageInfo={testimoniesPageInfo} onPageChange={setCurrentPage} />
              </>
            )}
          </div>
        )}

        {/* --- 4. COMMENTS & PRAYER ENCOURAGEMENTS MODERATION VIEW --- */}
        {activeTab === "comments" && (
          <div>
            <div className="sanc-admin-subbar">
              <div className="sanc-segmented" role="tablist" aria-label="Comments Moderation Type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={commentsSubTab === "feed"}
                  className={`sanc-seg-btn ${commentsSubTab === "feed" ? "active" : ""}`}
                  onClick={() => {
                    setCommentsSubTab("feed");
                    setCurrentPage(1);
                  }}
                >
                  Feed Comments ({filteredComments.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={commentsSubTab === "prayers"}
                  className={`sanc-seg-btn ${commentsSubTab === "prayers" ? "active" : ""}`}
                  onClick={() => {
                    setCommentsSubTab("prayers");
                    setCurrentPage(1);
                  }}
                >
                  Prayer Encouragements ({filteredEncouragements.length})
                </button>
              </div>
            </div>

            <div className="sanc-admin-table-card">
              {tabLoading ? (
                <div className="sanc-admin-loading" style={{ margin: "2rem auto", border: "none", boxShadow: "none" }}>
                  <i className="ri-loader-4-line sanc-spin" aria-hidden="true"></i>
                  <span>Loading moderation queues...</span>
                </div>
              ) : commentsSubTab === "feed" ? (
                <>
                  <div className="sanc-admin-table-wrap">
                    <table className="sanc-admin-table">
                      <thead>
                        <tr>
                          <th>Comment Text</th>
                          <th>Author</th>
                          <th>Testimony Context</th>
                          <th>Written</th>
                          <th style={{ textAlign: "right" }}>Moderation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {commentsPageInfo.slice.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              style={{ padding: "4rem", textAlign: "center", color: "var(--sanc-muted)" }}
                            >
                              No feed comments found matching query.
                            </td>
                          </tr>
                        ) : (
                          commentsPageInfo.slice.map((c) => (
                            <tr key={c.id}>
                              <td>
                                <div className="sanc-admin-truncate" style={{ fontStyle: "italic" }}>
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
                                {formatAdminDate(c.created_at, true)}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div className="sanc-admin-actions">
                                  <button
                                    type="button"
                                    className="sanc-admin-icon-action"
                                    onClick={() => setPreviewComment({ ...c, isEncouragement: false })}
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
                  <AdminPagination pageInfo={commentsPageInfo} onPageChange={setCurrentPage} />
                </>
              ) : (
                <>
                  <div className="sanc-admin-table-wrap">
                    <table className="sanc-admin-table">
                      <thead>
                        <tr>
                          <th>Encouragement</th>
                          <th>Author</th>
                          <th>Prayer Context</th>
                          <th>Written</th>
                          <th style={{ textAlign: "right" }}>Moderation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {encouragementsPageInfo.slice.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              style={{ padding: "4rem", textAlign: "center", color: "var(--sanc-muted)" }}
                            >
                              No prayer encouragements found matching query.
                            </td>
                          </tr>
                        ) : (
                          encouragementsPageInfo.slice.map((enc) => (
                            <tr key={enc.id}>
                              <td>
                                <div className="sanc-admin-truncate" style={{ fontStyle: "italic" }}>
                                  &quot;{enc.content}&quot;
                                </div>
                              </td>
                              <td style={{ color: "var(--sanc-muted)" }}>{enc.author_name}</td>
                              <td style={{ color: "var(--sanc-muted)" }}>
                                {enc.prayer_title ? (
                                  <strong style={{ color: "var(--sanc-text)" }}>
                                    {enc.prayer_title}
                                  </strong>
                                ) : (
                                  <span style={{ fontSize: "1.2rem", fontStyle: "italic" }}>
                                    Prayer deleted
                                  </span>
                                )}
                              </td>
                              <td style={{ color: "var(--sanc-muted)" }}>
                                {formatAdminDate(enc.created_at, true)}
                              </td>
                              <td style={{ textAlign: "right" }}>
                                <div className="sanc-admin-actions">
                                  <button
                                    type="button"
                                    className="sanc-admin-icon-action"
                                    onClick={() =>
                                      setPreviewComment({
                                        ...enc,
                                        testimony_title: enc.prayer_title
                                          ? `Prayer: ${enc.prayer_title}`
                                          : "Prayer deleted",
                                        isEncouragement: true,
                                      })
                                    }
                                    title="Preview encouragement"
                                    aria-label="Preview encouragement"
                                  >
                                    <i className="ri-eye-line" aria-hidden="true"></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="sanc-admin-icon-action danger"
                                    disabled={actionLoading}
                                    onClick={() => handleDeletePrayerEncouragement(enc.id)}
                                    title="Delete encouragement permanently"
                                    aria-label="Delete encouragement"
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
                  <AdminPagination pageInfo={encouragementsPageInfo} onPageChange={setCurrentPage} />
                </>
              )}
            </div>
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
              <>
                <div className="sanc-admin-table-wrap">
                  <table className="sanc-admin-table">
                    <thead>
                      <tr>
                        <th>Prayer Request</th>
                        <th>Author</th>
                        <th>Visibility</th>
                        <th>Requested</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Moderation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prayersPageInfo.slice.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            style={{ padding: "4rem", textAlign: "center", color: "var(--sanc-muted)" }}
                          >
                            No prayer requests match the active filters.
                          </td>
                        </tr>
                      ) : (
                        prayersPageInfo.slice.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                                <span style={{ fontWeight: 700 }}>{p.title}</span>
                                <span
                                  className="sanc-admin-truncate"
                                  style={{ fontSize: "1.18rem", color: "var(--sanc-muted)" }}
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
                              {formatAdminDate(p.created_at)}
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
                                  className="sanc-admin-icon-action gold"
                                  disabled={actionLoading}
                                  onClick={() => handleTogglePrayerStatus(p)}
                                  title={
                                    p.status === "answered"
                                      ? "Reopen prayer request as active"
                                      : "Mark prayer request as answered"
                                  }
                                  aria-label={
                                    p.status === "answered"
                                      ? `Reopen ${p.title}`
                                      : `Mark ${p.title} answered`
                                  }
                                >
                                  <i
                                    className={
                                      p.status === "answered"
                                        ? "ri-restart-line"
                                        : "ri-checkbox-circle-line"
                                    }
                                    aria-hidden="true"
                                  ></i>
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
                <AdminPagination pageInfo={prayersPageInfo} onPageChange={setCurrentPage} />
              </>
            )}
          </div>
        )}

        {/* --- 6. DEVOTIONAL PLANS VIEW --- */}
        {activeTab === "plans" && (
          <div className="sanc-stack" style={{ gap: "2rem" }}>
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
                <>
                  <div className="sanc-admin-table-wrap">
                    <table className="sanc-admin-table">
                      <thead>
                        <tr>
                          <th>Plan Title</th>
                          <th>Category</th>
                          <th>Days</th>
                          <th>Analytics</th>
                          <th>Source</th>
                          <th style={{ textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plansPageInfo.slice.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              style={{ padding: "4rem", textAlign: "center", color: "var(--sanc-muted)" }}
                            >
                              No devotional plans match the active filters.
                            </td>
                          </tr>
                        ) : (
                          plansPageInfo.slice.map((p) => {
                            const thumbSrc = isSafeImageUrl(p.image)
                              ? p.image.trim()
                              : getDefaultPlanCover(p.category);
                            const isExternal = !thumbSrc.startsWith("/");
                            const metrics = planAnalytics[p.id] || {
                              enrolled: 0,
                              completed: 0,
                              saved: 0,
                            };

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
                                  {p.days ? p.days.length : 0}d
                                </td>
                                <td>
                                  <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
                                    <span className="sanc-badge">
                                      {metrics.enrolled} Enrolled
                                    </span>
                                    <span className="sanc-badge emerald">
                                      {metrics.completed} Done
                                    </span>
                                    <span className="sanc-badge sky">
                                      {metrics.saved} Saved
                                    </span>
                                  </div>
                                </td>
                                <td>
                                  {p.isCustom ? (
                                    <span
                                      className={`sanc-badge ${
                                        p.isOverridden ? "sky" : "emerald"
                                      }`}
                                    >
                                      {p.isOverridden ? "Override" : "Custom"}
                                    </span>
                                  ) : (
                                    <span className="sanc-badge">System</span>
                                  )}
                                </td>
                                <td style={{ textAlign: "right" }}>
                                  <div className="sanc-admin-actions">
                                    <Link
                                      href={`/plans/${p.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="sanc-admin-icon-action"
                                      title="Open live plan"
                                      aria-label={`Open ${p.title} in new tab`}
                                    >
                                      <i className="ri-external-link-line" aria-hidden="true"></i>
                                    </Link>
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
                                      className="sanc-admin-icon-action"
                                      onClick={() => handleDuplicatePlan(p)}
                                      title="Duplicate plan as new custom plan"
                                      aria-label={`Duplicate ${p.title}`}
                                    >
                                      <i className="ri-file-copy-line" aria-hidden="true"></i>
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
                  <AdminPagination pageInfo={plansPageInfo} onPageChange={setCurrentPage} />
                </>
              )}
            </div>
          </div>
        )}

        {/* --- 7. SYSTEM & PUSH VIEW --- */}
        {activeTab === "system" && (
          <AdminSystemTab
            systemData={systemData}
            loading={tabLoading}
            busy={actionLoading}
            onPurgeSessions={handlePurgeSessions}
            onSendBroadcast={handleSendBroadcast}
            onRefresh={handleRefreshSystem}
          />
        )}
      </div>

      {/* Confirmation, Inspection & Preview Modals */}
      <ConfirmActionModal
        dialog={confirmDialog}
        busy={actionLoading}
        onCancel={() => {
          if (!actionLoading) setConfirmDialog(null);
        }}
        onConfirm={() => confirmDialog?.onConfirm?.()}
      />

      <UserDetailModal
        user={selectedUserForDetail}
        details={userDetailsData}
        loading={userDetailsLoading}
        busy={actionLoading}
        isSelf={selectedUserForDetail?.id === currentUser.id}
        onClose={closeUserDetailModal}
        onGrantFreeze={handleGrantUserFreeze}
        onToggleRole={(u) => {
          closeUserDetailModal();
          handleToggleUserRole(u);
        }}
        onRequestDelete={(u) => {
          closeUserDetailModal();
          handleDeleteUser(u);
        }}
      />

      <TestimonyPreviewModal
        testimony={previewTestimony}
        busy={actionLoading}
        onClose={() => setPreviewTestimony(null)}
        onEditMeta={(t) => {
          setPreviewTestimony(null);
          setEditingTestimony(t);
        }}
        onRequestDelete={(t) => {
          setPreviewTestimony(null);
          handleDeleteTestimony(t.id, t.title);
        }}
      />

      <TestimonyEditModal
        testimony={editingTestimony}
        busy={actionLoading}
        onClose={() => {
          if (!actionLoading) setEditingTestimony(null);
        }}
        onSave={handleSaveTestimonyMeta}
      />

      <PrayerPreviewModal
        prayer={previewPrayer}
        busy={actionLoading}
        onClose={() => setPreviewPrayer(null)}
        onToggleStatus={(p) => handleTogglePrayerStatus(p)}
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
          if (c.isEncouragement) {
            handleDeletePrayerEncouragement(c.id);
          } else {
            handleDeleteComment(c.id);
          }
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
