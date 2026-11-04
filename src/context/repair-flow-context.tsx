import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/context/auth-context";
import {
  createRepairRequest,
  getMechanicProfile,
  getMechanicRepairs,
  getMotoristRepairs,
  getOwnedVehicles,
  getRepairRequest,
  getVerifiedMechanics,
  saveInspection as saveBackendInspection,
  saveMechanicProfile as saveBackendMechanicProfile,
  saveRepairQuote,
  saveVehicle as saveBackendVehicle,
  submitRating,
  subscribeToRepair,
  updateRepairStatus,
} from "@/services/repair-backend";

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
  latitude?: number | null;
  longitude?: number | null;
};

export type MechanicOption = {
  id: string;
  name: string;
  specialties: string[];
  rating: number;
  reviews: number;
  distanceKm: number;
  match: number;
  location?: string;
  live?: boolean;
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
    latitude: null,
    longitude: null,
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
  mechanics: MechanicOption[];
  selectedMechanic: MechanicOption;
  backendLoading: boolean;
  backendError: string | null;
  liveBackend: boolean;
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
  refreshBackend: () => Promise<void>;
};

const RepairFlowContext = createContext<RepairFlowContextValue | null>(null);

function isRepairStatus(value: string): value is RepairStatus {
  return [
    "idle", "draft", "requested", "accepted", "en-route", "arrived", "inspected",
    "quoted", "approved", "repairing", "repair-complete", "paid", "completed", "cancelled",
  ].includes(value);
}

export function RepairFlowProvider({ children }: { children: ReactNode }) {
  const { backendEnabled, user, profile } = useAuth();
  const liveBackend = backendEnabled && Boolean(user && profile);
  const [state, setState] = useState<RepairFlowState>(initialState);
  const [mechanics, setMechanics] = useState<MechanicOption[]>(MECHANICS);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [backendLoading, setBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const selectedMechanic = useMemo(
    () =>
      mechanics.find((mechanic) => mechanic.id === state.selectedMechanicId) ??
      mechanics[0] ??
      MECHANICS[0],
    [mechanics, state.selectedMechanicId],
  );

  const hydrateRepair = useCallback((row: any) => {
    if (!row) return;
    const vehicle = Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles;
    const inspections = Array.isArray(row.inspections) ? row.inspections : row.inspections ? [row.inspections] : [];
    const quotes = Array.isArray(row.repair_quotes) ? row.repair_quotes : row.repair_quotes ? [row.repair_quotes] : [];
    const ratings = Array.isArray(row.ratings) ? row.ratings : row.ratings ? [row.ratings] : [];
    const inspection = inspections[0];
    const quote = quotes[0];
    const rating = ratings[0];

    setState((current) => ({
      ...current,
      requestId: row.id,
      status: isRepairStatus(row.status) ? row.status : current.status,
      submittedAt: row.submitted_at ?? current.submittedAt,
      selectedMechanicId: row.mechanic_id ?? current.selectedMechanicId,
      problem: {
        description: row.description ?? current.problem.description,
        symptom: row.symptom ?? current.problem.symptom,
        location: row.location_text ?? current.problem.location,
        preferredTime: row.preferred_time ?? current.problem.preferredTime,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
      },
      vehicle: vehicle
        ? {
            make: vehicle.make,
            model: vehicle.model,
            year: String(vehicle.year),
            registration: vehicle.registration,
            powerSource: vehicle.power_source as PowerSource,
            transmission: vehicle.transmission,
          }
        : current.vehicle,
      inspection: inspection
        ? {
            brakePads: inspection.brake_pads,
            brakeDiscs: inspection.brake_discs,
            brakeFluid: inspection.brake_fluid,
            notes: inspection.notes,
          }
        : current.inspection,
      quote: quote
        ? {
            labourDescription: quote.labour_description,
            labourAmount: Number(quote.labour_amount),
            partDescription: quote.part_description,
            partAmount: Number(quote.part_amount),
            serviceFee: Number(quote.service_fee),
            total: Number(quote.total ?? 0),
          }
        : current.quote,
      paid: row.status === "paid" || row.status === "completed",
      rating: rating?.rating ?? current.rating,
    }));

    if (vehicle?.id) setVehicleId(vehicle.id);
  }, []);

  const loadRepairById = useCallback(async (requestId: string) => {
    const { data, error } = await getRepairRequest(requestId);
    if (error) throw error;
    hydrateRepair(data);
  }, [hydrateRepair]);

  const refreshBackend = useCallback(async () => {
    if (!liveBackend || !user || !profile) return;
    setBackendLoading(true);
    setBackendError(null);

    try {
      if (profile.role === "motorist") {
        const [vehiclesResult, mechanicsResult, repairsResult] = await Promise.all([
          getOwnedVehicles(user.id),
          getVerifiedMechanics(),
          getMotoristRepairs(user.id),
        ]);

        if (vehiclesResult.error) throw vehiclesResult.error;
        if (mechanicsResult.error) throw mechanicsResult.error;
        if (repairsResult.error) throw repairsResult.error;

        const liveMechanics: MechanicOption[] = (mechanicsResult.data ?? []).map((item) => ({
          id: item.user_id,
          name: item.garage_name || "Verified mechanic",
          specialties: item.services,
          rating: Number(item.rating),
          reviews: item.reviews_count,
          distanceKm: 0,
          match: item.services.some((service) => service.toLowerCase().includes(state.problem.symptom.toLowerCase())) ? 96 : 82,
          location: item.location,
          live: true,
        }));
        setMechanics(liveMechanics);

        const firstVehicle = vehiclesResult.data?.[0];
        if (firstVehicle) {
          setVehicleId(firstVehicle.id);
          setState((current) => ({
            ...current,
            vehicleSaved: true,
            vehicle: {
              make: firstVehicle.make,
              model: firstVehicle.model,
              year: String(firstVehicle.year),
              registration: firstVehicle.registration,
              powerSource: firstVehicle.power_source as PowerSource,
              transmission: firstVehicle.transmission,
            },
          }));
        } else {
          setVehicleId(null);
          setState((current) => ({ ...current, vehicleSaved: false }));
        }

        const latestRepair = repairsResult.data?.find((repair: any) => !["completed", "cancelled"].includes(repair.status)) ?? repairsResult.data?.[0];
        if (latestRepair?.id) await loadRepairById(latestRepair.id);
      } else if (profile.role === "mechanic") {
        const [mechanicProfileResult, repairsResult] = await Promise.all([
          getMechanicProfile(user.id),
          getMechanicRepairs(user.id),
        ]);

        if (mechanicProfileResult.error) throw mechanicProfileResult.error;
        if (repairsResult.error) throw repairsResult.error;

        const mechanic = mechanicProfileResult.data;
        if (mechanic) {
          setState((current) => ({
            ...current,
            mechanicProfile: {
              ...current.mechanicProfile,
              fullName: profile.full_name,
              phone: profile.phone,
              garageName: mechanic.garage_name,
              location: mechanic.location,
              services: mechanic.services.join(", "),
              verified: mechanic.verified,
            },
          }));
        } else {
          setState((current) => ({
            ...current,
            mechanicProfile: {
              ...current.mechanicProfile,
              fullName: profile.full_name,
              phone: profile.phone,
              verified: false,
            },
          }));
        }

        const latestRepair = repairsResult.data?.find((repair: any) => !["completed", "cancelled"].includes(repair.status)) ?? repairsResult.data?.[0];
        if (latestRepair?.id) await loadRepairById(latestRepair.id);
      }
    } catch (error) {
      setBackendError(error instanceof Error ? error.message : "Unable to synchronize AutoAssist data.");
    } finally {
      setBackendLoading(false);
    }
  }, [liveBackend, user, profile, loadRepairById, state.problem.symptom]);

  useEffect(() => {
    if (!liveBackend) {
      setMechanics(MECHANICS);
      return;
    }
    void refreshBackend();
  }, [liveBackend, user?.id, profile?.role]);

  useEffect(() => {
    if (!liveBackend || !state.requestId || state.requestId.startsWith("REP-")) return;
    return subscribeToRepair(state.requestId, () => {
      void loadRepairById(state.requestId!).catch((error) => {
        setBackendError(error instanceof Error ? error.message : "Realtime repair refresh failed.");
      });
    });
  }, [liveBackend, state.requestId, loadRepairById]);

  const runBackend = (operation: () => Promise<void>) => {
    if (!liveBackend) return;
    setBackendError(null);
    void operation().catch((error) => {
      setBackendError(error instanceof Error ? error.message : "AutoAssist backend operation failed.");
      void refreshBackend();
    });
  };

  const saveVehicle = (vehicle: Vehicle) => {
    setState((current) => ({ ...current, vehicle, vehicleSaved: true }));
    if (!user || profile?.role !== "motorist") return;

    runBackend(async () => {
      const { data, error } = await saveBackendVehicle(
        user.id,
        {
          ...vehicle,
          year: Number(vehicle.year),
        },
        vehicleId ?? undefined,
      );
      if (error) throw error;
      setVehicleId(data.id);
    });
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
      requestId: liveBackend ? current.requestId : current.requestId ?? `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "requested",
      submittedAt: new Date().toISOString(),
      quote: null,
      paid: false,
      rating: null,
      repairStep: 0,
    }));

    if (!user || profile?.role !== "motorist") return;

    runBackend(async () => {
      let liveVehicleId = vehicleId;
      if (!liveVehicleId) {
        const vehicleResult = await saveBackendVehicle(user.id, {
          ...state.vehicle,
          year: Number(state.vehicle.year),
        });
        if (vehicleResult.error) throw vehicleResult.error;
        liveVehicleId = vehicleResult.data.id;
        setVehicleId(liveVehicleId);
      }

      const mechanic = mechanics.find((item) => item.id === state.selectedMechanicId);
      if (!mechanic?.live) throw new Error("Choose a verified live mechanic before sending this request.");

      const { data, error } = await createRepairRequest(user.id, {
        vehicleId: liveVehicleId,
        mechanicId: mechanic.id,
        description: state.problem.description,
        symptom: state.problem.symptom,
        locationText: state.problem.location,
        latitude: state.problem.latitude ?? null,
        longitude: state.problem.longitude ?? null,
        preferredTime: state.problem.preferredTime,
      });
      if (error) throw error;
      setState((current) => ({ ...current, requestId: data.id, submittedAt: data.submitted_at, status: "requested" }));
    });
  };

  const updateStatus = (status: Exclude<RepairStatus, "idle" | "draft">) => {
    setState((current) => ({ ...current, status, paid: status === "paid" || status === "completed" ? true : current.paid }));
    if (!state.requestId || state.requestId.startsWith("REP-")) return;
    runBackend(async () => {
      const { error } = await updateRepairStatus(state.requestId!, status);
      if (error) throw error;
    });
  };

  const cancelRequest = () => updateStatus("cancelled");

  const saveMechanicProfile = (mechanicProfile: Omit<MechanicProfile, "verified">) => {
    setState((current) => ({
      ...current,
      mechanicProfile: {
        ...mechanicProfile,
        verified: current.mechanicProfile.verified,
      },
    }));

    if (!user || profile?.role !== "mechanic") return;
    runBackend(async () => {
      const { error } = await saveBackendMechanicProfile(user.id, {
        garageName: mechanicProfile.garageName,
        location: mechanicProfile.location,
        services: mechanicProfile.services.split(",").map((item) => item.trim()).filter(Boolean),
      });
      if (error) throw error;
    });
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
    if (liveBackend) {
      setState((current) => ({ ...current, mechanicProfile: { ...current.mechanicProfile, verified: false } }));
      return;
    }
    setState((current) => ({ ...current, mechanicProfile: { ...current.mechanicProfile, verified: true } }));
  };

  const acceptRequest = () => updateStatus("accepted");
  const declineRequest = () => setState((current) => ({ ...current, status: "requested" }));
  const startTravel = () => updateStatus("en-route");
  const confirmArrival = () => updateStatus("arrived");

  const saveInspection = (inspection: Inspection) => {
    setState((current) => ({ ...current, inspection, status: "inspected" }));
    if (!user || !state.requestId || state.requestId.startsWith("REP-")) return;

    runBackend(async () => {
      const inspectionResult = await saveBackendInspection({
        requestId: state.requestId!,
        mechanicId: user.id,
        brakePads: inspection.brakePads,
        brakeDiscs: inspection.brakeDiscs,
        brakeFluid: inspection.brakeFluid,
        notes: inspection.notes,
      });
      if (inspectionResult.error) throw inspectionResult.error;
      const statusResult = await updateRepairStatus(state.requestId!, "inspected");
      if (statusResult.error) throw statusResult.error;
    });
  };

  const sendQuote = (quote: Omit<RepairQuote, "total">) => {
    const total = quote.labourAmount + quote.partAmount + quote.serviceFee;
    setState((current) => ({ ...current, quote: { ...quote, total }, status: "quoted" }));
    if (!user || !state.requestId || state.requestId.startsWith("REP-")) return;

    runBackend(async () => {
      const quoteResult = await saveRepairQuote({
        requestId: state.requestId!,
        mechanicId: user.id,
        ...quote,
      });
      if (quoteResult.error) throw quoteResult.error;
      const statusResult = await updateRepairStatus(state.requestId!, "quoted");
      if (statusResult.error) throw statusResult.error;
    });
  };

  const approveQuote = () => updateStatus("approved");
  const startRepair = () => {
    setState((current) => ({ ...current, status: "repairing", repairStep: 1 }));
    if (state.requestId && !state.requestId.startsWith("REP-")) {
      runBackend(async () => {
        const { error } = await updateRepairStatus(state.requestId!, "repairing");
        if (error) throw error;
      });
    }
  };

  const advanceRepair = () => {
    setState((current) => ({ ...current, status: "repairing", repairStep: Math.min(4, current.repairStep + 1) }));
  };

  const completeRepair = () => {
    setState((current) => ({ ...current, status: "repair-complete", repairStep: 4 }));
    if (state.requestId && !state.requestId.startsWith("REP-")) {
      runBackend(async () => {
        const { error } = await updateRepairStatus(state.requestId!, "repair-complete");
        if (error) throw error;
      });
    }
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
    if (state.requestId && !state.requestId.startsWith("REP-")) {
      runBackend(async () => {
        const { error } = await updateRepairStatus(state.requestId!, "paid");
        if (error) throw error;
      });
    }
  };

  const rateRepair = (rating: number) => {
    setState((current) => ({ ...current, status: "completed", rating }));
    if (!user || !state.requestId || state.requestId.startsWith("REP-") || !state.selectedMechanicId) return;

    runBackend(async () => {
      const ratingResult = await submitRating({
        requestId: state.requestId!,
        motoristId: user.id,
        mechanicId: state.selectedMechanicId!,
        rating,
      });
      if (ratingResult.error) throw ratingResult.error;
      const statusResult = await updateRepairStatus(state.requestId!, "completed");
      if (statusResult.error) throw statusResult.error;
    });
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
        mechanics,
        selectedMechanic,
        backendLoading,
        backendError,
        liveBackend,
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
        refreshBackend,
      }}
    >
      {children}
    </RepairFlowContext.Provider>
  );
}

export function useRepairFlow() {
  const context = useContext(RepairFlowContext);
  if (!context) throw new Error("useRepairFlow must be used inside RepairFlowProvider");
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
    "repair-complete": "Visit finished — please rate your mechanic",
    paid: "Payment completed",
    completed: "Service completed",
    cancelled: "Request cancelled",
  };
  return labels[status];
}

export function formatKES(value: number) {
  return `KSh ${Math.round(value).toLocaleString("en-KE")}`;
}
