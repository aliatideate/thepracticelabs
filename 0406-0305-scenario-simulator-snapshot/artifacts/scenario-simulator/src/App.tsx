import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import LandingScreen from "./pages/landing";
import EntryScreen from "./pages/entry";
import SimulationApp from "./simulation/SimulationApp";
import FacilitatorDashboard from "./pages/results";
import ModeratorDashboard from "./pages/moderator";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingScreen} />
      <Route path="/w/:code" component={EntryScreen} />
      <Route path="/play/:sessionId/:screen" component={SimulationApp} />
      <Route path="/results/:code" component={FacilitatorDashboard} />
      <Route path="/moderator/:code" component={ModeratorDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
