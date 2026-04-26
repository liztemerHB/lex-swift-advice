import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LandingScreen from "@/components/LandingScreen";
import ChatInterface from "@/components/ChatInterface";
import ResultScreen from "@/components/ResultScreen";

type View = "landing" | "chat" | "result";

const Index = () => {
  const [view, setView] = useState<View>("landing");
  const [chatTopic, setChatTopic] = useState<string | undefined>();
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  const startChat = (topic?: string) => {
    setChatTopic(topic);
    setView("chat");
  };

  return (
    <div className="mx-auto w-full max-w-app min-h-screen">
      {view === "landing" && <LandingScreen onStartChat={startChat} />}
      {view === "chat" && (
        <ChatInterface
          onBack={() => setView("landing")}
          onShowResult={(id) => {
            setActiveCaseId(id);
            setView("result");
          }}
          initialTopic={chatTopic}
        />
      )}
      {view === "result" && activeCaseId && (
        <ResultScreen
          caseId={activeCaseId}
          onBack={() => setView("chat")}
        />
      )}
    </div>
  );
};

export default Index;
