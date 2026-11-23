"use client";

import { useState, useEffect, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import VerseImageCreator from "@/components/VerseImageCreator";

/**
 * Button trigger + portaled modal wrapper for launching the VerseImageCreator
 * Story Card studio on any verse, quote, testimony, or devotional highlight.
 */
export default function ShareCardTrigger({
  verseText,
  verseTag,
  sharePath = "/",
  initialAspectRatio = "9:16",
  modalTitle = "Share as Story Card",
  label = "Share Card",
  icon = "ri-image-add-line",
  className = "sanc-btn-gold sanc-btn-sm",
  defaultBgId = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const headingId = useId();

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const modalContent =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="study-modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                handleClose();
              }
            }}
          >
            <div className="study-modal-dialog wide">
              <div className="study-modal-header">
                <div className="study-modal-title-group">
                  {verseTag && (
                    <span className="study-modal-eyebrow">{verseTag}</span>
                  )}
                  <h3 id={headingId} className="study-modal-title">
                    {modalTitle}
                  </h3>
                </div>

                <button
                  type="button"
                  className="study-modal-close"
                  onClick={handleClose}
                  aria-label="Close card creator"
                >
                  <i className="ri-close-line" aria-hidden="true" />
                </button>
              </div>

              <div className="study-creator-wrap">
                <VerseImageCreator
                  embedded
                  verseText={verseText}
                  verseTag={verseTag}
                  sharePath={sharePath}
                  initialAspectRatio={initialAspectRatio}
                  modalTitle={modalTitle}
                  defaultBgId={defaultBgId}
                  onClose={handleClose}
                />
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={label ? undefined : modalTitle}
      >
        {icon && <i className={icon} aria-hidden="true" />}
        {label ? <span>{label}</span> : null}
      </button>
      {modalContent}
    </>
  );
}
