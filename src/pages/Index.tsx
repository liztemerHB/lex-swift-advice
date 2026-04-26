import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import LandingScreen from "@/components/LandingScreen";
import ChatInterface from "@/components/ChatInterface";
import ResultScreen from "@/components/ResultScreen";

type View = "landing" | "chat" | "result";

const Index = () => {
  const location = useLocation();
  const [view, setView] = useState<View>("landing");
  const [chatTopic, setChatTopic] = useState<string | undefined>();
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  // Reset to landing whenever the user navigates to "/" (e.g. clicks the LexAdvice logo)
  useEffect(() => {
    if (location.pathname === "/") {
      const goHome = (location.state as { goHome?: boolean } | null)?.goHome;
      if (goHome) {
        setView("landing");
        setActiveCaseId(null);
        setChatTopic(undefined);
      }
    }
  }, [location.key, location.pathname, location.state]);

  const startChat = (topic?: string) => {
    setChatTopic(topic);
    setView("chat");
  };

  const goHome = () => {
    setView("landing");
    setActiveCaseId(null);
    setChatTopic(undefined);
  };

  return (
    <div className="mx-auto w-full max-w-app min-h-screen">
      {view === "landing" && <LandingScreen onStartChat={startChat} />}
      {view === "chat" && (
        <ChatInterface
          onBack={() => setView("landing")}
          onHome={goHome}
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
          onHome={goHome}
        />
      )}
    </div>
  );
};

export default Index;
