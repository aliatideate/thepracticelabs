import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScenarioProvider } from "@/lib/scenario";
import JoinScreen from "./pages/join";
import SimulationApp from "./simulation/SimulationApp";
import FacilitatePage from "./pages/facilitate";
import PrintPack from "./pages/print";
import NotFound from "./pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={JoinScreen} />
      <Route path="/play/:sessionId/:screen" component={SimulationApp} />
      <Route path="/facilitate/:secret" component={FacilitatePage} />
      <Route path="/print" component={PrintPack} />
      <Route component={NotFound} />
    </Switch>
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
