import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, useParams, useSearch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScenarioProvider } from "@/lib/scenario";
import { DecisionGameProvider } from "@/lib/decisionGame";
import { SessionRoomFromRoute, useSessionRoomRequired } from "@/lib/sessionRoom";
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
import CreateClientsPage from "./pages/create-clients";
import CreateClientPage from "./pages/create-client";
import CreateNewSessionPage from "./pages/create-new-session";
import CreateSessionPage from "./pages/create-session";
import CreateLibraryPage from "./pages/create-library";

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
  return <Redirect to="/create" />;
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

function SessionJoinInner() {
  const room = useSessionRoomRequired();
  if (room.format === "branching") {
    return (
      <DecisionGameProvider code={room.workshopCode}>
        <MartJoin />
      </DecisionGameProvider>
    );
  }
  return (
    <ScenarioProvider code={room.workshopCode}>
      <JoinScreen />
    </ScenarioProvider>
  );
}

function SessionPlayInner() {
  const room = useSessionRoomRequired();
  if (room.format === "branching") {
    return (
      <DecisionGameProvider code={room.workshopCode}>
        <MartApp />
      </DecisionGameProvider>
    );
  }
  return (
    <ScenarioProvider code={room.workshopCode}>
      <SimulationApp />
    </ScenarioProvider>
  );
}

function SessionFacilitateInner() {
  const room = useSessionRoomRequired();
  if (room.format === "branching") {
    return (
      <AuthGate>
        <DecisionGameProvider code={room.workshopCode}>
          <MartFacilitate />
        </DecisionGameProvider>
      </AuthGate>
    );
  }
  return (
    <AuthGate>
      <ScenarioProvider code={room.workshopCode}>
        <FacilitatePage />
      </ScenarioProvider>
    </AuthGate>
  );
}

function SessionPrintInner() {
  const room = useSessionRoomRequired();
  if (room.format !== "investigation") return <NotFound />;
  return (
    <ScenarioProvider code={room.workshopCode}>
      <PrintPack />
    </ScenarioProvider>
  );
}

function SessionTryInner() {
  const room = useSessionRoomRequired();
  // Preview sessions are themselves try-outs; live sessions link to a separate preview create.
  if (room.format === "branching") {
    return (
      <DecisionGameProvider code={room.workshopCode}>
        <MartJoin />
      </DecisionGameProvider>
    );
  }
  return (
    <ScenarioProvider code={room.workshopCode}>
      <JoinScreen />
    </ScenarioProvider>
  );
}

function withSessionRoom(Inner: React.ComponentType) {
  return function Wrapped() {
    return (
      <SessionRoomFromRoute>
        <Inner />
      </SessionRoomFromRoute>
    );
  };
}

const SessionJoinGate = withSessionRoom(SessionJoinInner);
const SessionPlayGate = withSessionRoom(SessionPlayInner);
const SessionFacilitateGate = withSessionRoom(SessionFacilitateInner);
const SessionPrintGate = withSessionRoom(SessionPrintInner);
const SessionTryGate = withSessionRoom(SessionTryInner);

function Router() {
  return (
    <DesktopGate>
      <Switch>
        <Route path="/" component={HomeRedirect} />
        <Route path="/create/library" component={CreateLibraryPage} />
        <Route path="/create/sessions/:id" component={CreateSessionPage} />
        <Route path="/create/clients/:id/new" component={CreateNewSessionPage} />
        <Route path="/create/clients/:id" component={CreateClientPage} />
        <Route path="/create" component={CreateClientsPage} />
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
        <Route path="/s/:code/facilitate" component={SessionFacilitateGate} />
        <Route path="/s/:code/print" component={SessionPrintGate} />
        <Route path="/s/:code/play/:sessionId/:screen" component={SessionPlayGate} />
        <Route path="/s/:code/play/:sessionId" component={SessionPlayGate} />
        <Route path="/s/:code/try/play/:sessionId/:screen" component={SessionPlayGate} />
        <Route path="/s/:code/try/play/:sessionId" component={SessionPlayGate} />
        <Route path="/s/:code/try" component={SessionTryGate} />
        <Route path="/s/:code" component={SessionJoinGate} />
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
