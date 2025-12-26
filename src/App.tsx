import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./features/home/HomePage";
import RuleAddPage from "./features/rule-add/RuleAddPage";
import ExplanationPage from "./features/explanation/ExplanationPage";
import SettingsPage from "./features/settings/SettingsPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/add" element={<RuleAddPage />} />
        <Route path="/explain/:gameId" element={<ExplanationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
