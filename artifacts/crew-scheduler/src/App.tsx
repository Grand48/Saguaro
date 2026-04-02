import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "./components/layout/app-layout";
import Dashboard from "./pages/dashboard";
import JobsList from "./pages/jobs/index";
import JobDetail from "./pages/jobs/[id]";
import CrewList from "./pages/crew/index";
import CrewDetail from "./pages/crew/[id]";
import LocationsList from "./pages/locations/index";
import LocationDetail from "./pages/locations/[id]";
import TimeOff from "./pages/time-off/index";
import Notifications from "./pages/notifications/index";
import TimeClock from "./pages/time-clock/index";
import SideQuests from "./pages/quests/index";
import EmployeeRequests from "./pages/requests/index";
import Lodging from "./pages/lodging/index";
import Vehicles from "./pages/vehicles/index";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/jobs" component={JobsList} />
        <Route path="/jobs/:id" component={JobDetail} />
        <Route path="/crew" component={CrewList} />
        <Route path="/crew/:id" component={CrewDetail} />
        <Route path="/locations" component={LocationsList} />
        <Route path="/locations/:id" component={LocationDetail} />
        <Route path="/time-off" component={TimeOff} />
        <Route path="/time-clock" component={TimeClock} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/quests" component={SideQuests} />
        <Route path="/requests" component={EmployeeRequests} />
        <Route path="/lodging" component={Lodging} />
        <Route path="/vehicles" component={Vehicles} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
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
