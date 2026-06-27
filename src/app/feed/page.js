"use client";

import { useState, useEffect } from "react";
import { posts } from "@/data/posts";
import { getLocalTestimonies, saveTestimony } from "@/data/userState";

export default function CommunityFeed() {
  const [allPosts, setAllPosts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [likedPosts, setLikedPosts] = useState({});
  const [formData, setFormData] = useState({ title: "", author: "", content: "" });
  const [formSubmitted, setFormSubmitted] = useState(false);

  const loadFeed = () => {
    // Merge static posts from posts.js and user posts from localStorage
    const localPosts = getLocalTestimonies();
    
    // Format static posts to align properties
    const formattedStatic = posts.map(p => ({
      ...p,
      author: "Ju & Vicky",
      // Expose the raw string if text paragraphs exist
      bodyText: p.content.map(c => c.text).join("\n\n")
    }));

    const formattedLocal = localPosts.map(p => ({
      ...p,
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

  const handleLike = (postId) => {
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
    
    saveTestimony(formData.title, formData.author, formData.content);
    setFormData({ title: "", author: "", content: "" });
    setFormSubmitted(true);
    
    setTimeout(() => {
      setFormSubmitted(false);
      setShowModal(false);
      loadFeed();
    }, 1500);
  };

  return (
    <section className="section" style={{ minHeight: "80vh", paddingBlock: "4rem" }}>
      <div className="container" style={{ maxWidth: "800px" }}>
        
        {/* Feed Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4rem" }}>
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

        {/* Timeline Posts */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
          {allPosts.map((post) => {
            const isLiked = !!likedPosts[post.id];
            
            return (
              <article 
                key={post.id} 
                style={{
                  background: "var(--secondary-background-color)",
                  borderRadius: "12px",
                  padding: "3.5rem 3rem",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                  border: "1px solid var(--transparent-light-color)",
                  transition: "background-color 0.25s"
                }}
              >
                {/* Author Metadata */}
                <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginBottom: "2.5rem" }}>
                  <div 
                    className="place-items-center"
                    style={{ 
                      width: "4.5rem", 
                      height: "4.5rem", 
                      borderRadius: "50%", 
                      background: "var(--transparent-light-color)",
                      color: "var(--light-color)",
                      fontWeight: "700",
                      fontSize: "1.6rem"
                    }}
                  >
                    {post.author.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span style={{ display: "block", fontSize: "1.5rem", fontWeight: "600", color: "var(--light-color)" }}>
                      {post.author}
                    </span>
                    <span style={{ fontSize: "1.2rem", color: "var(--light-color-alt)" }}>
                      {post.date} &bull; {post.readTime}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <h3 style={{ fontSize: "2.2rem", color: "var(--light-color)", marginBottom: "1.5rem", lineHeight: "1.3" }}>
                  {post.title}
                </h3>
                
                <div 
                  style={{ 
                    fontSize: "1.5rem", 
                    lineHeight: "1.7", 
                    color: "var(--light-color-alt)", 
                    whiteSpace: "pre-line",
                    marginBottom: "3rem"
                  }}
                  dangerouslySetInnerHTML={{ __html: post.bodyText }}
                />

                {/* Interactive Footer */}
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
                    onClick={() => handleLike(post.id)}
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "0.6rem", 
                      color: isLiked ? "#ff5e62" : "var(--light-color-alt)",
                      fontWeight: isLiked ? "700" : "500",
                      fontSize: "1.4rem",
                      cursor: "pointer"
                    }}
                  >
                    <i className={isLiked ? "ri-heart-fill" : "ri-heart-line"} style={{ fontSize: "2rem" }}></i>
                    {isLiked ? "Liked" : "Like"}
                  </button>

                  <span style={{ fontSize: "1.3rem", color: "var(--light-color-alt)" }}>
                    <i className="ri-chat-3-line" style={{ fontSize: "1.8rem", marginRight: "0.5rem", verticalAlign: "middle" }}></i>
                    Comments (0)
                  </span>
                </div>

              </article>
            );
          })}
        </div>

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
                    placeholder="Enter a heading..."
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

    </section>
  );
}
