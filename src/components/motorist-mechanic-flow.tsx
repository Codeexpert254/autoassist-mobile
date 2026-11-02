import { useRouter } from "expo-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDemoApp } from "@/context/demo-app-context";
import {
  MECHANICS,
  formatKES,
  repairStatusLabel,
  type Inspection,
  type MechanicProfile,
  type ProblemDetails,
  type RepairStatus,
  useRepairFlow,
} from "@/context/repair-flow-context";

const functionalPaths = new Set([
  "/motorist/describe-problem",
  "/motorist/preliminary-estimate",
  "/motorist/mechanic-results",
  "/motorist/mechanic-profile",
  "/motorist/confirm-request",
  "/motorist/finding-mechanic",
  "/motorist/mechanic-assigned",
  "/motorist/inspection-quote",
  "/motorist/repair-progress",
  "/motorist/service-payment",
  "/motorist/service-complete",
  "/motorist/history",
  "/motorist/vehicle-details",
  "/mechanic/registration",
  "/mechanic/verification",
  "/mechanic/dashboard",
  "/mechanic/job-offer",
  "/mechanic/job-details",
  "/mechanic/navigation",
  "/mechanic/inspection",
  "/mechanic/create-quote",
  "/mechanic/awaiting-approval",
  "/mechanic/work-progress",
  "/mechanic/complete-job",
  "/mechanic/earnings",
  "/mechanic/profile",
  "/mechanic/history",
]);

export function isMotoristMechanicFunctionalPath(pathname: string) {
  return functionalPaths.has(pathname);
}

export function MotoristMechanicFlow({ pathname }: { pathname: string }) {
  switch (pathname) {
    case "/motorist/describe-problem":
      return <DescribeProblemScreen />;
    case "/motorist/preliminary-estimate":
      return <EstimateScreen />;
    case "/motorist/mechanic-results":
      return <MechanicResultsScreen />;
    case "/motorist/mechanic-profile":
      return <MechanicProfileScreen />;
    case "/motorist/confirm-request":
      return <ConfirmRequestScreen />;
    case "/motorist/finding-mechanic":
      return <FindingMechanicScreen />;
    case "/motorist/mechanic-assigned":
      return <MechanicAssignedScreen />;
    case "/motorist/inspection-quote":
      return <MotoristQuoteScreen />;
    case "/motorist/repair-progress":
      return <MotoristRepairProgressScreen />;
    case "/motorist/service-payment":
      return <ServicePaymentScreen />;
    case "/motorist/service-complete":
      return <ServiceCompleteScreen />;
    case "/motorist/history":
      return <MotoristHistoryScreen />;
    case "/motorist/vehicle-details":
      return <VehicleDetailsScreen />;
    case "/mechanic/registration":
      return <MechanicRegistrationScreen />;
    case "/mechanic/verification":
      return <MechanicVerificationScreen />;
    case "/mechanic/dashboard":
      return <MechanicDashboardScreen />;
    case "/mechanic/job-offer":
      return <MechanicJobOfferScreen />;
    case "/mechanic/job-details":
      return <MechanicJobDetailsScreen />;
    case "/mechanic/navigation":
      return <MechanicNavigationScreen />;
    case "/mechanic/inspection":
      return <MechanicInspectionScreen />;
    case "/mechanic/create-quote":
      return <CreateQuoteScreen />;
    case "/mechanic/awaiting-approval":
      return <AwaitingApprovalScreen />;
    case "/mechanic/work-progress":
      return <MechanicWorkProgressScreen />;
    case "/mechanic/complete-job":
      return <MechanicCompleteJobScreen />;
    case "/mechanic/earnings":
      return <MechanicEarningsScreen />;
    case "/mechanic/profile":
      return <MechanicOwnProfileScreen />;
    case "/mechanic/history":
      return <MechanicHistoryScreen />;
    default:
      return null;
  }
}

function Screen({
  title,
  subtitle,
  children,
  footer,
  showBack = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  showBack?: boolean;
}) {
  const router = useRouter();
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          {showBack ? (
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backText}>‹</Text>
            </Pressable>
          ) : null}
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
          <View style={{ height: footer ? 96 : 28 }} />
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </SafeAreaView>
    </View>
  );
}

function Card({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "blue" | "green" | "amber" }) {
  return <View style={[styles.card, styles[`card_${tone}`]]}>{children}</View>;
}

function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Value({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return <Text style={[styles.value, strong && styles.valueStrong]}>{children}</Text>;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "phone-pad";
}) {
  return (
    <View style={styles.fieldWrap}>
      <Label>{label}</Label>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#98A2B3"
        multiline={multiline}
        keyboardType={keyboardType}
        textAlignVertical={multiline ? "top" : "center"}
      />
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled && styles.buttonDisabled]}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.secondaryButton}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function StatusCard({ status }: { status: RepairStatus }) {
  return (
    <Card tone="blue">
      <Text style={styles.eyebrow}>LIVE REPAIR STATUS</Text>
      <Text style={styles.cardTitle}>{repairStatusLabel(status)}</Text>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ChoiceRow({ choices, selected, onSelect }: { choices: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <View style={styles.choiceWrap}>
      {choices.map((choice) => (
        <Pressable
          key={choice}
          onPress={() => onSelect(choice)}
          style={[styles.choice, choice === selected && styles.choiceActive]}
        >
          <Text style={[styles.choiceText, choice === selected && styles.choiceTextActive]}>{choice}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function DescribeProblemScreen() {
  const router = useRouter();
  const { state, saveProblem } = useRepairFlow();
  const [description, setDescription] = useState(state.problem.description);
  const [symptom, setSymptom] = useState<ProblemDetails["symptom"]>(state.problem.symptom);
  const [location, setLocation] = useState(state.problem.location);
  const [preferredTime, setPreferredTime] = useState(state.problem.preferredTime);
  const valid = description.trim().length >= 10 && location.trim().length >= 3;

  return (
    <Screen
      title="Describe the problem"
      subtitle={`${state.vehicle.make} ${state.vehicle.model} • ${state.vehicle.year} • ${state.vehicle.powerSource}`}
      footer={<PrimaryButton disabled={!valid} label="Get preliminary estimate" onPress={() => {
        saveProblem({ description: description.trim(), symptom, location: location.trim(), preferredTime: preferredTime.trim() || "As soon as possible" });
        router.push("/motorist/preliminary-estimate");
      }} />}
    >
      <Field label="What are you noticing?" value={description} onChangeText={setDescription} multiline placeholder="Describe the sound, warning light or behaviour..." />
      <Label>Quick symptom</Label>
      <ChoiceRow choices={["Brakes", "Engine", "Electrical", "Other"]} selected={symptom} onSelect={(value) => setSymptom(value as ProblemDetails["symptom"])} />
      <Field label="Current location" value={location} onChangeText={setLocation} placeholder="Westlands, Nairobi" />
      <Field label="Preferred time" value={preferredTime} onChangeText={setPreferredTime} placeholder="As soon as possible" />
    </Screen>
  );
}

function EstimateScreen() {
  const router = useRouter();
  const { state } = useRepairFlow();
  const estimate = useMemo(() => {
    if (state.problem.symptom === "Brakes") return { issue: "Brake system inspection / repair", range: "KSh 10,000 – 18,000" };
    if (state.problem.symptom === "Electrical") return { issue: "Electrical / charging system diagnosis", range: "KSh 3,000 – 15,000" };
    if (state.problem.symptom === "Engine" && state.vehicle.powerSource === "Electric") return { issue: "Electric drive / battery diagnostics", range: "KSh 8,000 – 25,000" };
    if (state.problem.symptom === "Engine") return { issue: "Engine and powertrain diagnostics", range: "KSh 8,000 – 25,000" };
    return { issue: "General vehicle inspection", range: "KSh 5,000 – 20,000" };
  }, [state.problem.symptom, state.vehicle.powerSource]);

  return (
    <Screen title="Preliminary estimate" subtitle="Based on the problem information you provided" footer={<PrimaryButton label="Find matching mechanics" onPress={() => router.push("/motorist/mechanic-results")} />}>
      <Card tone="blue">
        <Text style={styles.eyebrow}>LIKELY ISSUE</Text>
        <Text style={styles.heroTitle}>{estimate.issue}</Text>
        <Text style={styles.heroAmount}>{estimate.range}</Text>
        <Text style={styles.muted}>Estimated range • final price requires inspection</Text>
      </Card>
      <Card tone="amber">
        <Text style={styles.cardTitle}>Important</Text>
        <Text style={styles.muted}>This estimate is guidance only. The mechanic must inspect the vehicle and send a final quote for your approval.</Text>
      </Card>
      <Row label="Vehicle" value={`${state.vehicle.make} ${state.vehicle.model} • ${state.vehicle.powerSource}`} />
      <Row label="Symptom" value={state.problem.symptom} />
      <Row label="Location" value={state.problem.location} />
    </Screen>
  );
}

function MechanicResultsScreen() {
  const router = useRouter();
  const { selectMechanic, state } = useRepairFlow();
  return (
    <Screen title="Mechanics near you" subtitle={`Matched for ${state.problem.symptom.toLowerCase()} • ${state.vehicle.make} ${state.vehicle.model}`}>
      {MECHANICS.map((mechanic) => (
        <Pressable key={mechanic.id} onPress={() => { selectMechanic(mechanic.id); router.push("/motorist/mechanic-profile"); }}>
          <Card tone={mechanic.match >= 90 ? "blue" : "neutral"}>
            <Text style={styles.cardTitle}>{mechanic.name}</Text>
            <Text style={styles.muted}>{mechanic.specialties.join(" • ")}</Text>
            <Text style={styles.meta}>{mechanic.match}% match • {mechanic.distanceKm} km • {mechanic.rating} ★</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

function MechanicProfileScreen() {
  const router = useRouter();
  const { selectedMechanic } = useRepairFlow();
  return (
    <Screen title="Mechanic profile" footer={<PrimaryButton label="Request this mechanic" onPress={() => router.push("/motorist/confirm-request")} />}>
      <Card tone="blue">
        <Text style={styles.heroTitle}>{selectedMechanic.name}</Text>
        <Text style={styles.meta}>VERIFIED PROVIDER • {selectedMechanic.rating} ★ • {selectedMechanic.reviews} reviews</Text>
      </Card>
      <Label>Specialties</Label>
      <View style={styles.choiceWrap}>{selectedMechanic.specialties.map((item) => <View key={item} style={styles.choiceActive}><Text style={styles.choiceTextActive}>{item}</Text></View>)}</View>
      <Row label="Distance" value={`${selectedMechanic.distanceKm} km`} />
      <Row label="Match" value={`${selectedMechanic.match}%`} />
      <Card><Text style={styles.cardTitle}>How pricing works</Text><Text style={styles.muted}>The mechanic inspects your vehicle first, then sends a quote. Work starts only after you approve it.</Text></Card>
    </Screen>
  );
}

function ConfirmRequestScreen() {
  const router = useRouter();
  const { state, selectedMechanic, submitRequest } = useRepairFlow();
  return (
    <Screen title="Confirm request" footer={<PrimaryButton label="Send request" onPress={() => { submitRequest(); router.replace("/motorist/finding-mechanic"); }} />}>
      <Card tone="blue"><Text style={styles.cardTitle}>{selectedMechanic.name}</Text><Text style={styles.muted}>{selectedMechanic.match}% match • {selectedMechanic.distanceKm} km • {selectedMechanic.rating} ★</Text></Card>
      <Row label="Vehicle" value={`${state.vehicle.make} ${state.vehicle.model} • ${state.vehicle.year}`} />
      <Row label="Power source" value={state.vehicle.powerSource} />
      <Row label="Problem" value={state.problem.description} />
      <Row label="Location" value={state.problem.location} />
      <Row label="Preferred time" value={state.problem.preferredTime} />
    </Screen>
  );
}

function FindingMechanicScreen() {
  const router = useRouter();
  const { state, selectedMechanic, cancelRequest } = useRepairFlow();
  const accepted = ["accepted", "en-route", "arrived", "inspected", "quoted", "approved", "repairing", "repair-complete", "paid", "completed"].includes(state.status);
  return (
    <Screen title="Finding mechanic" subtitle={state.requestId ? `Request ${state.requestId}` : undefined}>
      <StatusCard status={state.status} />
      <Card><Text style={styles.cardTitle}>{selectedMechanic.name}</Text><Text style={styles.muted}>Your request is visible on the mechanic dashboard.</Text></Card>
      {accepted ? <PrimaryButton label="View assigned mechanic" onPress={() => router.replace("/motorist/mechanic-assigned")} /> : <>
        <Card tone="amber"><Text style={styles.cardTitle}>Waiting for acceptance</Text><Text style={styles.muted}>The Motorist side will remain here until the Mechanic accepts this request.</Text></Card>
        <SecondaryButton label="Demo: open mechanic account" onPress={() => router.push("/mechanic/dashboard")} />
        <SecondaryButton label="Cancel request" onPress={() => { cancelRequest(); router.replace("/motorist/home"); }} />
      </>}
    </Screen>
  );
}

function MechanicAssignedScreen() {
  const router = useRouter();
  const { state, selectedMechanic } = useRepairFlow();
  const quoteReady = ["quoted", "approved", "repairing", "repair-complete", "paid", "completed"].includes(state.status);
  return (
    <Screen title="Mechanic assigned" subtitle={state.requestId ?? undefined}>
      <StatusCard status={state.status} />
      <Card tone="green"><Text style={styles.cardTitle}>{selectedMechanic.name}</Text><Text style={styles.muted}>Verified • {selectedMechanic.rating} ★ • {selectedMechanic.distanceKm} km away</Text></Card>
      <Row label="Current status" value={repairStatusLabel(state.status)} />
      <SecondaryButton label="Message mechanic" onPress={() => router.push("/orderchat")} />
      {quoteReady ? <PrimaryButton label="View inspection & quote" onPress={() => router.push("/motorist/inspection-quote")} /> : null}
    </Screen>
  );
}

function MotoristQuoteScreen() {
  const router = useRouter();
  const { state, approveQuote } = useRepairFlow();
  const quote = state.quote;
  if (!quote) {
    return <Screen title="Inspection & quote"><StatusCard status={state.status} /><Card tone="amber"><Text style={styles.cardTitle}>Waiting for mechanic quote</Text><Text style={styles.muted}>The mechanic must complete the inspection and submit a quote before you can approve work.</Text></Card><SecondaryButton label="Back to assigned mechanic" onPress={() => router.replace("/motorist/mechanic-assigned")} /></Screen>;
  }
  const approved = ["approved", "repairing", "repair-complete", "paid", "completed"].includes(state.status);
  return (
    <Screen title="Inspection & quote" footer={approved ? <PrimaryButton label="View repair progress" onPress={() => router.replace("/motorist/repair-progress")} /> : <PrimaryButton label={`Approve ${formatKES(quote.total)}`} onPress={() => { approveQuote(); router.replace("/motorist/repair-progress"); }} />}>
      <StatusCard status={state.status} />
      <Card><Text style={styles.cardTitle}>Inspection findings</Text><Text style={styles.muted}>{state.inspection.notes}</Text></Card>
      <Row label="Labour" value={`${quote.labourDescription} • ${formatKES(quote.labourAmount)}`} />
      <Row label="Part" value={`${quote.partDescription} • ${formatKES(quote.partAmount)}`} />
      <Row label="AutoAssist fee" value={formatKES(quote.serviceFee)} />
      <View style={styles.totalRow}><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.totalValue}>{formatKES(quote.total)}</Text></View>
    </Screen>
  );
}

const repairSteps = ["Vehicle secured", "Old parts removed", "Replacement installed", "Road test completed"];

function MotoristRepairProgressScreen() {
  const router = useRouter();
  const { state } = useRepairFlow();
  const complete = ["repair-complete", "paid", "completed"].includes(state.status);
  return (
    <Screen title="Repair progress" footer={complete ? <PrimaryButton label="Continue to payment" onPress={() => router.replace("/motorist/service-payment")} /> : undefined}>
      <StatusCard status={state.status} />
      {repairSteps.map((step, index) => {
        const done = state.repairStep > index || complete;
        const active = state.status === "repairing" && state.repairStep === index + 1;
        return <Card key={step} tone={done ? "green" : active ? "blue" : "neutral"}><Text style={styles.cardTitle}>{done ? "✓ " : active ? "• " : "○ "}{step}</Text></Card>;
      })}
      {!complete ? <Card tone="amber"><Text style={styles.cardTitle}>Mechanic is working</Text><Text style={styles.muted}>Progress changes here when the mechanic updates the job.</Text></Card> : null}
    </Screen>
  );
}

function ServicePaymentScreen() {
  const router = useRouter();
  const { state, payRepair } = useRepairFlow();
  const { state: demoState } = useDemoApp();
  const quote = state.quote;
  if (!quote) return <Screen title="Service payment"><Card tone="amber"><Text style={styles.cardTitle}>No final quote available</Text></Card></Screen>;
  return (
    <Screen title="Service payment" footer={<PrimaryButton label={state.paid ? "View completion" : `Pay ${formatKES(quote.total)}`} onPress={() => { if (!state.paid) payRepair(); router.replace("/motorist/service-complete"); }} />}>
      <Card tone="blue"><Text style={styles.eyebrow}>AMOUNT DUE</Text><Text style={styles.heroAmount}>{formatKES(quote.total)}</Text></Card>
      <Row label="Payment method" value={demoState.paymentMethod} />
      <Row label="Request" value={state.requestId ?? "—"} />
      <Card tone="green"><Text style={styles.cardTitle}>Payment protection</Text><Text style={styles.muted}>The demo records the payment only after the mechanic marks the repair complete.</Text></Card>
    </Screen>
  );
}

function ServiceCompleteScreen() {
  const router = useRouter();
  const { state, rateRepair } = useRepairFlow();
  const [rating, setRating] = useState(state.rating ?? 5);
  return (
    <Screen title="Service complete" footer={<PrimaryButton label="Save rating & return home" onPress={() => { rateRepair(rating); router.replace("/motorist/home"); }} />}>
      <Card tone="green"><Text style={styles.heroTitle}>Repair completed successfully</Text><Text style={styles.muted}>{state.requestId} • payment recorded</Text></Card>
      <Label>Rate your service</Label>
      <View style={styles.ratingRow}>{[1,2,3,4,5].map((value) => <Pressable key={value} onPress={() => setRating(value)}><Text style={[styles.star, value <= rating && styles.starActive]}>★</Text></Pressable>)}</View>
      <Row label="Rating" value={`${rating}/5`} />
      <Row label="Mechanic" value={state.mechanicProfile.garageName} />
    </Screen>
  );
}

function MotoristHistoryScreen() {
  const router = useRouter();
  const { state, resetRepair } = useRepairFlow();
  return (
    <Screen title="Service history" subtitle="Repairs and requests made through AutoAssist">
      {state.requestId ? <Card tone={state.status === "completed" ? "green" : "blue"}><Text style={styles.cardTitle}>{state.requestId} • {state.vehicle.make} {state.vehicle.model}</Text><Text style={styles.muted}>{repairStatusLabel(state.status)}{state.quote ? ` • ${formatKES(state.quote.total)}` : ""}</Text></Card> : <Card><Text style={styles.cardTitle}>No repair requests yet</Text></Card>}
      {state.status === "completed" || state.status === "cancelled" ? <PrimaryButton label="Start a new repair request" onPress={() => { resetRepair(); router.replace("/motorist/describe-problem"); }} /> : null}
    </Screen>
  );
}

function VehicleDetailsScreen() {
  const router = useRouter();
  const { state } = useRepairFlow();
  return (
    <Screen title="Vehicle details" footer={<PrimaryButton label="Edit vehicle" onPress={() => router.push("/motorist/addavehicle")} />}>
      <Card tone="blue"><Text style={styles.heroTitle}>{state.vehicle.make} {state.vehicle.model}</Text><Text style={styles.muted}>{state.vehicle.year} • {state.vehicle.registration}</Text></Card>
      <Row label="Power source" value={state.vehicle.powerSource} />
      <Row label="Transmission" value={state.vehicle.transmission} />
    </Screen>
  );
}

function MechanicRegistrationScreen() {
  const router = useRouter();
  const { state, saveMechanicProfile } = useRepairFlow();
  const profile = state.mechanicProfile;
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [nationalId, setNationalId] = useState(profile.nationalId);
  const [garageName, setGarageName] = useState(profile.garageName);
  const [location, setLocation] = useState(profile.location);
  const [services, setServices] = useState(profile.services);
  const valid = [fullName, phone, nationalId, garageName, location, services].every((value) => value.trim().length >= 2);
  return (
    <Screen title="Mechanic registration" subtitle="Create the professional profile motorists will see" footer={<PrimaryButton disabled={!valid} label="Continue to verification" onPress={() => { saveMechanicProfile({ fullName, phone, nationalId, garageName, location, services }); router.replace("/mechanic/verification"); }} />}>
      <Field label="Full name" value={fullName} onChangeText={setFullName} />
      <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="National ID" value={nationalId} onChangeText={setNationalId} keyboardType="numeric" />
      <Field label="Garage / business name" value={garageName} onChangeText={setGarageName} />
      <Field label="Primary location" value={location} onChangeText={setLocation} />
      <Field label="Services" value={services} onChangeText={setServices} placeholder="Brakes, diagnostics, suspension" />
    </Screen>
  );
}

function MechanicVerificationScreen() {
  const router = useRouter();
  const { state, toggleVerificationItem, submitVerification } = useRepairFlow();
  const items = [
    ["nationalId", "National ID"],
    ["businessPermit", "Business permit"],
    ["certificates", "Skill certificates"],
    ["profilePhoto", "Profile photo"],
  ] as const;
  const allReady = Object.values(state.verificationItems).every(Boolean);
  return (
    <Screen title="Mechanic verification" subtitle="For the demo, tap each document to mark it uploaded" footer={<PrimaryButton disabled={!allReady} label="Submit verification" onPress={() => { submitVerification(); router.replace("/mechanic/dashboard"); }} />}>
      {items.map(([key, label]) => <Pressable key={key} onPress={() => toggleVerificationItem(key)}><Card tone={state.verificationItems[key] ? "green" : "neutral"}><Text style={styles.cardTitle}>{state.verificationItems[key] ? "✓ " : "+ "}{label}</Text><Text style={styles.muted}>{state.verificationItems[key] ? "Uploaded" : "Tap to upload"}</Text></Card></Pressable>)}
    </Screen>
  );
}

function mechanicNextRoute(status: RepairStatus) {
  if (status === "requested") return "/mechanic/job-offer";
  if (status === "accepted") return "/mechanic/job-details";
  if (status === "en-route") return "/mechanic/navigation";
  if (status === "arrived") return "/mechanic/inspection";
  if (status === "inspected") return "/mechanic/create-quote";
  if (status === "quoted") return "/mechanic/awaiting-approval";
  if (status === "approved" || status === "repairing") return "/mechanic/work-progress";
  if (["repair-complete", "paid", "completed"].includes(status)) return "/mechanic/complete-job";
  return undefined;
}

function MechanicDashboardScreen() {
  const router = useRouter();
  const { state } = useRepairFlow();
  const next = mechanicNextRoute(state.status);
  return (
    <Screen title="Mechanic dashboard" subtitle={state.mechanicProfile.verified ? "Verified provider • Online" : "Verification required"} showBack={false}>
      <Card tone={state.mechanicProfile.verified ? "green" : "amber"}><Text style={styles.eyebrow}>{state.mechanicProfile.verified ? "YOU ARE ONLINE" : "ACCOUNT SETUP"}</Text><Text style={styles.heroTitle}>{state.mechanicProfile.garageName}</Text><Text style={styles.muted}>{state.mechanicProfile.location}</Text></Card>
      <StatusCard status={state.status} />
      {state.status === "idle" || state.status === "draft" || state.status === "cancelled" ? <Card><Text style={styles.cardTitle}>No repair requests available</Text><Text style={styles.muted}>A Motorist request will appear here as soon as it is submitted.</Text></Card> : <Card tone={state.status === "requested" ? "blue" : "neutral"}><Text style={styles.cardTitle}>{state.requestId} • {state.vehicle.make} {state.vehicle.model}</Text><Text style={styles.muted}>{state.problem.description}</Text><Text style={styles.meta}>{state.problem.location}</Text></Card>}
      {next ? <PrimaryButton label={state.status === "requested" ? "Open new request" : "Continue active job"} onPress={() => router.push(next as never)} /> : null}
      <View style={styles.twoButtons}><SecondaryButton label="Earnings" onPress={() => router.push("/mechanic/earnings")} /><SecondaryButton label="Profile" onPress={() => router.push("/mechanic/profile")} /></View>
    </Screen>
  );
}

function MechanicJobOfferScreen() {
  const router = useRouter();
  const { state, acceptRequest, declineRequest } = useRepairFlow();
  const { state: demoState } = useDemoApp();
  if (state.status !== "requested") return <Screen title="Repair request"><StatusCard status={state.status} /><PrimaryButton label="Return to dashboard" onPress={() => router.replace("/mechanic/dashboard")} /></Screen>;
  return (
    <Screen title="New repair request" subtitle={state.requestId ?? undefined} footer={<View style={styles.footerStack}><PrimaryButton label="Accept job" onPress={() => { acceptRequest(); router.replace("/mechanic/job-details"); }} /><SecondaryButton label="Decline" onPress={() => { declineRequest(); router.replace("/mechanic/dashboard"); }} /></View>}>
      <Card tone="blue"><Text style={styles.cardTitle}>{state.vehicle.make} {state.vehicle.model} • {state.vehicle.year}</Text><Text style={styles.muted}>{state.problem.description}</Text></Card>
      <Row label="Customer" value={demoState.user.name} />
      <Row label="Power source" value={state.vehicle.powerSource} />
      <Row label="Location" value={state.problem.location} />
      <Row label="Requested time" value={state.problem.preferredTime} />
    </Screen>
  );
}

function MechanicJobDetailsScreen() {
  const router = useRouter();
  const { state, startTravel } = useRepairFlow();
  const { state: demoState } = useDemoApp();
  return (
    <Screen title="Job details" subtitle={`${state.requestId ?? "Repair"} • accepted`} footer={<PrimaryButton label="Navigate to customer" onPress={() => { startTravel(); router.replace("/mechanic/navigation"); }} />}>
      <StatusCard status={state.status} />
      <Row label="Customer" value={demoState.user.name} />
      <Row label="Vehicle" value={`${state.vehicle.make} ${state.vehicle.model} • ${state.vehicle.registration}`} />
      <Row label="Power source" value={state.vehicle.powerSource} />
      <Card><Text style={styles.cardTitle}>Customer report</Text><Text style={styles.muted}>{state.problem.description}</Text></Card>
    </Screen>
  );
}

function MechanicNavigationScreen() {
  const router = useRouter();
  const { state, confirmArrival } = useRepairFlow();
  return (
    <Screen title="On the way" footer={<PrimaryButton label="I have arrived" onPress={() => { confirmArrival(); router.replace("/mechanic/inspection"); }} />}>
      <StatusCard status={state.status} />
      <Card tone="blue"><Text style={styles.eyebrow}>ROUTE</Text><Text style={styles.heroTitle}>{state.mechanicProfile.location}</Text><Text style={styles.muted}>↓</Text><Text style={styles.heroTitle}>{state.problem.location}</Text><Text style={styles.meta}>Estimated arrival • 12 min</Text></Card>
      <SecondaryButton label="Message customer" onPress={() => router.push("/orderchat")} />
    </Screen>
  );
}

function MechanicInspectionScreen() {
  const router = useRouter();
  const { state, saveInspection } = useRepairFlow();
  const [brakePads, setBrakePads] = useState<Inspection["brakePads"]>(state.inspection.brakePads);
  const [brakeDiscs, setBrakeDiscs] = useState<Inspection["brakeDiscs"]>(state.inspection.brakeDiscs);
  const [brakeFluid, setBrakeFluid] = useState<Inspection["brakeFluid"]>(state.inspection.brakeFluid);
  const [notes, setNotes] = useState(state.inspection.notes);
  return (
    <Screen title="Vehicle inspection" subtitle={`${state.vehicle.make} ${state.vehicle.model} • ${state.vehicle.powerSource}`} footer={<PrimaryButton label="Save inspection & create quote" onPress={() => { saveInspection({ brakePads, brakeDiscs, brakeFluid, notes }); router.replace("/mechanic/create-quote"); }} />}>
      <Label>Brake pads</Label><ChoiceRow choices={["Replace", "Serviceable"]} selected={brakePads} onSelect={(value) => setBrakePads(value as Inspection["brakePads"])} />
      <Label>Brake discs</Label><ChoiceRow choices={["Replace", "Serviceable"]} selected={brakeDiscs} onSelect={(value) => setBrakeDiscs(value as Inspection["brakeDiscs"])} />
      <Label>Brake fluid</Label><ChoiceRow choices={["Low", "Normal"]} selected={brakeFluid} onSelect={(value) => setBrakeFluid(value as Inspection["brakeFluid"])} />
      <Field label="Inspection notes" value={notes} onChangeText={setNotes} multiline />
    </Screen>
  );
}

function CreateQuoteScreen() {
  const router = useRouter();
  const { state, sendQuote } = useRepairFlow();
  const [labourDescription, setLabourDescription] = useState(state.quote?.labourDescription ?? "Brake pad replacement");
  const [labour, setLabour] = useState(String(state.quote?.labourAmount ?? 4500));
  const [partDescription, setPartDescription] = useState(state.quote?.partDescription ?? "Premium brake pad set");
  const [part, setPart] = useState(String(state.quote?.partAmount ?? 6800));
  const labourAmount = Number(labour.replace(/,/g, "")) || 0;
  const partAmount = Number(part.replace(/,/g, "")) || 0;
  const serviceFee = 350;
  const total = labourAmount + partAmount + serviceFee;
  const valid = labourDescription.trim().length > 2 && labourAmount > 0 && total > 0;
  return (
    <Screen title="Create repair quote" footer={<PrimaryButton disabled={!valid} label={`Send quote • ${formatKES(total)}`} onPress={() => { sendQuote({ labourDescription: labourDescription.trim(), labourAmount, partDescription: partDescription.trim() || "No parts", partAmount, serviceFee }); router.replace("/mechanic/awaiting-approval"); }} />}>
      <Field label="Labour description" value={labourDescription} onChangeText={setLabourDescription} />
      <Field label="Labour amount (KSh)" value={labour} onChangeText={setLabour} keyboardType="numeric" />
      <Field label="Part description" value={partDescription} onChangeText={setPartDescription} />
      <Field label="Part amount (KSh)" value={part} onChangeText={setPart} keyboardType="numeric" />
      <Row label="AutoAssist fee" value={formatKES(serviceFee)} />
      <View style={styles.totalRow}><Text style={styles.totalLabel}>CUSTOMER TOTAL</Text><Text style={styles.totalValue}>{formatKES(total)}</Text></View>
    </Screen>
  );
}

function AwaitingApprovalScreen() {
  const router = useRouter();
  const { state, startRepair } = useRepairFlow();
  const approved = ["approved", "repairing", "repair-complete", "paid", "completed"].includes(state.status);
  return (
    <Screen title={approved ? "Quote approved" : "Quote sent"}>
      <StatusCard status={state.status} />
      {state.quote ? <Card tone={approved ? "green" : "amber"}><Text style={styles.heroAmount}>{formatKES(state.quote.total)}</Text><Text style={styles.muted}>{state.quote.labourDescription} • {state.quote.partDescription}</Text></Card> : null}
      {approved ? <PrimaryButton label="Start repair" onPress={() => { if (state.status === "approved") startRepair(); router.replace("/mechanic/work-progress"); }} /> : <>
        <Card><Text style={styles.cardTitle}>Waiting for Motorist approval</Text><Text style={styles.muted}>The Motorist can now review the inspection and approve or reject the quote.</Text></Card>
        <SecondaryButton label="Demo: open Motorist approval" onPress={() => router.push("/motorist/inspection-quote")} />
      </>}
    </Screen>
  );
}

function MechanicWorkProgressScreen() {
  const router = useRouter();
  const { state, startRepair, advanceRepair, completeRepair } = useRepairFlow();
  const repairing = state.status === "repairing";
  const alreadyComplete = ["repair-complete", "paid", "completed"].includes(state.status);
  return (
    <Screen title="Work in progress">
      <StatusCard status={state.status} />
      {repairSteps.map((step, index) => {
        const done = state.repairStep > index || alreadyComplete;
        const active = repairing && state.repairStep === index + 1;
        return <Card key={step} tone={done ? "green" : active ? "blue" : "neutral"}><Text style={styles.cardTitle}>{done ? "✓ " : active ? "• " : "○ "}{step}</Text></Card>;
      })}
      {state.status === "approved" ? <PrimaryButton label="Start repair" onPress={startRepair} /> : null}
      {repairing && state.repairStep < 4 ? <PrimaryButton label="Complete current step" onPress={advanceRepair} /> : null}
      {repairing && state.repairStep >= 4 ? <PrimaryButton label="Mark repair complete" onPress={() => { completeRepair(); router.replace("/mechanic/complete-job"); }} /> : null}
      {alreadyComplete ? <PrimaryButton label="View completion" onPress={() => router.replace("/mechanic/complete-job")} /> : null}
    </Screen>
  );
}

function MechanicCompleteJobScreen() {
  const router = useRouter();
  const { state } = useRepairFlow();
  const paid = state.paid || state.status === "completed";
  return (
    <Screen title="Complete repair">
      <StatusCard status={state.status} />
      <Card tone={paid ? "green" : "amber"}><Text style={styles.cardTitle}>{paid ? "Customer payment received" : "Waiting for customer payment"}</Text><Text style={styles.muted}>{state.quote ? formatKES(state.quote.total) : "Final amount pending"}</Text></Card>
      {paid ? <PrimaryButton label="View earnings" onPress={() => router.replace("/mechanic/earnings")} /> : <SecondaryButton label="Demo: open Motorist payment" onPress={() => router.push("/motorist/service-payment")} />}
    </Screen>
  );
}

function MechanicEarningsScreen() {
  const { state } = useRepairFlow();
  return (
    <Screen title="Earnings & payouts">
      <Card tone="green"><Text style={styles.eyebrow}>DEMO EARNINGS</Text><Text style={styles.heroAmount}>{formatKES(state.mechanicEarnings)}</Text><Text style={styles.muted}>Includes completed repair labour payouts</Text></Card>
      {state.paid && state.quote ? <Row label={state.requestId ?? "Latest job"} value={`+ ${formatKES(Math.round(state.quote.labourAmount * 0.9))}`} /> : null}
    </Screen>
  );
}

function MechanicOwnProfileScreen() {
  const router = useRouter();
  const { state } = useRepairFlow();
  return (
    <Screen title="Mechanic profile">
      <Card tone={state.mechanicProfile.verified ? "green" : "amber"}><Text style={styles.heroTitle}>{state.mechanicProfile.garageName}</Text><Text style={styles.muted}>{state.mechanicProfile.verified ? "VERIFIED PROVIDER" : "Verification pending"}</Text></Card>
      <Row label="Owner" value={state.mechanicProfile.fullName} />
      <Row label="Phone" value={state.mechanicProfile.phone} />
      <Row label="Location" value={state.mechanicProfile.location} />
      <Row label="Services" value={state.mechanicProfile.services} />
      <SecondaryButton label="Edit registration" onPress={() => router.push("/mechanic/registration")} />
    </Screen>
  );
}

function MechanicHistoryScreen() {
  const { state } = useRepairFlow();
  return (
    <Screen title="Job history">
      {state.requestId ? <Card tone={state.status === "completed" || state.paid ? "green" : "blue"}><Text style={styles.cardTitle}>{state.requestId} • {state.vehicle.make} {state.vehicle.model}</Text><Text style={styles.muted}>{repairStatusLabel(state.status)}{state.quote ? ` • ${formatKES(state.quote.total)}` : ""}</Text></Card> : <Card><Text style={styles.cardTitle}>No jobs yet</Text></Card>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  safeArea: { flex: 1, backgroundColor: "#FFFFFF" },
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#EEF1F5" },
  backButton: { width: 34, minHeight: 36, justifyContent: "center" },
  backText: { color: "#102A43", fontSize: 28, fontFamily: "Inter_600SemiBold" },
  headerCopy: { flex: 1 },
  title: { color: "#102A43", fontSize: 20, fontFamily: "Inter_600SemiBold" },
  subtitle: { color: "#667085", fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular", marginTop: 5 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 14 },
  footer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: "#EEF1F5", backgroundColor: "#FFFFFF" },
  footerStack: { gap: 8 },
  card: { borderWidth: 1, borderColor: "#E4E7EC", borderRadius: 14, padding: 16, backgroundColor: "#FFFFFF", gap: 6 },
  card_neutral: { backgroundColor: "#FFFFFF", borderColor: "#E4E7EC" },
  card_blue: { backgroundColor: "#EAF2FD", borderColor: "#B8D2F0" },
  card_green: { backgroundColor: "#EAF7F1", borderColor: "#B7DFC9" },
  card_amber: { backgroundColor: "#FFF7E8", borderColor: "#F5B942" },
  cardTitle: { color: "#102A43", fontSize: 14, lineHeight: 20, fontFamily: "Inter_600SemiBold" },
  heroTitle: { color: "#102A43", fontSize: 18, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
  heroAmount: { color: "#1857A6", fontSize: 24, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  eyebrow: { color: "#1857A6", fontSize: 10, letterSpacing: 0.4, fontFamily: "Inter_600SemiBold" },
  muted: { color: "#667085", fontSize: 12, lineHeight: 18, fontFamily: "Inter_400Regular" },
  meta: { color: "#344054", fontSize: 11, fontFamily: "Inter_600SemiBold", marginTop: 3 },
  fieldWrap: { gap: 6 },
  label: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  value: { color: "#344054", fontSize: 13, fontFamily: "Inter_400Regular" },
  valueStrong: { color: "#102A43", fontFamily: "Inter_600SemiBold" },
  input: { minHeight: 50, borderWidth: 1, borderColor: "#D0D5DD", borderRadius: 10, paddingHorizontal: 14, backgroundColor: "#FFFFFF", color: "#102A43", fontFamily: "Inter_400Regular", fontSize: 14 },
  inputMultiline: { minHeight: 100, paddingTop: 14 },
  choiceWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: "#D0D5DD", paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  choiceActive: { minHeight: 36, borderRadius: 18, borderWidth: 1, borderColor: "#1857A6", backgroundColor: "#1857A6", paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  choiceText: { color: "#344054", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  choiceTextActive: { color: "#FFFFFF", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  primaryButton: { minHeight: 48, borderRadius: 12, backgroundColor: "#1857A6", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonDisabled: { backgroundColor: "#A9C2DF" },
  primaryText: { color: "#FFFFFF", fontSize: 14, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  secondaryButton: { minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: "#B8D2F0", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  secondaryText: { color: "#1857A6", fontSize: 13, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  row: { minHeight: 54, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#EEF1F5", gap: 12 },
  rowLabel: { width: "32%", color: "#667085", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  rowValue: { flex: 1, color: "#344054", fontSize: 12, lineHeight: 17, fontFamily: "Inter_400Regular" },
  totalRow: { minHeight: 62, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#D0D5DD" },
  totalLabel: { color: "#102A43", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  totalValue: { color: "#1857A6", fontSize: 19, fontFamily: "Inter_600SemiBold" },
  ratingRow: { flexDirection: "row", gap: 10 },
  star: { color: "#D0D5DD", fontSize: 34 },
  starActive: { color: "#F5B942" },
  twoButtons: { flexDirection: "row", gap: 10 },
});
