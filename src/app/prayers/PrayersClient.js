"use client";

import { useState, useEffect, useRef, useSyncExternalStore, Suspense } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  getPrayersPageData,
  createPrayer,
  toggleSupportPrayer,
  markPrayerAsAnswered,
  getPrayerEncouragements,
  addPrayerEncouragement,
} from "@/app/actions/dbActions";

const ITEMS_PER_PAGE = 12;

function subscribeNoop() {
  return () => {};
}

function PrayerBoardContent({
  initialTab = "active",
  initialUser = null,
  initialCounts = { active: 0, answered: 0 },
  initialPrayers = [],
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = searchParams.get("tab") === "answered" ? "answered" : "active";

  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const [prayers, setPrayers] = useState(initialPrayers);
  const [currentUser, setCurrentUser] = useState(initialUser);
  const [isLoading, setIsLoading] = useState(false);
  const [boardAlert, setBoardAlert] = useState(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [answeredPrayerId, setAnsweredPrayerId] = useState(null);
  const [testimonyTitle, setTestimonyTitle] = useState("");
  const [testimonyContent, setTestimonyContent] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [answerError, setAnswerError] = useState("");

  // Encouragement states
  const [expandedPrayerId, setExpandedPrayerId] = useState(null);
  const [encouragements, setEncouragements] = useState([]);
  const [loadingEncouragements, setLoadingEncouragements] = useState(false);
  const [newEncouragementText, setNewEncouragementText] = useState("");
  const [guestEncName, setGuestEncName] = useState("");
  const [encError, setEncError] = useState("");

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPrayers.length === ITEMS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [counts, setCounts] = useState(initialCounts);

  const loadedTabRef = useRef(initialTab);
  const alertTimerRef = useRef(null);

  const showTimedBoardAlert = (nextAlert) => {
    setBoardAlert(nextAlert);
    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
    }
    alertTimerRef.current = setTimeout(() => {
      setBoardAlert(null);
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) {
        clearTimeout(alertTimerRef.current);
      }
    };
  }, []);

  const isAnyModalOpen = showCreateModal || Boolean(answeredPrayerId);

  useEffect(() => {
    if (!isClient || !isAnyModalOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (answeredPrayerId) {
        setAnsweredPrayerId(null);
        setAnswerError("");
      } else if (showCreateModal) {
        setShowCreateModal(false);
        setErrorMsg("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isClient, isAnyModalOpen, answeredPrayerId, showCreateModal]);

  // Single-call fetch when activeTab diverges from SSR-loaded tab
  useEffect(() => {
    if (loadedTabRef.current === activeTab) return;
    let cancelled = false;

    async function loadTab() {
      try {
        const data = await getPrayersPageData(activeTab, ITEMS_PER_PAGE, 0);
        if (cancelled) return;
        loadedTabRef.current = activeTab;
        const list = data.prayers || [];
        setCurrentUser(data.user);
        setCounts(data.counts || { active: 0, answered: 0 });
        setPrayers(list);
        setPage(1);
        setHasMore(list.length === ITEMS_PER_PAGE);
      } catch (err) {
        console.error("Error loading prayers:", err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadTab();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const handleTabChange = (nextTab) => {
    if (nextTab === activeTab) return;
    setIsLoading(loadedTabRef.current !== nextTab);
    setExpandedPrayerId(null);
    setEncouragements([]);
    setEncError("");
    router.replace(nextTab === "answered" ? "/prayers?tab=answered" : "/prayers", {
      scroll: false,
    });
  };

  const loadMorePrayers = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const offset = page * ITEMS_PER_PAGE;
      const data = await getPrayersPageData(activeTab, ITEMS_PER_PAGE, offset);
      const list = data.prayers || [];
      setPrayers((prev) => [...prev, ...list]);
      setPage((prev) => prev + 1);
      setHasMore(list.length === ITEMS_PER_PAGE);
      if (data.counts) setCounts(data.counts);
    } catch (err) {
      console.error("Error loading more prayers:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  async function refreshAll() {
    setPage(1);
    try {
      const data = await getPrayersPageData(activeTab, ITEMS_PER_PAGE, 0);
      const list = data.prayers || [];
      setCounts(data.counts || { active: 0, answered: 0 });
      setPrayers(list);
      setHasMore(list.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Error refreshing prayers:", err);
    }
  }

  const openCreateModal = () => {
    setErrorMsg("");
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setErrorMsg("");
  };

  const openAnswerModal = (prayerId) => {
    setAnswerError("");
    setAnsweredPrayerId(prayerId);
  };

  const closeAnswerModal = () => {
    setAnsweredPrayerId(null);
    setAnswerError("");
  };

  const handleCreatePrayer = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const res = await createPrayer(newTitle, newContent, isAnonymous, guestName);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setNewTitle("");
      setNewContent("");
      setIsAnonymous(false);
      setGuestName("");
      setShowCreateModal(false);
      showTimedBoardAlert({
        type: "ok",
        text: "Your prayer request has been pinned to the board.",
      });
      await refreshAll();
    }
  };

  const handleSupport = async (prayerId) => {
    if (!currentUser) {
      showTimedBoardAlert({
        type: "error",
        text: "Please sign in to stand in prayer for this request.",
        showLogin: true,
      });
      return;
    }

    setPrayers((prev) =>
      prev.map((p) => {
        if (p.id === prayerId) {
          const increment = p.isSupportedByUser ? -1 : 1;
          return {
            ...p,
            supportCount: p.supportCount + increment,
            isSupportedByUser: !p.isSupportedByUser,
          };
        }
        return p;
      })
    );

    const res = await toggleSupportPrayer(prayerId);
    if (res?.error) {
      showTimedBoardAlert({
        type: "error",
        text: res.error,
      });
    }
  };

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!testimonyTitle.trim() || !testimonyContent.trim()) {
      setAnswerError("Please fill in the testimony details to share your praise report.");
      return;
    }

    setAnswerError("");
    setIsAnswering(true);
    const res = await markPrayerAsAnswered(answeredPrayerId, testimonyTitle, testimonyContent);
    setIsAnswering(false);

    if (res.error) {
      setAnswerError(res.error);
    } else {
      setAnsweredPrayerId(null);
      setTestimonyTitle("");
      setTestimonyContent("");
      showTimedBoardAlert({
        type: "ok",
        text: "Praise God! Your answered prayer and testimony have been shared.",
      });
      await refreshAll();
    }
  };

  const toggleEncouragementThread = async (prayerId) => {
    if (expandedPrayerId === prayerId) {
      setExpandedPrayerId(null);
      setEncouragements([]);
      setEncError("");
    } else {
      setExpandedPrayerId(prayerId);
      setLoadingEncouragements(true);
      setNewEncouragementText("");
      setEncError("");
      const list = await getPrayerEncouragements(prayerId);
      setEncouragements(list);
      setLoadingEncouragements(false);
    }
  };

  const handleSubmitEncouragement = async (e) => {
    e.preventDefault();
    if (!newEncouragementText.trim()) return;

    const currentId = expandedPrayerId;
    const content = newEncouragementText;
    const nameToSend = guestEncName;
    setEncError("");
    setNewEncouragementText("");
    setGuestEncName("");

    const res = await addPrayerEncouragement(currentId, content, nameToSend);
    if (res.error) {
      setEncError(res.error);
      setNewEncouragementText(content);
      setGuestEncName(nameToSend);
    } else {
      const list = await getPrayerEncouragements(currentId);
      setEncouragements(list);

      setPrayers((prev) =>
        prev.map((p) => {
          if (p.id === currentId) {
            return { ...p, encouragementCount: p.encouragementCount + 1 };
          }
          return p;
        })
      );
    }
  };

  return (
    <section className="sanc-page">
      <div className="sanc-container-md">
        {/* Widescreen Hero Sanctuary Banner */}
        <div className="sanc-hero-banner" style={{ minHeight: "240px", position: "relative" }}>
          <Image
            src="/assets/images/prayer_wall_banner.png"
            alt="Prayer Wall"
            fill
            sizes="(max-width: 1000px) 100vw, 1000px"
            preload
            style={{ objectFit: "cover" }}
          />
          <div className="sanc-hero-banner-overlay">
            <span className="sanc-eyebrow" style={{ color: "var(--sanc-gold)" }}>
              Community Prayer Sanctuary
            </span>
            <h1 className="sanc-title" style={{ color: "#ffffff" }}>
              Wall of <span className="sanc-title-accent">Faith &amp; Supplication</span>
            </h1>
            <p className="sanc-subtitle" style={{ color: "rgba(255, 255, 255, 0.86)" }}>
              Carry one another&apos;s burdens, stand in faith together, and celebrate the goodness of God through answered prayers.
            </p>
          </div>
        </div>

        {/* Action and Tab Control Bar */}
        <div
          className="sanc-tab-bar"
          role="tablist"
          aria-label="Prayer wall filter"
          style={{ justifyContent: "space-between", alignItems: "center", gap: "1.2rem" }}
        >
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "active"}
              className={`sanc-tab-btn ${activeTab === "active" ? "active" : ""}`}
              onClick={() => handleTabChange("active")}
            >
              Active Requests ({counts.active})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "answered"}
              className={`sanc-tab-btn ${activeTab === "answered" ? "active" : ""}`}
              onClick={() => handleTabChange("answered")}
            >
              Answered Prayers ({counts.answered})
            </button>
          </div>

          <button
            type="button"
            className="sanc-btn-primary"
            onClick={openCreateModal}
          >
            <i className="ri-add-line" aria-hidden="true"></i>
            Request Prayer
          </button>
        </div>

        {/* Inline Feedback Alert */}
        {boardAlert && (
          <div
            className={`sanc-alert ${boardAlert.type}`}
            role="status"
            style={{
              marginBottom: "2.4rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <span>
              {boardAlert.text}{" "}
              {boardAlert.showLogin && (
                <Link
                  href="/login?redirect=/prayers"
                  style={{ color: "var(--sanc-emerald)", fontWeight: 700, textDecoration: "underline" }}
                >
                  Sign in
                </Link>
              )}
            </span>
            <button
              type="button"
              className="sanc-btn-ghost sanc-btn-sm"
              aria-label="Dismiss notification"
              onClick={() => setBoardAlert(null)}
            >
              <i className="ri-close-line" aria-hidden="true"></i>
            </button>
          </div>
        )}

        {/* Prayers Feed list */}
        {isLoading ? (
          <div className="sanc-prayer-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="sanc-prayer-card">
                <div className="sanc-stack" style={{ gap: "1rem" }}>
                  <div className="shimmer" style={{ width: "68%", height: "1.8rem", borderRadius: "4px" }}></div>
                  <div className="shimmer" style={{ width: "100%", height: "1.2rem", borderRadius: "4px" }}></div>
                  <div className="shimmer" style={{ width: "80%", height: "1.2rem", borderRadius: "4px" }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : prayers.length === 0 ? (
          <div className="sanc-empty">
            <i
              className={activeTab === "active" ? "ri-chat-heart-line" : "ri-rainbow-line"}
              style={{ fontSize: "4.6rem", display: "block", marginBottom: "1.4rem", opacity: 0.7 }}
              aria-hidden="true"
            ></i>
            <p style={{ fontSize: "1.6rem", marginBottom: "1.6rem" }}>
              {activeTab === "active"
                ? "No prayer requests listed currently. Be the first to reach out!"
                : "No answered prayers posted yet. We await God's faithful testimonies."}
            </p>
            {activeTab === "active" && (
              <button type="button" className="sanc-btn-primary" onClick={openCreateModal}>
                Share First Request
              </button>
            )}
          </div>
        ) : (
          <div>
            <div className="sanc-prayer-grid">
              {prayers.map((prayer) => {
                const isOwner = currentUser && currentUser.id === prayer.user_id;

                return (
                  <article
                    key={prayer.id}
                    className={`sanc-prayer-card ${
                      prayer.status === "answered" ? "praise-report" : "active-request"
                    }`}
                  >
                    <span
                      className={`sanc-prayer-pin ${
                        prayer.status === "answered" ? "praise-pin" : "active-pin"
                      }`}
                    >
                      <i
                        className={
                          prayer.status === "answered"
                            ? "ri-sparkling-line"
                            : "ri-pushpin-line"
                        }
                        aria-hidden="true"
                      ></i>
                      {prayer.status === "answered" ? "Answered Praise" : "Prayer Request"}
                    </span>

                    {/* Card Header */}
                    <div>
                      <h3
                        style={{
                          fontSize: "1.7rem",
                          fontWeight: 700,
                          color: "var(--sanc-text)",
                          marginBottom: "0.4rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {prayer.title}
                      </h3>
                      <span style={{ fontSize: "1.15rem", color: "var(--sanc-muted)" }}>
                        By {prayer.author} &bull; {prayer.date}
                      </span>
                    </div>

                    {/* Card Content */}
                    <p
                      style={{
                        fontSize: "1.38rem",
                        lineHeight: 1.6,
                        color: "var(--sanc-muted)",
                        whiteSpace: "pre-line",
                        margin: "0.2rem 0",
                      }}
                    >
                      {prayer.content}
                    </p>

                    {/* Praise Report Header (if answered) */}
                    {prayer.status === "answered" && (
                      <div className="sanc-praise-box">
                        <span className="sanc-badge violet" style={{ marginBottom: "0.8rem" }}>
                          <i className="ri-star-smile-fill" aria-hidden="true"></i>
                          Praise Report
                        </span>
                        <p
                          style={{
                            fontSize: "1.3rem",
                            fontStyle: "italic",
                            color: "var(--sanc-text)",
                            lineHeight: 1.55,
                            margin: 0,
                          }}
                        >
                          {prayer.testimonyContent ||
                            "Answered! Thank you for standing in prayer with us."}
                        </p>
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="sanc-prayer-actions">
                      <button
                        type="button"
                        onClick={() => handleSupport(prayer.id)}
                        className={`sanc-prayer-btn support ${
                          prayer.isSupportedByUser ? "active" : ""
                        }`}
                        aria-pressed={Boolean(prayer.isSupportedByUser)}
                      >
                        <i
                          className={
                            prayer.isSupportedByUser ? "ri-hand-heart-fill" : "ri-hand-heart-line"
                          }
                          aria-hidden="true"
                        ></i>
                        <span>{prayer.isSupportedByUser ? "Praying" : "Pray"}</span>
                        {prayer.supportCount > 0 && (
                          <span className="sanc-prayer-count">{prayer.supportCount}</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleEncouragementThread(prayer.id)}
                        className={`sanc-prayer-btn encourage ${
                          expandedPrayerId === prayer.id ? "active" : ""
                        }`}
                        aria-expanded={expandedPrayerId === prayer.id}
                      >
                        <i className="ri-chat-smile-3-line" aria-hidden="true"></i>
                        <span>Encourage</span>
                        {prayer.encouragementCount > 0 && (
                          <span className="sanc-prayer-count">{prayer.encouragementCount}</span>
                        )}
                      </button>

                      {isOwner && prayer.status === "active" && (
                        <button
                          type="button"
                          onClick={() => openAnswerModal(prayer.id)}
                          className="sanc-prayer-btn answered"
                          style={{ marginLeft: "auto" }}
                        >
                          <i className="ri-checkbox-circle-line" aria-hidden="true"></i>
                          <span>Mark Answered</span>
                        </button>
                      )}
                    </div>

                    {/* Pinned Thread Panel */}
                    {expandedPrayerId === prayer.id && (
                      <div className="sanc-enc-thread">
                        <h4
                          style={{
                            fontSize: "1.25rem",
                            fontWeight: 700,
                            color: "var(--sanc-sky)",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            margin: 0,
                          }}
                        >
                          <i className="ri-heart-line" aria-hidden="true"></i>
                          Encouragements
                        </h4>

                        {encError && (
                          <div className="sanc-alert error" role="alert">
                            {encError}
                          </div>
                        )}

                        {loadingEncouragements ? (
                          <div style={{ color: "var(--sanc-muted)", fontSize: "1.2rem" }}>
                            Loading...
                          </div>
                        ) : encouragements.length === 0 ? (
                          <div
                            style={{
                              color: "var(--sanc-muted)",
                              fontSize: "1.2rem",
                              fontStyle: "italic",
                            }}
                          >
                            No messages yet.
                          </div>
                        ) : (
                          <div
                            className="sanc-stack"
                            style={{ gap: "0.8rem", maxHeight: "170px", overflowY: "auto" }}
                          >
                            {encouragements.map((enc) => (
                              <div key={enc.id} className="sanc-enc-item">
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: "0.4rem",
                                    fontSize: "1.05rem",
                                  }}
                                >
                                  <span style={{ fontWeight: 700, color: "var(--sanc-text)" }}>
                                    {enc.authorName}
                                  </span>
                                  <span style={{ color: "var(--sanc-muted)" }}>{enc.date}</span>
                                </div>
                                <p
                                  style={{
                                    fontSize: "1.2rem",
                                    lineHeight: 1.45,
                                    color: "var(--sanc-muted)",
                                    whiteSpace: "pre-wrap",
                                    margin: 0,
                                  }}
                                >
                                  {enc.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        <form
                          onSubmit={handleSubmitEncouragement}
                          className="sanc-stack"
                          style={{ gap: "0.6rem" }}
                        >
                          {!currentUser && (
                            <input
                              type="text"
                              className="sanc-input"
                              placeholder="Your name (optional)"
                              value={guestEncName}
                              onChange={(e) => setGuestEncName(e.target.value)}
                            />
                          )}
                          <div style={{ display: "flex", gap: "0.6rem" }}>
                            <input
                              type="text"
                              className="sanc-input"
                              placeholder="Comfort or scripture..."
                              value={newEncouragementText}
                              onChange={(e) => setNewEncouragementText(e.target.value)}
                            />
                            <button
                              type="submit"
                              className="sanc-btn-primary sanc-btn-sm"
                              aria-label="Send encouragement"
                            >
                              <i className="ri-send-plane-fill" aria-hidden="true"></i>
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {hasMore && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: "3.6rem" }}>
                <button
                  type="button"
                  className="sanc-btn-secondary"
                  onClick={loadMorePrayers}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <span>Loading...</span>
                  ) : (
                    <>
                      <i className="ri-arrow-down-double-line" aria-hidden="true"></i>
                      <span>Load More Prayers</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Portaled Modal: Create Prayer Request */}
      {isClient &&
        typeof document !== "undefined" &&
        showCreateModal &&
        createPortal(
          <div
            className="sanc-modal-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeCreateModal();
            }}
          >
            <div
              className="sanc-modal-dialog narrow"
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-prayer-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sanc-modal-header">
                <h2 id="create-prayer-title" className="sanc-modal-title">
                  Request Prayer
                </h2>
                <button
                  type="button"
                  className="sanc-modal-close"
                  onClick={closeCreateModal}
                  aria-label="Close modal"
                >
                  <i className="ri-close-line" aria-hidden="true"></i>
                </button>
              </div>

              <div className="sanc-modal-body">
                {errorMsg && (
                  <div className="sanc-alert error" role="alert" style={{ marginBottom: "1.6rem" }}>
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleCreatePrayer} className="sanc-stack" style={{ gap: "1.8rem" }}>
                  {!currentUser && (
                    <div className="sanc-field">
                      <label htmlFor="guest-name" className="sanc-label">
                        Your Name{" "}
                        <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional)</span>
                      </label>
                      <input
                        id="guest-name"
                        type="text"
                        className="sanc-input"
                        placeholder="Leave blank to post anonymously"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="sanc-field">
                    <label htmlFor="prayer-title" className="sanc-label">
                      Title / Subject
                    </label>
                    <input
                      id="prayer-title"
                      type="text"
                      className="sanc-input"
                      placeholder="e.g. Strength during exam week"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>

                  <div className="sanc-field">
                    <label htmlFor="prayer-content" className="sanc-label">
                      Prayer Details
                    </label>
                    <textarea
                      id="prayer-content"
                      rows={5}
                      className="sanc-textarea"
                      placeholder="Share what is on your heart. Let us know how we can pray..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                    />
                  </div>

                  {currentUser && (
                    <label className="sanc-checkbox" htmlFor="anonymous-check">
                      <input
                        id="anonymous-check"
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                      />
                      <span>Post request anonymously</span>
                    </label>
                  )}

                  {!currentUser && (
                    <p style={{ fontSize: "1.25rem", color: "var(--sanc-muted)", lineHeight: 1.5, margin: 0 }}>
                      <i className="ri-lock-line" style={{ marginRight: "0.4rem" }} aria-hidden="true"></i>
                      Guest requests are posted anonymously.{" "}
                      <Link
                        href="/login"
                        style={{ color: "var(--sanc-emerald)", textDecoration: "underline" }}
                      >
                        Sign in
                      </Link>{" "}
                      to use your name.
                    </p>
                  )}

                  <div className="sanc-modal-footer">
                    <button
                      type="button"
                      className="sanc-btn-ghost"
                      onClick={closeCreateModal}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="sanc-btn-primary" disabled={isSubmitting}>
                      {isSubmitting ? "Submitting..." : "Submit Prayer Request"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Portaled Modal: Mark Answered & Create Testimony */}
      {isClient &&
        typeof document !== "undefined" &&
        answeredPrayerId &&
        createPortal(
          <div
            className="sanc-modal-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeAnswerModal();
            }}
          >
            <div
              className="sanc-modal-dialog narrow"
              role="dialog"
              aria-modal="true"
              aria-labelledby="praise-report-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sanc-modal-header">
                <h2
                  id="praise-report-title"
                  className="sanc-modal-title"
                  style={{ color: "var(--sanc-violet)" }}
                >
                  <i className="ri-rainbow-line" style={{ marginRight: "0.7rem" }} aria-hidden="true"></i>
                  Share Praise Report
                </h2>
                <button
                  type="button"
                  className="sanc-modal-close"
                  onClick={closeAnswerModal}
                  aria-label="Close modal"
                >
                  <i className="ri-close-line" aria-hidden="true"></i>
                </button>
              </div>

              <div className="sanc-modal-body">
                <p
                  style={{
                    fontSize: "1.35rem",
                    color: "var(--sanc-muted)",
                    lineHeight: 1.6,
                    marginBottom: "1.8rem",
                  }}
                >
                  Praise God! Share how this prayer request was answered to inspire and encourage others in our community feed.
                </p>

                {answerError && (
                  <div className="sanc-alert error" role="alert" style={{ marginBottom: "1.6rem" }}>
                    {answerError}
                  </div>
                )}

                <form onSubmit={handleAnswerSubmit} className="sanc-stack" style={{ gap: "1.8rem" }}>
                  <div className="sanc-field">
                    <label htmlFor="testimony-title" className="sanc-label">
                      Testimony Title
                    </label>
                    <input
                      id="testimony-title"
                      type="text"
                      className="sanc-input"
                      placeholder="e.g. God provided right on time!"
                      value={testimonyTitle}
                      onChange={(e) => setTestimonyTitle(e.target.value)}
                    />
                  </div>

                  <div className="sanc-field">
                    <label htmlFor="testimony-content" className="sanc-label">
                      Testimony Story
                    </label>
                    <textarea
                      id="testimony-content"
                      rows={5}
                      className="sanc-textarea"
                      placeholder="Describe how God answered this prayer request..."
                      value={testimonyContent}
                      onChange={(e) => setTestimonyContent(e.target.value)}
                    />
                  </div>

                  <div className="sanc-modal-footer">
                    <button
                      type="button"
                      className="sanc-btn-ghost"
                      onClick={closeAnswerModal}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="sanc-btn-violet" disabled={isAnswering}>
                      {isAnswering ? "Submitting..." : "Post Testimony & Mark Answered"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}

export default function PrayersClient(props) {
  return (
    <Suspense
      fallback={
        <section className="sanc-page">
          <div className="sanc-container-md">
            <div className="sanc-empty">Loading prayer wall...</div>
          </div>
        </section>
      }
    >
      <PrayerBoardContent {...props} />
    </Suspense>
  );
}
