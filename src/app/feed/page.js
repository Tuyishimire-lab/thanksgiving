import { getMe } from "@/app/actions/authActions";
import { getTestimonies } from "@/app/actions/dbActions";
import FeedClient from "./FeedClient";

export default async function FeedPage({ searchParams }) {
  const [resolvedSearchParams, initialUser, initialPosts] = await Promise.all([
    searchParams,
    getMe(),
    getTestimonies()
  ]);

  const initialPostId =
    typeof resolvedSearchParams?.post === "string" ? resolvedSearchParams.post : null;
  const initialShare = resolvedSearchParams?.share === "true";

  return (
    <FeedClient
      initialUser={initialUser}
      initialPosts={initialPosts}
      initialPostId={initialPostId}
      initialShare={initialShare}
    />
  );
}
