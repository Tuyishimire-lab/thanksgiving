"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getMe } from "@/app/actions/authActions";
import { 
  getTestimonies, 
  createTestimony, 
  toggleLikeTestimony, 
  getComments, 
  addComment 
} from "@/app/actions/dbActions";

const CATEGORIES = ["All", "Gratitude", "Hope", "Love", "Strength", "Patience", "Joy"];

export default function CommunityFeed() {
  const router = useRouter();
  const [allPosts, setAllPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [likedPosts, setLikedPosts] = useState({});
  const [formData, setFormData] = useState({ title: "", content: "", tag: "Gratitude" });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [activeTag, setActiveTag] = useState("All");
  const [visibleCount, setVisibleCount] = useState(6);
  const [selectedPost, setSelectedPost] = useState(null);
  
  // Auth and comments state
  const [user, setUser] = useState(null);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState("");

  const loadFeed = async () => {
    const [currentUser, testimonies] = await Promise.all([
      getMe(),
      getTestimonies()
    ]);
    setUser(currentUser);
    setAllPosts(testimonies);

    // Sync liked states
    const initialLikes = {};
    testimonies.forEach(t => {
      if (t.isLikedByUser) {
        initialLikes[t.id] = true;
      }
    });
    setLikedPosts(initialLikes);
  };

  useEffect(() => {
    loadFeed();
    
    // Automatically open the share modal if coming from a share CTA link and logged in
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("share") === "true") {
        getMe().then(u => {
          if (!u) {
            router.push("/login?redirect=/feed?share=true");
          } else {
            setShowModal(true);
            // Immediately clean up URL query parameter so refreshes or back-navigation don't trigger it again
            const url = new URL(window.location.href);
            url.searchParams.delete("share");
            window.history.replaceState(null, "", url.pathname + url.search);
          }
        });
      }
    }
  }, []);

  // Load comments when selected post changes
  useEffect(() => {
    if (selectedPost) {
      loadComments(selectedPost.id);
    } else {
      setComments([]);
      setNewCommentText("");
      setCommentError("");
    }
  }, [selectedPost]);

  const loadComments = async (postId) => {
    const list = await getComments(postId);
    setComments(list);
  };

  // Reset pagination count when active filter tag changes
  useEffect(() => {
    setVisibleCount(6);
  }, [activeTag]);

  const handlePostButtonClick = () => {
    if (!user) {
      router.push("/login?redirect=/feed");
    } else {
      setShowModal(true);
    }
  };

  const handleLike = async (postId, e) => {
    e.stopPropagation(); // Avoid opening the detail modal when liking the card!
    if (!user) {
      router.push("/login?redirect=/feed");
      return;
    }

    const res = await toggleLikeTestimony(postId);
    if (res.error) {
      alert(res.error);
    } else {
      // Update local liked list
      setLikedPosts(prev => ({
        ...prev,
        [postId]: res.isLiked
      }));

      // Update likes count on local post
      setAllPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likesCount: res.isLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1),
            isLikedByUser: res.isLiked
          };
        }
        return post;
      }));

      // Update selected post detail if open
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost(prev => ({
          ...prev,
          likesCount: res.isLiked ? prev.likesCount + 1 : Math.max(0, prev.likesCount - 1),
          isLikedByUser: res.isLiked
        }));
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;
    
    setPostLoading(true);
    setPostError("");

    const res = await createTestimony(formData.title, formData.content, formData.tag);
    if (res.error) {
      setPostError(res.error);
      setPostLoading(false);
    } else {
      setFormData({ title: "", content: "", tag: "Gratitude" });
      setFormSubmitted(true);
      setPostLoading(false);
      
      setTimeout(() => {
        setFormSubmitted(false);
        setShowModal(false);
        loadFeed();
      }, 1500);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }
    if (!newCommentText || newCommentText.trim() === "") return;

    setCommentLoading(true);
    setCommentError("");

    const res = await addComment(selectedPost.id, newCommentText);
    if (res.error) {
      setCommentError(res.error);
    } else {
      setNewCommentText("");
      await loadComments(selectedPost.id);

      // Increment comments count on local feed post
      setAllPosts(prev => prev.map(post => {
        if (post.id === selectedPost.id) {
          return {
            ...post,
            commentsCount: post.commentsCount + 1
          };
        }
        return post;
      }));

      // Increment comments count on open selected post
      setSelectedPost(prev => ({
        ...prev,
        commentsCount: prev.commentsCount + 1
      }));
    }
    setCommentLoading(false);
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
            onClick={handlePostButtonClick}
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
                        {post.likesCount || 0}
                      </button>

                      <span style={{ fontSize: "1.1rem", color: "var(--light-color-alt)" }}>
                        <i className="ri-chat-3-line" style={{ fontSize: "1.4rem", marginRight: "0.4rem", verticalAlign: "middle" }}></i>
                        Comments ({post.commentsCount || 0})
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

                {postError && (
                  <span style={{ color: "#ff5e62", fontSize: "1.3rem" }}>{postError}</span>
                )}

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
                      resize: "none"
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={postLoading}
                  style={{
                    background: "var(--accent-color)",
                    color: "#131417",
                    border: "none",
                    borderRadius: "30px",
                    padding: "1.5rem",
                    fontSize: "1.5rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    textAlign: "center",
                    marginTop: "1rem",
                    opacity: postLoading ? 0.7 : 1
                  }}
                >
                  {postLoading ? "Publishing..." : "Publish to Feed"}
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
            style={{ maxHeight: "90vh", overflowY: "auto" }}
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
                alignItems: "center",
                marginBottom: "2.5rem"
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
                {selectedPost.likesCount || 0}
              </button>

              <span style={{ fontSize: "1.3rem", color: "var(--light-color-alt)" }}>
                <i className="ri-chat-3-line" style={{ fontSize: "1.8rem", marginRight: "0.5rem", verticalAlign: "middle" }}></i>
                Comments ({selectedPost.commentsCount || 0})
              </span>
            </div>

            {/* Comments List Section */}
            <div style={{ borderTop: "1px solid var(--transparent-light-color)", paddingTop: "2rem" }}>
              <h4 style={{ fontSize: "1.6rem", color: "var(--light-color)", marginBottom: "2rem" }}>
                Comments ({comments.length})
              </h4>
              
              {comments.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxHeight: "250px", overflowY: "auto", paddingRight: "1rem", marginBottom: "2rem" }}>
                  {comments.map((comment) => (
                    <div 
                      key={comment.id} 
                      style={{ 
                        background: "rgba(255,255,255,0.02)", 
                        padding: "1.5rem", 
                        borderRadius: "8px",
                        border: "1px solid var(--transparent-light-color)"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.8rem", alignItems: "center" }}>
                        <span style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--light-color)" }}>
                          {comment.author}
                        </span>
                        <span style={{ fontSize: "1rem", color: "var(--light-color-alt)" }}>
                          {comment.date}
                        </span>
                      </div>
                      <p style={{ fontSize: "1.3rem", lineHeight: "1.5", color: "var(--light-color-alt)" }}>
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "1.3rem", color: "var(--light-color-alt)", fontStyle: "italic", marginBottom: "2rem" }}>
                  No comments yet. Be the first to share an encouraging word!
                </p>
              )}

              {/* Add Comment Form */}
              {user ? (
                <form onSubmit={handleCommentSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {commentError && (
                    <span style={{ color: "#ff5e62", fontSize: "1.2rem" }}>{commentError}</span>
                  )}
                  <textarea
                    rows="3"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Write an encouraging comment..."
                    style={{
                      width: "100%",
                      padding: "1.2rem",
                      borderRadius: "6px",
                      background: "var(--primary-background-color)",
                      border: "1px solid var(--transparent-light-color)",
                      color: "var(--light-color)",
                      fontSize: "1.3rem",
                      outline: "none",
                      resize: "none"
                    }}
                  />
                  <button
                    type="submit"
                    disabled={commentLoading || !newCommentText.trim()}
                    style={{
                      alignSelf: "flex-end",
                      background: "var(--accent-color)",
                      color: "#131417",
                      border: "none",
                      borderRadius: "30px",
                      padding: "0.8rem 2.5rem",
                      fontSize: "1.2rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      opacity: (commentLoading || !newCommentText.trim()) ? 0.6 : 1
                    }}
                  >
                    {commentLoading ? "Posting..." : "Comment"}
                  </button>
                </form>
              ) : (
                <div style={{ textAlign: "center", padding: "1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "6px", border: "1px dashed var(--transparent-light-color)" }}>
                  <p style={{ fontSize: "1.3rem", color: "var(--light-color-alt)" }}>
                    Please <Link href="/login" style={{ color: "var(--accent-color)", fontWeight: "600", textDecoration: "underline" }}>Log In</Link> to write a comment.
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
