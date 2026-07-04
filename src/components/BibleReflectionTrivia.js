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
    <div 
      className="verse-of-the-day-card" 
      style={{ 
        height: "100%", 
        display: "flex", 
        flexDirection: "column",
        cursor: "default"
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .trivia-option {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--transparent-light-color);
          border-radius: 8px;
          padding: 0.8rem 1.2rem;
          color: var(--light-color-alt);
          font-size: 1.25rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .trivia-option:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
          border-color: var(--light-color-alt);
          color: var(--light-color);
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

      {/* Card Header (Matches Verse of the Day style exactly) */}
      <div className="verse-of-the-day-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <span>Daily Scripture Quiz</span>
        <i className="ri-question-line" style={{ fontSize: "1.8rem", color: "var(--accent-color)", opacity: 0.8 }}></i>
      </div>

      {/* Card Question Text */}
      <div style={{ margin: "1.2rem 0", fontSize: "1.6rem", fontWeight: "600", lineHeight: "1.4", color: "var(--light-color)" }}>
        {currentQuestion.question}
      </div>

      {/* Option Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginBlockEnd: "1.5rem" }}>
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
                width: "2rem",
                height: "2rem",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.05)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
                fontWeight: "700",
                color: "inherit"
              }}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span>{option}</span>
              {hasAnswered && idx === currentQuestion.answerIndex && (
                <i className="ri-checkbox-circle-fill" style={{ marginLeft: "auto", fontSize: "1.5rem" }}></i>
              )}
              {hasAnswered && idx === selectedIdx && idx !== currentQuestion.answerIndex && (
                <i className="ri-close-circle-fill" style={{ marginLeft: "auto", fontSize: "1.5rem" }}></i>
              )}
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      {hasAnswered && (
        <div style={{
          marginTop: "auto",
          paddingTop: "1rem",
          borderTop: "1px dashed var(--transparent-light-color)",
          animation: "fadeIn 0.3s ease"
        }}>
          <span style={{
            fontSize: "1.1rem",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "1px",
            color: selectedIdx === currentQuestion.answerIndex ? "var(--accent-color)" : "#e84c3c",
            display: "block",
            marginBottom: "0.4rem"
          }}>
            {selectedIdx === currentQuestion.answerIndex ? "Correct Answer" : "Explanation"}
          </span>
          <p style={{
            fontSize: "1.2rem",
            lineHeight: "1.4",
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
