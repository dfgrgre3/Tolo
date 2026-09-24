"use client";

import { ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/api-client";
import { useAddToCart } from "@/features/cart";

interface AddToCartButtonProps {
  subjectId: string;
  enrolled?: boolean;
  inCart?: boolean;
  variant?: "icon" | "full";
  className?: string;
}

/**
 * زر إضافة للسلة الموحد — يملك كل منطق الإضافة (auth/ضيف/أخطاء/toast)
 * بدل تكراره في كل بطاقة كورس.
 */
export function AddToCartButton({
  subjectId,
  enrolled,
  inCart,
  variant = "icon",
  className,
}: AddToCartButtonProps) {
  const { add, isPending } = useAddToCart();

  if (enrolled) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPending || inCart) return;
    try {
      add(subjectId);
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        toast.error("سجّل الدخول أولاً");
      } else {
        toast.error("حدث خطأ، حاول مرة أخرى");
      }
    }
  };

  if (variant === "full") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={isPending || inCart}
        className={cn("gap-2 font-bold", className)}
      >
        <ShoppingCart className={cn("h-5 w-5", inCart && "text-emerald-500")} />
        {inCart ? "في السلة" : "أضف للسلة"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isPending || inCart}
      className={cn("h-12 w-12 shrink-0 rounded-2xl p-0", className)}
      aria-label="أضف للسلة"
    >
      <ShoppingCart className={cn("h-5 w-5", inCart && "text-emerald-500")} />
    </Button>
  );
}
