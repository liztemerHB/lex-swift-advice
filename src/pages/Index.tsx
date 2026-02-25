import { useState } from "react";
import LandingScreen from "@/components/LandingScreen";
import ChatInterface from "@/components/ChatInterface";
import ResultScreen from "@/components/ResultScreen";
import LawyerDashboard from "@/components/LawyerDashboard";

type View = "landing" | "chat" | "result" | "lawyer";

const Index = () => {
  const [view, setView] = useState<View>("landing");
  const [chatTopic, setChatTopic] = useState<string | undefined>();

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
          onShowResult={() => setView("result")}
          initialTopic={chatTopic}
        />
      )}
      {view === "result" && (
        <ResultScreen
          onBack={() => setView("chat")}
          onLawyerDashboard={() => setView("lawyer")}
        />
      )}
      {view === "lawyer" && <LawyerDashboard onBack={() => setView("result")} />}
    </div>
  );
};

export default Index;
