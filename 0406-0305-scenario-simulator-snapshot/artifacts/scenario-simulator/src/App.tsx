import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, useParams, useSearch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScenarioProvider } from "@/lib/scenario";
import { DecisionGameProvider } from "@/lib/decisionGame";
import { SessionRoomFromRoute, useSessionRoomRequired } from "@/lib/sessionRoom";
import { engineRoutes } from "@/lib/engineRegistry";
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
import CreateBoardsPage from "./pages/create-boards";
import CreateBriefPage from "./pages/create-brief";

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
  const routes = engineRoutes(room.format);
  const Join = routes.Join;
  if (room.format === "branching") {
    return (
      <DecisionGameProvider code={room.workshopCode}>
        <Join />
      </DecisionGameProvider>
    );
  }
  return (
    <ScenarioProvider code={room.workshopCode}>
      <Join />
    </ScenarioProvider>
  );
}

function SessionPlayInner() {
  const room = useSessionRoomRequired();
  const routes = engineRoutes(room.format);
  const Play = routes.Play;
  if (room.format === "branching") {
    return (
      <DecisionGameProvider code={room.workshopCode}>
        <Play />
      </DecisionGameProvider>
    );
  }
  return (
    <ScenarioProvider code={room.workshopCode}>
      <Play />
    </ScenarioProvider>
  );
}

function SessionFacilitateInner() {
  const room = useSessionRoomRequired();
  const routes = engineRoutes(room.format);
  const Facilitate = routes.Facilitate;
  if (room.format === "branching") {
    return (
      <AuthGate allowFacilitatorToken>
        <DecisionGameProvider code={room.workshopCode}>
          <Facilitate />
        </DecisionGameProvider>
      </AuthGate>
    );
  }
  return (
    <AuthGate allowFacilitatorToken>
      <ScenarioProvider code={room.workshopCode}>
        <Facilitate />
      </ScenarioProvider>
    </AuthGate>
  );
}

function SessionPrintInner() {
  const room = useSessionRoomRequired();
  const routes = engineRoutes(room.format);
  if (!routes.Print) return <NotFound />;
  const Print = routes.Print;
  return (
    <ScenarioProvider code={room.workshopCode}>
      <Print />
    </ScenarioProvider>
  );
}

function SessionTryInner() {
  const room = useSessionRoomRequired();
  // Preview sessions are themselves try-outs; live sessions link to a separate preview create.
  const routes = engineRoutes(room.format);
  const Join = routes.Join;
  if (room.format === "branching") {
    return (
      <DecisionGameProvider code={room.workshopCode}>
        <Join />
      </DecisionGameProvider>
    );
  }
  return (
    <ScenarioProvider code={room.workshopCode}>
      <Join />
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
        <Route path="/create/boards" component={CreateBoardsPage} />
        <Route path="/create/briefs/:id" component={CreateBriefPage} />
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
