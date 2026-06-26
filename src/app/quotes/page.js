"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";

// Import Swiper styles
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
  }
];

const CATEGORIES = ["Gratitude", "Praise", "Harvest", "Love", "Justice", "Salvation"];

function QuotesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category");
  const [selectedCategory, setSelectedCategory] = useState(categoryParam || "All");

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory("All");
    }
  }, [categoryParam]);

  const handleCategoryClick = (category) => {
    if (category === "All") {
      router.push("/quotes");
    } else {
      router.push(`/quotes?category=${category}`);
    }
  };

  const filteredQuotes = selectedCategory === "All"
    ? QUOTES_DATA
    : QUOTES_DATA.filter(q => q.category === selectedCategory);

  // If a category has no quotes, fall back to showing all to avoid an empty slider
  const displayedQuotes = filteredQuotes.length > 0 ? filteredQuotes : QUOTES_DATA;

  return (
    <section className="quick-read section">
      <div className="container">
        {/* Categories Banner */}
        <div className="quotes-categories headline-banner">
          <h3 className="headline fancy-border" style={{ flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={() => handleCategoryClick("All")}
              style={{ cursor: "pointer" }}
              className={selectedCategory === "All" ? "active-category" : ""}
            >
              <span className="place-items-center">All</span>
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                style={{ cursor: "pointer" }}
                className={selectedCategory === cat ? "active-category" : ""}
              >
                <span className="place-items-center">{cat}</span>
              </button>
            ))}
          </h3>
          <span className="headline-description">
            {selectedCategory === "All" ? "Find comfort in Jesus..." : `Reflecting on ${selectedCategory}...`}
          </span>
        </div>

        <h2 className="quotes title section-title" data-name="Uplifting">
          Hope & Inspiration
        </h2>

        {/* Carousel Slider */}
        <div className="swiper-container-react" style={{ position: "relative", paddingBottom: "3rem" }}>
          <Swiper
            modules={[Navigation, Pagination]}
            slidesPerView={1}
            spaceBetween={20}
            navigation
            pagination={{ clickable: true }}
            breakpoints={{
              700: {
                slidesPerView: 2,
              },
              1200: {
                slidesPerView: 3,
              },
            }}
            style={{ width: "100%", height: "auto" }}
          >
            {displayedQuotes.map((quote, index) => (
              <SwiperSlide key={index}>
                <div className="article" style={{ height: "40rem", borderRadius: "8px", overflow: "hidden" }}>
                  <img src={quote.image} alt={quote.reference} className="quotes-image" style={{ width: "100%", height: "100%", objectFit: "cover" }} />

                  <div className="article-data-container">
                    <div className="article-data">
                      <span>{quote.reference}</span>
                      <span className="article-data-spacer"></span>
                      <span>{quote.category}</span>
                    </div>
                    <h3 className="title article-title" style={{ fontSize: "1.8rem", lineHeight: "1.4" }}>
                      {quote.text}
                    </h3>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* Inline styles for category tagging */}
        <style jsx global>{`
          .active-category span {
            color: var(--light-color) !important;
            border-bottom: 2px solid var(--light-color);
          }
          .headline button {
            background: transparent;
            border: none;
            outline: none;
            padding: 0.5rem 1rem;
            color: var(--light-color-alt);
            font: inherit;
            transition: color 0.25s;
          }
          .headline button:hover {
            color: var(--light-color);
          }
          /* Custom overrides for React Swiper controls */
          .swiper-button-prev,
          .swiper-button-next {
            width: 4rem;
            height: 4rem;
            background-color: var(--secondary-background-color);
            color: var(--light-color) !important;
            border-radius: 50%;
            transition: all 0.3s ease;
          }
          .swiper-button-prev::after,
          .swiper-button-next::after {
            font-size: 1.6rem !important;
            font-weight: bold;
          }
          .swiper-button-prev:hover,
          .swiper-button-next:hover {
            background-color: var(--light-color);
            color: var(--primary-background-color) !important;
          }
          .swiper-pagination-bullet-active {
            background: var(--light-color) !important;
          }
        `}</style>
      </div>
    </section>
  );
}

export default function Quotes() {
  return (
    <Suspense fallback={<div className="container" style={{ padding: "5rem", textAlign: "center" }}>Loading quotes...</div>}>
      <QuotesContent />
    </Suspense>
  );
}
