import {
  createContext,
  type ReactNode,
  useContext,
  useState,
} from "react";

export type DemoRole =
  | "motorist"
  | "mechanic"
  | "partsdealer"
  | "rider"
  | "towing";

export type DemoVehicle = {
  make: string;
  model: string;
  year: string;
  registration: string;
  fuel: string;
  transmission: string;
};

export type DemoMessage = {
  id: string;
  sender: string;
  text: string;
  mine: boolean;
};

export type DemoState = {
  user: {
    name: string;
    email: string;
    phone: string;
  };
  loggedIn: boolean;
  role: DemoRole;
  vehicle: DemoVehicle;
  cartCount: number;
  walletBalance: number;
  mechanicRequestStatus: string;
  partsOrderStatus: string;
  towStatus: string;
  mechanicJobStatus: string;
  dealerOrderStatus: string;
  riderJobStatus: string;
  towingJobStatus: string;
  paymentMethod: string;
  messages: DemoMessage[];
  toast: string | null;
};

const initialState: DemoState = {
  user: {
    name: "Abraham Masai",
    email: "demo@autoassist.co.ke",
    phone: "+254 712 345 678",
  },
  loggedIn: false,
  role: "motorist",
  vehicle: {
    make: "Toyota",
    model: "Fielder",
    year: "2015",
    registration: "KDA XXX X",
    fuel: "Petrol",
    transmission: "Automatic",
  },
  cartCount: 0,
  walletBalance: 18420,
  mechanicRequestStatus: "idle",
  partsOrderStatus: "idle",
  towStatus: "idle",
  mechanicJobStatus: "available",
  dealerOrderStatus: "new order",
  riderJobStatus: "job available",
  towingJobStatus: "tow available",
  paymentMethod: "M-PESA •••• 2481",
  messages: [
    {
      id: "m1",
      sender: "Nairobi Auto Care",
      text: "I have arrived at your location.",
      mine: false,
    },
    {
      id: "m2",
      sender: "You",
      text: "Great, I am coming outside.",
      mine: true,
    },
  ],
  toast: null,
};

type RegisterPayload = {
  name: string;
  email: string;
  phone: string;
};

type DemoContextValue = {
  state: DemoState;
  login: (email: string) => void;
  register: (payload: RegisterPayload) => void;
  selectRole: (role: DemoRole) => void;
  saveVehicle: (vehicle: DemoVehicle) => void;
  sendMessage: (text: string) => void;
  performAction: (pathname: string, label: string) => void;
  getStatusForPath: (pathname: string) => string | undefined;
  clearToast: () => void;
  logout: () => void;
  resetDemo: () => void;
};

const DemoAppContext = createContext<DemoContextValue | null>(null);

export function DemoAppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(initialState);

  const showToast = (message: string) => {
    setState((current) => ({ ...current, toast: message }));
  };

  const login = (email: string) => {
    setState((current) => ({
      ...current,
      loggedIn: true,
      user: { ...current.user, email: email.trim() || current.user.email },
      toast: "Demo login successful.",
    }));
  };

  const register = ({ name, email, phone }: RegisterPayload) => {
    setState((current) => ({
      ...current,
      loggedIn: true,
      user: { name: name.trim(), email: email.trim(), phone: phone.trim() },
      toast: "Account created in demo mode.",
    }));
  };

  const selectRole = (role: DemoRole) => {
    setState((current) => ({
      ...current,
      role,
      toast: `Switched to ${role.replace("partsdealer", "parts dealer")} mode.`,
    }));
  };

  const saveVehicle = (vehicle: DemoVehicle) => {
    setState((current) => ({
      ...current,
      vehicle,
      toast: `${vehicle.make} ${vehicle.model} saved.`,
    }));
  };

  const sendMessage = (text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;

    setState((current) => ({
      ...current,
      messages: [
        ...current.messages,
        {
          id: `${Date.now()}-${current.messages.length}`,
          sender: "You",
          text: cleaned,
          mine: true,
        },
      ],
      toast: "Message sent.",
    }));
  };

  const performAction = (pathname: string, label: string) => {
    setState((current) => {
      let patch: Partial<DemoState> = {};
      let toast = `${label} completed in demo mode.`;

      switch (pathname) {
        case "/motorist/confirm-request":
          patch = { mechanicRequestStatus: "searching for a mechanic" };
          toast = "Request sent to nearby verified mechanics.";
          break;
        case "/motorist/finding-mechanic":
          patch = { mechanicRequestStatus: "mechanic assigned" };
          toast = "Nairobi Auto Care accepted the request.";
          break;
        case "/motorist/mechanic-assigned":
          patch = { mechanicRequestStatus: "mechanic en route" };
          toast = "Mechanic tracking is active.";
          break;
        case "/motorist/inspection-quote":
          patch = { mechanicRequestStatus: "quote approved" };
          toast = "Repair quote approved.";
          break;
        case "/motorist/repair-progress":
          patch = { mechanicRequestStatus: "repair completed — payment due" };
          toast = "Repair marked complete. Payment is ready.";
          break;
        case "/motorist/service-payment":
          patch = {
            mechanicRequestStatus: "service complete",
            walletBalance: Math.max(0, current.walletBalance - 11650),
          };
          toast = "Demo payment of KSh 11,650 completed.";
          break;
        case "/motorist/service-complete":
          patch = { mechanicRequestStatus: "rated and complete" };
          toast = "Rating submitted. Thank you!";
          break;
        case "/motorist/part-details":
          patch = { cartCount: 1, partsOrderStatus: "item in cart" };
          toast = "Brake pad set added to cart.";
          break;
        case "/motorist/parts-checkout":
          patch = {
            cartCount: 0,
            partsOrderStatus: "order placed",
            walletBalance: Math.max(0, current.walletBalance - 7150),
          };
          toast = "Parts order placed. Rider dispatch started.";
          break;
        case "/motorist/finding-rider":
          patch = { partsOrderStatus: "rider assigned" };
          toast = "Verified rider Kevin M. assigned.";
          break;
        case "/motorist/rider-assigned":
          patch = { partsOrderStatus: "delivery active" };
          toast = "Delivery tracking is active.";
          break;
        case "/motorist/request-towing":
          patch = { towStatus: "searching for towing agent" };
          toast = "Towing request sent.";
          break;
        case "/motorist/tow-assigned":
          patch = { towStatus: "tow truck en route" };
          toast = "Metro Tow Services is on the way.";
          break;
        case "/mechanic/job-offer":
          patch = { mechanicJobStatus: "job accepted" };
          toast = "Repair job accepted.";
          break;
        case "/mechanic/navigation":
          patch = { mechanicJobStatus: "arrived at customer" };
          toast = "Arrival confirmed.";
          break;
        case "/mechanic/inspection":
          patch = { mechanicJobStatus: "inspection complete" };
          toast = "Inspection saved.";
          break;
        case "/mechanic/create-quote":
          patch = { mechanicJobStatus: "quote awaiting approval" };
          toast = "Quote sent to customer.";
          break;
        case "/mechanic/awaiting-approval":
          patch = { mechanicJobStatus: "quote approved" };
          toast = "Customer approval simulated.";
          break;
        case "/mechanic/work-progress":
          patch = { mechanicJobStatus: "repair in progress" };
          toast = "Repair milestone updated.";
          break;
        case "/mechanic/complete-job":
          patch = {
            mechanicJobStatus: "job complete",
            walletBalance: current.walletBalance + 4050,
          };
          toast = "Job completed. KSh 4,050 added to demo wallet.";
          break;
        case "/partsdealer/order-details":
          patch = { dealerOrderStatus: "preparing order" };
          toast = "Order accepted for preparation.";
          break;
        case "/partsdealer/prepare-order":
          patch = { dealerOrderStatus: "ready for rider pickup" };
          toast = "Order marked ready for pickup.";
          break;
        case "/partsdealer/ready-pickup":
          patch = { dealerOrderStatus: "rider arrived" };
          toast = "Pickup code verified.";
          break;
        case "/partsdealer/rider-handoff":
          patch = {
            dealerOrderStatus: "handed to rider",
            walletBalance: current.walletBalance + 6800,
          };
          toast = "Order handed to rider. Sale recorded.";
          break;
        case "/rider/delivery-offer":
          patch = { riderJobStatus: "delivery accepted" };
          toast = "Delivery job accepted.";
          break;
        case "/rider/pickup-verification":
          patch = { riderJobStatus: "part collected" };
          toast = "Pickup verified.";
          break;
        case "/rider/active-delivery":
          patch = { riderJobStatus: "delivering to customer" };
          toast = "Delivery status updated.";
          break;
        case "/rider/delivery-complete":
          patch = {
            riderJobStatus: "delivery complete",
            walletBalance: current.walletBalance + 420,
          };
          toast = "Delivery complete. KSh 420 payout recorded.";
          break;
        case "/towing/tow-offer":
          patch = { towingJobStatus: "tow accepted" };
          toast = "Tow request accepted.";
          break;
        case "/towing/en-route":
          patch = { towingJobStatus: "arrived at pickup" };
          toast = "Arrival at pickup confirmed.";
          break;
        case "/towing/pickup-check":
          patch = { towingJobStatus: "vehicle checked" };
          toast = "Pickup checklist completed.";
          break;
        case "/towing/vehicle-secured":
          patch = { towingJobStatus: "vehicle secured" };
          toast = "Vehicle secured for towing.";
          break;
        case "/towing/active-tow":
          patch = { towingJobStatus: "tow in progress" };
          toast = "Tow status updated.";
          break;
        case "/towing/complete-tow":
          patch = {
            towingJobStatus: "tow complete",
            walletBalance: current.walletBalance + 3200,
          };
          toast = "Tow completed. KSh 3,200 payout recorded.";
          break;
        case "/shared/add-payment-method":
          patch = { paymentMethod: "M-PESA •••• 2481" };
          toast = "Payment method saved.";
          break;
        default:
          break;
      }

      return { ...current, ...patch, toast };
    });
  };

  const getStatusForPath = (pathname: string) => {
    if (pathname.startsWith("/motorist/part") || pathname === "/motorist/spare-parts" || pathname === "/motorist/finding-rider" || pathname === "/motorist/rider-assigned") {
      return `Parts order: ${state.partsOrderStatus} • Cart: ${state.cartCount}`;
    }
    if (pathname.startsWith("/motorist/request-towing") || pathname.startsWith("/motorist/tow-assigned")) {
      return `Towing: ${state.towStatus}`;
    }
    if (pathname.startsWith("/motorist/") && !pathname.endsWith("/home") && !pathname.endsWith("/history") && !pathname.includes("vehicle")) {
      return `Repair request: ${state.mechanicRequestStatus}`;
    }
    if (pathname.startsWith("/mechanic/")) return `Mechanic job: ${state.mechanicJobStatus}`;
    if (pathname.startsWith("/partsdealer/")) return `Dealer order: ${state.dealerOrderStatus}`;
    if (pathname.startsWith("/rider/")) return `Rider job: ${state.riderJobStatus}`;
    if (pathname.startsWith("/towing/")) return `Towing job: ${state.towingJobStatus}`;
    if (pathname.startsWith("/shared/payment") || pathname === "/wallet") return `Payment: ${state.paymentMethod}`;
    return undefined;
  };

  const clearToast = () => {
    setState((current) => ({ ...current, toast: null }));
  };

  const logout = () => {
    setState((current) => ({ ...current, loggedIn: false, toast: "Logged out." }));
  };

  const resetDemo = () => {
    setState({ ...initialState, toast: "Demo state reset." });
  };

  return (
    <DemoAppContext.Provider
      value={{
        state,
        login,
        register,
        selectRole,
        saveVehicle,
        sendMessage,
        performAction,
        getStatusForPath,
        clearToast,
        logout,
        resetDemo,
      }}
    >
      {children}
    </DemoAppContext.Provider>
  );
}

export function useDemoApp() {
  const context = useContext(DemoAppContext);
  if (!context) {
    throw new Error("useDemoApp must be used inside DemoAppProvider");
  }
  return context;
}

export function formatKES(value: number) {
  return `KSh ${value.toLocaleString("en-KE")}`;
}
