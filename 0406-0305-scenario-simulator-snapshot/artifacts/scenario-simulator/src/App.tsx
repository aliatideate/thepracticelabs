import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, useParams, useSearch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScenarioProvider } from "@/lib/scenario";
import { DecisionGameProvider } from "@/lib/decisionGame";
import JoinScreen from "./pages/join";
import SimulationApp from "./simulation/SimulationApp";
import FacilitatePage from "./pages/facilitate";
import MartFacilitate from "./pages/mart-facilitate";
import MartJoin from "./pages/mart-join";
import MartApp from "./pages/MartApp";
import TryJoin from "./pages/try-join";
import DemandTryJoin from "./pages/demand-try-join";
import PrintPack from "./pages/print";
import AuthGate from "./pages/auth-gate";
import LoginPage from "./pages/login";
import DesktopGate from "./pages/DesktopGate";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

function Redirect({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to, { replace: true });
  }, [to, setLocation]);
  return null;
}

function LegacyPlayRedirect() {
  const { sessionId, screen } = useParams<{ sessionId: string; screen: string }>();
  return <Redirect to={`/demand/play/${sessionId}/${screen}`} />;
}

function LegacyTryPlayRedirect() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <Redirect to={`/mart/try/play/${sessionId}`} />;
}

/** Old /facilitate/:secret bookmarks → hub (auth via cookie, not URL secret). */
function LegacyFacilitatorRedirect() {
  return <Redirect to="/facilitate" />;
}

function FacilitateHub() {
  const search = useSearch();
  const tab = new URLSearchParams(search).get("tab") === "mart" ? "mart" : "demand";
  const board =
    tab === "mart" ? (
      <DecisionGameProvider>
        <MartFacilitate />
      </DecisionGameProvider>
    ) : (
      <FacilitatePage />
    );
  return <AuthGate>{board}</AuthGate>;
}

function MartJoinGate() {
  return (
    <DecisionGameProvider>
      <MartJoin />
    </DecisionGameProvider>
  );
}

function MartPlayGate() {
  return (
    <DecisionGameProvider>
      <MartApp />
    </DecisionGameProvider>
  );
}

function TryJoinGate() {
  return (
    <DecisionGameProvider>
      <TryJoin />
    </DecisionGameProvider>
  );
}

function TryPlayGate() {
  return (
    <DecisionGameProvider>
      <MartApp mode="try" />
    </DecisionGameProvider>
  );
}

function HomeRedirect() {
  return <Redirect to="/demand" />;
}

function TryHomeRedirect() {
  return <Redirect to="/mart/try" />;
}

function DemandPlay() {
  return <SimulationApp />;
}

function DemandTryPlay() {
  return <SimulationApp mode="try" />;
}

function Router() {
  return (
    <DesktopGate>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/play/:sessionId/:screen" component={LegacyPlayRedirect} />
        <Route path="/demand/try/play/:sessionId/:screen" component={DemandTryPlay} />
        <Route path="/demand/try" component={DemandTryJoin} />
        <Route path="/demand/play/:sessionId/:screen" component={DemandPlay} />
        <Route path="/demand" component={JoinScreen} />
        <Route path="/mart/try/play/:sessionId" component={TryPlayGate} />
        <Route path="/mart/try" component={TryJoinGate} />
        <Route path="/mart/play/:sessionId" component={MartPlayGate} />
        <Route path="/mart" component={MartJoinGate} />
        <Route path="/try/play/:sessionId" component={LegacyTryPlayRedirect} />
        <Route path="/try" component={TryHomeRedirect} />
        <Route path="/login" component={LoginPage} />
        <Route path="/facilitate/:secret" component={LegacyFacilitatorRedirect} />
        <Route path="/facilitate" component={FacilitateHub} />
        <Route path="/print" component={PrintPack} />
        <Route component={NotFound} />
      </Switch>
    </DesktopGate>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <ScenarioProvider>
          <Router />
        </ScenarioProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}
