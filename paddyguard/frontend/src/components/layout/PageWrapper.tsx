import React from "react";
import BottomNav from "./BottomNav";

interface PageWrapperProps {
  children: React.ReactNode;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-cream">
      <div className="page-enter mx-auto max-w-[430px] pb-20">{children}</div>
      <BottomNav />
    </div>
  );
};

export default PageWrapper;
