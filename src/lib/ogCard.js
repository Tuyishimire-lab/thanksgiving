import { ImageResponse } from "next/og";
import { stripMarkup, truncateDescription } from "@/lib/seo";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const ACCENT_THEMES = {
  gold: {
    primary: "#d4af37",
    soft: "rgba(212, 175, 55, 0.16)",
    border: "rgba(212, 175, 55, 0.4)",
    text: "#f3d87a",
  },
  emerald: {
    primary: "#34d399",
    soft: "rgba(52, 211, 153, 0.15)",
    border: "rgba(52, 211, 153, 0.38)",
    text: "#6ee7b7",
  },
  amber: {
    primary: "#f59e0b",
    soft: "rgba(245, 158, 11, 0.16)",
    border: "rgba(245, 158, 11, 0.38)",
    text: "#fcd34d",
  },
  sky: {
    primary: "#38bdf8",
    soft: "rgba(56, 189, 248, 0.15)",
    border: "rgba(56, 189, 248, 0.38)",
    text: "#7dd3fc",
  },
};

export const DEFAULT_HOME_OG_CONFIG = {
  eyebrow: "PRAISEPAGE SANCTUARY",
  title: "Daily Gratitude, Scripture & Guided Faith",
  subtitle:
    "Read the Bible freely, build prayer rhythms, explore 17 devotional themes, and share testimonies of God's faithfulness.",
  badge: "Free & Ad-Free",
  footerMeta: "Bible · Devotionals · Testimonies · Prayer Wall",
  accent: "gold",
};

export function createSanctuaryOgResponse({
  eyebrow = "PRAISEPAGE",
  title,
  subtitle = "",
  footerMeta = "",
  badge = "",
  accent = "gold",
  headers = undefined,
} = {}) {
  const theme = ACCENT_THEMES[accent] || ACCENT_THEMES.gold;
  const safeEyebrow =
    (truncateDescription(stripMarkup(eyebrow || "PRAISEPAGE"), 48) || "PRAISEPAGE").toUpperCase();
  const safeTitle =
    truncateDescription(
      stripMarkup(title || DEFAULT_HOME_OG_CONFIG.title),
      96
    ) || DEFAULT_HOME_OG_CONFIG.title;
  const safeSubtitle = truncateDescription(stripMarkup(subtitle || ""), 165);
  const safeFooterMeta =
    truncateDescription(stripMarkup(footerMeta || "Bible · Devotionals · Prayers"), 64) ||
    "Bible · Devotionals · Prayers";
  const safeBadge = truncateDescription(stripMarkup(badge || ""), 36);

  const titleFontSize = safeTitle.length > 62 ? 42 : safeTitle.length > 36 ? 50 : 58;

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          padding: "42px",
          background: "linear-gradient(135deg, #0b0e14 0%, #141923 58%, #0f1520 100%)",
          color: "#f8fafc",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-90px",
            width: "440px",
            height: "440px",
            borderRadius: "9999px",
            background: theme.soft,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-140px",
            left: "-100px",
            width: "360px",
            height: "360px",
            borderRadius: "9999px",
            background: "rgba(212, 175, 55, 0.08)",
            display: "flex",
          }}
        />

        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: "24px",
            border: `2px solid ${theme.border}`,
            backgroundColor: "rgba(17, 22, 32, 0.9)",
            padding: "44px 52px",
          }}
        >
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "14px",
                  height: "14px",
                  borderRadius: "9999px",
                  backgroundColor: theme.primary,
                  marginRight: "14px",
                  display: "flex",
                }}
              />
              <div
                style={{
                  display: "flex",
                  fontSize: "21px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: theme.text,
                }}
              >
                {safeEyebrow}
              </div>
            </div>

            {safeBadge ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 22px",
                  borderRadius: "9999px",
                  backgroundColor: theme.soft,
                  border: `1.5px solid ${theme.border}`,
                  color: theme.text,
                  fontSize: "20px",
                  fontWeight: 600,
                }}
              >
                {safeBadge}
              </div>
            ) : null}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: "14px",
              marginBottom: "14px",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "4px",
                borderRadius: "9999px",
                backgroundColor: theme.primary,
                marginBottom: "22px",
                display: "flex",
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: `${titleFontSize}px`,
                fontWeight: 700,
                lineHeight: 1.15,
                color: "#f8fafc",
              }}
            >
              {safeTitle}
            </div>
            {safeSubtitle ? (
              <div
                style={{
                  display: "flex",
                  marginTop: "20px",
                  fontSize: "25px",
                  lineHeight: 1.45,
                  color: "#cbd5e1",
                }}
              >
                {safeSubtitle}
              </div>
            ) : null}
          </div>

          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(148, 163, 184, 0.22)",
              paddingTop: "20px",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: "20px",
                color: "#94a3b8",
              }}
            >
              {safeFooterMeta}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "20px",
                fontWeight: 600,
                color: theme.text,
              }}
            >
              praisepage.vercel.app
            </div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );

  if (!headers || typeof headers !== "object") {
    return imageResponse;
  }

  const mergedHeaders = new Headers(imageResponse.headers);
  for (const [key, value] of Object.entries(headers)) {
    mergedHeaders.set(key, String(value));
  }
  return new Response(imageResponse.body, {
    status: imageResponse.status,
    headers: mergedHeaders,
  });
}
