"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getMe } from "@/app/actions/authActions";
import { 
  getPrayers, 
  getPrayerCounts,
  createPrayer, 
  toggleSupportPrayer, 
  markPrayerAsAnswered,
  getPrayerEncouragements,
  addPrayerEncouragement
} from "@/app/actions/dbActions";

export default function PrayerBoard() {
  const [prayers, setPrayers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active"); // "active" or "answered"

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [answeredPrayerId, setAnsweredPrayerId] = useState(null);
  const [testimonyTitle, setTestimonyTitle] = useState("");
  const [testimonyContent, setTestimonyContent] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);

  // Encouragement states
  const [expandedPrayerId, setExpandedPrayerId] = useState(null);
  const [encouragements, setEncouragements] = useState([]);
  const [loadingEncouragements, setLoadingEncouragements] = useState(false);
  const [newEncouragementText, setNewEncouragementText] = useState("");

  // Pagination states
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [counts, setCounts] = useState({ active: 0, answered: 0 });

  const ITEMS_PER_PAGE = 12;

  // Load initial data or when tab changes
  useEffect(() => {
    async function initData() {
      setIsLoading(true);
      setPage(1);
      try {
        const user = await getMe();
        setCurrentUser(user);
        
        // Fetch count statistics
        const statCounts = await getPrayerCounts();
        setCounts(statCounts);

        // Fetch first page of prayers filtered by status
        const list = await getPrayers(activeTab, ITEMS_PER_PAGE, 0);
        setPrayers(list);
        setHasMore(list.length === ITEMS_PER_PAGE);
      } catch (err) {
        console.error("Error loading prayers:", err);
      } finally {
        setIsLoading(false);
      }
    }
    initData();
  }, [activeTab]);

  const loadMorePrayers = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    try {
      const offset = page * ITEMS_PER_PAGE;
      const list = await getPrayers(activeTab, ITEMS_PER_PAGE, offset);
      setPrayers(prev => [...prev, ...list]);
      setPage(prev => prev + 1);
      setHasMore(list.length === ITEMS_PER_PAGE);

      // Refresh stats
      const statCounts = await getPrayerCounts();
      setCounts(statCounts);
    } catch (err) {
      console.error("Error loading more prayers:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Re-fetch all data on creation or status change
  async function refreshAll() {
    setPage(1);
    try {
      const statCounts = await getPrayerCounts();
      setCounts(statCounts);
      const list = await getPrayers(activeTab, ITEMS_PER_PAGE, 0);
      setPrayers(list);
      setHasMore(list.length === ITEMS_PER_PAGE);
    } catch (err) {
      console.error("Error refreshing prayers:", err);
    }
  }

  const handleCreatePrayer = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const res = await createPrayer(newTitle, newContent, isAnonymous);
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setNewTitle("");
      setNewContent("");
      setIsAnonymous(false);
      setShowCreateModal(false);
      await refreshAll();
    }
  };

  const handleSupport = async (prayerId) => {
    if (!currentUser) {
      alert("Please log in to support prayer requests.");
      return;
    }

    // Optimistic UI update
    setPrayers(prev => prev.map(p => {
      if (p.id === prayerId) {
        const increment = p.isSupportedByUser ? -1 : 1;
        return {
          ...p,
          supportCount: p.supportCount + increment,
          isSupportedByUser: !p.isSupportedByUser
        };
      }
      return p;
    }));

    await toggleSupportPrayer(prayerId);
  };

  const handleAnswerSubmit = async (e) => {
    e.preventDefault();
    if (!testimonyTitle.trim() || !testimonyContent.trim()) {
      alert("Please fill in the testimony details to share your praise report.");
      return;
    }

    setIsAnswering(true);
    const res = await markPrayerAsAnswered(answeredPrayerId, testimonyTitle, testimonyContent);
    setIsAnswering(false);

    if (res.error) {
      alert(res.error);
    } else {
      setAnsweredPrayerId(null);
      setTestimonyTitle("");
      setTestimonyContent("");
      await refreshAll();
    }
  };

  const toggleEncouragementThread = async (prayerId) => {
    if (expandedPrayerId === prayerId) {
      setExpandedPrayerId(null);
      setEncouragements([]);
    } else {
      setExpandedPrayerId(prayerId);
      setLoadingEncouragements(true);
      setNewEncouragementText("");
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
    setNewEncouragementText("");

    const res = await addPrayerEncouragement(currentId, content);
    if (res.error) {
      alert(res.error);
    } else {
      const list = await getPrayerEncouragements(currentId);
      setEncouragements(list);
      
      // Update count inline
      setPrayers(prev => prev.map(p => {
        if (p.id === currentId) {
          return { ...p, encouragementCount: p.encouragementCount + 1 };
        }
        return p;
      }));
    }
  };

  return (
    <div className="section" style={{ paddingBlock: "6rem 4rem" }}>
      <style dangerouslySetInnerHTML={{__html: `
        .pinned-note {
          position: relative;
          background: var(--secondary-background-color);
          border: 1px solid var(--transparent-light-color);
          border-radius: 12px;
          padding: 2.5rem;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s ease, border-color 0.3s ease;
        }
        .pinned-note.active-request:hover {
          transform: translateY(-6px) rotate(var(--tilt)) scale(1.02) !important;
          box-shadow: 0 15px 35px rgba(79, 207, 112, 0.12);
          border-color: var(--accent-color);
        }
        .pinned-note.praise-report {
          background: linear-gradient(135deg, var(--secondary-background-color) 0%, rgba(167, 103, 229, 0.05) 100%);
          border: 1px solid rgba(167, 103, 229, 0.25);
          box-shadow: 0 8px 24px rgba(167, 103, 229, 0.08);
        }
        .pinned-note.praise-report:hover {
          transform: translateY(-6px) rotate(var(--tilt)) scale(1.02) !important;
          box-shadow: 0 15px 35px rgba(167, 103, 229, 0.2);
          border-color: #c893f9;
        }
        .pinned-note-pushpin {
          position: absolute;
          top: -9px;
          left: 50%;
          transform: translateX(-50%);
          width: 14px;
          height: 14px;
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
          z-index: 5;
        }
        .pinned-note-pushpin.active-pin {
          background: radial-gradient(circle, #ff6b6b 30%, #e84c3c 70%, #8b0000 100%);
        }
        .pinned-note-pushpin.praise-pin {
          background: radial-gradient(circle, #fad648 30%, #f1c40f 70%, #b7950b 100%);
        }
      `}} />

      <div className="container" style={{ maxWidth: "1000px" }}>
        
        {/* Widescreen Hero Sanctuary Banner */}
        <div 
          style={{
            position: "relative",
            width: "100%",
            height: "240px",
            borderRadius: "16px",
            overflow: "hidden",
            marginBottom: "4rem",
            border: "1px solid var(--transparent-light-color)",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.2)",
            background: "var(--secondary-background-color)"
          }}
        >
          <img 
            src="/assets/images/prayer_wall_banner.png" 
            alt="Prayer Wall" 
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.5,
              filter: "brightness(0.9) contrast(1.1)"
            }}
          />
          <div 
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(to bottom, rgba(19, 20, 23, 0.1) 0%, rgba(19, 20, 23, 0.8) 100%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "2.5rem 3rem",
              zIndex: 2
            }}
          >
            <h1 style={{ fontSize: "3.2rem", fontWeight: "700", color: "var(--light-color)", marginBottom: "0.5rem" }}>
              Wall of <span style={{ color: "var(--accent-color)" }}>Faith & Supplication</span>
            </h1>
            <p style={{ fontSize: "1.45rem", color: "var(--light-color-alt)", maxWidth: "550px", lineHeight: "1.5" }}>
              Carry one another's burdens, stand in faith together, and celebrate the goodness of God through answered prayers.
            </p>
          </div>
        </div>

        {/* Action and Tab Control Bar */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "2rem",
          marginBottom: "3rem",
          borderBottom: "1px solid var(--transparent-light-color)",
          paddingBottom: "1.5rem"
        }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              onClick={() => setActiveTab("active")}
              style={{
                background: activeTab === "active" ? "rgba(79, 207, 112, 0.12)" : "transparent",
                color: activeTab === "active" ? "var(--accent-color)" : "var(--light-color-alt)",
                border: "none",
                padding: "0.8rem 1.6rem",
                borderRadius: "20px",
                fontSize: "1.3rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.25s"
              }}
            >
              Active Requests ({counts.active})
            </button>
            <button
              onClick={() => setActiveTab("answered")}
              style={{
                background: activeTab === "answered" ? "rgba(167, 103, 229, 0.12)" : "transparent",
                color: activeTab === "answered" ? "#c893f9" : "var(--light-color-alt)",
                border: "none",
                padding: "0.8rem 1.6rem",
                borderRadius: "20px",
                fontSize: "1.3rem",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.25s"
              }}
            >
              Answered Prayers ({counts.answered})
            </button>
          </div>

          {/* Share Button */}
          {currentUser ? (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: "var(--accent-color)",
                color: "#131417",
                border: "none",
                padding: "1rem 2.2rem",
                borderRadius: "30px",
                fontWeight: "700",
                fontSize: "1.3rem",
                cursor: "pointer",
                boxShadow: "0 4px 15px rgba(79, 207, 112, 0.25)",
                display: "flex",
                alignItems: "center",
                gap: "0.8rem"
              }}
            >
              <i className="ri-add-line" style={{ fontSize: "1.6rem" }}></i>
              Request Prayer
            </button>
          ) : (
            <Link
              href="/login"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                color: "var(--light-color)",
                border: "1px solid var(--transparent-light-color)",
                padding: "1rem 2.2rem",
                borderRadius: "30px",
                fontWeight: "600",
                fontSize: "1.3rem",
                textDecoration: "none"
              }}
            >
              Sign In to Request Prayer
            </Link>
          )}
        </div>

        {/* Prayers Feed list */}
        {isLoading ? (
          <div 
            style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
              gap: "2.5rem" 
            }}
          >
            {[1, 2, 3].map(n => (
              <div key={n} className="pinned-note" style={{ padding: "2.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="shimmer" style={{ width: "200px", height: "1.8rem", borderRadius: "4px" }}></div>
                  <div className="shimmer" style={{ width: "100%", height: "1.2rem", borderRadius: "4px" }}></div>
                  <div className="shimmer" style={{ width: "80%", height: "1.2rem", borderRadius: "4px" }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : prayers.length === 0 ? (
          <div style={{
            textAlign: "center",
            padding: "8rem 2rem",
            background: "var(--secondary-background-color)",
            borderRadius: "12px",
            border: "1px solid var(--transparent-light-color)",
            color: "var(--light-color-alt)"
          }}>
            <i className={`${activeTab === "active" ? "ri-chat-heart-line" : "ri-rainbow-line"}`} style={{ fontSize: "5rem", display: "block", marginBottom: "1.5rem", opacity: 0.7 }}></i>
            <p style={{ fontSize: "1.6rem", marginBottom: "1.5rem" }}>
              {activeTab === "active" 
                ? "No prayer requests listed currently. Be the first to reach out!" 
                : "No answered prayers posted yet. We await God's faithful testimonies."}
            </p>
            {activeTab === "active" && currentUser && (
              <button 
                onClick={() => setShowCreateModal(true)}
                style={{ background: "var(--accent-color)", color: "#131417", border: "none", padding: "1rem 2rem", borderRadius: "30px", fontWeight: "700", cursor: "pointer" }}
              >
                Share First Request
              </button>
            )}
          </div>
        ) : (
          <div>
            <div 
              style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", 
                gap: "2.5rem",
                alignItems: "start"
              }}
            >
              {prayers.map((prayer, idx) => {
                const isOwner = currentUser && currentUser.id === prayer.user_id;
                // Generate minor alternating organic tilts
                const tiltAngle = (idx % 2 === 0 ? 0.6 : -0.6) * (idx % 3 === 0 ? 1 : 0.5);

                return (
                  <div 
                    key={prayer.id}
                    className={`pinned-note ${prayer.status === "answered" ? "praise-report" : "active-request"}`}
                    style={{
                      "--tilt": `${tiltAngle}deg`,
                      transform: `rotate(${tiltAngle}deg)`
                    }}
                  >
                    {/* Circular pushpin at the top center */}
                    <div className={`pinned-note-pushpin ${prayer.status === "answered" ? "praise-pin" : "active-pin"}`} />

                    {/* Card Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: "1.7rem", fontWeight: "700", color: "var(--light-color)", marginBottom: "0.4rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {prayer.title}
                        </h3>
                        <span style={{ fontSize: "1.15rem", color: "var(--light-color-alt)" }}>
                          By {prayer.author} &bull; {prayer.date}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <p style={{
                      fontSize: "1.35rem",
                      lineHeight: "1.6",
                      color: "var(--light-color-alt)",
                      whiteSpace: "pre-line",
                      marginBlock: "0.5rem"
                    }}>
                      {prayer.content}
                    </p>

                    {/* Praise Report Header (if answered) */}
                    {prayer.status === "answered" && (
                      <div style={{
                        background: "rgba(167, 103, 229, 0.08)",
                        border: "1px dashed rgba(167, 103, 229, 0.3)",
                        borderRadius: "8px",
                        padding: "1.2rem",
                        marginTop: "0.5rem"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#c893f9", fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.5rem" }}>
                          <i className="ri-star-smile-fill"></i>
                          <span>PRAISE REPORT</span>
                        </div>
                        <p style={{ fontSize: "1.25rem", fontStyle: "italic", color: "var(--light-color-alt)", lineHeight: "1.5" }}>
                          {prayer.testimonyContent || "Answered! Thank you for standing in prayer with us."}
                        </p>
                      </div>
                    )}

                    {/* Card Actions */}
                    <div className="prayer-card-actions" style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid var(--transparent-light-color)" }}>
                      <div className="prayer-card-actions-group" style={{ display: "flex", flexWrap: "wrap", gap: "0.8rem", width: "100%" }}>
                        {/* Support Button */}
                        <button
                          onClick={() => handleSupport(prayer.id)}
                          className={`prayer-card-btn prayer-card-btn-support ${prayer.isSupportedByUser ? "active" : ""}`}
                          style={{ fontSize: "1.2rem", padding: "0.6rem 1.2rem" }}
                        >
                          <i className={prayer.isSupportedByUser ? "ri-hand-heart-fill" : "ri-hand-heart-line"} style={{ fontSize: "1.3rem" }}></i>
                          <span>{prayer.isSupportedByUser ? "Praying" : "Pray"}</span>
                          {prayer.supportCount > 0 && (
                            <span className="prayer-card-badge">
                              {prayer.supportCount}
                            </span>
                          )}
                        </button>

                        {/* Encourage Comment Button */}
                        <button
                          onClick={() => toggleEncouragementThread(prayer.id)}
                          className={`prayer-card-btn prayer-card-btn-encourage ${expandedPrayerId === prayer.id ? "active" : ""}`}
                          style={{ fontSize: "1.2rem", padding: "0.6rem 1.2rem" }}
                        >
                          <i className="ri-chat-smile-3-line" style={{ fontSize: "1.3rem" }}></i>
                          <span>Encourage</span>
                          {prayer.encouragementCount > 0 && (
                            <span className="prayer-card-badge">
                              {prayer.encouragementCount}
                            </span>
                          )}
                        </button>

                        {/* Owner Answered Actions */}
                        {isOwner && prayer.status === "active" && (
                          <button
                            onClick={() => setAnsweredPrayerId(prayer.id)}
                            className="prayer-card-btn prayer-card-btn-answered"
                            style={{ fontSize: "1.2rem", padding: "0.6rem 1.2rem", marginLeft: "auto" }}
                          >
                            <i className="ri-checkbox-circle-line" style={{ fontSize: "1.3rem" }}></i>
                            <span>Answered</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pinned Thread Panel */}
                    {expandedPrayerId === prayer.id && (
                      <div style={{
                        marginTop: "1.5rem",
                        paddingTop: "1.5rem",
                        borderTop: "1px dashed var(--transparent-light-color)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.2rem"
                      }}>
                        <h4 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#12bcfe", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <i className="ri-heart-line"></i> Encouragements
                        </h4>
                        
                        {loadingEncouragements ? (
                          <div style={{ color: "var(--light-color-alt)", fontSize: "1.1rem", paddingBlock: "0.5rem" }}>
                            Loading...
                          </div>
                        ) : encouragements.length === 0 ? (
                          <div style={{ color: "var(--light-color-alt)", fontSize: "1.1rem", fontStyle: "italic", paddingBlock: "0.5rem" }}>
                            No messages yet.
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", maxOpacity: 0.9, maxHeight: "150px", overflowY: "auto" }}>
                            {encouragements.map((enc) => (
                              <div 
                                key={enc.id} 
                                style={{ 
                                  background: "var(--primary-background-color)", 
                                  padding: "1rem", 
                                  borderRadius: "6px", 
                                  border: "1px solid var(--transparent-light-color)"
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "1rem" }}>
                                  <span style={{ fontWeight: "700", color: "var(--light-color)" }}>{enc.authorName}</span>
                                  <span style={{ color: "var(--light-color-alt)" }}>{enc.date}</span>
                                </div>
                                <p style={{ fontSize: "1.15rem", lineHeight: "1.4", color: "var(--light-color-alt)", whiteSpace: "pre-wrap" }}>
                                  {enc.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Encouragement Form */}
                        {currentUser ? (
                          <form onSubmit={handleSubmitEncouragement} style={{ display: "flex", gap: "0.6rem", marginTop: "0.2rem" }}>
                            <input
                              type="text"
                              placeholder="Comfort or scripture..."
                              value={newEncouragementText}
                              onChange={(e) => setNewEncouragementText(e.target.value)}
                              style={{
                                flex: 1,
                                background: "var(--primary-background-color)",
                                color: "var(--light-color)",
                                border: "1px solid var(--transparent-light-color)",
                                borderRadius: "20px",
                                padding: "0.6rem 1.2rem",
                                fontSize: "1.15rem",
                                outline: "none"
                              }}
                            />
                            <button
                              type="submit"
                              style={{
                                background: "var(--accent-color)",
                                color: "#131417",
                                border: "none",
                                borderRadius: "20px",
                                padding: "0.6rem 1.2rem",
                                fontWeight: "700",
                                fontSize: "1.15rem",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.2rem"
                              }}
                            >
                              <i className="ri-send-plane-fill"></i>
                            </button>
                          </form>
                        ) : (
                          <p style={{ fontSize: "1.1rem", color: "var(--light-color-alt)", fontStyle: "italic", textAlign: "center" }}>
                            <Link href="/login" style={{ color: "var(--accent-color)", textDecoration: "underline" }}>Log in</Link> to encourage.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: "4rem" }}>
                <button
                  onClick={loadMorePrayers}
                  disabled={loadingMore}
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "var(--light-color)",
                    border: "1px solid var(--transparent-light-color)",
                    padding: "1.2rem 3.2rem",
                    borderRadius: "30px",
                    fontWeight: "600",
                    fontSize: "1.3rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
                    e.currentTarget.style.borderColor = "var(--light-color-alt)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                    e.currentTarget.style.borderColor = "var(--transparent-light-color)";
                  }}
                >
                  {loadingMore ? (
                    <>
                      <span className="shimmer" style={{ width: "1.4rem", height: "1.4rem", borderRadius: "50%", display: "inline-block" }}></span>
                      <span>Loading...</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-arrow-down-double-line"></i>
                      <span>Load More Prayers</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Modal: Create Prayer Request */}
        {showCreateModal && (
          <div className="drawer-backdrop" onClick={(e) => {
            if (e.target.classList.contains("drawer-backdrop")) setShowCreateModal(false);
          }}>
            <div className="drawer-content" style={{ maxWidth: "550px", padding: "3.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
                <h3 style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--light-color)" }}>Request Prayer</h3>
                <button onClick={() => setShowCreateModal(false)} style={{ cursor: "pointer", background: "none", border: "none", color: "var(--light-color-alt)" }}>
                  <i className="ri-close-line" style={{ fontSize: "2.2rem" }}></i>
                </button>
              </div>

              {errorMsg && (
                <div style={{ background: "rgba(255, 94, 98, 0.1)", border: "1px solid rgba(255, 94, 98, 0.2)", padding: "1.2rem", borderRadius: "6px", color: "#ff5e62", fontSize: "1.3rem", marginBottom: "2rem" }}>
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreatePrayer} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="prayer-title" style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>TITLE / SUBJECT</label>
                  <input
                    id="prayer-title"
                    type="text"
                    placeholder="e.g. Strength during exam week"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{
                      background: "var(--primary-background-color)",
                      color: "var(--light-color)",
                      border: "1px solid var(--transparent-light-color)",
                      borderRadius: "6px",
                      padding: "1.2rem",
                      fontSize: "1.4rem",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="prayer-content" style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>PRAYER DETAILS</label>
                  <textarea
                    id="prayer-content"
                    rows="5"
                    placeholder="Share what is on your heart. Let us know how we can pray..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    style={{
                      background: "var(--primary-background-color)",
                      color: "var(--light-color)",
                      border: "1px solid var(--transparent-light-color)",
                      borderRadius: "6px",
                      padding: "1.2rem",
                      fontSize: "1.4rem",
                      outline: "none",
                      resize: "vertical"
                    }}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <input
                    id="anonymous-check"
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    style={{ width: "1.8rem", height: "1.8rem", cursor: "pointer" }}
                  />
                  <label htmlFor="anonymous-check" style={{ fontSize: "1.3rem", color: "var(--light-color-alt)", cursor: "pointer", userSelect: "none" }}>
                    Post request anonymously
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: "var(--accent-color)",
                    color: "#131417",
                    border: "none",
                    padding: "1.2rem",
                    borderRadius: "30px",
                    fontSize: "1.4rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    marginTop: "1rem"
                  }}
                >
                  {isSubmitting ? "Submitting..." : "Submit Prayer Request"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Mark Answered & Create Testimony */}
        {answeredPrayerId && (
          <div className="drawer-backdrop" onClick={(e) => {
            if (e.target.classList.contains("drawer-backdrop")) setAnsweredPrayerId(null);
          }}>
            <div className="drawer-content" style={{ maxWidth: "550px", padding: "3.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
                <h3 style={{ fontSize: "1.8rem", fontWeight: "700", color: "#a767e5" }}>
                  <i className="ri-rainbow-line" style={{ marginRight: "0.8rem" }}></i>
                  Share Praise Report
                </h3>
                <button onClick={() => setAnsweredPrayerId(null)} style={{ cursor: "pointer", background: "none", border: "none", color: "var(--light-color-alt)" }}>
                  <i className="ri-close-line" style={{ fontSize: "2.2rem" }}></i>
                </button>
              </div>

              <p style={{ fontSize: "1.35rem", color: "var(--light-color-alt)", lineHeight: "1.6", marginBottom: "2rem" }}>
                Praise God! Share how this prayer request was answered to inspire and encourage others in our community feed.
              </p>

              <form onSubmit={handleAnswerSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="testimony-title" style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>TESTIMONY TITLE</label>
                  <input
                    id="testimony-title"
                    type="text"
                    placeholder="e.g. God provided right on time!"
                    value={testimonyTitle}
                    onChange={(e) => setTestimonyTitle(e.target.value)}
                    style={{
                      background: "var(--primary-background-color)",
                      color: "var(--light-color)",
                      border: "1px solid var(--transparent-light-color)",
                      borderRadius: "6px",
                      padding: "1.2rem",
                      fontSize: "1.4rem",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label htmlFor="testimony-content" style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>TESTIMONY STORY</label>
                  <textarea
                    id="testimony-content"
                    rows="5"
                    placeholder="Describe how God answered this prayer request..."
                    value={testimonyContent}
                    onChange={(e) => setTestimonyContent(e.target.value)}
                    style={{
                      background: "var(--primary-background-color)",
                      color: "var(--light-color)",
                      border: "1px solid var(--transparent-light-color)",
                      borderRadius: "6px",
                      padding: "1.2rem",
                      fontSize: "1.4rem",
                      outline: "none",
                      resize: "vertical"
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAnswering}
                  style={{
                    background: "linear-gradient(45deg, #a767e5, #12bcfe)",
                    color: "white",
                    border: "none",
                    padding: "1.2rem",
                    borderRadius: "30px",
                    fontSize: "1.4rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    marginTop: "1.5rem"
                  }}
                >
                  {isAnswering ? "Submitting..." : "Post Testimony & Mark Answered"}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
