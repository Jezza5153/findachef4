import React from "react";
import { Button } from "@/components/ui/button";

export type WallTab = "Both" | "Chef Wall" | "Customer Wall";

interface WallTabsProps {
  role: "chef" | "customer";
  activeTab: WallTab;
  setActiveTab: (tab: WallTab) => void;
}

export default function WallTabs({ role, activeTab, setActiveTab }: WallTabsProps) {
  const tabs: WallTab[] =
    role === "chef"
      ? ["Both", "Chef Wall", "Customer Wall"]
      : ["Customer Wall"];

  return (
    <div className="flex gap-2 mb-6 justify-center">
      {tabs.map(tab => (
        <Button
          key={tab}
          variant={activeTab === tab ? "default" : "outline"}
          aria-pressed={activeTab === tab}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </Button>
      ))}
    </div>
  );
}
