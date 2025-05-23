// /components/Wall/WallTabs.tsx

import React from "react";
import { Button } from "@/components/ui/button";

export type WallTab = "Both" | "Chef Wall" | "Customer Wall";

interface WallTabsProps {
  role: "chef" | "customer";
  activeTab: WallTab;
  setActiveTab: (tab: WallTab) => void;
}

export default function WallTabs({ role, activeTab, setActiveTab }: WallTabsProps) {
  const tabs = role === "chef"
    ? (["Both", "Chef Wall", "Customer Wall"] as WallTab[])
    : (["Customer Wall"] as WallTab[]);
  return (
    <div className="flex gap-2 mb-6 justify-center">
      {tabs.map(tab => (
        <Button
          key={tab}
          variant={activeTab === tab ? "default" : "outline"}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </Button>
      ))}
    </div>
  );
}
