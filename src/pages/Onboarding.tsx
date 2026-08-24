import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { useNavigate } from "react-router-dom";

export default function OnboardingPage() {
  const navigate = useNavigate();

  const handleComplete = () => {
    localStorage.setItem("sf_onboarding_complete", "true");
    navigate("/app", { replace: true });
  };

  return (
    <ProtectedRoute minPermissionLevel={2}>
      <OnboardingScreen onComplete={handleComplete} />
    </ProtectedRoute>
  );
}
