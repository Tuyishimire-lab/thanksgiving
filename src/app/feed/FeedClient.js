"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getMe } from "@/app/actions/authActions";
import {
  getTestimonies,
  createTestimony,
  toggleLikeTestimony,
  getComments,
  addComment,
} from "@/app/actions/dbActions";
import {
  TestimonyReaderModal,
  ShareTestimonyModal,
} from "@/components/feed/TestimonyModals";

const CATEGORIES = ["All", "Gratitude", "Hope", "Love", "Strength", "Patience", "Joy"];

function subscribeNoop() {
  return () => {};
}

function buildLikedMap(posts) {
  const initialLikes = {};
  if (Array.isArray(posts)) {
    posts.forEach((t) => {
      if (t.isLikedByUser) {
        initialLikes[t.id] = true;
      }
    });
  }
  return initialLikes;
}

export default function FeedClient({
  initialUser = null,
  initialPosts = [],
  initialPostId = null,
  initialShare = false,
}) {
  const router = useRouter();
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  const [allPosts, setAllPosts] = useState(initialPosts);
  const [showModal, setShowModal] = useState(() => Boolean(initialShare && initialUser));
  const [likedPosts, setLikedPosts] = useState(() => buildLikedMap(initialPosts));
  const [formData, setFormData] = useState({ title: "", content: "", tag: "Gratitude" });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [activeTag, setActiveTag] = useState("All");
  const [visibleCount, setVisibleCount] = useState(6);
  const [selectedPost, setSelectedPost] = useState(() =>
    initialPostId ? initialPosts.find((post) => post.id === initialPostId) || null : null
  );
  const [prevInitialPostId, setPrevInitialPostId] = useState(initialPostId);
  const [prevInitialShare, setPrevInitialShare] = useState(initialShare);

  // Auth, inline feedback, and comments state
  const [user, setUser] = useState(initialUser);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(() =>
    Boolean(initialPostId && initialPosts.some((post) => post.id === initialPostId))
  );
  const [newCommentText, setNewCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [postLoading, setPostLoading] = useState(false);
  const [postError, setPostError] = useState("");
  const [feedAlert, setFeedAlert] = useState(null);

  const alertTimerRef = useRef(null);
  const submitTimerRef = useRef(null);
  const focusTimerRef = useRef(null);

  const showTimedFeedAlert = (nextAlert) => {
    setFeedAlert(nextAlert);
    if (alertTimerRef.current) {
      clearTimeout(alertTimerRef.current);
    }
    alertTimerRef.current = setTimeout(() => {
      setFeedAlert(null);
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    };
  }, []);

  // Sync URL-derived props when navigating while already mounted on /feed
  if (initialPostId !== prevInitialPostId) {
    setPrevInitialPostId(initialPostId);
    if (initialPostId) {
      const found = allPosts.find((post) => post.id === initialPostId);
      if (found) {
        setComments([]);
        setCommentsLoading(true);
        setNewCommentText("");
        setCommentError("");
        setSelectedPost(found);
      }
    }
  }

  if (initialShare !== prevInitialShare) {
    setPrevInitialShare(initialShare);
    if (initialShare && user) {
      setShowModal(true);
    }
  }

  const openPostModal = (post) => {
    setComments([]);
    setCommentsLoading(true);
    setNewCommentText("");
    setCommentError("");
    setSelectedPost(post);
  };

  const closePostModal = () => {
    setSelectedPost(null);
    setComments([]);
    setCommentsLoading(false);
    setNewCommentText("");
    setCommentError("");
  };

  const isAnyModalOpen = showModal || Boolean(selectedPost);

  useEffect(() => {
    if (!isClient || !isAnyModalOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (selectedPost) {
        setSelectedPost(null);
        setComments([]);
        setCommentsLoading(false);
        setNewCommentText("");
        setCommentError("");
      } else if (showModal) {
        setShowModal(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isClient, isAnyModalOpen, selectedPost, showModal]);

  const refreshFeed = async () => {
    const [currentUser, testimonies] = await Promise.all([getMe(), getTestimonies()]);
    setUser(currentUser);
    setAllPosts(testimonies);
    setLikedPosts(buildLikedMap(testimonies));
  };

  // Clean ?post= / ?share=true query params and redirect unauthenticated share intents
  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    let changed = false;

    if (url.searchParams.has("post")) {
      url.searchParams.delete("post");
      changed = true;
    }

    if (url.searchParams.get("share") === "true") {
      if (!user) {
        router.push("/login?redirect=/feed?share=true");
        return;
      }
      url.searchParams.delete("share");
      changed = true;
    }

    if (changed) {
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, [initialPostId, initialShare, router, user]);

  // Load comments when selected post changes
  const selectedPostId = selectedPost?.id ?? null;
  useEffect(() => {
    if (!selectedPostId) return;

    let active = true;
    async function fetchComments() {
      try {
        const list = await getComments(selectedPostId);
        if (active) setComments(list);
      } catch (err) {
        console.error("Failed to load comments:", err);
      } finally {
        if (active) setCommentsLoading(false);
      }
    }
    fetchComments();

    return () => {
      active = false;
    };
  }, [selectedPostId]);

  const handlePostButtonClick = () => {
    if (!user) {
      router.push("/login?redirect=/feed");
    } else {
      setPostError("");
      setShowModal(true);
    }
  };

  const handleLike = async (postId, e) => {
    e.stopPropagation();
    if (!user) {
      router.push("/login?redirect=/feed");
      return;
    }

    const res = await toggleLikeTestimony(postId);
    if (res.error) {
      showTimedFeedAlert({ type: "error", text: res.error });
    } else {
      setLikedPosts((prev) => ({
        ...prev,
        [postId]: res.isLiked,
      }));

      setAllPosts((prev) =>
        prev.map((post) => {
          if (post.id === postId) {
            return {
              ...post,
              likesCount: res.isLiked
                ? post.likesCount + 1
                : Math.max(0, post.likesCount - 1),
              isLikedByUser: res.isLiked,
            };
          }
          return post;
        })
      );

      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev) => ({
          ...prev,
          likesCount: res.isLiked
            ? prev.likesCount + 1
            : Math.max(0, prev.likesCount - 1),
          isLikedByUser: res.isLiked,
        }));
      }
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const insertFormatting = (before, after) => {
    const textarea = document.getElementById("testimony-textarea");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    const replacement = before + selected + after;

    const newContent = text.substring(0, start) + replacement + text.substring(end);
    setFormData((prev) => ({
      ...prev,
      content: newContent,
    }));

    if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
    focusTimerRef.current = setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length
      );
    }, 0);
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
      router.refresh();

      if (submitTimerRef.current) clearTimeout(submitTimerRef.current);
      submitTimerRef.current = setTimeout(() => {
        setFormSubmitted(false);
        setShowModal(false);
        refreshFeed();
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
      const list = await getComments(selectedPost.id);
      setComments(list);

      setAllPosts((prev) =>
        prev.map((post) => {
          if (post.id === selectedPost.id) {
            return {
              ...post,
              commentsCount: post.commentsCount + 1,
            };
          }
          return post;
        })
      );

      setSelectedPost((prev) => ({
        ...prev,
        commentsCount: prev.commentsCount + 1,
      }));
    }
    setCommentLoading(false);
  };

  // Filter posts based on active filter category
  const filteredPosts = allPosts.filter((post) => {
    if (activeTag === "All") return true;
    return (post.tag || "").toLowerCase() === activeTag.toLowerCase();
  });

  const displayedPosts = filteredPosts.slice(0, visibleCount);

  return (
    <section className="sanc-page">
      <div className="sanc-container-md">
        {/* Feed Header */}
        <header className="sanc-hero sanc-hero-row">
          <div>
            <span className="sanc-eyebrow">Stories of Grace</span>
            <h1 className="sanc-title">
              Community <span className="sanc-title-accent">Feed</span>
            </h1>
            <p className="sanc-subtitle">
              Testimonies and reflections of God&apos;s faithfulness across our community.
            </p>
          </div>

          <button
            type="button"
            className="sanc-btn-primary"
            onClick={handlePostButtonClick}
          >
            <i className="ri-quill-pen-line" aria-hidden="true"></i>
            Post Testimony
          </button>
        </header>

        {/* Tag Filters Row */}
        <div
          className="sanc-filter-row"
          role="group"
          aria-label="Filter testimonies by topic"
          style={{ marginBottom: "2.8rem" }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={activeTag === cat}
              className={`sanc-pill ${activeTag === cat ? "active" : ""}`}
              onClick={() => {
                setActiveTag(cat);
                setVisibleCount(6);
              }}
            >
              {cat === "All" ? cat : `#${cat}`}
            </button>
          ))}
        </div>

        {/* Inline Feedback Alert */}
        {feedAlert && (
          <div
            className={`sanc-alert ${feedAlert.type}`}
            role="alert"
            style={{
              marginBottom: "2.4rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <span>{feedAlert.text}</span>
            <button
              type="button"
              className="sanc-btn-ghost sanc-btn-sm"
              aria-label="Dismiss notification"
              onClick={() => setFeedAlert(null)}
            >
              <i className="ri-close-line" aria-hidden="true"></i>
            </button>
          </div>
        )}

        {/* Timeline Posts Grid */}
        {displayedPosts.length > 0 ? (
          <div className="sanc-feed-grid">
            {displayedPosts.map((post) => {
              const isLiked = !!likedPosts[post.id];

              return (
                <article
                  key={post.id}
                  className="sanc-card sanc-card-hover sanc-feed-card"
                  onClick={() => openPostModal(post)}
                >
                  <div className="sanc-stack" style={{ gap: "1rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span className="sanc-badge emerald">#{post.tag}</span>
                      <span style={{ fontSize: "1.15rem", color: "var(--sanc-muted)" }}>
                        {post.readTime}
                      </span>
                    </div>

                    <h2 className="sanc-feed-title">{post.title}</h2>
                    <p className="sanc-feed-excerpt">{post.excerpt}</p>
                  </div>

                  <div className="sanc-stack" style={{ gap: "1.2rem", marginTop: "auto" }}>
                    {/* Author Meta */}
                    <div className="sanc-feed-meta">
                      <div className="sanc-avatar" aria-hidden="true">
                        {(post.author || "A").charAt(0).toUpperCase()}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--sanc-text)" }}>
                          {post.author}
                        </span>
                        <span style={{ fontSize: "1.1rem", color: "var(--sanc-muted)" }}>
                          {post.date}
                        </span>
                      </div>
                    </div>

                    {/* Interactive Stats */}
                    <div className="sanc-feed-actions">
                      <button
                        type="button"
                        className={`sanc-like-btn ${isLiked ? "liked" : ""}`}
                        onClick={(e) => handleLike(post.id, e)}
                        aria-pressed={isLiked}
                        aria-label={isLiked ? `Unlike ${post.title}` : `Like ${post.title}`}
                      >
                        <i
                          className={isLiked ? "ri-heart-fill" : "ri-heart-line"}
                          aria-hidden="true"
                        ></i>
                        <span>{post.likesCount || 0}</span>
                      </button>

                      <span
                        style={{
                          fontSize: "1.2rem",
                          color: "var(--sanc-muted)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.4rem",
                        }}
                      >
                        <i className="ri-chat-3-line" aria-hidden="true"></i>
                        Comments ({post.commentsCount || 0})
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="sanc-empty">
            <i
              className="ri-chat-3-line"
              style={{ fontSize: "4.5rem", opacity: 0.45, display: "block", marginBottom: "1.4rem" }}
              aria-hidden="true"
            ></i>
            <h2 style={{ fontSize: "1.9rem", color: "var(--sanc-text)", marginBottom: "0.6rem" }}>
              No Testimonies Yet
            </h2>
            <p style={{ fontSize: "1.4rem", color: "var(--sanc-muted)" }}>
              Be the first to share your thanksgiving testimony under this category!
            </p>
          </div>
        )}

        {/* Load More Button */}
        {filteredPosts.length > visibleCount && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: "3.6rem" }}>
            <button
              type="button"
              className="sanc-btn-secondary"
              onClick={() => setVisibleCount((prev) => prev + 6)}
            >
              Load More Testimonies
            </button>
          </div>
        )}
      </div>

      <ShareTestimonyModal
        isOpen={showModal}
        isClient={isClient}
        formData={formData}
        formSubmitted={formSubmitted}
        postLoading={postLoading}
        postError={postError}
        onClose={() => setShowModal(false)}
        onFormChange={handleFormChange}
        onInsertFormatting={insertFormatting}
        onSubmit={handleFormSubmit}
      />

      <TestimonyReaderModal
        post={selectedPost}
        isClient={isClient}
        isLiked={selectedPost ? Boolean(likedPosts[selectedPost.id]) : false}
        user={user}
        comments={comments}
        commentsLoading={commentsLoading}
        newCommentText={newCommentText}
        commentLoading={commentLoading}
        commentError={commentError}
        onClose={closePostModal}
        onLike={handleLike}
        onCommentTextChange={setNewCommentText}
        onCommentSubmit={handleCommentSubmit}
      />
    </section>
  );
}
