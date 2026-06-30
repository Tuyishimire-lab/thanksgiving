"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getMe } from "@/app/actions/authActions";
import { 
  getPrayers, 
  createPrayer, 
  toggleSupportPrayer, 
  markPrayerAsAnswered 
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

  async function loadData() {
    setIsLoading(true);
    try {
      const user = await getMe();
      setCurrentUser(user);
      const list = await getPrayers();
      setPrayers(list);
    } catch (err) {
      console.error("Error loading prayers:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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
      loadData();
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
      loadData();
    }
  };

  const activePrayers = prayers.filter(p => p.status === "active");
  const answeredPrayers = prayers.filter(p => p.status === "answered");
  const visiblePrayers = activeTab === "active" ? activePrayers : answeredPrayers;

  return (
    <div className="section" style={{ paddingBlock: "6rem 4rem" }}>
      <div className="container" style={{ maxWidth: "900px" }}>
        
        {/* Page Header */}
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h1 style={{ fontSize: "3.2rem", fontWeight: "700", color: "var(--light-color)", marginBottom: "1rem" }}>
            Community <span style={{ color: "var(--accent-color)" }}>Prayer Board</span>
          </h1>
          <p style={{ fontSize: "1.5rem", color: "var(--light-color-alt)", maxWidth: "600px", margin: "0 auto" }}>
            {"Carry one another's burdens, stand in faith together, and celebrate the goodness of God through answered prayers."}
          </p>
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
              Active Requests ({activePrayers.length})
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
              Answered Prayers ({answeredPrayers.length})
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
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {[1, 2, 3].map(n => (
              <div key={n} className="streak-card" style={{ padding: "2.5rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div className="shimmer" style={{ width: "200px", height: "1.8rem", borderRadius: "4px" }}></div>
                  <div className="shimmer" style={{ width: "100%", height: "1.2rem", borderRadius: "4px" }}></div>
                  <div className="shimmer" style={{ width: "80%", height: "1.2rem", borderRadius: "4px" }}></div>
                </div>
              </div>
            ))}
          </div>
        ) : visiblePrayers.length === 0 ? (
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
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {visiblePrayers.map((prayer) => {
              const isOwner = currentUser && currentUser.id === prayer.user_id;
              return (
                <div 
                  key={prayer.id}
                  className="streak-card"
                  style={{
                    background: prayer.status === "answered" ? "linear-gradient(135deg, rgba(167, 103, 229, 0.05), var(--secondary-background-color))" : "var(--secondary-background-color)",
                    borderLeft: prayer.status === "answered" ? "4px solid #a767e5" : "4px solid var(--accent-color)",
                    padding: "3rem",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                    transition: "transform 0.25s",
                    position: "relative"
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <h3 style={{ fontSize: "1.8rem", fontWeight: "700", color: "var(--light-color)", marginBottom: "0.4rem" }}>
                        {prayer.title}
                      </h3>
                      <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
                        By {prayer.author} &bull; {prayer.date}
                      </span>
                    </div>

                    {/* Answered Stamp */}
                    {prayer.status === "answered" && (
                      <span style={{
                        background: "rgba(167, 103, 229, 0.12)",
                        color: "#c893f9",
                        padding: "0.4rem 1.2rem",
                        borderRadius: "30px",
                        fontSize: "1.1rem",
                        fontWeight: "700",
                        letterSpacing: "0.5px"
                      }}>
                        PRAISE REPORT
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <p style={{
                    fontSize: "1.45rem",
                    lineHeight: "1.6",
                    color: "var(--light-color)",
                    whiteSpace: "pre-line"
                  }}>
                    {prayer.content}
                  </p>

                  {/* Card Actions */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid var(--transparent-light-color)",
                    paddingTop: "1.5rem",
                    marginTop: "0.5rem"
                  }}>
                    {/* Support Button */}
                    <button
                      onClick={() => handleSupport(prayer.id)}
                      style={{
                        background: prayer.isSupportedByUser ? "rgba(79, 207, 112, 0.12)" : "rgba(255, 255, 255, 0.03)",
                        border: prayer.isSupportedByUser ? "1px solid rgba(79, 207, 112, 0.3)" : "1px solid var(--transparent-light-color)",
                        padding: "0.6rem 1.5rem",
                        borderRadius: "20px",
                        fontSize: "1.2rem",
                        fontWeight: "600",
                        color: prayer.isSupportedByUser ? "var(--accent-color)" : "var(--light-color)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        transition: "all 0.2s"
                      }}
                    >
                      <i className={prayer.isSupportedByUser ? "ri-hand-heart-fill" : "ri-hand-heart-line"} style={{ fontSize: "1.5rem" }}></i>
                      <span>{prayer.isSupportedByUser ? "Praying" : "Stand in Prayer"}</span>
                      {prayer.supportCount > 0 && (
                        <span style={{
                          background: prayer.isSupportedByUser ? "var(--accent-color)" : "rgba(255, 255, 255, 0.1)",
                          color: prayer.isSupportedByUser ? "#131417" : "var(--light-color)",
                          padding: "0.1rem 0.6rem",
                          borderRadius: "10px",
                          fontSize: "1rem",
                          fontWeight: "700",
                          marginLeft: "0.2rem"
                        }}>
                          {prayer.supportCount}
                        </span>
                      )}
                    </button>

                    {/* Owner Answered Actions */}
                    {isOwner && prayer.status === "active" && (
                      <button
                        onClick={() => setAnsweredPrayerId(prayer.id)}
                        style={{
                          background: "linear-gradient(45deg, rgba(167, 103, 229, 0.15), rgba(18, 188, 254, 0.15))",
                          border: "1px solid rgba(167, 103, 229, 0.3)",
                          color: "#c893f9",
                          padding: "0.6rem 1.5rem",
                          borderRadius: "20px",
                          fontSize: "1.2rem",
                          fontWeight: "600",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          transition: "all 0.2s"
                        }}
                      >
                        <i className="ri-checkbox-circle-line" style={{ fontSize: "1.5rem" }}></i>
                        Mark Answered
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
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
