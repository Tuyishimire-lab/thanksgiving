"use client";

import { Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

function QuotesContent({ quotes = [], categories = [], initialCategory = "All" }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedCategory = searchParams.get("category") || initialCategory || "All";

  const handleCategoryClick = (category) => {
    if (category === "All") {
      router.push("/quotes");
    } else {
      router.push(`/quotes?category=${encodeURIComponent(category)}`);
    }
  };

  const filteredQuotes =
    selectedCategory === "All"
      ? quotes
      : quotes.filter((q) => q.category.toLowerCase() === selectedCategory.toLowerCase());

  const displayedQuotes = filteredQuotes.length > 0 ? filteredQuotes : quotes;

  return (
    <section className="sanc-page">
      <div className="sanc-container">
        <div className="sanc-hero">
          <div className="sanc-hero-row">
            <div>
              <span className="sanc-eyebrow">Scripture Cards</span>
              <h1 className="sanc-title">
                Words of <span className="sanc-title-accent">Hope &amp;</span> Inspiration
              </h1>
              <p className="sanc-subtitle">
                {selectedCategory === "All"
                  ? "Find quiet comfort and encouragement in Jesus across curated Scripture reflections."
                  : `Reflecting on ${selectedCategory} through timeless passages of Scripture.`}
              </p>
            </div>
          </div>

          <div className="sanc-filter-row" style={{ marginTop: "2rem" }}>
            <button
              type="button"
              onClick={() => handleCategoryClick("All")}
              className={`sanc-pill${selectedCategory === "All" ? " active-gold" : ""}`}
            >
              All Quotes
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryClick(cat)}
                className={`sanc-pill${
                  selectedCategory.toLowerCase() === cat.toLowerCase() ? " active-gold" : ""
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="quotes-slider-wrap">
          <Swiper
            key={selectedCategory}
            modules={[Navigation, Pagination]}
            slidesPerView={1}
            spaceBetween={22}
            navigation
            pagination={{ clickable: true }}
            breakpoints={{
              700: { slidesPerView: 2 },
              1120: { slidesPerView: 3 },
            }}
            style={{ width: "100%", height: "auto" }}
          >
            {displayedQuotes.map((quote) => (
              <SwiperSlide key={quote.reference}>
                <article className="sanc-quote-slide">
                  <Image
                    src={quote.image}
                    alt={quote.reference}
                    fill
                    sizes="(max-width: 699px) 100vw, (max-width: 1119px) 50vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />

                  <div className="sanc-quote-overlay">
                    <span className="sanc-badge gold" style={{ alignSelf: "flex-start" }}>
                      {quote.category}
                    </span>
                    <blockquote className="sanc-quote-text">
                      &ldquo;{quote.text}&rdquo;
                    </blockquote>
                    <cite className="sanc-quote-ref">&mdash; {quote.reference}</cite>
                  </div>
                </article>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </section>
  );
}

export default function QuotesClient({
  quotes = [],
  categories = [],
  initialCategory = "All",
}) {
  return (
    <Suspense
      fallback={
        <section className="sanc-page">
          <div
            className="sanc-container"
            style={{ textAlign: "center", paddingBlock: "6rem", color: "var(--sanc-muted)" }}
          >
            Loading inspirational quotes...
          </div>
        </section>
      }
    >
      <QuotesContent
        quotes={quotes}
        categories={categories}
        initialCategory={initialCategory}
      />
    </Suspense>
  );
}
