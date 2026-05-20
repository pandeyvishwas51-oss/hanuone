import RatingStars from "./RatingStars";
import { BadgeCheck } from "lucide-react";
import type { Review } from "@/lib/types";

export default function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">{review.reviewer_name || "Anonymous"}</span>
          {review.is_verified && (
            <span title="Verified visit">
              <BadgeCheck size={14} className="text-accent" />
            </span>
          )}
        </div>
        <RatingStars rating={review.rating} showValue={false} />
      </div>
      {review.review_text && <p className="mt-2 text-sm text-ink/80">{review.review_text}</p>}
      <div className="mt-2 text-xs text-muted">
        {new Date(review.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
