import Sidebar from "@/components/Sidebar";
import AIAnalysis from "@/components/dashboard/AIAnalysis";

export default function AIPage() {
  return (
    <div className="flex" style={{ height: "100vh", background: "var(--bg-primary)" }}>
      <Sidebar />
      <div className="flex flex-col flex-1 ml-56 overflow-hidden">
        <AIAnalysis fullPage />
      </div>
    </div>
  );
}
