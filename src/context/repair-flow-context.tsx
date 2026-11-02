import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

export type PowerSource = "Petrol" | "Diesel" | "Hybrid" | "Electric" | "LPG";

export type Vehicle = {
  make: string;
  model: string;
  year: string;
  registration: string;
  powerSource: PowerSource;
  transmission: string;
};

export type ProblemDetails = {
  description: string;
  symptom: "Brakes" | "Engine" | "Electrical" | "Other";
  location: string;
  preferredTime: string;
};

export type MechanicOption = {
  id: string;
  name: string;
  specialties: string[];
  rating: number;
  reviews: number;
  distanceKm: number;
  match: number;
};

export type MechanicProfile = {
  fullName: string;
  phone: string;
  nationalId: string;
  garageName: string;
  location: string;
  services: string;
  verified: boolean;
};

export type Inspection = {
  brakePads: "Replace" | "Serviceable";
  brakeDiscs: "Replace" | "Serviceable";
  brakeFluid: "Low" | "Normal";
  notes: string;
};

export type RepairQuote = {
  labourDescription: string;
  labourAmount: number;
  partDescription: string;
  partAmount: number;
  serviceFee: number;
  total: number;
};

export type RepairStatus =
  | "idle"
  | "draft"
  | "requested"
  | "accepted"
  | "en-route"
  | "arrived"
  | "inspected"
  | "quoted"
  | "approved"
  | "repairing"
  | "repair-complete"
  | "paid"
  | "completed"
  | "cancelled";

export type RepairFlowState = {
  vehicle: Vehicle;
  vehicleSaved: boolean;
  problem: ProblemDetails;
  selectedMechanicId: string | null;
  requestId: string | null;
  status: RepairStatus;
  submittedAt: string | null;
  mechanicProfile: MechanicProfile;
  verificationItems: {
    nationalId: boolean;
    businessPermit: boolean;
    certificates: boolean;
    profilePhoto: boolean;
  };
  inspection: Inspection;
  quote: RepairQuote | null;
  repairStep: number;
  paid: boolean;
  rating: number | null;
  mechanicEarnings: number;
};

export const MECHANICS: MechanicOption[] = [
  {
    id: "nairobi-auto-care",
    name: "Nairobi Auto Care",
    specialties: ["Brakes", "Diagnostics", "Suspension"],
    rating: 4.8,
    reviews: 243,
    distanceKm: 1.2,
    match: 96,
  },
  {
    id: "westlands-motor-clinic",
    name: "Westlands Motor Clinic",
    specialties: ["Brakes", "Engine", "Diagnostics"],
    rating: 4.7,
    reviews: 181,
    distanceKm: 4.9,
    match: 88,
  },
  {
    id: "city-brake-specialists",
    name: "City Brake Specialists",
    specialties: ["Brakes", "Suspension"],
    rating: 4.6,
    reviews: 126,
    distanceKm: 6.1,
    match: 84,
  },
];

const initialState: RepairFlowState = {
  vehicle: {
    make: "Toyota",
    model: "Fielder",
    year: "2015",
    registration: "KDA XXX X",
    powerSource: "Petrol",
    transmission: "Automatic",
  },
  vehicleSaved: true,
  problem: {
    description: "The car makes a grinding sound when braking and the pedal feels soft.",
    symptom: "Brakes",
    location: "Westlands, Nairobi",
    preferredTime: "As soon as possible",
  },
  selectedMechanicId: "nairobi-auto-care",
  requestId: null,
  status: "idle",
  submittedAt: null,
  mechanicProfile: {
    fullName: "Daniel Mwangi",
    phone: "+254 712 345 678",
    nationalId: "12345678",
    garageName: "Nairobi Auto Care",
    location: "Ngara, Nairobi",
    services: "Brakes, diagnostics, suspension",
    verified: false,
  },
  verificationItems: {
    nationalId: false,
    businessPermit: false,
    certificates: false,
    profilePhoto: false,
  },
  inspection: {
    brakePads: "Replace",
    brakeDiscs: "Serviceable",
    brakeFluid: "Low",
    notes: "Front brake pads are below safe thickness. Brake fluid is low.",
  },
  quote: null,
  repairStep: 0,
  paid: false,
  rating: null,
  mechanicEarnings: 8400,
};

type RepairFlowContextValue = {
  state: RepairFlowState;
  selectedMechanic: MechanicOption;
  saveVehicle: (vehicle: Vehicle) => void;
  saveProblem: (problem: ProblemDetails) => void;
  selectMechanic: (id: string) => void;
  submitRequest: () => void;
  cancelRequest: () => void;
  saveMechanicProfile: (profile: Omit<MechanicProfile, "verified">) => void;
  toggleVerificationItem: (key: keyof RepairFlowState["verificationItems"]) => void;
  submitVerification: () => void;
  acceptRequest: () => void;
  declineRequest: () => void;
  startTravel: () => void;
  confirmArrival: () => void;
  saveInspection: (inspection: Inspection) => void;
  sendQuote: (quote: Omit<RepairQuote, "total">) => void;
  approveQuote: () => void;
  startRepair: () => void;
  advanceRepair: () => void;
  completeRepair: () => void;
  payRepair: () => void;
  rateRepair: (rating: number) => void;
  resetRepair: () => void;
};

const RepairFlowContext = createContext<RepairFlowContextValue | null>(null);

export function RepairFlowProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RepairFlowState>(initialState);

  const selectedMechanic = useMemo(
    () =>
      MECHANICS.find((mechanic) => mechanic.id === state.selectedMechanicId) ??
      MECHANICS[0],
    [state.selectedMechanicId],
  );

  const saveVehicle = (vehicle: Vehicle) => {
    setState((current) => ({ ...current, vehicle, vehicleSaved: true }));
  };

  const saveProblem = (problem: ProblemDetails) => {
    setState((current) => ({ ...current, problem, status: "draft" }));
  };

  const selectMechanic = (id: string) => {
    setState((current) => ({ ...current, selectedMechanicId: id }));
  };

  const submitRequest = () => {
    setState((current) => ({
      ...current,
      requestId: current.requestId ?? `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "requested",
      submittedAt: new Date().toISOString(),
      quote: null,
      paid: false,
      rating: null,
      repairStep: 0,
    }));
  };

  const cancelRequest = () => {
    setState((current) => ({ ...current, status: "cancelled" }));
  };

  const saveMechanicProfile = (profile: Omit<MechanicProfile, "verified">) => {
    setState((current) => ({
      ...current,
      mechanicProfile: {
        ...profile,
        verified: current.mechanicProfile.verified,
      },
    }));
  };

  const toggleVerificationItem = (key: keyof RepairFlowState["verificationItems"]) => {
    setState((current) => ({
      ...current,
      verificationItems: {
        ...current.verificationItems,
        [key]: !current.verificationItems[key],
      },
    }));
  };

  const submitVerification = () => {
    setState((current) => ({
      ...current,
      mechanicProfile: { ...current.mechanicProfile, verified: true },
    }));
  };

  const acceptRequest = () => {
    setState((current) => ({ ...current, status: "accepted" }));
  };

  const declineRequest = () => {
    setState((current) => ({ ...current, status: "requested" }));
  };

  const startTravel = () => {
    setState((current) => ({ ...current, status: "en-route" }));
  };

  const confirmArrival = () => {
    setState((current) => ({ ...current, status: "arrived" }));
  };

  const saveInspection = (inspection: Inspection) => {
    setState((current) => ({ ...current, inspection, status: "inspected" }));
  };

  const sendQuote = (quote: Omit<RepairQuote, "total">) => {
    const total = quote.labourAmount + quote.partAmount + quote.serviceFee;
    setState((current) => ({
      ...current,
      quote: { ...quote, total },
      status: "quoted",
    }));
  };

  const approveQuote = () => {
    setState((current) => ({ ...current, status: "approved" }));
  };

  const startRepair = () => {
    setState((current) => ({ ...current, status: "repairing", repairStep: 1 }));
  };

  const advanceRepair = () => {
    setState((current) => ({
      ...current,
      status: "repairing",
      repairStep: Math.min(4, current.repairStep + 1),
    }));
  };

  const completeRepair = () => {
    setState((current) => ({ ...current, status: "repair-complete", repairStep: 4 }));
  };

  const payRepair = () => {
    setState((current) => {
      if (current.paid) return current;
      const labourPayout = Math.round((current.quote?.labourAmount ?? 0) * 0.9);
      return {
        ...current,
        status: "paid",
        paid: true,
        mechanicEarnings: current.mechanicEarnings + labourPayout,
      };
    });
  };

  const rateRepair = (rating: number) => {
    setState((current) => ({ ...current, status: "completed", rating }));
  };

  const resetRepair = () => {
    setState((current) => ({
      ...initialState,
      vehicle: current.vehicle,
      vehicleSaved: current.vehicleSaved,
      mechanicProfile: current.mechanicProfile,
      verificationItems: current.verificationItems,
      mechanicEarnings: current.mechanicEarnings,
    }));
  };

  return (
    <RepairFlowContext.Provider
      value={{
        state,
        selectedMechanic,
        saveVehicle,
        saveProblem,
        selectMechanic,
        submitRequest,
        cancelRequest,
        saveMechanicProfile,
        toggleVerificationItem,
        submitVerification,
        acceptRequest,
        declineRequest,
        startTravel,
        confirmArrival,
        saveInspection,
        sendQuote,
        approveQuote,
        startRepair,
        advanceRepair,
        completeRepair,
        payRepair,
        rateRepair,
        resetRepair,
      }}
    >
      {children}
    </RepairFlowContext.Provider>
  );
}

export function useRepairFlow() {
  const context = useContext(RepairFlowContext);
  if (!context) {
    throw new Error("useRepairFlow must be used inside RepairFlowProvider");
  }
  return context;
}

export function repairStatusLabel(status: RepairStatus) {
  const labels: Record<RepairStatus, string> = {
    idle: "No active repair",
    draft: "Problem saved",
    requested: "Waiting for mechanic",
    accepted: "Mechanic accepted",
    "en-route": "Mechanic en route",
    arrived: "Mechanic arrived",
    inspected: "Inspection completed",
    quoted: "Quote awaiting approval",
    approved: "Quote approved",
    repairing: "Repair in progress",
    "repair-complete": "Repair complete — payment due",
    paid: "Payment completed",
    completed: "Service completed",
    cancelled: "Request cancelled",
  };
  return labels[status];
}

export function formatKES(value: number) {
  return `KSh ${Math.round(value).toLocaleString("en-KE")}`;
}
