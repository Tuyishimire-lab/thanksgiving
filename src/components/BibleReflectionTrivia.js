"use client";

import { useState, useCallback, useSyncExternalStore } from "react";

const TRIVIA_EVENT = "praisepage-trivia-set-change";
const EMPTY_ANSWERS = Object.freeze({});
const snapshotCache = new Map();
const memoryAnswersCache = new Map();

function subscribeTrivia(callback) {
  window.addEventListener("storage", callback);
  window.addEventListener(TRIVIA_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(TRIVIA_EVENT, callback);
  };
}

function getTriviaServerSnapshot() {
  return EMPTY_ANSWERS;
}

function readTriviaSetSnapshot(storageKey) {
  let raw = null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    raw = null;
  }

  if (raw === null) {
    return memoryAnswersCache.get(storageKey) || EMPTY_ANSWERS;
  }

  const cached = snapshotCache.get(storageKey);
  if (cached && cached.raw === raw) {
    return cached.value;
  }

  try {
    const parsed = JSON.parse(raw);
    const value =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : EMPTY_ANSWERS;
    snapshotCache.set(storageKey, { raw, value });
    return value;
  } catch {
    snapshotCache.set(storageKey, { raw, value: EMPTY_ANSWERS });
    return EMPTY_ANSWERS;
  }
}

function getQuestionKey(q, idx) {
  return q?.id !== undefined && q?.id !== null ? String(q.id) : String(idx);
}

function getSavedChoice(savedAnswers, q, idx) {
  const key = getQuestionKey(q, idx);
  const rawVal = savedAnswers[key] ?? savedAnswers[String(idx)];
  if (typeof rawVal !== "number" || !Number.isInteger(rawVal)) return null;
  if (!q?.options || rawVal < 0 || rawVal >= q.options.length) return null;
  return rawVal;
}

export default function BibleReflectionTrivia({ dailyQuestions = [], todayKey = "" }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const storageKey = todayKey ? `trivia_set_${todayKey}` : "trivia_set_default";

  const getSnapshot = useCallback(
    () => readTriviaSetSnapshot(storageKey),
    [storageKey]
  );

  const savedAnswers = useSyncExternalStore(
    subscribeTrivia,
    getSnapshot,
    getTriviaServerSnapshot
  );

  const total = Array.isArray(dailyQuestions) ? dailyQuestions.length : 0;

  if (total === 0) {
    return (
      <div className="home-quiz-card">
        <div className="home-quiz-header">
          <span>Daily Scripture Quiz</span>
          <i className="ri-question-line" aria-hidden="true"></i>
        </div>
        <p style={{ fontSize: "1.35rem", color: "var(--home-text-muted, var(--light-color-alt))", margin: "auto 0" }}>
          Today&apos;s scripture quiz will be available shortly.
        </p>
      </div>
    );
  }

  const safeIdx = Math.min(Math.max(activeIdx, 0), total - 1);
  const currentQuestion = dailyQuestions[safeIdx];

  const choices = dailyQuestions.map((q, idx) => getSavedChoice(savedAnswers, q, idx));
  const answeredCount = choices.filter((c) => c !== null).length;
  const correctCount = dailyQuestions.reduce(
    (sum, q, idx) => (choices[idx] === q.answerIndex ? sum + 1 : sum),
    0
  );
  const allAnswered = answeredCount === total;

  const selectedIdx = choices[safeIdx];
  const hasAnswered = selectedIdx !== null;
  const firstUnansweredIdx = choices.findIndex((c) => c === null);

  const handleSelectOption = (optionIdx) => {
    if (hasAnswered) return;

    const qKey = getQuestionKey(currentQuestion, safeIdx);
    const nextAnswers = { ...savedAnswers, [qKey]: optionIdx };
    memoryAnswersCache.set(storageKey, nextAnswers);

    try {
      const serialized = JSON.stringify(nextAnswers);
      localStorage.setItem(storageKey, serialized);
      snapshotCache.set(storageKey, { raw: serialized, value: nextAnswers });
    } catch {
      // Ignore storage write errors in restricted browsing modes
    }
    window.dispatchEvent(new Event(TRIVIA_EVENT));
  };

  const handleNextQuestion = () => {
    if (safeIdx < total - 1) {
      setActiveIdx(safeIdx + 1);
    } else if (firstUnansweredIdx !== -1) {
      setActiveIdx(firstUnansweredIdx);
    }
  };

  const scoreMessage =
    correctCount === total
      ? "Perfect score! Well done in the Word."
      : correctCount >= Math.ceil(total / 2)
        ? "Great effort! Keep growing in Scripture."
        : "Keep exploring God\u2019s Word daily!";

  return (
    <div className="home-quiz-card">
      {/* Card Header */}
      <div className="home-quiz-header">
        <span>Daily Scripture Quiz</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span className="home-quiz-pill">
            Question {safeIdx + 1} of {total} &bull; Score: {correctCount}/{total}
          </span>
          <i className="ri-question-line" aria-hidden="true"></i>
        </div>
      </div>

      {/* Question Stepper Dots */}
      {total > 1 && (
        <div className="home-quiz-dots">
          {dailyQuestions.map((q, idx) => {
            const choice = choices[idx];
            let dotClass = "home-quiz-dot";
            if (choice !== null) {
              dotClass += choice === q.answerIndex ? " correct" : " incorrect";
            }
            if (idx === safeIdx) {
              dotClass += " active";
            }
            return (
              <button
                key={getQuestionKey(q, idx)}
                type="button"
                className={dotClass}
                onClick={() => setActiveIdx(idx)}
                aria-label={`Question ${idx + 1}`}
                aria-current={idx === safeIdx ? "step" : undefined}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Card Question Text */}
      <div className="home-quiz-question">{currentQuestion.question}</div>

      {/* Option Buttons */}
      <div className="home-quiz-options">
        {currentQuestion.options.map((option, idx) => {
          let className = "home-quiz-option";
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
              type="button"
              className={className}
              onClick={() => handleSelectOption(idx)}
              disabled={hasAnswered}
            >
              <span className="home-quiz-letter">
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

      {/* Explanation & Next Action */}
      {hasAnswered && (
        <div className="home-quiz-explanation">
          <div>
            <span
              style={{
                color:
                  selectedIdx === currentQuestion.answerIndex
                    ? "var(--home-emerald, var(--accent-color))"
                    : "#e84c3c",
              }}
            >
              {selectedIdx === currentQuestion.answerIndex ? "Correct Answer" : "Explanation"}
            </span>
            <p>{currentQuestion.explanation}</p>
          </div>

          {!allAnswered && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={handleNextQuestion}
                className="home-quiz-next"
              >
                Next Question &rarr;
              </button>
            </div>
          )}

          {allAnswered && (
            <div className="home-quiz-summary">
              <strong>
                Daily Quiz Complete &bull; {correctCount}/{total}
              </strong>
              <span>{scoreMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
