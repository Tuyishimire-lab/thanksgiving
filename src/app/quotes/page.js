"use client";

import { Suspense } from "react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const QUOTES_DATA = [
  {
    reference: "1 Timothy 4:4-5",
    category: "Gratitude",
    text: "For everything God created is good, and nothing is to be rejected if it is received with thanksgiving, because it is consecrated by the word of God and prayer.",
    image: "/assets/images/quick_read/quick_read_1.jpg",
  },
  {
    reference: "Psalm 100:4",
    category: "Gratitude",
    text: "Enter into His gates with thanksgiving, and into His courts with praise: be thankful unto Him, and bless His name.",
    image: "/assets/images/quick_read/quick_read_5.jpg",
  },
  {
    reference: "Colossians 2:6-7",
    category: "Gratitude",
    text: "As you therefore have received Christ Jesus the Lord, so walk in Him, rooted and built up in Him and established in the faith, as you have been taught, abounding in it with thanksgiving.",
    image: "/assets/images/quick_read/quick_read_5.jpg",
  },
  {
    reference: "Psalm 50:14",
    category: "Gratitude",
    text: "Offer God a sacrifice of thanksgiving! Fulfill the promises you made to the Most High!",
    image: "/assets/images/quick_read/quick_read_5.jpg",
  },
  {
    reference: "Psalm 28:7",
    category: "Gratitude",
    text: "The Lord is my strength and my shield; in him my heart trusts, and I am helped; my heart exults, and with my song I give thanks to him.",
    image: "/assets/images/quick_read/quick_read_5.jpg",
  },
  {
    reference: "Colossians 4:2",
    category: "Gratitude",
    text: "Devote yourselves to prayer, being watchful and thankful",
    image: "/assets/images/quick_read/quick_read_5.jpg",
  },
  {
    reference: "John 15:12",
    category: "Love",
    text: "My command is this: Love each other as I have loved you.",
    image: "/assets/images/quick_read/quick_read_1.jpg",
  },
  {
    reference: "1 Corinthians 16:14",
    category: "Love",
    text: "Do everything in love.",
    image: "/assets/images/quick_read/quick_read_5.jpg",
  },
  {
    reference: "Psalm 150:6",
    category: "Praise",
    text: "Let everything that has breath praise the Lord. Praise the Lord.",
    image: "/assets/images/quick_read/quick_read_1.jpg",
  },
  {
    reference: "Galatians 6:9",
    category: "Harvest",
    text: "Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.",
    image: "/assets/images/quick_read/quick_read_5.jpg",
  },
];

const CATEGORIES = ["Gratitude", "Praise", "Harvest", "Love", "Justice", "Salvation"];

function QuotesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedCategory = searchParams.get("category") || "All";

  const handleCategoryClick = (category) => {
    if (category === "All") {
      router.push("/quotes");
    } else {
      router.push(`/quotes?category=${encodeURIComponent(category)}`);
    }
  };

  const filteredQuotes =
    selectedCategory === "All"
      ? QUOTES_DATA
      : QUOTES_DATA.filter((q) => q.category.toLowerCase() === selectedCategory.toLowerCase());

  const displayedQuotes = filteredQuotes.length > 0 ? filteredQuotes : QUOTES_DATA;

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
            {CATEGORIES.map((cat) => (
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

export default function Quotes() {
  return (
    <Suspense
      fallback={
        <section className="sanc-page">
          <div className="sanc-container" style={{ textAlign: "center", paddingBlock: "6rem", color: "var(--sanc-muted)" }}>
            Loading inspirational quotes...
          </div>
        </section>
      }
    >
      <QuotesContent />
    </Suspense>
  );
}
