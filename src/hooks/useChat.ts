import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface CaseData {
  id: string;
  category?: string | null;
  urgency?: string | null;
  problem_summary?: string | null;
  facts?: any;
  next_steps?: string[] | null;
  estimated_damage?: number | null;
  city?: string | null;
  is_fact_gathering_complete?: boolean;
}

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (text: string, consent?: { personalData: boolean; privacyPolicy: boolean }) => {
      if (!text.trim()) return;
      setError(null);

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      try {
        const { data, error: fnErr } = await supabase.functions.invoke("chat-with-ai", {
          body: { message: text, caseId },
        });
        if (fnErr) throw fnErr;
        if (data?.error) throw new Error(data.error);

        const newCaseId = data.caseId as string;
        setCaseId(newCaseId);

        // Save consent on first message
        if (consent && consent.personalData && consent.privacyPolicy) {
          await supabase
            .from("cases")
            .update({
              consent_personal_data: true,
              privacy_policy_accepted: true,
              consent_at: new Date().toISOString(),
              consent_version: "v1.0",
            })
            .eq("id", newCaseId);
        }

        setCaseData(data.case);
        const aiMsg: ChatMessage = {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Ошибка соединения");
      } finally {
        setIsTyping(false);
      }
    },
    [caseId]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setCaseId(null);
    setCaseData(null);
    setError(null);
  }, []);

  return { messages, caseId, caseData, isTyping, error, sendMessage, reset };
};
