"use client";

import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { Crown, Star } from "lucide-react";
import { toast } from "sonner";

interface AdminPremiumToggleProps {
  userId: Id<"users">;
  isPremium?: boolean;
}

export function AdminPremiumToggle({ userId, isPremium }: AdminPremiumToggleProps) {
  const togglePremium = useMutation(api.users.togglePremium);

  const handleToggle = async () => {
    try {
      const newStatus = await togglePremium({ userId });
      toast.success(
        `User is now ${newStatus ? "Premium" : "Free"} user`
      );
    } catch (error) {
      toast.error("Failed to toggle premium status");
    }
  };

  return (
    <Button
      variant={isPremium ? "default" : "secondary"}
      size="sm"
      onClick={handleToggle}
    >
        {isPremium ? (
             <Star className="mr-2 h-4 w-4 fill-yellow-400 text-yellow-400" />
        ) : (
             <Star className="mr-2 h-4 w-4" />
        )}

      {isPremium ? "Premium User" : "Make Premium"}
    </Button>
  );
}
