"use client";

import { useState, useEffect } from "react";
import { triviaQuestions } from "@/data/triviaQuestions";

export default function BibleReflectionTrivia() {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);

  useEffect(() => {
    // Generate index based on day of year
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    const questionIndex = dayOfYear % triviaQuestions.length;
    const q = triviaQuestions[questionIndex];
    setCurrentQuestion(q);

    // Check localStorage if they already answered today
    const todayKey = `trivia_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
    const savedAnswer = localStorage.getItem(todayKey);
    if (savedAnswer !== null) {
      setSelectedIdx(parseInt(savedAnswer));
      setHasAnswered(true);
    }
  }, []);

  const handleSelectOption = (idx) => {
    if (hasAnswered || !currentQuestion) return;
    
    setSelectedIdx(idx);
    setHasAnswered(true);

    const d = new Date();
    const todayKey = `trivia_${d.getFullYear()}_${d.getMonth()}_${d.getDate()}`;
    localStorage.setItem(todayKey, idx.toString());
  };

  if (!currentQuestion) return null;

  return (
    <div style={{
      background: "linear-gradient(135deg, var(--secondary-background-color) 0%, rgba(255, 255, 255, 0.01) 100%)",
      border: "1px solid var(--transparent-light-color)",
      borderRadius: "16px",
      padding: "2.5rem",
      boxShadow: "0 12px 30px rgba(0, 0, 0, 0.15)",
      position: "relative",
      height: "100%",
      display: "flex",
      flexDirection: "column"
    }}>
      <style dangerouslySetInnerHTML={{__html: `
        .trivia-option {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--transparent-light-color);
          border-radius: 10px;
          padding: 1.2rem 1.6rem;
          color: var(--light-color-alt);
          font-size: 1.3rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.25s ease;
          text-align: left;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .trivia-option:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.08);
          border-color: var(--light-color-alt);
          color: var(--light-color);
          transform: translateX(3px);
        }
        .trivia-option.correct {
          background: rgba(79, 207, 112, 0.12) !important;
          border-color: var(--accent-color) !important;
          color: #4fcf70 !important;
          font-weight: 700;
        }
        .trivia-option.incorrect {
          background: rgba(232, 76, 60, 0.12) !important;
          border-color: #e84c3c !important;
          color: #e84c3c !important;
        }
      `}} />

      {/* Decorative polaroid look pushpin */}
      <div style={{
        position: "absolute",
        top: "-8px",
        left: "24px",
        width: "12px",
        height: "12px",
        borderRadius: "50%",
        background: "radial-gradient(circle, #ff6b6b 30%, #e84c3c 70%, #8b0000 100%)",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.3)"
      }} />

      <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", color: "var(--accent-color)", fontWeight: "700", fontSize: "1.2rem", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "1rem" }}>
        <i className="ri-question-line" style={{ fontSize: "1.6rem" }}></i>
        <span>Daily Scripture Quiz</span>
      </div>

      <h3 style={{
        fontSize: "1.7rem",
        fontWeight: "700",
        lineHeight: "1.4",
        color: "var(--light-color)",
        marginBottom: "2rem"
      }}>
        {currentQuestion.question}
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {currentQuestion.options.map((option, idx) => {
          let className = "trivia-option";
          if (hasAnswered) {
            if (idx === currentQuestion.answerIndex) {
              className += " correct";
            } else if (idx === selectedIdx) {
              className += " incorrect";
            }
          }

          return (
            <button
              key={idx}
              className={className}
              onClick={() => handleSelectOption(idx)}
              disabled={hasAnswered}
            >
              <span style={{
                width: "2.2rem",
                height: "2.2rem",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.05)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
                fontWeight: "700",
                color: "inherit"
              }}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span>{option}</span>
              {hasAnswered && idx === currentQuestion.answerIndex && (
                <i className="ri-checkbox-circle-fill" style={{ marginLeft: "auto", fontSize: "1.6rem" }}></i>
              )}
              {hasAnswered && idx === selectedIdx && idx !== currentQuestion.answerIndex && (
                <i className="ri-close-circle-fill" style={{ marginLeft: "auto", fontSize: "1.6rem" }}></i>
              )}
            </button>
          );
        })}
      </div>

      {hasAnswered && (
        <div style={{
          marginTop: "auto",
          paddingTop: "1.5rem",
          marginTop: "2rem",
          borderRadius: "10px",
          background: "rgba(255, 255, 255, 0.02)",
          border: "1px dashed var(--transparent-light-color)",
          animation: "fadeIn 0.3s ease"
        }}>
          <span style={{
            fontSize: "1.2rem",
            fontWeight: "700",
            color: selectedIdx === currentQuestion.answerIndex ? "var(--accent-color)" : "#e84c3c",
            display: "block",
            marginBottom: "0.5rem"
          }}>
            {selectedIdx === currentQuestion.answerIndex ? "🎉 Correct!" : "✨ Explanation:"}
          </span>
          <p style={{
            fontSize: "1.25rem",
            lineHeight: "1.5",
            color: "var(--light-color-alt)",
            margin: 0
          }}>
            {currentQuestion.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
