import RefundView from "./views/RefundView";
import Requests from "./views/Requests";

var routes = [
  {
    path: "/home",
    name: "Dashboard",
    icon: "tim-icons icon-chart-pie-36",
    component: RefundView,
  },
  {
    path: "/requests",
    name: "Requests",
    icon: "tim-icons icon-atom",
    component: Requests,
  },
];
export default routes;
