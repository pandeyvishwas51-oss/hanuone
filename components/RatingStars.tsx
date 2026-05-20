import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  rating: number | null | undefined;
  reviewCount?: number;
  size?: number;
  showValue?: boolean;
  className?: string;
};

export default function RatingStars({
  rating,
  reviewCount,
  size = 14,
  showValue = true,
  className
}: Props) {
  if (rating == null) {
    return <span className={cn("text-xs text-muted", className)}>No reviews yet</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star size={size} className="fill-amber-400 text-amber-400" />
      {showValue && <strong className="font-semibold">{rating.toFixed(1)}</strong>}
      {typeof reviewCount === "number" && (
        <span className="text-xs text-muted">({reviewCount})</span>
      )}
    </span>
  );
}
