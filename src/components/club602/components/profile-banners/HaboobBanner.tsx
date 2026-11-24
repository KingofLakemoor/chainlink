import React from "react";

export function HaboobBanner({
  isStatic = false,
  ...props
}: { isStatic?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      style={{ width: "100%", height: "100%", borderRadius: 8, overflow: "hidden", position: "relative" }}
      {...props}
    >
      <img 
        src="/images/haboob.gif" 
        alt="Haboob Banner" 
        style={{ width: "100%", height: "100%", objectFit: "cover" }} 
      />
    </div>
  );
}
