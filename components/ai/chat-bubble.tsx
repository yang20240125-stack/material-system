"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { ChatDrawer } from "./chat-drawer";

export function AIChatBubble() {
  const { aiDrawerOpen, toggleAiDrawer, setAiDrawerOpen } = useAppStore();

  return (
    <>
      <Button
        onClick={toggleAiDrawer}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 shadow-lg hover:bg-blue-700"
        size="icon"
      >
        {aiDrawerOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageSquare className="h-6 w-6 text-white" />
        )}
      </Button>

      <ChatDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
      />
    </>
  );
}
