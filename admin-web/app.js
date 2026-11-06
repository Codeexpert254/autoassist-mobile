import { createClient, FunctionsHttpError } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.118.0/+esm";

const cfg = window.AUTOASSIST_CONFIG ?? {};
const loginView = document.querySelector("#login-view");
const adminView = document.querySelector("#admin-view");
const content = document.querySelector("#content");
const title = document.querySelector("#page-title");
const roleBadge = document.querySelector("#admin-role");
const loginForm = document.querySelector("#login-form");
const loginError = document.querySelector("#login-error");
const loginButton = document.querySelector("#login-button");

const state = {
  section: "overview",
  role: null,
  verificationFilter: "pending",
  verificationRole: "all",
  selectedVerification: null,
};

const configured = Boolean(cfg.supabaseUrl && cfg.supabasePublishableKey);
const supabase = configured
  ? createClient(cfg.supabaseUrl, cfg.supabasePublishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function formatKES(value) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function statusClass(value) {
  const status = String(value ?? "default").toLowerCase();
  return ["pending","approved","rejected","draft","matching","paid","completed","failed"].includes(status) ? status : "default";
}

async function functionMessage(error) {
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json();
      if (payload?.error) return String(payload.error);
    } catch {}
  }
  return error instanceof Error ? error.message : "Request failed.";
}

async function invoke(name, body) {
  if (!supabase) throw new Error("Admin configuration is missing.");
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(await functionMessage(error));
  if (data?.error) throw new Error(String(data.error));
  return data;
}

function showLogin(message = "") {
  adminView.hidden = true;
  loginView.hidden = false;
  if (message) {
    loginError.textContent = message;
    loginError.hidden = false;
  }
}

function showAdmin() {
  loginView.hidden = true;
  adminView.hidden = false;
  roleBadge.textContent = String(state.role ?? "admin").replaceAll("_", " ");
  const sandboxNav = document.querySelector("#sandbox-nav");
  if (sandboxNav) sandboxNav.style.display = state.role === "super_admin" ? "" : "none";
  const financeNav=document.querySelector("#marketplace-nav");
  if(financeNav)financeNav.style.display=state.role==="super_admin"?"":"none";
}

function setLoading(message = "Loading…") {
  content.innerHTML = `<div class="loading">${escapeHtml(message)}</div>`;
}

function setError(message) {
  content.innerHTML = `<div class="notice warning"><strong>Unable to load this section.</strong><br>${escapeHtml(message)}</div>`;
}

async function authorize() {
  const status = await invoke("admin-core", { action: "status" });
  state.role = status.role;
  showAdmin();
  await navigate("overview");
}

async function restore() {
  if (!configured) {
    showLogin("Missing admin-web/config.js. Copy config.example.js to config.js and add the Supabase publishable key.");
    return;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) return showLogin(error.message);
  if (!data.session) return showLogin();
  try {
    await authorize();
  } catch (error) {
    await supabase.auth.signOut();
    showLogin(error.message === "Admin access required" ? "This account is not authorized for AutoAssist Admin." : error.message);
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  loginError.hidden = true;
  if (!supabase) return showLogin("Admin configuration is missing.");
  loginButton.disabled = true;
  loginButton.textContent = "Signing in…";
  try {
    const email = document.querySelector("#login-email").value.trim();
    const password = document.querySelector("#login-password").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await authorize();
  } catch (error) {
    loginError.textContent = error.message ?? "Unable to sign in.";
    loginError.hidden = false;
  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "Sign in";
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  await supabase?.auth.signOut();
  state.role = null;
  state.selectedVerification = null;
  showLogin();
});

document.querySelector("#sidebar-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-section]");
  if (button) void navigate(button.dataset.section);
});

async function navigate(section) {
  state.section = section;
  state.selectedVerification = null;
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.section === section));
  const labels = {
    overview: "Overview",
    verification: "Provider verification",
    users: "Users",
    jobs: "Live repair jobs",
    orders: "Orders",
    payments: "Connection payments",
    marketplace: "Marketplace finance",
    sandbox: "Sandbox payment testing",
    support: "Support & disputes",
    analytics: "Analytics",
    settings: "Admin settings",
  };
  title.textContent = labels[section] ?? "AutoAssist Admin";
  setLoading();
  try {
    if (section === "overview") return await renderOverview();
    if (section === "verification") return await renderVerificationList();
    if (section === "users") return await renderUsers();
    if (section === "jobs") return await renderJobs();
    if (section === "payments") return await renderPayments();
    if (section === "marketplace" && state.role==="super_admin") return await renderMarketplaceFinance();
    if (section === "sandbox" && state.role === "super_admin") return await renderSandboxTesting();
    if (section === "analytics") return await renderAnalytics();
    if (section === "settings") return renderSettings();
    if (section === "orders") return renderNotConnected("Orders", "Parts/order persistence is not live in the current backend yet. This screen is isolated and ready to connect when the order tables are implemented.");
    if (section === "support") return renderNotConnected("Support & disputes", "A production support/dispute table is not present yet. This screen will connect once those records are persisted in Supabase.");
  } catch (error) {
    setError(error.message ?? "Unknown error");
  }
}

async function renderOverview() {
  const data = await invoke("admin-core", { action: "overview" });
  const m = data.metrics;
  const pending = m.requestCounts?.pending ?? m.requestCounts?.matching ?? 0;
  content.innerHTML = `
    <div class="metric-grid">
      ${metric("Total users", m.totalUsers, `${m.roleCounts?.mechanic ?? 0} mechanics`)}
      ${metric("Verified mechanics", m.verifiedMechanics, `${m.availableMechanics} currently available`)}
      ${metric("Repair requests", m.repairRequests, `${pending} active/matching`)}
      ${metric("Real connection fees", formatKES(m.paidConnectionFees), `${m.connectionPayments} payment records`)}
      ${metric("Simulated payments", m.simulatedPayments ?? 0, "No actual funds collected")}
    </div>
    <div class="panel">
      <div class="panel-header"><h3 class="panel-title">Live system summary</h3><span class="status approved">${escapeHtml(state.role)}</span></div>
      <div class="info-grid">
        ${info("Motorists", m.roleCounts?.motorist ?? 0)}
        ${info("Mechanics", m.roleCounts?.mechanic ?? 0)}
        ${info("Ratings", m.ratings)}
        ${info("Average rating", m.averageRating || "—")}
      </div>
    </div>
    <div class="panel"><div class="panel-header"><h3 class="panel-title">Recent repair activity</h3></div>${renderRequestCards(data.recentRequests ?? [])}</div>
  `;
}

function metric(label, value, meta = "") {
  return `<div class="metric-card"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div><div class="metric-meta">${escapeHtml(meta)}</div></div>`;
}
function info(label, value) {
  return `<div class="info-cell"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}


const verificationRoles = [
  ["all","All providers"],["mechanic","Mechanics"],
  ["partsdealer","Parts Dealers"],["rider","Riders"],["towing","Towing Agents"],
];
const roleLabel = (role) => ({
  mechanic:"Mechanic",partsdealer:"Parts Dealer",rider:"Rider",towing:"Towing Agent",
})[role] ?? role;

async function renderVerificationList() {
  if (!["super_admin","verification_admin"].includes(state.role)) {
    return setError("Verification administrator access required.");
  }
  setLoading("Loading verification applications…");
  try {
    const data = await invoke("admin-verification", {
      action:"list-all",role:state.verificationRole,status:state.verificationFilter,
    });
    const items=data.items??[];
    content.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3 class="panel-title">Provider verification</h3>
            <p class="muted">Review mechanic, parts shop, rider and towing agent applications in one secure queue.</p>
          </div>
          <span class="status pending">${items.length} matching</span>
        </div>
        <div class="toolbar" style="margin-bottom:14px" aria-label="Provider type">
          ${verificationRoles.map(([value,label])=>`<button class="filter-button ${state.verificationRole===value?"active":""}" data-verification-role="${value}">${label}</button>`).join("")}
        </div>
        <div class="toolbar" style="margin-bottom:16px" aria-label="Verification status">
          ${["pending","approved","rejected","all"].map(value=>`<button class="filter-button ${state.verificationFilter===value?"active":""}" data-verification-status="${value}">${value}</button>`).join("")}
        </div>
        <div class="list">
          ${items.length?items.map(verificationCard).join(""):`<div class="empty">No ${escapeHtml(state.verificationFilter)} applications for this provider type.</div>`}
        </div>
      </div>`;
    content.querySelectorAll("[data-verification-role]").forEach(button=>button.addEventListener("click",()=>{
      state.verificationRole=button.dataset.verificationRole;
      void renderVerificationList();
    }));
    content.querySelectorAll("[data-verification-status]").forEach(button=>button.addEventListener("click",()=>{
      state.verificationFilter=button.dataset.verificationStatus;
      void renderVerificationList();
    }));
    content.querySelectorAll("[data-provider-id]").forEach(button=>button.addEventListener("click",()=>{
      void renderProviderVerificationDetail(button.dataset.providerId,button.dataset.providerRole);
    }));
  }catch(error){setError(error.message??"Unable to load verification applications.");}
}

function verificationCard(item) {
  return `<button class="list-card clickable" data-provider-id="${escapeHtml(item.id)}"
      data-provider-role="${escapeHtml(item.role)}" style="width:100%;text-align:left">
    <div>
      <div class="list-title">${escapeHtml(item.displayName||"Unnamed provider")}</div>
      <div class="list-subtitle">
        <strong>${escapeHtml(roleLabel(item.role))}</strong> • ${escapeHtml(item.summary||"—")}
        <br>Submitted ${escapeHtml(formatDate(item.createdAt))}
      </div>
    </div>
    <span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
  </button>`;
}

function providerInfoRows(role, record, profile) {
  if (role==="partsdealer")return [
    ["Shop / garage",record.shop_name],["Seller category",record.seller_kind],
    ["Business registration / permit",record.business_reg_number],
    ["Shop address",record.location_text],["Shop phone",record.phone],
    ["Description",record.description],["Account holder",profile?.full_name],
  ];
  if (role==="rider")return [
    ["Applicant",profile?.full_name],["Account phone",profile?.phone],
    ["Rider phone",record.phone],["Vehicle type",record.vehicle_type],
    ["Vehicle registration",record.registration_number],
    ["Rider status",record.verification_status],
  ];
  return [
    ["Business / operator",record.business_name],
    ["Account holder",profile?.full_name],["Phone",record.phone],
    ["Operating area",record.operating_area],["Services offered",Array.isArray(record.service_types) && record.service_types.length ? record.service_types.map(s => s.replaceAll("_"," ")).join(", ") : record.vehicle_type],["Primary tow truck type",record.vehicle_type],
    ["Truck registration",record.vehicle_registration],
    ["Operating licence",record.license_number],
    ["Insurance policy",record.insurance_policy],
  ];
}

async function renderProviderVerificationDetail(id,role) {
  if(role==="mechanic")return renderMechanicVerificationDetail(id);
  if(!["partsdealer","rider","towing"].includes(role)){
    return setError("Unknown provider type.");
  }
  setLoading("Loading provider details…");
  try {
    const data=await invoke("admin-verification",{action:"detail-provider",id,role});
    state.selectedVerification=data;
    const record=data.record??{};
    const pending=record.verification_status==="pending";
    const proof=role==="towing";
    const evidence=data.evidence??{};
    const hasTowingDocuments=Boolean(evidence.licenseUrl&&evidence.insuranceUrl&&evidence.truckUrl);
    const proofs=proof?[
      ["Towing operating licence",evidence.licenseUrl],
      ["Insurance certificate",evidence.insuranceUrl],
      ["Tow-truck photograph",evidence.truckUrl],
    ]:[];
    const rows=providerInfoRows(role,record,data.profile??{});
    content.innerHTML=`
      <button id="back-to-verifications" class="back-link">← Back to verification queue</button>
      <div class="detail-grid">
        <div>
          <div class="panel">
            <div class="panel-header">
              <h3 class="panel-title">${escapeHtml(roleLabel(role))} application</h3>
              <span class="status ${statusClass(record.verification_status)}">${escapeHtml(record.verification_status)}</span>
            </div>
            <div class="info-grid">
              ${rows.map(([label,value])=>info(label,value||"—")).join("")}
              ${info("Submitted",formatDate(record.submitted_at??record.created_at))}
              ${record.review_note||record.verification_note?info("Previous review note",record.review_note??record.verification_note):""}
            </div>
          </div>
          <div class="panel">
            <div class="panel-header"><h3 class="panel-title">Verification evidence</h3>
            ${proof?`<span class="muted">Private links expire in 5 minutes</span>`:""}</div>
            ${proof?`<div class="document-grid">${proofs.map(([label,url])=>documentCard(label,url)).join("")}</div>`:
             `<div class="notice warning"><strong>Independent document verification required.</strong><br>
               This ${escapeHtml(roleLabel(role).toLowerCase())} registration currently provides business or vehicle details but no private identity-document upload.
               Confirm the details through appropriate records before approving.</div>`}
          </div>
        </div>
        <div class="panel">
          <h3 class="panel-title">Admin review</h3>
          <p class="muted">Check registration details and supporting evidence before changing account approval.</p>
          ${proof&&!hasTowingDocuments?`<div class="notice warning">All three towing evidence images must be available before approval.</div>`:""}
          <label class="check-row"><input id="check-provider-details" type="checkbox" />
            <span>I verified the applicant's business, vehicle and contact details.</span></label>
          <label class="check-row"><input id="check-provider-evidence" type="checkbox" />
            <span>${proof
              ?"I inspected the operating licence, insurance certificate and tow-truck photo."
              :"I independently checked the registration information against reliable records."}</span></label>
          <label>Review note<textarea id="review-note" placeholder="Required for rejection; explain what needs to change."></textarea></label>
          <div class="action-row">
            <button id="approve-provider" class="button primary" disabled>Approve ${escapeHtml(roleLabel(role))}</button>
            <button id="reject-provider" class="button danger" ${!pending?"disabled":""}>Reject application</button>
          </div>
          <p id="review-error" class="error-text" hidden></p>
        </div>
      </div>`;
    content.querySelector("#back-to-verifications").addEventListener("click",()=>void renderVerificationList());
    const approveButton=content.querySelector("#approve-provider");
    const updateApproval=()=>{
      approveButton.disabled=!pending||(proof&&!hasTowingDocuments)
        ||!content.querySelector("#check-provider-details").checked
        ||!content.querySelector("#check-provider-evidence").checked;
    };
    content.querySelector("#check-provider-details").addEventListener("change",updateApproval);
    content.querySelector("#check-provider-evidence").addEventListener("change",updateApproval);
    approveButton.addEventListener("click",()=>void submitProviderReview(id,role,"approve"));
    content.querySelector("#reject-provider").addEventListener("click",()=>void submitProviderReview(id,role,"reject"));
    updateApproval();
  }catch(error){setError(error.message??"Unable to load application.");}
}

async function submitProviderReview(id,role,decision){
  const note=content.querySelector("#review-note").value.trim();
  const errorEl=content.querySelector("#review-error");
  errorEl.hidden=true;
  if(decision==="reject"&&note.length<5){
    errorEl.textContent="Enter a reason for rejection (at least five characters).";
    errorEl.hidden=false;return;
  }
  if(!window.confirm(`Confirm ${decision} for this ${roleLabel(role).toLowerCase()} application?`))return;
  const buttons=content.querySelectorAll("#approve-provider,#reject-provider");
  buttons.forEach(button=>{button.disabled=true;});
  try{
    await invoke("admin-verification",{action:"review-provider",role,id,decision,note});
    await renderProviderVerificationDetail(id,role);
  }catch(error){
    errorEl.textContent=error.message??"Unable to record review.";
    errorEl.hidden=false;
    buttons.forEach(button=>{button.disabled=false;});
    const approved=content.querySelector("#approve-provider");
    approved.disabled=!content.querySelector("#check-provider-details").checked ||
      !content.querySelector("#check-provider-evidence").checked;
  }
}

async function renderMechanicVerificationDetail(userId) {
  setLoading("Loading private verification evidence…");
  try {
    const data = await invoke("admin-verification", { action: "detail", userId });
    state.selectedVerification = data;
    const individual = data.profile.provider_type !== "garage";
    const storedId = data.identityNumberStored;
    content.innerHTML = `
      <button id="back-to-verifications" class="back-link">← Back to verification queue</button>
      ${individual && !storedId ? `<div class="notice warning"><strong>Readable ID number unavailable.</strong><br>This is a legacy submission made before readable ID storage was enabled. Approval is intentionally blocked; request ID resubmission.</div>` : ""}
      ${individual && storedId ? `<div class="notice success"><strong>ID pre-check passed and readable ID stored.</strong><br>Compare the saved ID number with the number visible on the submitted National ID before approving.</div>` : ""}
      <div class="detail-grid">
        <div>
          <div class="panel"><div class="panel-header"><h3 class="panel-title">Application</h3><span class="status ${statusClass(data.submission.status)}">${escapeHtml(data.submission.status)}</span></div>
            <div class="info-grid">
              ${info("Name", data.profile.full_name || "—")}
              ${info("Provider type", individual ? "Individual mechanic" : "Garage / business")}
              ${info("Phone", data.profile.phone || "—")}
              ${info("Location", data.mechanic?.location || "—")}
              ${info("Saved National ID", individual ? (data.identityNumber || "Not stored") : "Not required")}
              ${info("OCR / identity claim", data.submission.identity_claimed ? "Passed" : "Not confirmed")}
            </div>
          </div>
          <div class="panel"><div class="panel-header"><h3 class="panel-title">Submitted evidence</h3><span class="muted">Links expire in ${escapeHtml(data.evidence.expiresInSeconds)} seconds</span></div>
            <div class="document-grid">
              ${documentCard(individual ? "National ID" : "Business permit", individual ? data.evidence.nationalIdUrl : data.evidence.businessPermitUrl)}
              ${documentCard("Profile photo", data.evidence.profilePhotoUrl)}
              ${(data.evidence.certificateUrls ?? []).map((url, i) => documentCard(`Skill certificate ${i+1}`, url)).join("")}
            </div>
          </div>
        </div>
        <div class="panel">
          <h3 class="panel-title">Admin review</h3>
          <p class="muted">Approval records these checks in the protected review workflow.</p>
          <label class="check-row"><input id="check-document" type="checkbox" /> <span>I inspected the submitted ${individual ? "National ID" : "business permit"} and it appears clear and valid.</span></label>
          <label class="check-row"><input id="check-match" type="checkbox" /> <span>${individual ? "The saved ID number matches the number visible on the National ID image." : "The business permit details match this garage/business application."}</span></label>
          <label>Review note<textarea id="review-note" placeholder="Required for rejection or resubmission"></textarea></label>
          <div class="action-row">
            <button id="approve-button" class="button primary" ${data.submission.status !== "pending" || (individual && !storedId) ? "disabled" : ""}>Approve mechanic</button>
            <button id="resubmit-button" class="button warning">Request resubmission</button>
            <button id="reject-button" class="button danger">Reject</button>
          </div>
          <p id="review-error" class="error-text" hidden></p>
        </div>
      </div>`;
    document.querySelector("#back-to-verifications").addEventListener("click", () => void renderVerificationList());
    const approveButton = document.querySelector("#approve-button");
    const refreshApproval = () => {
      const checks = document.querySelector("#check-document").checked && document.querySelector("#check-match").checked;
      approveButton.disabled = data.submission.status !== "pending" || (individual && !storedId) || !checks;
    };
    document.querySelector("#check-document").addEventListener("change", refreshApproval);
    document.querySelector("#check-match").addEventListener("change", refreshApproval);
    refreshApproval();
    approveButton.addEventListener("click", () => void submitReview(userId, "approve"));
    document.querySelector("#resubmit-button").addEventListener("click", () => void submitReview(userId, "resubmit"));
    document.querySelector("#reject-button").addEventListener("click", () => void submitReview(userId, "reject"));
  } catch (error) { setError(error.message); }
}


function documentCard(label, url) {
  if (!url) return `<div class="document-card"><div style="height:230px;display:grid;place-items:center;color:#667085">No document available</div><div>${escapeHtml(label)}</div></div>`;
  return `<a class="document-card" href="${escapeHtml(url)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(url)}" alt="${escapeHtml(label)}" /><div>${escapeHtml(label)} • open full size</div></a>`;
}

async function submitReview(userId, decision) {
  const note = document.querySelector("#review-note").value.trim();
  const errorEl = document.querySelector("#review-error");
  errorEl.hidden = true;
  if ((decision === "reject" || decision === "resubmit") && !note) {
    errorEl.textContent = "Enter a review note explaining the decision.";
    errorEl.hidden = false;
    return;
  }
  try {
    await invoke("admin-verification", { action: "review", userId, decision, note: note || null });
    await renderVerificationDetail(userId);
  } catch (error) {
    errorEl.textContent = error.message;
    errorEl.hidden = false;
  }
}

async function renderUsers() {
  const data = await invoke("admin-core", { action: "users" });
  const items = data.items ?? [];
  content.innerHTML = `<div class="panel"><div class="panel-header"><div><h3 class="panel-title">Registered users</h3><p class="muted">Live Supabase Auth + profile data. Admin authorization is separate from user roles.</p></div><input id="user-search" placeholder="Search name, email, role…" style="max-width:280px" /></div><div id="users-table"></div></div>`;
  const render = (query = "") => {
    const q = query.toLowerCase();
    const filtered = items.filter((item) => [item.full_name,item.email,item.phone,item.role,item.provider_type].some((v) => String(v ?? "").toLowerCase().includes(q)));
    document.querySelector("#users-table").innerHTML = `<div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Phone</th><th>Provider</th><th>Mechanic status</th><th>Last sign in</th></tr></thead><tbody>${filtered.map((item) => `<tr><td><strong>${escapeHtml(item.full_name || "Unnamed")}</strong><br><span class="muted">${escapeHtml(item.email || "No email")}</span></td><td>${escapeHtml(item.role)}</td><td>${escapeHtml(item.phone || "—")}</td><td>${escapeHtml(item.provider_type || "—")}</td><td>${item.mechanic ? `<span class="status ${item.mechanic.verified?"approved":"pending"}">${item.mechanic.verified?"verified":"unverified"}</span>` : "—"}</td><td>${escapeHtml(formatDate(item.last_sign_in_at))}</td></tr>`).join("")}</tbody></table></div>`;
  };
  render();
  document.querySelector("#user-search").addEventListener("input", (e) => render(e.target.value));
}

async function renderJobs() {
  const data = await invoke("admin-core", { action: "jobs" });
  content.innerHTML = `<div class="panel"><div class="panel-header"><div><h3 class="panel-title">Repair requests</h3><p class="muted">Live persisted repair/dispatch records.</p></div></div>${renderRequestTable(data.items ?? [])}</div>`;
}
function renderRequestCards(items) {
  if (!items.length) return `<div class="empty">No repair requests yet.</div>`;
  return `<div class="list">${items.map((item) => `<div class="list-card"><div><div class="list-title">${escapeHtml(item.symptom || item.id)}</div><div class="list-subtitle">${escapeHtml(item.location_text || "Location unavailable")} • ${escapeHtml(formatDate(item.created_at))}</div></div><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></div>`).join("")}</div>`;
}
function renderRequestTable(items) {
  if (!items.length) return `<div class="empty">No repair requests yet.</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Request</th><th>Motorist</th><th>Mechanic</th><th>Problem</th><th>Location</th><th>Status</th><th>Created</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(String(item.id).slice(0,8))}</td><td>${escapeHtml(item.motorist?.full_name || item.motorist_id)}</td><td>${escapeHtml(item.mechanic?.full_name || "Unassigned")}</td><td>${escapeHtml(item.symptom || item.description)}</td><td>${escapeHtml(item.location_text || "—")}</td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(formatDate(item.created_at))}</td></tr>`).join("")}</tbody></table></div>`;
}

async function renderMarketplaceFinance(){
  const data=await invoke("marketplace-finance-admin",{action:"summary"});
  const policy=data.policy??{};
  const m=data.summary??{};
  const payments=data.payments??[];
  const payouts=data.payouts??[];
  content.innerHTML=`
    <div class="panel">
      <div class="panel-header"><div><h3 class="panel-title">Marketplace settlement control</h3>
        <p class="muted">Restricted, read-only pilot ledger. Money never moves from this screen.</p>
      </div></div>
      <div class="notice warning">M-PESA marketplace collection:
        <strong>${policy.collection_enabled?"ENABLED":"DISABLED"}</strong>.
        Automatic B2C payouts: <strong>${policy.payouts_enabled?"ENABLED":"DISABLED"}</strong>.
        Cash fallback: <strong>${policy.cash_fallback_enabled?"ENABLED":"DISABLED"}</strong>.
        Do not interpret job completion as payment proof.</div>
      <div class="metric-grid">
        ${metric("Confirmed customer receipts",formatKES(m.confirmedGrossKes??0),`${m.verifiedPaymentCount??0} verified payments`)}
        ${metric("Commission from confirmed receipts",formatKES(m.recordedCommissionKes??0),"Before provider fees and taxes")}
        ${metric("Confirmed payouts",formatKES(m.actualPayoutKes??0),"M-PESA B2C payout verification required")}
        ${metric("Payouts awaiting processing",m.pendingPayoutCount??0,"No automatic disbursements")}
      </div>
      <div class="info-grid" style="margin-top:14px">
        ${info("Parts seller commission",(policy.parts_percent??10)+"%")}
        ${info("Towing partner commission",(policy.towing_percent??10)+"%")}
        ${info("Rider commission",(policy.rider_percent??0)+"%")}
        ${info("Pilot delivery pricing",formatKES(policy.rider_base_kes??150)+" + "+formatKES(policy.rider_per_km_kes??35)+"/km")}
      </div>
    </div>
    <div class="panel"><h3 class="panel-title">Marketplace customer payment records</h3>
      ${payments.length?`<div class="table-wrap"><table>
        <thead><tr><th>Reference</th><th>Service</th><th>Amount</th><th>Commission</th><th>Status</th><th>Provider</th><th>Created</th></tr></thead>
        <tbody>${payments.map(p=>`<tr>
          <td>${escapeHtml(String(p.origin_id).slice(0,8))}</td>
          <td>${escapeHtml(p.origin_kind)}</td>
          <td>${escapeHtml(formatKES(p.amount_kes))}</td>
          <td>${escapeHtml(formatKES(p.commission_kes))}</td>
          <td><span class="status ${statusClass(p.status)}">${escapeHtml(p.status)}</span></td>
          <td>${escapeHtml(p.provider)}</td>
          <td>${escapeHtml(formatDate(p.created_at))}</td>
        </tr>`).join("")}</tbody></table></div>`:
        '<div class="empty">No verified marketplace payments have been recorded. Collection is not connected.</div>'}
    </div>
    <div class="panel"><h3 class="panel-title">Provider and rider payouts</h3>
      ${payouts.length?`<div class="table-wrap"><table>
        <thead><tr><th>Payment</th><th>Role</th><th>Amount</th><th>Status</th><th>Paid at</th></tr></thead>
        <tbody>${payouts.map(p=>`<tr>
          <td>${escapeHtml(String(p.payment_id).slice(0,8))}</td>
          <td>${escapeHtml(p.beneficiary_role)}</td>
          <td>${escapeHtml(formatKES(p.amount_kes))}</td>
          <td><span class="status ${statusClass(p.status)}">${escapeHtml(p.status)}</span></td>
          <td>${escapeHtml(formatDate(p.paid_at))}</td>
        </tr>`).join("")}</tbody></table></div>`:
        '<div class="empty">No provider or rider payouts yet. Disbursements remain disabled.</div>'}
    </div>`;
}

async function renderPayments() {
  const data = await invoke("admin-core", { action: "payments" });
  const items = data.items ?? [];
  content.innerHTML = `<div class="panel"><div class="panel-header"><div><h3 class="panel-title">Connection payments</h3><p class="muted">Live connection-fee records. Provider secrets remain server-side.</p></div></div>${items.length ? `<div class="table-wrap"><table><thead><tr><th>Payment</th><th>Request</th><th>Amount</th><th>Provider</th><th>Status</th><th>Receipt</th><th>Created</th></tr></thead><tbody>${items.map((item) => `<tr><td>${escapeHtml(String(item.id).slice(0,8))}</td><td>${escapeHtml(String(item.request_id).slice(0,8))}</td><td>${escapeHtml(formatKES(item.amount))}</td><td>${item.provider === "sandbox_simulator" ? "<strong>SANDBOX TEST</strong><br><span class='muted'>No actual funds</span>" : escapeHtml(item.provider)}</td><td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(item.mpesa_receipt_number || "—")}</td><td>${escapeHtml(formatDate(item.created_at))}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">No connection payment records yet.</div>`}</div>`;
}

async function renderSandboxTesting() {
  if (state.role !== "super_admin") throw new Error("Super-admin access required.");

  const [simulator, jobs, payments] = await Promise.all([
    invoke("sandbox-payment-simulator", { action: "status" }),
    invoke("admin-core", { action: "jobs" }),
    invoke("admin-core", { action: "payments" }),
  ]);
  const paymentMap = new Map((payments.items ?? []).map((payment) => [payment.request_id, payment]));
  const accepted = (jobs.items ?? [])
    .filter((job) => job.status === "accepted" && job.mechanic_id && Number(job.connection_fee_amount) === 500);

  content.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div><h3 class="panel-title">Super-admin sandbox payment simulator</h3>
        <p class="muted">For testing only. This is outside the Android app. No M-PESA funds are collected or transferred.</p></div>
        <span class="status ${simulator.enabled ? "approved" : "failed"}">${simulator.enabled ? "Sandbox enabled" : "Disabled"}</span>
      </div>
      <div class="notice ${simulator.enabled ? "success" : "warning"}">
        <strong>${simulator.enabled ? "Test-only operation enabled" : "Simulation is disabled"}</strong><br>
        ${escapeHtml(simulator.message)}<br>
        A successful simulation marks the payment provider <strong>sandbox_simulator</strong> and unlocks contact details. It does not call Daraja or create a genuine receipt.
      </div>
      <p class="muted">To enable intentionally, set <code>MPESA_ENV=sandbox</code> and <code>AUTOASSIST_PAYMENT_SIMULATOR_ENABLED=true</code> under Supabase Edge Function Secrets. Switching to production disables simulation automatically.</p>
    </div>
    <div class="panel">
      <div class="panel-header"><h3 class="panel-title">Accepted repair requests</h3><span class="muted">Only accepted KES 500 jobs can be tested</span></div>
      ${accepted.length ? `
        <div class="table-wrap"><table>
          <thead><tr><th>Repair request</th><th>Motorist / Mechanic</th><th>Payment</th><th>Test actions</th></tr></thead>
          <tbody>
            ${accepted.map((job) => {
              const payment = paymentMap.get(job.id);
              const blocked = !simulator.enabled || ["paid","refunded"].includes(payment?.status) ||
                (payment?.status === "pending" && payment?.hasOpenCheckout);
              const reason = payment?.status === "paid" ? "Already paid" :
                payment?.status === "refunded" ? "Refunded" :
                payment?.hasOpenCheckout ? "Await Daraja checkout resolution first" :
                simulator.enabled ? "No payment has been collected" : "Simulator disabled";
              return `<tr>
                <td><strong>${escapeHtml(job.symptom ?? "Repair")}</strong><br>
                <span class="muted">${escapeHtml(job.id)}<br>${escapeHtml(formatDate(job.created_at))}</span></td>
                <td>${escapeHtml(job.motorist?.full_name ?? "Motorist")}<br>
                <span class="muted">Mechanic: ${escapeHtml(job.mechanic?.full_name ?? "Assigned")}</span></td>
                <td><span class="status ${statusClass(payment?.status)}">${escapeHtml(payment?.status ?? "Not started")}</span><br>
                <span class="muted">${escapeHtml(payment?.provider ?? "—")} • ${escapeHtml(reason)}</span></td>
                <td>
                  <div class="action-row">
                    <button class="button primary" data-sandbox-id="${escapeHtml(job.id)}" data-outcome="success" ${blocked ? "disabled" : ""}>Simulate success</button>
                    <button class="button warning" data-sandbox-id="${escapeHtml(job.id)}" data-outcome="failure" ${blocked ? "disabled" : ""}>Simulate failure</button>
                  </div>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
        </table></div>
      ` : `<div class="empty">No accepted KES 500 requests are available. Create and accept a new repair request on your two phones.</div>`}
    </div>
  `;

  content.querySelectorAll("[data-sandbox-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const requestId = button.dataset.sandboxId;
      const outcome = button.dataset.outcome;
      const phrase = window.prompt(
        `TEST ONLY: Simulate ${outcome} for this accepted repair? No real money will move.\n\nType SIMULATE TEST PAYMENT to confirm:`
      );
      if (phrase === null) return;
      if (phrase !== "SIMULATE TEST PAYMENT") {
        window.alert("Simulation cancelled. The confirmation phrase did not match.");
        return;
      }
      content.querySelectorAll("[data-sandbox-id]").forEach((item) => { item.disabled = true; });
      try {
        const result = await invoke("sandbox-payment-simulator", {
          action: "simulate",
          requestId,
          outcome,
          confirmation: phrase,
        });
        window.alert(result.message ?? "Sandbox payment status updated.");
        await renderSandboxTesting();
      } catch (error) {
        window.alert(error.message ?? "Sandbox payment simulation failed.");
        await renderSandboxTesting();
      }
    });
  });
}

async function renderAnalytics() {
  const data = await invoke("admin-core", { action: "analytics" });
  const m = data.metrics;
  content.innerHTML = `<div class="metric-grid">${metric("Users",m.totalUsers)}${metric("Verified mechanics",m.verifiedMechanics)}${metric("Repair requests",m.repairRequests)}${metric("Average rating",m.averageRating || "—")}</div><div class="panel"><h3 class="panel-title">Operational analytics</h3><div class="info-grid" style="margin-top:14px">${info("Real connection fees",formatKES(m.paidConnectionFees))}${info("Simulated payments",m.simulatedPayments ?? 0)}${info("Payment records",m.connectionPayments)}${info("Ratings submitted",m.ratings)}${info("Mechanics available",m.availableMechanics)}</div></div>`;
}

function renderSettings() {
  content.innerHTML = `<div class="panel"><div class="panel-header"><div><h3 class="panel-title">Admin identity</h3><p class="muted">Authorization is stored server-side and is independent of motorist/mechanic roles.</p></div><span class="status approved">${escapeHtml(state.role)}</span></div><div class="notice info"><strong>Separate application boundary</strong><br>This admin console is outside Expo Router and is not included in the Android/iOS AutoAssist user bundle. The browser only receives the public Supabase publishable key; privileged reads and writes are performed by JWT-protected Edge Functions after server-side admin authorization.</div><div class="info-grid">${info("Current role",String(state.role).replaceAll("_"," "))}${info("Verification access",["super_admin","verification_admin"].includes(state.role)?"Enabled":"No")}${info("Full operations access",state.role==="super_admin"?"Enabled":"Restricted")}${info("Service role in browser","Never")}</div></div>`;
}

function renderNotConnected(section, message) {
  content.innerHTML = `<div class="panel"><h3 class="panel-title">${escapeHtml(section)}</h3><div class="notice info" style="margin-top:14px">${escapeHtml(message)}</div></div>`;
}

void restore();
