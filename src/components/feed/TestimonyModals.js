"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import {
  getDefaultTestimonyCover,
  shouldBypassNextImageOpt,
} from "@/data/testimonyCovers";
import TestimonyCoverPicker from "./TestimonyCoverPicker";

function sanitizeStoryHtml(html) {
  if (typeof html !== "string") return "";
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, "")
    .replace(/<\/?(?:script|style|iframe|object|embed)\b[^>]*>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`|[^\s>]+)/gi, "")
    .replace(/javascript\s*:/gi, "");
}

function renderStoryContentItem(item, idx) {
  if (!item) return null;
  if (typeof item === "string") {
    return <p key={idx}>{item}</p>;
  }
  if (item.type === "paragraph") {
    return (
      <p
        key={idx}
        dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(item.text || "") }}
      />
    );
  }
  if (item.type === "blockquote") {
    return (
      <blockquote
        key={idx}
        dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(item.text || "") }}
      />
    );
  }
  if (item.type === "list" && Array.isArray(item.items)) {
    return (
      <ul key={idx}>
        {item.items.map((li, lIdx) => (
          <li
            key={lIdx}
            dangerouslySetInnerHTML={{ __html: sanitizeStoryHtml(li || "") }}
          />
        ))}
      </ul>
    );
  }
  return null;
}

function ReaderDialogContent({
  post,
  isLiked,
  user,
  comments,
  commentsLoading,
  newCommentText,
  commentLoading,
  commentError,
  onClose,
  onLike,
  onCommentTextChange,
  onCommentSubmit,
}) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const commentsRef = useRef(null);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const handleBodyScroll = (e) => {
    const el = e.currentTarget;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) {
      setScrollProgress(0);
      return;
    }
    const nextProgress = Math.min(
      100,
      Math.max(0, Math.round((el.scrollTop / maxScroll) * 100))
    );
    setScrollProgress(nextProgress);
  };

  const handleCopyStoryLink = async () => {
    try {
      const shareUrl = `${window.location.origin}/posts/${encodeURIComponent(post.id)}`;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopiedLink(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopiedLink(false);
      }, 2500);
    } catch {
      // Clipboard unavailable in restricted context
    }
  };

  const authorInitial = (post.author || "A").trim().charAt(0).toUpperCase() || "A";
  const commentDisplayCount = Math.max(comments.length, post.commentsCount || 0);
  const coverSrc = post.image || getDefaultTestimonyCover(post.tag);

  return (
    <div
      className="sanc-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="sanc-modal-dialog wide sanc-story-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-post-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Reading Progress Bar */}
        <div className="sanc-story-progress" aria-hidden="true">
          <div
            className="sanc-story-progress-bar"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Sticky Story Header */}
        <div className="sanc-modal-header sanc-story-header">
          <div className="sanc-story-author">
            <div className="sanc-avatar" aria-hidden="true">
              {authorInitial}
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="sanc-story-author-name">{post.author}</div>
              <div className="sanc-story-author-meta">
                <i className="ri-calendar-line" aria-hidden="true"></i>
                <span>{post.date}</span>
                <span>&bull;</span>
                <span>{post.readTime}</span>
              </div>
            </div>
          </div>

          <div className="sanc-story-header-actions">
            <button
              type="button"
              className="sanc-icon-btn"
              onClick={handleCopyStoryLink}
              aria-label={copiedLink ? "Story link copied" : "Copy link to story"}
              title={copiedLink ? "Link copied!" : "Copy story link"}
            >
              <i
                className={copiedLink ? "ri-check-line" : "ri-share-line"}
                style={{ fontSize: "1.7rem", lineHeight: 1 }}
                aria-hidden="true"
              ></i>
            </button>
            <button
              type="button"
              className="sanc-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              <i className="ri-close-line" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        {/* Scrollable Editorial Article + Encouragements */}
        <div className="sanc-modal-body sanc-story-body" onScroll={handleBodyScroll}>
          <article className="sanc-story-article">
            <div className="sanc-story-cover">
              <Image
                src={coverSrc}
                alt={post.title || "Testimony cover"}
                fill
                sizes="(max-width: 768px) 100vw, 660px"
                unoptimized={shouldBypassNextImageOpt(coverSrc)}
              />
              <div className="sanc-story-cover-scrim" aria-hidden="true" />
              <span className="sanc-story-cover-badge">
                <i className="ri-sparkling-line" aria-hidden="true"></i>
                #{post.tag || "Gratitude"}
              </span>
            </div>

            <div className="sanc-story-kicker">
              <span className="sanc-badge emerald">#{post.tag}</span>
              <span>&bull;</span>
              <i className="ri-time-line" aria-hidden="true"></i>
              <span>{post.readTime}</span>
            </div>

            <h2 id="detail-post-title" className="sanc-story-title">
              {post.title}
            </h2>

            <div className="sanc-story-divider" aria-hidden="true" />

            <div className="sanc-prose">
              {Array.isArray(post.content) && post.content.length > 0 ? (
                post.content.map((item, idx) => renderStoryContentItem(item, idx))
              ) : (
                <p style={{ whiteSpace: "pre-wrap" }}>{post.bodyText}</p>
              )}
            </div>

            {/* Engagement Action Strip */}
            <div className="sanc-story-engage">
              <div className="sanc-story-engage-left">
                <button
                  type="button"
                  className={`sanc-like-btn ${isLiked ? "liked" : ""}`}
                  onClick={(e) => onLike(post.id, e)}
                  aria-pressed={Boolean(isLiked)}
                >
                  <i
                    className={isLiked ? "ri-heart-fill" : "ri-heart-line"}
                    aria-hidden="true"
                  ></i>
                  <span>{post.likesCount || 0}</span>
                </button>

                <button
                  type="button"
                  className="sanc-story-action-pill"
                  onClick={() =>
                    commentsRef.current?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                >
                  <i className="ri-chat-3-line" aria-hidden="true"></i>
                  <span>{commentDisplayCount} Comments</span>
                </button>
              </div>

              <div className="sanc-story-engage-right">
                <Link
                  href={`/posts/${encodeURIComponent(post.id)}`}
                  className="sanc-story-action-pill"
                >
                  <i className="ri-article-line" aria-hidden="true"></i>
                  <span>Full Page</span>
                </Link>
                <button
                  type="button"
                  className={`sanc-story-action-pill ${copiedLink ? "copied" : ""}`}
                  onClick={handleCopyStoryLink}
                >
                  <i
                    className={copiedLink ? "ri-check-line" : "ri-link"}
                    aria-hidden="true"
                  ></i>
                  <span>{copiedLink ? "Link Copied!" : "Share Story"}</span>
                </button>
              </div>
            </div>

            {/* Comments & Encouragements */}
            <section className="sanc-story-comments" ref={commentsRef}>
              <div className="sanc-story-comments-head">
                <h3 className="sanc-story-comments-title">
                  <i className="ri-chat-heart-line" aria-hidden="true"></i>
                  Encouragements &amp; Comments
                </h3>
                <span className="sanc-badge gold">{comments.length}</span>
              </div>

              {commentsLoading ? (
                <div className="sanc-story-comments-loading" role="status">
                  <i className="ri-loader-4-line sanc-spin" aria-hidden="true"></i>
                  <span>Loading encouragements...</span>
                </div>
              ) : comments.length > 0 ? (
                <div className="sanc-comment-list">
                  {comments.map((comment) => {
                    const commentInitial =
                      (comment.author || "M").trim().charAt(0).toUpperCase() || "M";
                    return (
                      <div key={comment.id} className="sanc-comment-item">
                        <div className="sanc-comment-row">
                          <div className="sanc-comment-avatar" aria-hidden="true">
                            {commentInitial}
                          </div>
                          <div className="sanc-comment-content">
                            <div className="sanc-comment-meta">
                              <span className="sanc-comment-author">{comment.author}</span>
                              <span className="sanc-comment-date">{comment.date}</span>
                            </div>
                            <p className="sanc-comment-body">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="sanc-story-comments-empty">
                  <i className="ri-chat-smile-2-line" aria-hidden="true"></i>
                  <span>No comments yet. Be the first to share an encouraging word!</span>
                </div>
              )}

              {user ? (
                <form onSubmit={onCommentSubmit} className="sanc-comment-composer">
                  {commentError && (
                    <div className="sanc-alert error" role="alert">
                      {commentError}
                    </div>
                  )}
                  <textarea
                    rows={3}
                    className="sanc-textarea"
                    value={newCommentText}
                    onChange={(e) => onCommentTextChange(e.target.value)}
                    placeholder="Write an encouraging comment..."
                    aria-label="Write an encouraging comment"
                  />
                  <div className="sanc-comment-composer-foot">
                    <span
                      style={{
                        fontSize: "1.22rem",
                        color: "var(--sanc-muted)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.45rem",
                      }}
                    >
                      <i className="ri-heart-line" aria-hidden="true"></i>
                      Offer a gentle word of encouragement
                    </span>
                    <button
                      type="submit"
                      className="sanc-btn-primary sanc-btn-sm"
                      disabled={commentLoading || !newCommentText.trim()}
                    >
                      {commentLoading ? "Posting..." : "Comment"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="sanc-story-guest-cta">
                  <div className="sanc-story-guest-info">
                    <div className="sanc-story-guest-icon" aria-hidden="true">
                      <i className="ri-chat-heart-line"></i>
                    </div>
                    <div>
                      <strong
                        style={{
                          display: "block",
                          fontSize: "1.44rem",
                          color: "var(--sanc-text)",
                          marginBottom: "0.2rem",
                        }}
                      >
                        Join the conversation
                      </strong>
                      <span style={{ fontSize: "1.26rem", color: "var(--sanc-muted)" }}>
                        Log in to leave an encouraging comment on {post.author}&apos;s story.
                      </span>
                    </div>
                  </div>
                  <Link
                    href={`/login?redirect=${encodeURIComponent(`/feed?post=${post.id}`)}`}
                    className="sanc-btn-primary sanc-btn-sm"
                  >
                    Log In to Comment
                  </Link>
                </div>
              )}
            </section>
          </article>
        </div>
      </div>
    </div>
  );
}

export function TestimonyReaderModal({
  post,
  isClient,
  isLiked,
  user,
  comments = [],
  commentsLoading = false,
  newCommentText = "",
  commentLoading = false,
  commentError = "",
  onClose,
  onLike,
  onCommentTextChange,
  onCommentSubmit,
}) {
  if (!isClient || typeof document === "undefined" || !post) return null;

  return createPortal(
    <ReaderDialogContent
      key={post.id}
      post={post}
      isLiked={isLiked}
      user={user}
      comments={comments}
      commentsLoading={commentsLoading}
      newCommentText={newCommentText}
      commentLoading={commentLoading}
      commentError={commentError}
      onClose={onClose}
      onLike={onLike}
      onCommentTextChange={onCommentTextChange}
      onCommentSubmit={onCommentSubmit}
    />,
    document.body
  );
}

export function ShareTestimonyModal({
  isOpen,
  isClient,
  formData,
  formSubmitted,
  postLoading,
  postError,
  pendingUpload = null,
  coverUploadError = "",
  onClose,
  onFormChange,
  onSelectStockCover,
  onCoverUploadReady,
  onClearCoverUpload,
  onCoverUploadError,
  onInsertFormatting,
  onSubmit,
}) {
  if (!isClient || typeof document === "undefined" || !isOpen) return null;

  const words = String(formData?.content || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const readMins = Math.max(1, Math.ceil(words / 200));

  const modalContent = (
    <div
      className="sanc-modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="sanc-modal-dialog wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-story-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sanc-modal-header">
          <div>
            <span className="sanc-eyebrow">Testimony Composer</span>
            <h2 id="share-story-title" className="sanc-modal-title">
              Share Your Story
            </h2>
          </div>
          <button
            type="button"
            className="sanc-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <i className="ri-close-line" aria-hidden="true"></i>
          </button>
        </div>

        <div className="sanc-modal-body">
          {formSubmitted ? (
            <div style={{ textAlign: "center", padding: "3.2rem 1.6rem" }}>
              <div
                className="sanc-stat-icon emerald"
                style={{
                  width: "6.4rem",
                  height: "6.4rem",
                  fontSize: "3.2rem",
                  margin: "0 auto 1.8rem",
                }}
                aria-hidden="true"
              >
                <i className="ri-checkbox-circle-line"></i>
              </div>
              <h3
                style={{
                  fontSize: "2.1rem",
                  color: "var(--sanc-text)",
                  marginBottom: "0.8rem",
                }}
              >
                Testimony Published!
              </h3>
              <p style={{ color: "var(--sanc-muted)", fontSize: "1.4rem", margin: 0 }}>
                Thank you for sharing your story of thanksgiving with the community.
              </p>
            </div>
          ) : (
            <form
              id="share-testimony-form"
              onSubmit={onSubmit}
              className="sanc-stack"
              style={{ gap: "1.8rem" }}
            >
              {postError && (
                <div className="sanc-alert error" role="alert">
                  {postError}
                </div>
              )}

              <div className="sanc-field">
                <label htmlFor="feed-story-title" className="sanc-label">
                  Title
                </label>
                <input
                  id="feed-story-title"
                  type="text"
                  name="title"
                  className="sanc-input"
                  value={formData?.title || ""}
                  onChange={onFormChange}
                  placeholder="Enter a heading for your testimony..."
                  required
                />
              </div>

              <div className="sanc-field">
                <label htmlFor="feed-story-tag" className="sanc-label">
                  Category / Topic
                </label>
                <select
                  id="feed-story-tag"
                  name="tag"
                  className="sanc-select"
                  value={formData?.tag || "Gratitude"}
                  onChange={onFormChange}
                >
                  <option value="Gratitude">Gratitude</option>
                  <option value="Hope">Hope</option>
                  <option value="Love">Love</option>
                  <option value="Strength">Strength</option>
                  <option value="Patience">Patience</option>
                  <option value="Joy">Joy</option>
                </select>
              </div>

              <div className="sanc-field">
                <span className="sanc-label">Story Cover Artwork</span>
                <TestimonyCoverPicker
                  tag={formData?.tag || "Gratitude"}
                  title={formData?.title || ""}
                  selectedCover={formData?.image || ""}
                  pendingUpload={pendingUpload}
                  uploadError={coverUploadError}
                  disabled={postLoading}
                  onSelectStock={onSelectStockCover}
                  onUploadReady={onCoverUploadReady}
                  onClearUpload={onClearCoverUpload}
                  onUploadError={onCoverUploadError}
                />
              </div>

              <div className="sanc-field">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.8rem",
                  }}
                >
                  <label htmlFor="testimony-textarea" className="sanc-label" style={{ margin: 0 }}>
                    Your Testimony / Reflection
                  </label>

                  <div className="sanc-toolbar" role="toolbar" aria-label="Text formatting">
                    <button
                      type="button"
                      className="sanc-toolbar-btn"
                      onClick={() => onInsertFormatting("**", "**")}
                      title="Bold Text"
                      aria-label="Bold"
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      type="button"
                      className="sanc-toolbar-btn"
                      onClick={() => onInsertFormatting("_", "_")}
                      title="Italic Text"
                      aria-label="Italic"
                    >
                      <em>I</em>
                    </button>
                    <button
                      type="button"
                      className="sanc-toolbar-btn"
                      onClick={() => onInsertFormatting("\n> ", "")}
                      title="Block Quote"
                      aria-label="Block quote"
                    >
                      <i className="ri-double-quotes-l" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      className="sanc-toolbar-btn"
                      onClick={() => onInsertFormatting("\n- ", "")}
                      title="Bullet List"
                      aria-label="Bullet list"
                    >
                      <i className="ri-list-unordered" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      className="sanc-toolbar-btn"
                      onClick={() => onInsertFormatting("\n1. ", "")}
                      title="Numbered List"
                      aria-label="Numbered list"
                    >
                      <i className="ri-list-ordered" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>

                <textarea
                  id="testimony-textarea"
                  name="content"
                  className="sanc-textarea"
                  value={formData?.content || ""}
                  onChange={onFormChange}
                  placeholder="What did the Lord do in your life today? (You can use the toolbar above to style your content)"
                  required
                  rows={8}
                />

                <div className="sanc-composer-meta">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                    <i className="ri-quill-pen-line" aria-hidden="true"></i>
                    {words} {words === 1 ? "word" : "words"}
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                    <i className="ri-time-line" aria-hidden="true"></i>
                    ~{readMins} min read
                  </span>
                </div>
              </div>
            </form>
          )}
        </div>

        {!formSubmitted && (
          <div className="sanc-modal-footer">
            <button
              type="button"
              className="sanc-btn-secondary"
              onClick={onClose}
              disabled={postLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="share-testimony-form"
              className="sanc-btn-primary"
              disabled={postLoading}
            >
              {postLoading ? "Publishing..." : "Publish to Feed"}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
