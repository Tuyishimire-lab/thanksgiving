"use client";

import { useState, useEffect } from "react";
import { posts } from "@/data/posts";
import { getLocalTestimonies, saveTestimony } from "@/data/userState";

const CATEGORIES = ["All", "Gratitude", "Hope", "Love", "Strength", "Patience", "Joy"];

export default function CommunityFeed() {
  const [allPosts, setAllPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [likedPosts, setLikedPosts] = useState({});
  const [formData, setFormData] = useState({ title: "", author: "", content: "", tag: "Gratitude" });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [activeTag, setActiveTag] = useState("All");
  const [visibleCount, setVisibleCount] = useState(6);
  const [selectedPost, setSelectedPost] = useState(null);

  const loadFeed = () => {
    const localPosts = getLocalTestimonies();
    
    // Format static posts to align properties
    const formattedStatic = posts.map(p => {
      let tag = "Gratitude";
      if (p.id === "post1") tag = "Hope";
      return {
        ...p,
        author: "Ju & Vicky",
        tag,
        bodyText: p.content.map(c => c.text).join("\n\n")
      };
    });

    const formattedLocal = localPosts.map(p => ({
      ...p,
      tag: p.tag || "Gratitude",
      bodyText: p.content.map(c => c.text).join("\n\n")
    }));

    // Local posts come first as they are newer, followed by static posts
    setAllPosts([...formattedLocal, ...formattedStatic]);
  };

  useEffect(() => {
    loadFeed();
    
    // Load liked states from localStorage
    if (typeof window !== "undefined") {
      const savedLikes = localStorage.getItem("thanksgiving_likes");
      if (savedLikes) {
        setLikedPosts(JSON.parse(savedLikes));
      }

      // Automatically open the share modal if coming from a share CTA link
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("share") === "true") {
        setShowModal(true);
      }
    }
  }, []);

  // Reset pagination count when active filter tag changes
  useEffect(() => {
    setVisibleCount(6);
  }, [activeTag]);

  const handleLike = (postId, e) => {
    e.stopPropagation(); // Avoid opening the detail modal when liking the card!
    const newLikes = { ...likedPosts };
    newLikes[postId] = !newLikes[postId];
    setLikedPosts(newLikes);
    localStorage.setItem("thanksgiving_likes", JSON.stringify(newLikes));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;
    
    saveTestimony(formData.title, formData.author, formData.content, formData.tag);
    setFormData({ title: "", author: "", content: "", tag: "Gratitude" });
    setFormSubmitted(true);
    
    setTimeout(() => {
      setFormSubmitted(false);
      setShowModal(false);
      loadFeed();
    }, 1500);
  };

  // Filter posts based on active filter category
  const filteredPosts = allPosts.filter(post => {
    if (activeTag === "All") return true;
    return post.tag.toLowerCase() === activeTag.toLowerCase();
  });

  const displayedPosts = filteredPosts.slice(0, visibleCount);

  // Helper render function for custom article elements
  const renderContentItem = (item, idx) => {
    if (item.type === "paragraph") {
      return (
        <p 
          key={idx} 
          style={{ fontSize: "1.55rem", lineHeight: "1.8", color: "var(--light-color-alt)", marginBottom: "2rem" }}
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
            paddingLeft: "2rem", 
            marginBlock: "2.5rem", 
            fontSize: "1.6rem", 
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
        <ul key={idx} style={{ paddingLeft: "2.5rem", marginBottom: "2rem", listStyleType: "disc" }}>
          {item.items.map((li, lIdx) => (
            <li 
              key={lIdx} 
              style={{ fontSize: "1.5rem", lineHeight: "1.8", color: "var(--light-color-alt)", marginBottom: "1rem" }}
              dangerouslySetInnerHTML={{ __html: li }}
            />
          ))}
        </ul>
      );
    }
    return null;
  };

  return (
    <section className="section" style={{ minHeight: "80vh", paddingBlock: "4rem" }}>
      <div className="container" style={{ maxWidth: "1000px" }}>
        
        {/* Feed Header */}
        <div className="feed-header">
          <div>
            <h2 style={{ fontSize: "var(--font-size-lg)", color: "var(--light-color)", marginBottom: "0.5rem" }}>
              Community Feed
            </h2>
            <p style={{ fontSize: "1.4rem", color: "var(--light-color-alt)" }}>
              Testimonies and reflections of God's work.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            style={{
              background: "var(--accent-color)",
              color: "#fff",
              border: "none",
              borderRadius: "30px",
              padding: "1.2rem 2.5rem",
              fontSize: "1.4rem",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.8rem",
              boxShadow: "0 4px 15px rgba(0,0,0,0.15)"
            }}
          >
            <i className="ri-quill-pen-line" style={{ fontSize: "1.8rem" }}></i>
            Post Testimony
          </button>
        </div>

        {/* Tag Filters Row */}
        <div className="feed-filter-row">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`feed-filter-pill ${activeTag === cat ? "active" : ""}`}
              onClick={() => setActiveTag(cat)}
            >
              {cat === "All" ? cat : `#${cat}`}
            </button>
          ))}
        </div>

        {/* Timeline Posts Grid */}
        {displayedPosts.length > 0 ? (
          <div className="feed-grid-layout">
            {displayedPosts.map((post) => {
              const isLiked = !!likedPosts[post.id];
              
              return (
                <div 
                  key={post.id} 
                  className="feed-tile-card"
                  onClick={() => setSelectedPost(post)}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Header Details */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="feed-card-tag">#{post.tag}</span>
                      <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)" }}>{post.readTime}</span>
                    </div>

                    <h4 style={{ 
                      fontSize: "1.6rem", 
                      fontWeight: "700", 
                      color: "var(--light-color)",
                      lineHeight: "1.3",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      marginBlock: "0.3rem"
                    }}>
                      {post.title}
                    </h4>

                    <p style={{ 
                      fontSize: "1.25rem", 
                      lineHeight: "1.5", 
                      color: "var(--light-color-alt)",
                      opacity: 0.85,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {post.excerpt}
                    </p>
                  </div>

                  {/* Footer details */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem", marginBlockStart: "1.5rem" }}>
                    {/* Author Meta */}
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div 
                        className="place-items-center"
                        style={{ 
                          width: "3rem", 
                          height: "3rem", 
                          borderRadius: "50%", 
                          background: "rgba(255,255,255,0.08)",
                          color: "var(--accent-color)",
                          fontWeight: "700",
                          fontSize: "1.2rem",
                          border: "1px solid var(--transparent-light-color)"
                        }}
                      >
                        {post.author.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "1.15rem", fontWeight: "600", color: "var(--light-color)" }}>
                          {post.author}
                        </span>
                        <span style={{ fontSize: "1rem", color: "var(--light-color-alt)" }}>
                          {post.date}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Stats */}
                    <div 
                      style={{ 
                        display: "flex", 
                        gap: "2rem", 
                        borderTop: "1px solid var(--transparent-light-color)", 
                        paddingTop: "1rem",
                        alignItems: "center"
                      }}
                    >
                      <button 
                        onClick={(e) => handleLike(post.id, e)}
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "0.4rem", 
                          color: isLiked ? "#ff5e62" : "var(--light-color-alt)",
                          fontWeight: isLiked ? "700" : "500",
                          fontSize: "1.2rem",
                          cursor: "pointer",
                          background: "transparent",
                          border: "none",
                          outline: "none"
                        }}
                      >
                        <i className={isLiked ? "ri-heart-fill" : "ri-heart-line"} style={{ fontSize: "1.6rem" }}></i>
                        {isLiked ? "Liked" : "Like"}
                      </button>

                      <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)" }}>
                        <i className="ri-chat-3-line" style={{ fontSize: "1.4rem", marginRight: "0.4rem", verticalAlign: "middle" }}></i>
                        Comments (0)
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "6rem 2rem", background: "var(--secondary-background-color)", borderRadius: "12px", border: "1px solid var(--transparent-light-color)", marginBlock: "3rem" }}>
            <i className="ri-chat-3-line" style={{ fontSize: "4.5rem", color: "var(--light-color-alt)", opacity: 0.3, display: "block", marginBottom: "1.5rem" }}></i>
            <h3 style={{ fontSize: "1.8rem", color: "var(--light-color)", marginBottom: "0.5rem" }}>No Testimonies Yet</h3>
            <p style={{ fontSize: "1.3rem", color: "var(--light-color-alt)" }}>Be the first to share your thanksgiving testimony under this category!</p>
          </div>
        )}

        {/* Load More Button */}
        {filteredPosts.length > visibleCount && (
          <button 
            className="load-more-btn"
            onClick={() => setVisibleCount(prev => prev + 6)}
          >
            Load More Testimonies
          </button>
        )}

      </div>

      {/* Submission Modal Popup */}
      {showModal && (
        <div 
          className="modal" 
          style={{ display: "flex", zIndex: "2000" }}
          onClick={(e) => {
            if (e.target.classList.contains("modal")) {
              setShowModal(false);
            }
          }}
        >
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <span className="close-button" onClick={() => setShowModal(false)}>
              &times;
            </span>

            {formSubmitted ? (
              <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
                <div 
                  className="place-items-center" 
                  style={{
                    width: "7rem",
                    height: "7rem",
                    borderRadius: "50%",
                    background: "var(--gradient-color)",
                    color: "#fff",
                    margin: "0 auto 2rem",
                    fontSize: "3.5rem"
                  }}
                >
                  <i className="ri-checkbox-circle-line"></i>
                </div>
                <h3 style={{ fontSize: "2.2rem", color: "var(--light-color)", marginBottom: "1rem" }}>
                  Testimony Published!
                </h3>
                <p style={{ color: "var(--light-color-alt)", fontSize: "1.4rem" }}>
                  Thank you for sharing your story of thanksgiving with the community.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                <h3 style={{ fontSize: "2.2rem", color: "var(--light-color)", marginBottom: "1rem" }}>
                  Share Your Story
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>TITLE</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleFormChange}
                    placeholder="Enter a heading for your testimony..."
                    required
                    style={{
                      border: "2px solid var(--transparent-light-color)",
                      borderRadius: "6px",
                      padding: "1.2rem",
                      background: "var(--primary-background-color)",
                      color: "var(--light-color)",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>YOUR NAME (OPTIONAL)</label>
                  <input
                    type="text"
                    name="author"
                    value={formData.author}
                    onChange={handleFormChange}
                    placeholder="Anonymous"
                    style={{
                      border: "2px solid var(--transparent-light-color)",
                      borderRadius: "6px",
                      padding: "1.2rem",
                      background: "var(--primary-background-color)",
                      color: "var(--light-color)",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>CATEGORY / TOPIC</label>
                  <select
                    name="tag"
                    value={formData.tag}
                    onChange={handleFormChange}
                    style={{
                      border: "2px solid var(--transparent-light-color)",
                      borderRadius: "6px",
                      padding: "1.2rem",
                      background: "var(--primary-background-color)",
                      color: "var(--light-color)",
                      outline: "none",
                      fontSize: "1.3rem",
                      cursor: "pointer"
                    }}
                  >
                    <option value="Gratitude">Gratitude</option>
                    <option value="Hope">Hope</option>
                    <option value="Love">Love</option>
                    <option value="Strength">Strength</option>
                    <option value="Patience">Patience</option>
                    <option value="Joy">Joy</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <label style={{ fontSize: "1.2rem", color: "var(--light-color-alt)", fontWeight: "600" }}>YOUR TESTIMONY / REFLECTION</label>
                  <textarea
                    name="content"
                    value={formData.content}
                    onChange={handleFormChange}
                    placeholder="What did the Lord do in your life today?"
                    required
                    rows="6"
                    style={{
                      border: "2px solid var(--transparent-light-color)",
                      borderRadius: "6px",
                      padding: "1.2rem",
                      background: "var(--primary-background-color)",
                      color: "var(--light-color)",
                      outline: "none",
                      resize: "vertical"
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    background: "var(--accent-color)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "30px",
                    padding: "1.5rem",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    textAlign: "center",
                    marginTop: "1rem"
                  }}
                >
                  Publish to Feed
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Expanded Read Detailed Testimony Modal overlay */}
      {selectedPost && (
        <div 
          className="detail-modal-overlay"
          onClick={() => setSelectedPost(null)}
        >
          <div 
            className="detail-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <span 
              className="close-button" 
              onClick={() => setSelectedPost(null)}
              style={{ top: "2rem", right: "2rem" }}
            >
              &times;
            </span>

            {/* Modal Header details */}
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "3rem" }}>
              <div 
                className="place-items-center"
                style={{ 
                  width: "4.5rem", 
                  height: "4.5rem", 
                  borderRadius: "50%", 
                  background: "rgba(255,255,255,0.08)",
                  color: "var(--accent-color)",
                  fontWeight: "700",
                  fontSize: "1.8rem",
                  border: "1px solid var(--transparent-light-color)"
                }}
              >
                {selectedPost.author.charAt(0).toUpperCase()}
              </div>
              <div>
                <span style={{ display: "block", fontSize: "1.6rem", fontWeight: "600", color: "var(--light-color)" }}>
                  {selectedPost.author}
                </span>
                <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
                  {selectedPost.date} &bull; {selectedPost.readTime}
                </span>
              </div>
            </div>

            {/* Tag Badge */}
            <div style={{ marginBottom: "1.5rem" }}>
              <span className="feed-card-tag">#{selectedPost.tag}</span>
            </div>

            {/* Title */}
            <h2 style={{ fontSize: "2.8rem", color: "var(--light-color)", marginBottom: "2.5rem", lineHeight: "1.3" }}>
              {selectedPost.title}
            </h2>

            {/* Multi-paragraph content */}
            <div style={{ marginBlock: "3rem" }}>
              {selectedPost.content ? (
                selectedPost.content.map((item, idx) => renderContentItem(item, idx))
              ) : (
                <p style={{ fontSize: "1.55rem", lineHeight: "1.8", color: "var(--light-color-alt)" }}>
                  {selectedPost.bodyText}
                </p>
              )}
            </div>

            {/* Like details */}
            <div 
              style={{ 
                display: "flex", 
                gap: "2.5rem", 
                borderTop: "1px solid var(--transparent-light-color)", 
                paddingTop: "2rem",
                alignItems: "center"
              }}
            >
              <button 
                onClick={(e) => handleLike(selectedPost.id, e)}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "0.6rem", 
                  color: likedPosts[selectedPost.id] ? "#ff5e62" : "var(--light-color-alt)",
                  fontWeight: likedPosts[selectedPost.id] ? "700" : "500",
                  fontSize: "1.4rem",
                  cursor: "pointer",
                  background: "transparent",
                  border: "none",
                  outline: "none"
                }}
              >
                <i className={likedPosts[selectedPost.id] ? "ri-heart-fill" : "ri-heart-line"} style={{ fontSize: "2rem" }}></i>
                {likedPosts[selectedPost.id] ? "Liked" : "Like"}
              </button>

              <span style={{ fontSize: "1.3rem", color: "var(--light-color-alt)" }}>
                <i className="ri-chat-3-line" style={{ fontSize: "1.8rem", marginRight: "0.5rem", verticalAlign: "middle" }}></i>
                Comments (0)
              </span>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
