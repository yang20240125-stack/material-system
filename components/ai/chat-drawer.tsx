"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Loader2, Minimize2, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { ConfirmCard, clearCompletedConfirms } from "./confirm-card";
import type { UIMessage } from "ai";

const STORAGE_KEY = "ai-chat-messages";

function loadSavedMessages(): UIMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveMessages(messages: UIMessage[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch {}
}

function getToolInfo(part: Record<string, unknown>): { toolName: string; state: string; output: Record<string, unknown> | undefined; toolCallId: string } | null {
  const partType = part.type as string;

  if (partType === "dynamic-tool") {
    return {
      toolName: (part.toolName as string) || "",
      state: (part.state as string) || "",
      output: part.output as Record<string, unknown> | undefined,
      toolCallId: (part.toolCallId as string) || "",
    };
  }

  if (partType?.startsWith("tool-")) {
    return {
      toolName: partType.replace("tool-", ""),
      state: (part.state as string) || "",
      output: part.output as Record<string, unknown> | undefined,
      toolCallId: (part.toolCallId as string) || "",
    };
  }

  return null;
}

export function ChatDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const user = useAppStore((s) => s.user);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/ai/chat" }),
    []
  );

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport,
    onError: (err) => {
      console.error("Chat error:", err);
      toast.error("AI 请求失败: " + (err.message || "请检查配置"));
    },
  });

  const restoredRef = useRef(false);
  useEffect(() => {
    if (!restoredRef.current) {
      restoredRef.current = true;
      const saved = loadSavedMessages();
      if (saved.length > 0) {
        setMessages(saved);
      }
    }
  }, [setMessages]);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleClear = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    clearCompletedConfirms();
    toast.success("聊天记录已清除");
  }, [setMessages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    await sendMessage({ text });
  }

  function renderMessage(message: UIMessage) {
    const isUser = message.role === "user";

    return (
      <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
        <div className="max-w-[85%] space-y-2">
          {message.parts?.map((part, i) => {
            if (part.type === "text" && part.text) {
              return (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    isUser
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{part.text}</div>
                </div>
              );
            }

            const toolInfo = getToolInfo(part as Record<string, unknown>);
            if (toolInfo) {
              const { toolName, state, output, toolCallId } = toolInfo;

              if (
                toolName.startsWith("prepare") &&
                state === "output-available" &&
                output?.found
              ) {
                return (
                  <ConfirmCard
                    key={toolCallId || i}
                    toolCallId={toolCallId || `tc-${message.id}-${i}`}
                    data={output}
                  />
                );
              }
            }
            return null;
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed bottom-24 right-6 z-50 flex w-96 flex-col rounded-lg border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
        isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
      }`}
      style={{ height: "min(70vh, 600px)" }}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-sm text-slate-900">智能物资助手</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
              title="清除聊天记录"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-sm text-slate-400 py-8">
              <Bot className="h-10 w-10 mx-auto mb-3 text-slate-300" />
              <p>你好，{user?.name}！我是物资助手。</p>
              <p className="mt-1">试试问我：&ldquo;还有多少鼠标？&rdquo;</p>
            </div>
          )}
          {messages.map(renderMessage)}
          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-slate-100 px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
              </div>
            </div>
          )}
          {error && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 max-w-[85%]">
                <div className="flex items-center gap-1.5 font-medium mb-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  AI 请求失败
                </div>
                <p className="text-xs text-red-600">{error.message || "请检查 AI 配置（Base URL / API Key / 模型名称）"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入指令或自然语言..."
            className="min-h-[40px] max-h-[80px] resize-none text-sm"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
