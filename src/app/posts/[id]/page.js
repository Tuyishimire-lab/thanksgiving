import { posts } from "@/data/posts";
import Link from "next/link";
import { notFound } from "next/navigation";

// Generate static params for static site generation support
export async function generateStaticParams() {
  return posts.map((post) => ({
    id: post.id,
  }));
}

export default async function PostPage({ params }) {
  // Await the params object in Next.js 15 App Router
  const { id } = await params;
  const post = posts.find((p) => p.id === id);

  if (!post) {
    notFound();
  }

  return (
    <section className="blog-post section-header-offset" style={{ paddingBlock: "4rem 6rem" }}>
      <div className="blog-post-container container" style={{ maxWidth: "900px" }}>
        <div className="blog-post-data" style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h3 className="title blog-post-title" style={{ fontSize: "var(--font-size-xl)", color: "var(--light-color)", marginBlock: "2rem 1rem" }}>
            {post.title}
          </h3>
          <div className="article-data" style={{ justifyContent: "center", marginBottom: "3rem" }}>
            <span>{post.date}</span>
            <span className="article-data-spacer"></span>
            <span>{post.readTime}</span>
          </div>
          <div style={{ borderRadius: "10px", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
            <img src={post.image} alt={post.title} style={{ width: "100%", height: "auto", display: "block" }} />
          </div>
        </div>

        <div className="container" style={{ paddingInline: "0" }}>
          {post.content.map((block, index) => {
            if (block.type === "paragraph") {
              return (
                <p 
                  key={index} 
                  style={{ marginBottom: "2rem", lineHeight: "1.8", fontSize: "1.6rem" }}
                  dangerouslySetInnerHTML={{ __html: block.text }}
                />
              );
            }
            if (block.type === "blockquote") {
              return (
                <blockquote key={index} className="quote" style={{ marginBlock: "3rem", paddingLeft: "2rem" }}>
                  <p style={{ fontStyle: "italic", fontSize: "1.8rem" }}>
                    <span>
                      <i className="ri-double-quotes-l" style={{ marginRight: "0.5rem", verticalAlign: "middle" }}></i>
                    </span>
                    {block.text}
                    <span>
                      <i className="ri-double-quotes-r" style={{ marginLeft: "0.5rem", verticalAlign: "middle" }}></i>
                    </span>
                  </p>
                </blockquote>
              );
            }
            if (block.type === "list") {
              return (
                <ul key={index} style={{ listStyleType: "disc", paddingLeft: "3rem", marginBlock: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {block.items.map((item, itemIdx) => (
                    <li 
                      key={itemIdx} 
                      style={{ lineHeight: "1.6", fontSize: "1.6rem" }}
                      dangerouslySetInnerHTML={{ __html: item }}
                    />
                  ))}
                </ul>
              );
            }
            return null;
          })}

          {/* Author Card */}
          <div className="author d-grid" style={{ marginTop: "6rem", background: "var(--secondary-background-color)", padding: "3rem", borderRadius: "12px" }}>
            <div className="author-image-box" style={{ width: "8rem", height: "8rem", borderRadius: "50%", overflow: "hidden" }}>
              <img src="/assets/images/thanksgivings.jpeg" alt="ThanksGivings" className="article-image" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div className="author-about">
              <h3 className="author-name" style={{ color: "var(--light-color)", fontSize: "1.8rem", marginBottom: "0.5rem" }}>
                ThanksGivings
              </h3>
              <p style={{ fontSize: "1.4rem", color: "var(--light-color-alt)", marginBottom: "1.5rem" }}>
                Share Your Testimony! We believe in the power of stories. Share your Thanksgiving reflection and touch the hearts of others on our website.
              </p>
              <ul className="list social-media" style={{ justifyContent: "flex-start", gap: "1.5rem" }}>
                <li className="list-item">
                  <a href="#" className="list-link" aria-label="Instagram"><i className="ri-instagram-line"></i></a>
                </li>
                <li className="list-item">
                  <a href="#" className="list-link" aria-label="Facebook"><i className="ri-facebook-circle-line"></i></a>
                </li>
                <li className="list-item">
                  <a href="#" className="list-link" aria-label="Twitter"><i className="ri-twitter-line"></i></a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
