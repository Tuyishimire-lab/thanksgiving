import { posts } from "@/data/posts";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export async function generateStaticParams() {
  return posts.map((post) => ({
    id: post.id,
  }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const post = posts.find((p) => p.id === id);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  const firstParagraph = post.content.find((c) => c.type === "paragraph")?.text || "";
  const cleanDescription = firstParagraph.replace(/<[^>]*>/g, "").substring(0, 160) + "...";

  return {
    title: post.title,
    description: cleanDescription,
    openGraph: {
      title: `${post.title} | PraisePage`,
      description: cleanDescription,
      type: "article",
      publishedTime: post.date,
      images: [
        {
          url: post.image,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | PraisePage`,
      description: cleanDescription,
      images: [post.image],
    },
  };
}

export default async function PostPage({ params }) {
  const { id } = await params;
  const post = posts.find((p) => p.id === id);

  if (!post) {
    notFound();
  }

  const firstParagraph = post.content.find((c) => c.type === "paragraph")?.text || "";
  const cleanDescription = firstParagraph.replace(/<[^>]*>/g, "").substring(0, 160) + "...";

  let publishedDate;
  try {
    publishedDate = new Date(post.date).toISOString();
  } catch {
    publishedDate = new Date().toISOString();
  }

  const schemaJson = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: cleanDescription,
    image: [
      post.image.startsWith("http") ? post.image : `https://praisepage.com${post.image}`,
    ],
    datePublished: publishedDate,
    dateModified: publishedDate,
    author: {
      "@type": "Person",
      name: "PraisePage",
      url: "https://praisepage.com",
    },
    publisher: {
      "@type": "Organization",
      name: "PraisePage",
      logo: {
        "@type": "ImageObject",
        url: "https://praisepage.com/assets/images/praisepage.jpeg",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://praisepage.com/posts/${id}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson).replace(/</g, "\\u003c") }}
      />

      <section className="sanc-page">
        <div className="sanc-container-sm">
          <Link href="/feed" className="sanc-back-link">
            <i className="ri-arrow-left-line" aria-hidden="true"></i>
            <span>Back to Community Feed</span>
          </Link>

          <article className="sanc-stack" style={{ gap: "2.4rem" }}>
            <header className="sanc-hero sanc-hero-center" style={{ marginBottom: 0 }}>
              <span className="sanc-eyebrow">Community Testimony</span>
              <h1 className="sanc-title">{post.title}</h1>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "1rem",
                  marginTop: "1.4rem",
                }}
              >
                <span className="sanc-badge gold">{post.date}</span>
                <span className="sanc-badge">{post.readTime}</span>
              </div>
            </header>

            <div className="sanc-card">
              <Image
                src={post.image}
                alt={post.title}
                width={900}
                height={500}
                style={{ width: "100%", height: "auto", display: "block" }}
                preload
              />
            </div>

            <div className="sanc-card sanc-card-pad">
              <div className="sanc-article-prose">
                {post.content.map((block, index) => {
                  if (block.type === "paragraph") {
                    return (
                      <p
                        key={index}
                        dangerouslySetInnerHTML={{ __html: block.text }}
                      />
                    );
                  }
                  if (block.type === "blockquote") {
                    return (
                      <blockquote key={index} className="sanc-blockquote">
                        &ldquo;{block.text}&rdquo;
                      </blockquote>
                    );
                  }
                  if (block.type === "list") {
                    return (
                      <ul key={index}>
                        {block.items.map((item, itemIdx) => (
                          <li key={itemIdx} dangerouslySetInnerHTML={{ __html: item }} />
                        ))}
                      </ul>
                    );
                  }
                  return null;
                })}
              </div>

              <div className="sanc-author-card">
                <div
                  style={{
                    width: "7.6rem",
                    height: "7.6rem",
                    borderRadius: "50%",
                    overflow: "hidden",
                    position: "relative",
                    flexShrink: 0,
                    border: "2px solid var(--sanc-gold-border)",
                  }}
                >
                  <Image
                    src="/assets/images/praisepage.jpeg"
                    alt="PraisePage"
                    fill
                    sizes="80px"
                    style={{ objectFit: "cover" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div>
                    <span className="sanc-eyebrow" style={{ marginBottom: "0.2rem" }}>
                      About the Ministry
                    </span>
                    <h3 className="sanc-section-title" style={{ fontSize: "2rem" }}>
                      PraisePage
                    </h3>
                  </div>
                  <p style={{ fontSize: "1.38rem", lineHeight: 1.6, color: "var(--sanc-muted)", margin: 0 }}>
                    Share Your Testimony! We believe in the power of stories. Share your PraisePage
                    reflection and encourage believers walking through every season.
                  </p>
                  <div className="sanc-social-row" style={{ marginTop: "0.3rem" }}>
                    <a
                      href="https://www.instagram.com/praisepage__?igsh=czB1MWpndDM5dmxl"
                      className="sanc-social-btn"
                      aria-label="Instagram"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="ri-instagram-line" aria-hidden="true"></i>
                    </a>
                    <a
                      href="https://www.facebook.com/share/17UGpy6s6P/"
                      className="sanc-social-btn"
                      aria-label="Facebook"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="ri-facebook-circle-line" aria-hidden="true"></i>
                    </a>
                    <a
                      href="https://x.com/praisepage_"
                      className="sanc-social-btn"
                      aria-label="X (Twitter)"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <i className="ri-twitter-line" aria-hidden="true"></i>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
