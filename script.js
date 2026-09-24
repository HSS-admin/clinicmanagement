        const ADMIN_PASSWORD = "Admin@3270";
        const GOOGLE_FORM_URL = "https://forms.gle/gGK2eZs595GSyFWv6";
        // Set this to the deployed Google Apps Script web-app URL to use the spreadsheet.
        // Leave blank to keep using the existing Supabase medical_records table.
        // Add the deployed Apps Script /exec URL here after deploying the Sheets API.
        // A placeholder URL must remain disabled; otherwise every refresh fails with "Failed to fetch".
        const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbywdPp6K_UC9Me-9fGJNBmZOThr2WO59Fxs-PKdr7gF6LJTZuZ6hruBkMeh2WMpnIu5Xg/exec";
        const GOOGLE_SHEET_TAB = "Form Responses 1";
        const GOOGLE_SHEETS_REQUEST_TIMEOUT_MS = 30000;
        const SUPABASE_URL = "https://waklvnbjhjqyykgdfacg.supabase.co";
        const SUPABASE_KEY = "sb_publishable_AEa9iIzus4ziOzax0wcH6w_3aHz_evn";
        const MEDICAL_TABLE = "medical_records";
        // Shared workspace state is stored in one Supabase row so all signed-in users
        // see the same man-hours, supplies, and activity-calendar data.
        const SHARED_STATE_TABLE = "hse_shared_state";
        const SHARED_STATE_ID = 1;
        const SHARED_STATE_REFRESH_MS = 5000;
        const SUPABASE_AUTH_URL = `${SUPABASE_URL}/auth/v1`;
        let realtimeChannel = null;
        let medicalRefreshTimer = null;
        let sharedStateTimer = null;
        let sharedStateLoadInProgress = false;
        let sharedStateSaveInProgress = false;
        let sharedStateSaveQueued = false;
        let sharedStateSaveTimer = null;
        let sharedStateUpdatedAt = "";
        let sharedStateLocalChangePending = false;
        let medicalLoadInProgress = false;
        let medicalLoadQueued = false;
        let currentUser = null;
        let refreshSessionPromise = null;
        const STANDARD_SHIFT_HOURS = 8;
        const HOLIDAYS = ["01-01","02-17","03-20","04-02","04-03","04-04","04-09","05-01","05-27","06-12","08-21","08-31","11-01","11-02","11-30","12-08","12-24","12-25","12-30","12-31","08-30"];
        const KEY = "hse_dashboard_metrics";
        const MEDICINES = [
            "Advil soft gel cap 200mg", "Alaxan FR 500 mg", "Betahistine 8 mg tab", "Betahistine 16 mg tab", "Bioflu 500 mg", "Biogesic 500 mg", "Bonamine / Meclizine", "Buscopan Venus tab 10mg", "Butamirate Citrate 50 mg", "Calmoseptine Ointment", "Carbocisteine Solmux", "Celecoxib", "Cetirizine 10 mg tab", "Clonidine 75 mcg ( Catapres )", "Decolgen Non-Drowse", "Gaviscon Sachet", "Hyoscine 10 mg tab", "Kamillosan Spray", "Kremil-s tab", "Loperamide ( Diatabs )", "Mefenamic Acid", "Metoclopramide Hydrochloride", "Myonal tab 50mg", "Neozep non-drowsy tab", "Omeprazol 20mg Ritemed", "Oral Rehydrate Solution Sachet", "Salbutamol neb 1ml", "Salbutamol tab", "Silver Sulfadiazine 25mg", "Strepsils Cool", "Strepsils Oranges", "Tobramycine Eyedrop", "Tranexamic acid cap 500mg", "Tuseran Forte", "Visine Eyedrop", "Bactidol oral antiseptic soln 120ml", "Band aid/ mediplast bantam plastic / strip", "Betadine wound soln 10% 60 ml", "Brown paper bag", "Burn ointment", "Cleene cotton balls 50's", "Dextran (gentle tears) ampule", "Drixine nasal spray 0.05% 15ml", "Elastic bandage 4x5 nmv", "Examination gloves (L) Disposable /box", "Face Mask/box", "Flammazine (Silver Sulfadiazine) 10mg/g 5g Cream Antibacterial", "Gauze 4x4", "Glucometer lancet", "Glucometer strips", "Hot Compress Bag", "Hydrogen Peroxide 3% solution (antiseptic/disinfectant) 500mL", "Ice pack", "Isopropyl alc 70% 3.2 Liters", "Kamillosan m spry soln 15ml", "Little pals cotton buds 108tips", "Little pals cotton buds 200tips", "Nasal cannula (adult)", "Neb.kit", "Salonpas patch", "Sterile gauze 4x4/pack", "Tobradex/tobramycin", "Tongue depressor senior/box", "White flower #3", "White flower 10 ml", "White flower 20ml"
        ];
        const els = {};
        let medicalRecords = [];
        let medicalRecordsInitialized = false;
        const pendingMedicalUpdates = new Map();
        let notificationAudioContext = null;
        let notificationAudioUnlocked = false;
        let editingMedicalRecord = null;
        let metrics = JSON.parse(localStorage.getItem(KEY) || "null") || { maleCount: 45, femaleCount: 30, manualDaysLost: 0, liveSecondsAccumulated: 0, lastTickTimestamp: Date.now(), incidentLogs: [], formResponseCount: 0, formLatestResponse: "No data" };
        let activeSection = "manhoursSection";
        let editingIncidentIndex = null;
        let passwordAction = null;
        let passwordActionIndex = null;
        if (!Array.isArray(metrics.incidentLogs)) metrics.incidentLogs = [];
        if (typeof metrics.formResponseCount !== "number") metrics.formResponseCount = 0;
        if (typeof metrics.formLatestResponse !== "string") metrics.formLatestResponse = "No data";
        if (typeof metrics.maleCount !== "number") metrics.maleCount = 45;
        if (typeof metrics.femaleCount !== "number") metrics.femaleCount = 30;
        if (typeof metrics.manualDaysLost !== "number") metrics.manualDaysLost = 0;
        if (typeof metrics.liveSecondsAccumulated !== "number") metrics.liveSecondsAccumulated = 0;
        if (typeof metrics.lastTickTimestamp !== "number") metrics.lastTickTimestamp = Date.now();

        function cache() {
            ["liveClock","authGate","loginForm","loginEmail","loginPassword","togglePassword","authError","signedInUser","logoutButton","googleFormFrame","googleFormOpenLink","formResponseCount","formEmployeeCount","formMaleCount","formFemaleCount","formLatestResponse","formResponseInput","medicalSyncStatus","displayPeriodHours","periodSelect","displayHoursLost","displayDaysLost","displayTotalCount","displayMaleCount","displayFemaleCount","displayIncidentFreeDays","displayRatio","displayCompliance","adminPanelModal","inputMale","inputFemale","inputDaysLost","adminPassword","incidentLogBody","medicalRecordsHead","incidentModal","incidentDateTimeInput","incidentPersonInput","incidentTypeInput","incidentNatureInput","incidentCauseInput","incidentDaysAbsentInput","incidentSummaryInput","incidentPasswordInput","modalTitle","passwordModal","passwordInput","monthList","medicalRecordModal","medicalRecordsBody","topMedicines","topComplaints","topDiagnoses","recordBp","recordO2","recordPulse","recordTemp","recordMedicine","medicineSuggestions","recordStaff","recordComplaint","recordDiagnosis","recordRecommendation","supplyItem","supplyUnit","supplyDelivered","supplyConsumed","supplyReorder"].forEach(id => els[id] = document.getElementById(id));
            els.menuItems = document.querySelectorAll(".menu-item");
            els.appSections = document.querySelectorAll(".app-section");
        }

        function setupNavigation() {
            els.menuItems.forEach(button => button.addEventListener("click", () => {
                activeSection = button.dataset.section;
                els.menuItems.forEach(item => item.classList.toggle("active", item === button));
                els.appSections.forEach(section => section.classList.toggle("active", section.id === activeSection));
                if (activeSection === "googleFormSection") loadMedicalRecords();
            }));
        }

        function setupGoogleForm() {
            const configured = GOOGLE_FORM_URL && !GOOGLE_FORM_URL.includes("PASTE_YOUR");
            if (configured) {
                els.googleFormOpenLink.href = GOOGLE_FORM_URL;
            } else {
                els.googleFormOpenLink.removeAttribute("href");
                els.googleFormOpenLink.addEventListener("click", event => event.preventDefault());
            }
            renderFormStatistics();
        }

        function saveSession() {
            if (currentUser) sessionStorage.setItem("hse_supabase_session", JSON.stringify(currentUser));
        }

        function sharedStateSnapshot() {
            return {
                metrics: {
                    maleCount: metrics.maleCount,
                    femaleCount: metrics.femaleCount,
                    manualDaysLost: metrics.manualDaysLost,
                    liveSecondsAccumulated: metrics.liveSecondsAccumulated,
                    incidentLogs: metrics.incidentLogs
                },
                supplies,
                activities
            };
        }

        function applySharedState(state, updatedAt = "") {
            if (!state || typeof state !== "object") return;
            // Do not let a polling response overwrite a calendar/supply/man-hours
            // edit that is still waiting to be written to Supabase.
            if (sharedStateLocalChangePending) return;
            if (updatedAt && sharedStateUpdatedAt && new Date(updatedAt) < new Date(sharedStateUpdatedAt)) return;
            if (updatedAt) sharedStateUpdatedAt = updatedAt;
            if (state.metrics && typeof state.metrics === "object") {
                metrics.maleCount = Number(state.metrics.maleCount) || 0;
                metrics.femaleCount = Number(state.metrics.femaleCount) || 0;
                metrics.manualDaysLost = Number(state.metrics.manualDaysLost) || 0;
                if (typeof state.metrics.liveSecondsAccumulated === "number") metrics.liveSecondsAccumulated = state.metrics.liveSecondsAccumulated;
                metrics.lastTickTimestamp = Date.now();
                if (Array.isArray(state.metrics.incidentLogs)) metrics.incidentLogs = state.metrics.incidentLogs;
            }
            if (Array.isArray(state.supplies)) supplies = state.supplies;
            if (Array.isArray(state.activities)) activities = state.activities;
            localStorage.setItem(KEY, JSON.stringify(metrics));
            saveSupplyData();
            saveActivityData();
            updateMedicineUsageCounts();
            renderDashboard();
            renderCalendar();
        }

        async function loadSharedState() {
            if (!currentUser?.access_token || sharedStateLoadInProgress) return;
            sharedStateLoadInProgress = true;
            try {
                const rows = await supabaseRequest(
                    `${SHARED_STATE_TABLE}?id=eq.${SHARED_STATE_ID}&select=state,updated_at&_ts=${Date.now()}`,
                    { method: "GET", cache: "no-store", headers: { "Cache-Control": "no-cache", Pragma: "no-cache" } }
                );
                if (Array.isArray(rows) && rows[0]?.state) {
                    applySharedState(rows[0].state, rows[0].updated_at);
                } else if (Array.isArray(rows) && !rows.length) {
                    await saveSharedState();
                }
            } catch (error) {
                console.warn("Shared workspace state unavailable; using local data.", error);
            } finally {
                sharedStateLoadInProgress = false;
            }
        }

        async function saveSharedState() {
            if (!currentUser?.access_token) return;
            sharedStateLocalChangePending = true;
            if (sharedStateSaveInProgress) {
                sharedStateSaveQueued = true;
                return;
            }
            sharedStateSaveInProgress = true;
            sharedStateSaveQueued = false;
            try {
                const updatedAt = new Date().toISOString();
                await supabaseRequest(SHARED_STATE_TABLE, {
                    method: "POST",
                    body: JSON.stringify({ id: SHARED_STATE_ID, state: sharedStateSnapshot(), updated_at: updatedAt }),
                    headers: { Prefer: "resolution=merge-duplicates,return=minimal", "Cache-Control": "no-cache" }
                });
                sharedStateUpdatedAt = updatedAt;
            } catch (error) {
                console.warn("Shared workspace state could not be saved.", error);
            } finally {
                sharedStateSaveInProgress = false;
                sharedStateLocalChangePending = false;
                if (sharedStateSaveQueued) {
                    sharedStateSaveQueued = false;
                    scheduleSharedStateSave(0);
                }
            }
        }

        function scheduleSharedStateSave(delay = 150) {
            sharedStateLocalChangePending = true;
            clearTimeout(sharedStateSaveTimer);
            sharedStateSaveTimer = setTimeout(() => saveSharedState(), delay);
        }

        async function refreshSupabaseSession() {
            if (!currentUser?.refresh_token) return false;
            if (refreshSessionPromise) return refreshSessionPromise;
            refreshSessionPromise = fetch(`${SUPABASE_AUTH_URL}/token?grant_type=refresh_token`, {
                method: "POST",
                headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
                body: JSON.stringify({ refresh_token: currentUser.refresh_token })
            }).then(async response => {
                if (!response.ok) return false;
                const session = await response.json();
                currentUser = { ...currentUser, ...session };
                saveSession();
                return true;
            }).catch(() => false).finally(() => {
                refreshSessionPromise = null;
            });
            return refreshSessionPromise;
        }

        async function supabaseRequest(path, options = {}, hasRetried = false) {
            const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${currentUser?.access_token || SUPABASE_KEY}`, "Content-Type": "application/json", ...(options.headers || {}) };
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...options, headers });
            if (response.status === 401 || response.status === 403) {
                const body = await response.clone().text();
                const expired = response.status === 401 || body.includes("JWT expired") || body.includes("PGRST303");
                if (expired && !hasRetried && await refreshSupabaseSession()) return supabaseRequest(path, options, true);
            }
            if (!response.ok) throw new Error(await response.text());
            return response.status === 204 ? null : response.json();
        }

        async function signInUser(event) {
            event.preventDefault();
            els.authError.textContent = "";
            try {
                const response = await fetch(`${SUPABASE_AUTH_URL}/token?grant_type=password`, { method: "POST", headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ email: els.loginEmail.value.trim(), password: els.loginPassword.value }) });
                if (!response.ok) throw new Error((await response.json()).msg || "Invalid email or password.");
                currentUser = await response.json();
                saveSession();
                showAuthenticatedApp();
                loadMedicalRecords();
            } catch (error) { els.authError.textContent = error.message || "Unable to sign in."; }
        }

        function showAuthenticatedApp() {
            els.authGate.hidden = true;
            els.logoutButton.hidden = false;
            els.signedInUser.textContent = currentUser?.user?.email || "Signed in";
            activeSection = "googleFormSection";
            els.menuItems.forEach(item => item.classList.toggle("active", item.dataset.section === activeSection));
            els.appSections.forEach(section => section.classList.toggle("active", section.id === activeSection));
            setupRealtimeUpdates();
            loadSharedState();
            loadMedicalRecords();
        }

        function logoutUser() {
            currentUser = null;
            refreshSessionPromise = null;
            medicalLoadInProgress = false;
            medicalLoadQueued = false;
            sessionStorage.removeItem("hse_supabase_session");
            if (realtimeChannel) {
                realtimeChannel.close();
                realtimeChannel = null;
            }
            clearInterval(medicalRefreshTimer);
            clearInterval(sharedStateTimer);
            clearTimeout(sharedStateSaveTimer);
            medicalRefreshTimer = null;
            sharedStateTimer = null;
            sharedStateSaveTimer = null;
            sharedStateSaveQueued = false;
            sharedStateUpdatedAt = "";
            sharedStateLocalChangePending = false;
            medicalRecords = [];
            medicalRecordsInitialized = false;
            medicineUsageCounts.clear();
            renderSupplies();
            els.authGate.hidden = false;
            els.logoutButton.hidden = true;
            els.signedInUser.textContent = "Not signed in";
            els.loginForm.reset();
            els.loginPassword.type = "password";
            els.togglePassword.textContent = "◉";
            els.togglePassword.setAttribute("aria-label", "Show password");
            els.togglePassword.setAttribute("aria-pressed", "false");
            els.authError.textContent = "";
            els.medicalRecordsHead.innerHTML = `<tr><th>Medical Records</th></tr>`;
            els.medicalRecordsBody.innerHTML = `<tr><td colspan="1" class="no-log">Sign in to load medical records.</td></tr>`;
            setMedicalSyncStatus("Waiting for sign-in");
            renderFormStatistics();
        }

        function togglePasswordVisibility() {
            const isHidden = els.loginPassword.type === "password";
            els.loginPassword.type = isHidden ? "text" : "password";
            els.togglePassword.textContent = isHidden ? "◉̸" : "◉";
            els.togglePassword.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
            els.togglePassword.setAttribute("aria-pressed", String(isHidden));
        }

        function unlockNotificationSound() {
            if (notificationAudioUnlocked) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            notificationAudioContext = notificationAudioContext || new AudioContext();
            if (notificationAudioContext.state === "suspended") notificationAudioContext.resume();
            notificationAudioUnlocked = true;
        }

        function playNewRecordNotification() {
            const audioContext = notificationAudioContext;
            if (!audioContext || audioContext.state === "suspended") return;
            const now = audioContext.currentTime;
            [0, 0.14].forEach((offset, index) => {
                const oscillator = audioContext.createOscillator();
                const gain = audioContext.createGain();
                oscillator.type = "sine";
                oscillator.frequency.value = index ? 880 : 660;
                gain.gain.setValueAtTime(0.0001, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.16, now + offset + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
                oscillator.connect(gain).connect(audioContext.destination);
                oscillator.start(now + offset);
                oscillator.stop(now + offset + 0.2);
            });
        }

        function setupAuth() {
            els.loginForm.addEventListener("submit", signInUser);
            els.loginForm.addEventListener("pointerdown", unlockNotificationSound, { once: true });
            els.togglePassword.addEventListener("click", togglePasswordVisibility);
            try { currentUser = JSON.parse(sessionStorage.getItem("hse_supabase_session") || "null"); } catch { currentUser = null; }
            if (currentUser?.access_token) showAuthenticatedApp();
        }

        function setMedicalSyncStatus(text, state = "") {
            if (!els.medicalSyncStatus) return;
            els.medicalSyncStatus.textContent = text;
            els.medicalSyncStatus.parentElement.className = `sync-status ${state}`.trim();
        }

        function setupRealtimeUpdates() {
            // Polling keeps shared workspace data current for every signed-in user.
            if (medicalRefreshTimer) clearInterval(medicalRefreshTimer);
            if (sharedStateTimer) clearInterval(sharedStateTimer);
            medicalRefreshTimer = setInterval(() => {
                if (document.visibilityState === "visible" && activeSection === "googleFormSection") loadMedicalRecords();
            }, 10000);
            sharedStateTimer = setInterval(() => {
                if (document.visibilityState !== "visible" || !currentUser?.access_token) return;
                loadSharedState();
            }, Math.min(SHARED_STATE_REFRESH_MS, 2000));
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible" && currentUser?.access_token) {
                    loadSharedState();
                    if (activeSection === "googleFormSection") loadMedicalRecords();
                }
            });
        }

        function setupMedicalRecords() {
            const medicineList = document.getElementById("medicineList");
            if (medicineList) medicineList.innerHTML = MEDICINES.map(medicine => `<option value="${escapeHtml(medicine)}"></option>`).join("");
            els.recordMedicine.addEventListener("input", renderMedicineSuggestions);
            els.recordMedicine.addEventListener("focus", renderMedicineSuggestions);
            els.recordMedicine.addEventListener("keydown", event => {
                if (event.key === "Escape") hideMedicineSuggestions();
            });
            document.addEventListener("click", event => {
                if (!event.target.closest(".medicine-picker")) hideMedicineSuggestions();
            });
            if (currentUser) loadMedicalRecords();
        }

        function hideMedicineSuggestions() {
            els.medicineSuggestions.hidden = true;
            els.medicineSuggestions.innerHTML = "";
        }

        function renderMedicineSuggestions() {
            const query = els.recordMedicine.value.trim().toLowerCase();
            const matches = MEDICINES.filter(medicine => medicine.toLowerCase().includes(query)).slice(0, 8);
            els.medicineSuggestions.innerHTML = matches.length
                ? matches.map(medicine => `<button type="button" role="option" data-medicine="${escapeHtml(medicine)}">${escapeHtml(medicine)}</button>`).join("")
                : `<div class="no-medicine-match">No matching medicine</div>`;
            els.medicineSuggestions.hidden = false;
            els.medicineSuggestions.querySelectorAll("[data-medicine]").forEach(button => button.addEventListener("click", () => {
                els.recordMedicine.value = button.dataset.medicine;
                hideMedicineSuggestions();
            }));
        }

        function animateRefreshButtons() {
            document.querySelectorAll(".refresh-records-button").forEach(button => {
                button.classList.remove("refreshing");
                void button.offsetWidth;
                button.classList.add("refreshing");
                button.addEventListener("animationend", () => button.classList.remove("refreshing"), { once: true });
            });
        }

        function normalizeMedicalRecord(record, headers = []) {
            let normalized = record;
            if (Array.isArray(record)) {
                normalized = Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""]));
            } else if (typeof record !== "object" || record === null) {
                normalized = {};
            }
            const rowNumber = normalized.rowNumber ?? normalized.row ?? normalized.rowIndex ?? "";
            const recordId = normalized.id || rowNumber;
            return {
                ...normalized,
                id: String(recordId),
                rowNumber
            };
        }

        async function loadMedicalRecords() {
            animateRefreshButtons();
            if (!currentUser?.access_token) {
                setMedicalSyncStatus("Waiting for sign-in");
                return;
            }
            if (medicalLoadInProgress) {
                medicalLoadQueued = true;
                return;
            }
            medicalLoadInProgress = true;
            setMedicalSyncStatus("Syncing records…", "syncing");
            try {
                if (GOOGLE_SHEETS_API_URL) {
                    // Apps Script deployments can fail in the browser because of CORS,
                    // redirects, permissions, or an outdated deployment version. If that
                    // happens, continue with the authenticated Supabase fallback below.
                    try {
                        const payload = await googleSheetsRequest(`${GOOGLE_SHEETS_API_URL}?action=list&sheet=${encodeURIComponent(GOOGLE_SHEET_TAB)}&accessToken=${encodeURIComponent(currentUser.access_token)}&_ts=${Date.now()}`, {
                            method: "GET"
                        });
                        const sheetHeaders = payload.headers || payload.header || payload.columns || payload.data?.headers || [];
                        const rawRecords = Array.isArray(payload)
                            ? payload
                            : (payload.records || payload.rows || payload.data?.records || payload.data?.rows || payload.data?.values || []);
                        const nextRecords = rawRecords.map(record => normalizeMedicalRecord(record, sheetHeaders));
                        nextRecords.forEach(record => {
                            const pendingUpdate = pendingMedicalUpdates.get(String(record.id));
                            if (!pendingUpdate) return;

                            // Apps Script returns the sheet's question headers, while the
                            // update payload uses database-style field names. Compare the
                            // displayed clinical values, not the raw property names.
                            const serverHasUpdate = Object.entries(pendingUpdate).every(([key, value]) => {
                                const aliasesByField = {
                                    vitals_bp: MEDICAL_FIELD_ALIASES.bp,
                                    vitals_o2: MEDICAL_FIELD_ALIASES.o2,
                                    vitals_pulse_rate: MEDICAL_FIELD_ALIASES.pulse,
                                    vitals_temperature: MEDICAL_FIELD_ALIASES.temp,
                                    medicine_given: MEDICAL_FIELD_ALIASES.medicine,
                                    attending_staff: MEDICAL_FIELD_ALIASES.staff,
                                    chief_complaint: MEDICAL_FIELD_ALIASES.complaint,
                                    diagnosis: MEDICAL_FIELD_ALIASES.diagnosis,
                                    recommendation: MEDICAL_FIELD_ALIASES.recommendation
                                };
                                return String(clinicalValue(record, aliasesByField[key] || [key]) ?? "").trim() === String(value ?? "").trim();
                            });

                            // Keep the optimistic values until the list endpoint confirms
                            // that the spreadsheet row has actually been updated.
                            if (!serverHasUpdate) Object.assign(record, pendingUpdate);
                            else pendingMedicalUpdates.delete(String(record.id));
                        });
                        const previousIds = new Set(medicalRecords.map(record => String(record.id)));
                        const hasNewRecords = medicalRecordsInitialized && nextRecords.some(record => !previousIds.has(String(record.id)));
                        medicalRecords = nextRecords;
                        updateMedicineUsageCounts();
                        medicalRecordsInitialized = true;
                        if (hasNewRecords) playNewRecordNotification();
                        renderMedicalRecords();
                        renderFormStatistics();
                        setMedicalSyncStatus(`Live • ${medicalRecords.length.toLocaleString()} record${medicalRecords.length === 1 ? "" : "s"} • Updated ${new Date().toLocaleTimeString()}`, "connected");
                        return;
                    } catch (googleError) {
                        // Do not read the old Supabase mirror when Sheets is configured;
                        // that can resurrect deleted rows and hide spreadsheet updates.
                        throw googleError;
                    }
                }
                // Fetch every column so a missing optional column cannot block all rows.
                // Google Forms data must first be inserted into medical_records by the
                // form integration/automation; this page reads that Supabase table.
                const records = await supabaseRequest(
                    `${MEDICAL_TABLE}?select=*`,
                    {
                        cache: "no-store",
                        headers: {
                            Prefer: "count=exact",
                            "Cache-Control": "no-cache",
                            "Pragma": "no-cache"
                        }
                    }
                );
                const nextRecords = (Array.isArray(records) ? records : []).sort((a, b) => {
                    const dateA = new Date(submittedValue(a)).getTime() || 0;
                    const dateB = new Date(submittedValue(b)).getTime() || 0;
                    return dateB - dateA;
                });
                const previousIds = new Set(medicalRecords.map(record => String(record.id)));
                const hasNewRecords = medicalRecordsInitialized && nextRecords.some(record => !previousIds.has(String(record.id)));
                medicalRecords = nextRecords;
                medicalRecordsInitialized = true;
                if (hasNewRecords) playNewRecordNotification();
                renderMedicalRecords();
                renderFormStatistics();
                setMedicalSyncStatus(`Live • ${medicalRecords.length.toLocaleString()} record${medicalRecords.length === 1 ? "" : "s"} • Updated ${new Date().toLocaleTimeString()}`, "connected");
            } catch (error) {
                const message = error?.message || "Unknown connection error";
                const source = GOOGLE_SHEETS_API_URL ? "Google Sheets Apps Script" : "Supabase";
                setMedicalSyncStatus("Sync failed — retrying automatically");
                const setupMessage = GOOGLE_SHEETS_API_URL
                    ? "Confirm that the Apps Script URL is deployed as a web app and allows requests from this page."
                    : `Set GOOGLE_SHEETS_API_URL in script.js to your deployed Apps Script /exec URL. Supabase is only a fallback and is not the Google Form spreadsheet.`;
                // Keep the last successfully loaded rows visible during a temporary
                // timeout; replacing them with an error row makes valid data appear deleted.
                if (!medicalRecords.length) {
                    els.medicalRecordsHead.innerHTML = `<tr><th>Medical Records</th></tr>`;
                    els.medicalRecordsBody.innerHTML = `<tr><td colspan="1" class="no-log">Unable to load records from ${source}: ${escapeHtml(message)}<br><small>${escapeHtml(setupMessage)}</small></td></tr>`;
                }
                console.error("Medical records load failed", { message, source, table: MEDICAL_TABLE, url: GOOGLE_SHEETS_API_URL || SUPABASE_URL });
            } finally {
                medicalLoadInProgress = false;
                if (medicalLoadQueued) {
                    medicalLoadQueued = false;
                    loadMedicalRecords();
                }
            }
        }

        function normalizedKey(value) {
            return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
        }

        function recordValue(record, names) {
            const wanted = names.map(normalizedKey).filter(Boolean);
            const entries = Object.entries(record || {});
            const exact = entries.find(([key]) => wanted.includes(normalizedKey(key)));
            if (exact) return exact[1];

            // Google Form question headers often contain extra wording. Match only
            // when an alias is clearly contained in the header, not by column order.
            const partial = entries.find(([key]) => {
                const header = normalizedKey(key);
                return wanted.some(alias => alias.length >= 5 && (header.includes(alias) || alias.includes(header)));
            });
            return partial ? partial[1] : "";
        }

        // Apps Script rows use sheet headers, while Supabase rows use database names.
        // Keep both formats mapped to the same table columns.
        function clinicalValue(record, names) {
            const value = recordValue(record, names);
            if (value !== "" && value !== null && value !== undefined) return value;
            return detailValue(record, names);
        }

        function submittedValue(record) {
            return recordValue(record, ["created_at", "timestamp", "submitted_at", "Timestamp", "Submission timestamp", "Submitted", "Response Timestamp"])
                || detailValue(record, ["Timestamp", "Submission timestamp", "Submitted", "Response Timestamp"]);
        }

        function escapeHtml(value) { return String(value ?? "").replace(/[&<>'\"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[char])); }

        function googleSheetsError(responseText, status) {
            const text = String(responseText || "").trim();
            try {
                const payload = JSON.parse(text);
                return payload.error || payload.message || `Google Sheets request failed (${status}).`;
            } catch {
                if (text.startsWith("<!DOCTYPE html") || text.startsWith("<html")) {
                    return "Google Sheets returned an HTML page instead of JSON. Redeploy the Apps Script as a Web app with access set to Anyone, and use its /exec URL (not /dev).";
                }
                return text.replace(/<[^>]*>/g, " ").replace(/\\s+/g, " ").trim().slice(0, 300) || `Google Sheets request failed (${status}).`;
            }
        }

        async function googleSheetsRequest(url, options = {}) {
            const controller = new AbortController();
            const timeoutMs = options.timeoutMs || GOOGLE_SHEETS_REQUEST_TIMEOUT_MS;
            const requestOptions = { ...options };
            delete requestOptions.timeoutMs;
            const timeout = setTimeout(() => controller.abort(), timeoutMs);
            try {
                const response = await fetch(url, {
                    ...requestOptions,
                    cache: "no-store",
                    signal: controller.signal
                });
                const text = await response.text();
                if (!response.ok) throw new Error(googleSheetsError(text, response.status));
                try {
                    const payload = JSON.parse(text);
                    if (payload && !Array.isArray(payload) && payload.error) throw new Error(payload.error);
                    return payload;
                } catch (error) {
                    if (error instanceof SyntaxError) throw new Error(googleSheetsError(text, response.status));
                    throw error;
                }
            } catch (error) {
                if (error.name === "AbortError") throw new Error("Google Sheets request timed out.");
                throw error;
            } finally {
                clearTimeout(timeout);
            }
        }

        function topTen(field) { const counts = {}; medicalRecords.forEach(record => { const value = clinicalValue(record, field); if (value) counts[value] = (counts[value] || 0) + 1; }); return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10).map(([name,count], index) => `<div>${index + 1}. ${escapeHtml(name)} <strong>${count}</strong></div>`).join("") || "No data"; }

        function formDetails(record) {
            // Supabase stores Google Form answers in form_details. Apps Script may
            // return the same object as form_details, details, or formDetails.
            const raw = record?.form_details ?? record?.details ?? record?.formDetails ?? {};
            if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) return raw;
            if (typeof raw === "string") {
                try {
                    const parsed = JSON.parse(raw);
                    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
                } catch {
                    return {};
                }
            }
            return {};
        }

        const MEDICAL_FIELD_ALIASES = {
            bp: ["vitals_bp", "blood_pressure", "blood pressure", "bp", "blood pressure reading"],
            o2: ["vitals_o2", "o2_saturation", "o2 saturation", "oxygen saturation", "spo2", "oxygen sat"],
            pulse: ["vitals_pulse_rate", "pulse_rate", "pulse rate", "pulse", "heart rate"],
            temp: ["vitals_temperature", "temperature", "temp", "body temperature"],
            medicine: ["medicine_given", "medicine given", "medicine", "medication"],
            staff: ["attending_staff", "attending nurse or doctor", "attending nurse", "attending doctor", "staff"],
            complaint: ["chief_complaint", "chief complaint", "complaint", "chief complaints"],
            diagnosis: ["diagnosis", "medical diagnosis"],
            recommendation: ["recommendation", "clinic recommendation", "disposition"]
        };

        function detailValue(record, names) {
            const details = formDetails(record);
            const wanted = names.map(normalizedKey);
            const entry = Object.entries(details).find(([key]) => wanted.includes(normalizedKey(key)));
            if (entry) return String(entry[1] ?? "").trim();
            const partial = Object.entries(details).find(([key]) => {
                const header = normalizedKey(key);
                return wanted.some(alias => alias.length >= 5 && (header.includes(alias) || alias.includes(header)));
            });
            return partial ? String(partial[1] ?? "").trim() : "";
        }

        function employeeKey(record) {
            return clinicalValue(record, ["employee_id", "Employee ID", "Employee Number", "Employee No.", "Employee Name", "Name", "Full Name", "Email Address", "Email"]) || record.id;
        }

        function genderValue(record) {
            return clinicalValue(record, ["gender", "Gender", "Sex", "What is your gender?", "What is your sex?"]).toLowerCase();
        }

        function getFormSummary() {
            const employees = new Set();
            let male = 0, female = 0;
            medicalRecords.forEach(record => {
                employees.add(employeeKey(record));
                const gender = genderValue(record);
                if (gender === "male" || gender === "m") male++;
                if (gender === "female" || gender === "f") female++;
            });
            return { employees: employees.size, male, female };
        }

        function formResponseEntries(record) {
            const excluded = new Set([
                "id", "rownumber", "row", "rowindex", "createdat", "created_at", "submittedat",
                "submitted_at", "timestamp", "submissiontimestamp", "submitted", "responsetimestamp",
                ...Object.values(MEDICAL_FIELD_ALIASES).flat().map(normalizedKey)
            ]);
            const details = formDetails(record);
            const source = Object.keys(details).length ? details : record;
            return Object.entries(source || {}).filter(([key]) => !excluded.has(normalizedKey(key)));
        }

        function medicalFormColumns() {
            const columns = [];
            medicalRecords.forEach(record => {
                formResponseEntries(record).forEach(([key]) => {
                    const normalized = normalizedKey(key);
                    if (normalized && !columns.some(column => normalizedKey(column) === normalized)) columns.push(key);
                });
            });
            return columns;
        }

        function formResponseValue(record, column) {
            const entry = formResponseEntries(record).find(([key]) => normalizedKey(key) === normalizedKey(column));
            return entry ? entry[1] : "";
        }

        function renderMedicalRecords() {
            els.topMedicines.innerHTML = topTen(["medicine_given", "Medicine Given", "Medicine"]);
            els.topComplaints.innerHTML = topTen(["chief_complaint", "Chief Complaint", "Complaint"]);
            els.topDiagnoses.innerHTML = topTen(["diagnosis", "Diagnosis"]);

            const formColumns = medicalFormColumns();
            els.medicalRecordsHead.innerHTML = `<tr><th>Submitted</th>${formColumns.map(column => `<th>${escapeHtml(column)}</th>`).join("")}<th>Vitals</th><th>Medicine</th><th>Staff</th><th>Complaint</th><th>Diagnosis</th><th>Recommendation</th><th>Action</th></tr>`;
            const columnCount = formColumns.length + 8;

            els.medicalRecordsBody.innerHTML = medicalRecords.length ? medicalRecords.map((record, index) => {
                const submitted = submittedValue(record);
                const vitals = [
                    clinicalValue(record, MEDICAL_FIELD_ALIASES.bp),
                    clinicalValue(record, MEDICAL_FIELD_ALIASES.o2),
                    clinicalValue(record, MEDICAL_FIELD_ALIASES.pulse),
                    clinicalValue(record, MEDICAL_FIELD_ALIASES.temp)
                ].filter(Boolean).join(" | ");
                const formCells = formColumns.map(column => `<td>${escapeHtml(formResponseValue(record, column) || "")}</td>`).join("");
                return `<tr><td>${escapeHtml(submitted ? new Date(submitted).toLocaleString("en-PH") : "No date")}</td>${formCells}<td>${escapeHtml(vitals || "Not recorded")}</td><td>${escapeHtml(clinicalValue(record, MEDICAL_FIELD_ALIASES.medicine))}</td><td>${escapeHtml(clinicalValue(record, MEDICAL_FIELD_ALIASES.staff))}</td><td>${escapeHtml(clinicalValue(record, MEDICAL_FIELD_ALIASES.complaint))}</td><td>${escapeHtml(clinicalValue(record, MEDICAL_FIELD_ALIASES.diagnosis))}</td><td>${escapeHtml(clinicalValue(record, MEDICAL_FIELD_ALIASES.recommendation))}</td><td><div class="log-actions"><button class="edit" onclick="openMedicalRecordModal(${index})">Edit</button></div></td></tr>`;
            }).join("") : `<tr><td colspan="${columnCount}" class="no-log">No medical records found.</td></tr>`;
        }
        function openMedicalRecordModal(index) {
            editingMedicalRecord = medicalRecords[index];
            ["Bp","O2","Pulse","Temp","Staff","Complaint","Diagnosis","Recommendation"].forEach(name => els[`record${name}`].value = "");
            hideMedicineSuggestions();
            els.recordBp.value = stripVitalUnit(clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.bp), "mmHg");
            els.recordO2.value = stripVitalUnit(clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.o2), "%");
            els.recordPulse.value = stripVitalUnit(clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.pulse), "bpm");
            els.recordTemp.value = stripVitalUnit(clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.temp), "°C");
            els.recordMedicine.value = clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.medicine);
            els.recordStaff.value = clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.staff);
            els.recordComplaint.value = clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.complaint);
            els.recordDiagnosis.value = clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.diagnosis);
            els.recordRecommendation.value = clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.recommendation) || "Clinic Rest";
            els.medicalRecordModal.classList.add("visible");
        }

        async function deleteMedicalRecord(index) {
            const record = medicalRecords[index];
            if (!record || !confirm("Delete this Google Form response and its clinic record? This cannot be undone.")) return;
            try {
                if (GOOGLE_SHEETS_API_URL) {
                    const rowNumber = record.rowNumber ?? record.row ?? record.rowIndex;
                    if (!rowNumber) throw new Error("This response has no spreadsheet row number.");
                    const result = await googleSheetsRequest(GOOGLE_SHEETS_API_URL, {
                        method: "POST",
                        headers: { "Content-Type": "text/plain;charset=utf-8" },
                        // The Apps Script must recognize action=delete. Do not send
                        // action=update here because that produces Invalid update request.
                        body: JSON.stringify({ action: "delete", sheet: GOOGLE_SHEET_TAB, rowNumber: Number(rowNumber), accessToken: currentUser.access_token })
                    });
                    if (result?.success === false || result?.ok === false) throw new Error(result.error || result.message || "Google Sheets rejected the delete.");
                } else {
                    if (!record.id) throw new Error("This record has no row identifier.");
                    await supabaseRequest(`${MEDICAL_TABLE}?id=eq.${encodeURIComponent(record.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
                }
                medicalRecords.splice(index, 1);
                medicalRecordsInitialized = true;
                renderMedicalRecords();
                renderFormStatistics();
                await loadMedicalRecords();
            } catch (error) {
                alert(`Unable to delete this medical record: ${error.message || "Unknown error"}`);
                console.error(error);
            }
        }
        function closeMedicalRecordModal() { els.medicalRecordModal.classList.remove("visible"); editingMedicalRecord = null; }
        function stripVitalUnit(value, unit) {
            return String(value ?? "").replace(new RegExp(`\\s*${unit.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*$`, "i"), "").trim();
        }

        function withVitalUnit(value, unit) {
            const cleanValue = stripVitalUnit(value, unit);
            return cleanValue ? `${cleanValue} ${unit}` : "";
        }

      async function saveMedicalRecord() {
            if (!editingMedicalRecord?.id) return alert("This record has no row identifier and cannot be edited.");
            const record = editingMedicalRecord;
            const update = {
                vitals_bp: withVitalUnit(els.recordBp.value, "mmHg"),
                vitals_o2: withVitalUnit(els.recordO2.value, "%"),
                vitals_pulse_rate: withVitalUnit(els.recordPulse.value, "bpm"),
                vitals_temperature: withVitalUnit(els.recordTemp.value, "°C"),
                medicine_given: els.recordMedicine.value,
                attending_staff: els.recordStaff.value.trim(),
                chief_complaint: els.recordComplaint.value.trim(),
                diagnosis: els.recordDiagnosis.value.trim(),
                recommendation: els.recordRecommendation.value
            };

            // Keep the edit visible while the spreadsheet list endpoint catches up.
            // Some Apps Script deployments return the previous row briefly after an update.
            pendingMedicalUpdates.set(String(record.id), update);
            Object.assign(record, update);
            updateMedicineUsageCounts();
            closeMedicalRecordModal();
            renderMedicalRecords();
            renderFormStatistics();

            try {
                if (GOOGLE_SHEETS_API_URL) {
                    const result = await googleSheetsRequest(GOOGLE_SHEETS_API_URL, {
                        method: "POST",
                        headers: { "Content-Type": "text/plain;charset=utf-8" },
                        timeoutMs: 60000,
                        body: JSON.stringify({ action: "update", sheet: GOOGLE_SHEET_TAB, rowNumber: record.rowNumber || record.id, fields: update, accessToken: currentUser.access_token })
                    });
                    if (result?.success === false || result?.ok === false) throw new Error(result.error || result.message || "Google Sheets rejected the update.");
                    // Do not clear this yet: the next list response may still be an
                    // older cached row. It is cleared only after displayed values match.
                    setMedicalSyncStatus("Saved — waiting for Google Sheets to confirm", "syncing");
                } else {
                    await supabaseRequest(`${MEDICAL_TABLE}?id=eq.${encodeURIComponent(record.id)}`, { method:"PATCH", body: JSON.stringify(update), headers:{ Prefer:"return=minimal" } });
                }
            } catch (error) {
                pendingMedicalUpdates.delete(String(record.id));
                console.error("Medical record save failed", error);
                alert(`Unable to save this medical record: ${error.message || "Unknown error"}`);
            } finally {
                // Do not immediately start another slow list request after saving.
                // The optimistic row stays visible, and the normal polling refresh
                // will reconcile it with Google Sheets later.
                if (!GOOGLE_SHEETS_API_URL) await loadMedicalRecords();
            }
        }

        function renderFormStatistics() {
            const summary = getFormSummary();
            els.formResponseCount.textContent = medicalRecords.length.toLocaleString();
            els.formEmployeeCount.textContent = summary.employees.toLocaleString();
            els.formMaleCount.textContent = summary.male.toLocaleString();
            els.formFemaleCount.textContent = summary.female.toLocaleString();
            els.formLatestResponse.textContent = medicalRecords.length && submittedValue(medicalRecords[0])
                ? new Date(submittedValue(medicalRecords[0])).toLocaleString("en-PH")
                : "No data";
        }

        function csvCell(value) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }
        function topTenRows(field) {
            const counts = {};
            medicalRecords.forEach(record => { const value = clinicalValue(record, field); if (value) counts[value] = (counts[value] || 0) + 1; });
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
        }
        function excelCell(value) {
            const text = String(value ?? "");
            return `<td>${escapeHtml(text)}</td>`;
        }

        function downloadExcelFile(filename, sheetName, rows) {
            const safeSheetName = String(sheetName || "Report").replace(/[\\/:?*\[\]]/g, "").slice(0, 31) || "Report";
            const tableRows = rows.map(row => `<tr>${row.map(excelCell).join("")}</tr>`).join("");
            const workbook = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(safeSheetName)}</title></head><body><table>${tableRows}</table></body></html>`;
            const url = URL.createObjectURL(new Blob(["\\ufeff" + workbook], { type: "application/vnd.ms-excel" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        function downloadMedicalReport() {
            const summary = getFormSummary();
            const now = new Date();
            const medicineRows = topTenRows(["medicine_given"]);
            const complaintRows = topTenRows(["chief_complaint"]);
            const diagnosisRows = topTenRows(["diagnosis"]);
            const rankingTable = (title, rows) => `
                <table class="ranking-table">
                    <thead><tr><th colspan="2">${escapeHtml(title)}</th></tr></thead>
                    <tbody>${rows.length
                        ? rows.map(([name, count], index) => `<tr><td>${index + 1}. ${escapeHtml(name)}</td><td class="value-cell num-integer">${count}</td></tr>`).join("")
                        : `<tr><td colspan="2" class="empty-cell">No data</td></tr>`}</tbody>
                </table>`;

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #333333; font-size: 13pt; }
        .report-title { font-size: 22pt; font-weight: bold; color: #0b2e2e; height: 42px; vertical-align: middle; }
        .export-meta { font-size: 12pt; color: #555555; font-style: italic; height: 26px; }
        table { border-collapse: collapse; margin-bottom: 28px; }
        th { background-color: #0b2e2e; color: #ffffff; font-weight: bold; font-size: 13pt; text-align: left; vertical-align: middle; border: 0.5pt solid #041a1a; height: 34px; padding: 8px; }
        td { font-size: 12pt; vertical-align: middle; border: 0.5pt solid #e0e0e0; height: 30px; padding: 8px; }
        .summary-table td.label-cell { background-color: #f4f7f7; font-weight: bold; color: #114242; width: 280px; }
        .summary-table td.value-cell { text-align: right; font-weight: 600; width: 180px; }
        .ranking-table { width: 520px; }
        .ranking-table td:first-child { width: 400px; }
        .ranking-table .value-cell { text-align: right; font-weight: 600; width: 120px; }
        .num-integer { mso-number-format: "#,##0"; }
        .empty-cell { color: #777777; font-style: italic; text-align: center; }
    </style>
</head>
<body>
    <table>
        <tr><td colspan="2" class="report-title">Medical Records Statistics Report</td></tr>
        <tr><td colspan="2" class="export-meta">Exported: ${now.toLocaleString("en-PH")}</td></tr>
        <tr><td colspan="2" style="height:15px;border:none;"></td></tr>
    </table>

    <table class="summary-table">
        <thead><tr><th colspan="2">Google Form Statistics Overview</th></tr></thead>
        <tbody>
            <tr><td class="label-cell">Total Responses</td><td class="value-cell num-integer">${medicalRecords.length}</td></tr>
            <tr><td class="label-cell">Total Employees Who Logged</td><td class="value-cell num-integer">${summary.employees}</td></tr>
            <tr><td class="label-cell">Male Employees</td><td class="value-cell num-integer">${summary.male}</td></tr>
            <tr><td class="label-cell">Female Employees</td><td class="value-cell num-integer">${summary.female}</td></tr>
            <tr><td class="label-cell">Latest Response</td><td class="value-cell">${escapeHtml(medicalRecords.length && submittedValue(medicalRecords[0]) ? new Date(submittedValue(medicalRecords[0])).toLocaleString("en-PH") : "No data")}</td></tr>
        </tbody>
    </table>

    ${rankingTable("Top 10 Medicines Given", medicineRows)}
    ${rankingTable("Top 10 Chief Complaints", complaintRows)}
    ${rankingTable("Top 10 Diagnoses", diagnosisRows)}
</body>
</html>`;

            const blob = new Blob(["\\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `Medical_Statistics_${now.toISOString().slice(0, 10)}.xls`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        function saveFormStatistics() {
            loadMedicalRecords();
        }

        function save() {
            metrics.lastTickTimestamp = Date.now();
            localStorage.setItem(KEY, JSON.stringify(metrics));
        }

        function resumeElapsedTime() {
            const now = Date.now();
            const elapsed = Math.max(0, Math.floor((now - (metrics.lastTickTimestamp || now)) / 1000));
            const totalStaff = (parseInt(metrics.maleCount) || 0) + (parseInt(metrics.femaleCount) || 0);
            if (elapsed > 0 && totalStaff > 0 && isWorkingDay()) {
                metrics.liveSecondsAccumulated = (parseInt(metrics.liveSecondsAccumulated) || 0) + elapsed;
            }
            metrics.lastTickTimestamp = now;
        }

        function updateClock() {
            els.liveClock.textContent = new Date().toLocaleString("en-PH", {
                weekday:"long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit"
            });
        }

        function isWorkingDay(date = new Date()) {
            if (date.getDay() === 0 || date.getDay() === 6) return false;
            const token = `${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
            return !HOLIDAYS.includes(token);
        }

        function workingDays(start, end) {
            let count = 0;
            const d = new Date(start);
            const last = new Date(end);
            last.setDate(last.getDate() - 1);
            while (d <= last) {
                if (isWorkingDay(d)) count++;
                d.setDate(d.getDate() + 1);
            }
            return count;
        }

        function totalDaysLost() {
            const incidentDays = metrics.incidentLogs.reduce((s, log) => s + (parseFloat(log.daysAbsent) || 0), 0);
            return (parseFloat(metrics.manualDaysLost) || 0) + incidentDays;
        }

        function localDateTimeValue(v) {
            if (!v) return "";
            const d = new Date(v), p = n => String(n).padStart(2,"0");
            return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
        }

        function openIncidentModal(index = null) {
            editingIncidentIndex = index;
            els.modalTitle.textContent = index === null ? "Report an Incident" : "Edit Incident Report";
            if (index === null) {
                els.incidentDateTimeInput.value = "";
                els.incidentPersonInput.value = "";
                els.incidentTypeInput.value = "";
                els.incidentNatureInput.value = "";
                els.incidentCauseInput.value = "";
                els.incidentDaysAbsentInput.value = "";
                els.incidentSummaryInput.value = "";
                els.incidentPasswordInput.value = "";
            } else {
                const log = metrics.incidentLogs[index];
                els.incidentDateTimeInput.value = localDateTimeValue(log.timestamp);
                els.incidentPersonInput.value = log.injuredPerson || "";
                els.incidentTypeInput.value = log.incidentType || "";
                els.incidentNatureInput.value = log.natureOfInjury || "";
                els.incidentCauseInput.value = log.causeOfIncident || "";
                els.incidentDaysAbsentInput.value = log.daysAbsent || "";
                els.incidentSummaryInput.value = log.reportSummary || "";
                els.incidentPasswordInput.value = "";
            }
            els.incidentModal.classList.add("visible");
        }

        function closeIncidentModal() {
            els.incidentModal.classList.remove("visible");
            editingIncidentIndex = null;
        }

        function saveIncidentFromModal() {
            if (els.incidentPasswordInput.value !== ADMIN_PASSWORD) return alert("Incorrect Admin Password!");
            const timestamp = els.incidentDateTimeInput.value;
            const injuredPerson = els.incidentPersonInput.value.trim();
            const incidentType = els.incidentTypeInput.value.trim();
            const natureOfInjury = els.incidentNatureInput.value.trim();
            const causeOfIncident = els.incidentCauseInput.value.trim();
            const daysAbsent = parseFloat(els.incidentDaysAbsentInput.value) || 0;
            const reportSummary = els.incidentSummaryInput.value.trim();

            if (!timestamp || !injuredPerson || !incidentType) return alert("Date, injured/ill person, and incident type are required.");

            const item = {
                timestamp: new Date(timestamp).toISOString(),
                injuredPerson, incidentType, natureOfInjury, causeOfIncident, daysAbsent, reportSummary
            };

            if (editingIncidentIndex === null) metrics.incidentLogs.push(item);
            else metrics.incidentLogs[editingIncidentIndex] = item;

            save();
            renderDashboard();
            scheduleSharedStateSave();
            closeIncidentModal();
        }

        function toggleAdminPanel() {
            const show = !els.adminPanelModal.classList.contains("visible");
            els.adminPanelModal.classList.toggle("visible");
            if (show) {
                els.inputMale.value = metrics.maleCount;
                els.inputFemale.value = metrics.femaleCount;
                els.inputDaysLost.value = metrics.manualDaysLost;
            }
        }

        function updateDashboard() {
            if (els.adminPassword.value !== ADMIN_PASSWORD) return alert("Incorrect Admin Password!");
            metrics.maleCount = parseInt(els.inputMale.value) || 0;
            metrics.femaleCount = parseInt(els.inputFemale.value) || 0;
            metrics.manualDaysLost = parseFloat(els.inputDaysLost.value) || 0;
            save();
            renderDashboard();
            scheduleSharedStateSave();
            els.adminPassword.value = "";
            toggleAdminPanel();
        }

        function openPasswordModal(action, index = null) {
            passwordAction = action;
            passwordActionIndex = index;
            els.passwordInput.value = "";
            els.passwordModal.classList.add("visible");
        }

        function closePasswordModal() {
            els.passwordModal.classList.remove("visible");
            passwordAction = null;
            passwordActionIndex = null;
        }

        function confirmPasswordAction() {
            if (els.passwordInput.value !== ADMIN_PASSWORD) return alert("Incorrect Admin Password!");
            if (passwordAction === "edit") openIncidentModal(passwordActionIndex);
            if (passwordAction === "delete") {
                metrics.incidentLogs.splice(passwordActionIndex, 1);
                save();
                renderDashboard();
                scheduleSharedStateSave();
            }
            closePasswordModal();
        }

        function deleteIncident(index) { openPasswordModal("delete", index); }

        function renderLogs() {
            if (!metrics.incidentLogs.length) {
                els.incidentLogBody.innerHTML = `<tr><td colspan="8" class="no-log">No incident entries found inside current workspace database logs.</td></tr>`;
                return;
            }

            els.incidentLogBody.innerHTML = [...metrics.incidentLogs].reverse().map((log, viewIndex) => {
                const actualIndex = metrics.incidentLogs.length - 1 - viewIndex;
                return `<tr>
                    <td>${new Date(log.timestamp).toLocaleString("en-PH")}</td>
                    <td>${log.injuredPerson || "N/A"}</td>
                    <td>${log.incidentType || "N/A"}</td>
                    <td>${log.natureOfInjury || "N/A"}</td>
                    <td>${log.causeOfIncident || "N/A"}</td>
                    <td>${log.daysAbsent || "0"}</td>
                    <td>${log.reportSummary || "N/A"}</td>
                    <td>
                        <div class="log-actions">
                            <button class="edit" onclick="openPasswordModal('edit', ${actualIndex})">Edit</button>
                            <button class="delete" onclick="deleteIncident(${actualIndex})">Delete</button>
                        </div>
                    </td>
                </tr>`;
            }).join("");
        }

        function renderMonthlySummary() {
            els.monthList.innerHTML = Array.from({ length: 12 }, (_, month) => {
                const total = metrics.incidentLogs.reduce((sum, log) => new Date(log.timestamp).getMonth() === month ? sum + (parseFloat(log.daysAbsent) || 0) : sum, 0);
                return `<div class="month-chip"><strong>${new Date(2000, month, 1).toLocaleString("en-US", { month:"long" })}</strong><div>${total.toFixed(1)} days absent</div></div>`;
            }).join("");
        }

        function renderDashboard() {
            const m = parseInt(metrics.maleCount) || 0;
            const f = parseInt(metrics.femaleCount) || 0;
            const totalStaff = m + f;
            const now = new Date();
            const todayWorking = isWorkingDay(now);
            const periodStart = els.periodSelect.value === "MTD" ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), 0, 1);
            const days = workingDays(periodStart, now) + (todayWorking ? 1 : 0);
            const hoursLost = totalDaysLost() * STANDARD_SHIFT_HOURS;

            const liveSeconds = parseInt(metrics.liveSecondsAccumulated) || 0;
            const liveHours = totalStaff > 0 ? (liveSeconds * totalStaff) / 3600 : 0;
            const baseHours = days * totalStaff * STANDARD_SHIFT_HOURS + (todayWorking ? liveHours : 0);
            const totalManHours = Math.max(0, baseHours - hoursLost);

            els.displayPeriodHours.textContent = totalManHours.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            els.displayHoursLost.textContent = hoursLost.toLocaleString();
            els.displayDaysLost.textContent = `${totalDaysLost().toFixed(1)} Days`;
            els.displayTotalCount.textContent = totalStaff.toLocaleString();
            els.displayMaleCount.textContent = m;
            els.displayFemaleCount.textContent = f;
            els.displayIncidentFreeDays.textContent = days;
            els.displayRatio.textContent = totalStaff ? `${Math.round(m / totalStaff * 100)}% M | ${Math.round(f / totalStaff * 100)}% F` : "0% M | 0% F";
            els.displayCompliance.textContent = days <= 0 ? "NON-COMPLIANT" : "COMPLIANT";

            renderLogs();
            renderMonthlySummary();
        }

        function triggerIncidentReset() { openIncidentModal(); }

        function downloadReport() {
            const now = new Date();
            const m = parseInt(metrics.maleCount) || 0;
            const f = parseInt(metrics.femaleCount) || 0;
            const totalStaff = m + f;
            const todayWorking = isWorkingDay(now);
            const ytdDays = workingDays(new Date(now.getFullYear(), 0, 1), now) + (todayWorking ? 1 : 0);
            const liveSeconds = parseInt(metrics.liveSecondsAccumulated) || 0;
            const liveHours = totalStaff > 0 ? (liveSeconds * totalStaff) / 3600 : 0;
            const totalHoursLost = totalDaysLost() * STANDARD_SHIFT_HOURS;
            const totalManHours = Math.max(0, ytdDays * totalStaff * STANDARD_SHIFT_HOURS + (todayWorking ? liveHours : 0) - totalHoursLost);

            const rows = metrics.incidentLogs.map(log => `
                <tr>
                    <td class="date-cell">${new Date(log.timestamp).toLocaleString("en-PH")}</td>
                    <td class="text-cell">${log.injuredPerson || "N/A"}</td>
                    <td class="text-cell">${log.incidentType || "N/A"}</td>
                    <td class="text-cell">${log.natureOfInjury || "N/A"}</td>
                    <td class="text-cell">${log.causeOfIncident || "N/A"}</td>
                    <td class="num-day" style="text-align:right;">${parseFloat(log.daysAbsent) || 0}</td>
                    <td class="text-cell">${log.reportSummary || "N/A"}</td>
                </tr>`).join("");

            const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <!--[if gte mso 9]>
    <xml>
        <x:ExcelWorkbook>
            <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                    <x:Name>OSH Summary & Logs</x:Name>
                    <x:WorksheetOptions>
                        <x:DisplayGridlines/>
                    </x:WorksheetOptions>
                </x:ExcelWorksheet>
            </x:ExcelWorksheets>
        </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; color: #333333; font-size: 13pt; }
        .report-title { font-size: 22pt; font-weight: bold; color: #0b2e2e; height: 42px; vertical-align: middle; }
        .export-meta { font-size: 12pt; color: #555555; font-style: italic; height: 26px; }
        table { border-collapse: collapse; margin-bottom: 28px; }
        th { background-color: #0b2e2e; color: #ffffff; font-weight: bold; font-size: 13pt; text-align: left; vertical-align: middle; border: 0.5pt solid #041a1a; height: 34px; padding: 8px; }
        td { font-size: 12pt; vertical-align: middle; border: 0.5pt solid #e0e0e0; height: 30px; padding: 8px; }
        .summary-table td.label-cell { background-color: #f4f7f7; font-weight: bold; color: #114242; width: 240px; }
        .summary-table td.value-cell { text-align: right; font-weight: 600; width: 180px; }
        .num-integer { mso-number-format: "#,##0"; }
        .num-decimal { mso-number-format: "#,##0.00"; }
        .num-day { mso-number-format: "#,##0.0"; }
        .text-cell { mso-number-format: "\\@"; }
        .date-cell { mso-number-format: "yyyy\\-mm\\-dd\\ hh\\:mm"; text-align: left; }
    </style>
</head>
<body>
    <table>
        <tr>
            <td colspan="7" class="report-title">Occupational Safety and Health (OSH) Man Hours Report</td>
        </tr>
        <tr>
            <td colspan="7" class="export-meta">Exported: ${now.toLocaleString("en-PH")}</td>
        </tr>
        <tr><td colspan="7" style="height:15px;border:none;"></td></tr>
    </table>

    <table class="summary-table">
        <thead>
            <tr><th colspan="2">HSE KPI Metrics Overview</th></tr>
        </thead>
        <tbody>
            <tr><td class="label-cell">Total Workforce</td><td class="value-cell num-integer">${totalStaff}</td></tr>
            <tr><td class="label-cell">Male Headcount</td><td class="value-cell num-integer">${m}</td></tr>
            <tr><td class="label-cell">Female Headcount</td><td class="value-cell num-integer">${f}</td></tr>
            <tr><td class="label-cell">Total Man Hours (YTD)</td><td class="value-cell num-decimal" style="color:#008060;font-weight:bold;">${totalManHours.toFixed(2)}</td></tr>
            <tr><td class="label-cell">Total Days Lost</td><td class="value-cell num-day" style="color:#cc0000;">${totalDaysLost().toFixed(1)}</td></tr>
            <tr><td class="label-cell">Total Hours Lost</td><td class="value-cell num-day" style="color:#cc0000;">${totalHoursLost.toFixed(1)}</td></tr>
        </tbody>
    </table>

    <table><tr><td style="height:15px;border:none;"></td></tr></table>

    <table>
        <thead>
            <tr>
                <th colspan="7" style="background-color:#114242;">Historical OSH Incident Logs WAIR</th>
            </tr>
            <tr>
                <th style="width:220px;">Date & Time</th>
                <th style="width:210px;">Injured / Ill Person</th>
                <th style="width:220px;">Type of Incident / Illness</th>
                <th style="width:220px;">Nature of Injury</th>
                <th style="width:220px;">Cause of Incident</th>
                <th style="width:140px;text-align:right;">Days Absent</th>
                <th style="width:360px;">Report Summary</th>
            </tr>
        </thead>
        <tbody>
            ${rows || `<tr><td colspan="7" class="text-cell" style="text-align:center;color:#777777;font-style:italic;">No incident logs recorded inside workspace database.</td></tr>`}
        </tbody>
    </table>
</body>
</html>`;

            const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `OSH_Report_${now.toISOString().slice(0,10)}.xls`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        }

        function tick() {
            updateClock();
            const totalStaff = (parseInt(metrics.maleCount) || 0) + (parseInt(metrics.femaleCount) || 0);
            if (totalStaff > 0 && isWorkingDay()) metrics.liveSecondsAccumulated = (parseInt(metrics.liveSecondsAccumulated) || 0) + 1;
            metrics.lastTickTimestamp = Date.now();
            save();
            scheduleSharedStateSave();
            renderDashboard();
        }

        const SUPPLIES_KEY = "hse_supply_tracker";
        const ACTIVITIES_KEY = "hse_activity_calendar";
        let supplies = JSON.parse(localStorage.getItem(SUPPLIES_KEY) || "[]");
        let activities = JSON.parse(localStorage.getItem(ACTIVITIES_KEY) || "[]");
        let medicineUsageCounts = new Map();
        let editingSupplyIndex = null;
        let editingActivityIndex = null;
        let calendarDate = new Date();

        function saveSupplyData() { localStorage.setItem(SUPPLIES_KEY, JSON.stringify(supplies)); }
        function saveActivityData() { localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities)); }
        function supplyNumber(id) { return Math.max(0, parseFloat(document.getElementById(id).value) || 0); }

        function medicineMatchKey(value) {
            return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
        }

        function updateMedicineUsageCounts() {
            medicineUsageCounts = new Map();
            medicalRecords.forEach(record => {
                const medicine = clinicalValue(record, MEDICAL_FIELD_ALIASES.medicine);
                if (!medicine) return;
                const key = medicineMatchKey(medicine);
                medicineUsageCounts.set(key, (medicineUsageCounts.get(key) || 0) + 1);
            });
            renderSupplies();
        }

        function recordedConsumption(item) {
            return medicineUsageCounts.get(medicineMatchKey(item)) || 0;
        }

        function supplyConsumedValue(item) {
            return Math.max(0, (parseFloat(item.consumed) || 0) + recordedConsumption(item.item));
        }
        function openSupplyModal(index = null) {
            editingSupplyIndex = index;
            const modal = document.getElementById("supplyModal");
            const title = document.getElementById("supplyModalTitle");
            const item = index === null ? {} : (supplies[index] || {});
            if (!modal || !els.supplyItem || !els.supplyUnit || !els.supplyDelivered || !els.supplyConsumed || !els.supplyReorder) return;
            if (title) title.textContent = index === null ? "Add Supply Entry" : "Edit Supply Entry";
            els.supplyItem.value = item.item || "";
            els.supplyUnit.value = item.unit || "";
            els.supplyDelivered.value = item.delivered ?? "";
            els.supplyConsumed.value = item.consumed ?? "";
            els.supplyReorder.value = item.reorder ?? "";
            const usage = recordedConsumption(item.item);
            els.supplyConsumed.placeholder = usage ? `Manual consumption (medical records add ${usage})` : "Manual consumption";
            modal.classList.add("visible");
        }
        function closeSupplyModal() { document.getElementById("supplyModal").classList.remove("visible"); editingSupplyIndex = null; }
        function mergeDuplicateSupplies() {
            const merged = new Map();
            supplies.forEach(entry => {
                const itemName = String(entry.item || entry.name || "").trim();
                const key = normalizedKey(itemName);
                if (!key) return;
                const existing = merged.get(key);
                if (!existing) {
                    merged.set(key, { ...entry, item: itemName });
                    return;
                }
                existing.delivered = (parseFloat(existing.delivered) || 0) + (parseFloat(entry.delivered) || 0);
                existing.consumed = (parseFloat(existing.consumed) || 0) + (parseFloat(entry.consumed) || 0);
                existing.reorder = Math.max(parseFloat(existing.reorder) || 0, parseFloat(entry.reorder) || 0);
                if (!existing.unit && entry.unit) existing.unit = entry.unit;
            });
            supplies = Array.from(merged.values());
            localStorage.setItem(SUPPLIES_KEY, JSON.stringify(supplies));
        }

        function saveSupply() {
    const item = els.supplyItem.value.trim();
    if (!item) return alert("Supply or medicine name is required.");
    const editingIndex = typeof editingSupplyIndex === "number" ? editingSupplyIndex : -1;
    const existingIndex = supplies.findIndex((entry, index) => index !== editingIndex && normalizedKey(entry.item || entry.name) === normalizedKey(item));
    
    if (existingIndex >= 0) {
        const existing = supplies[existingIndex];
        existing.unit = els.supplyUnit.value.trim() || existing.unit || "";
        existing.delivered = (parseFloat(existing.delivered) || 0) + (parseFloat(els.supplyDelivered.value) || 0);
        existing.consumed = (parseFloat(existing.consumed) || 0) + (parseFloat(els.supplyConsumed.value) || 0);
        existing.reorder = parseFloat(els.supplyReorder.value) || existing.reorder || 0;
                        localStorage.setItem(SUPPLIES_KEY, JSON.stringify(supplies));
        scheduleSharedStateSave();
        closeSupplyModal();
        renderSupplies();
        return;
    }
     
    const entry = { 
        item, 
        unit: document.getElementById("supplyUnit").value.trim() || "units", 
        delivered: supplyNumber("supplyDelivered"), 
        consumed: supplyNumber("supplyConsumed"), 
        reorder: supplyNumber("supplyReorder") 
    };
    
    if (editingSupplyIndex === null) {
        supplies.push(entry); 
    } else {
        supplies[editingSupplyIndex] = entry;
    }
    
                saveSupplyData();
    scheduleSharedStateSave();
    closeSupplyModal();
    renderSupplies();
}

        function deleteSupply(index) { if (confirm("Delete this supply entry?")) { supplies.splice(index, 1); saveSupplyData(); scheduleSharedStateSave(); renderSupplies(); } }
        function renderSupplies() {
            mergeDuplicateSupplies();
            let low = 0, delivered = 0, consumed = 0;
            const body = document.getElementById("suppliesBody");
            body.innerHTML = supplies.length ? supplies.map((s, index) => {
                const deliveredQuantity = Math.max(0, parseFloat(s.delivered) || 0);
                const medicalUsed = recordedConsumption(s.item);
                const totalConsumed = supplyConsumedValue(s);
                const stock = Math.max(0, deliveredQuantity - totalConsumed);
                // Calculate and display the rate for this medicine only.
                const rate = deliveredQuantity > 0 ? (totalConsumed / deliveredQuantity) * 100 : 0;
                const isLow = stock <= (parseFloat(s.reorder) || 0);
                if (isLow) low++;
                delivered += deliveredQuantity;
                consumed += totalConsumed;
                const consumptionLabel = medicalUsed ? `${totalConsumed} <small title="${medicalUsed} medical record${medicalUsed === 1 ? "" : "s"}">(${medicalUsed} medical)</small>` : totalConsumed;
                return `<tr><td>${escapeHtml(s.item)}</td><td>${escapeHtml(s.unit)}</td><td>${deliveredQuantity}</td><td>${consumptionLabel}</td><td><strong>${stock}</strong></td><td>${s.reorder}</td><td><strong>${rate.toFixed(1)}%</strong></td><td><span class="${isLow ? "status-low" : "status-ok"}">${isLow ? "REPLENISH" : "OK"}</span></td><td><div class="log-actions"><button class="edit" onclick="openSupplyModal(${index})">Edit</button><button class="delete" onclick="deleteSupply(${index})">Delete</button></div></td></tr>`;
            }).join("") : `<tr><td colspan="9" class="no-log">No supply entries recorded.</td></tr>`;
            document.getElementById("supplyItemCount").textContent = supplies.length;
            document.getElementById("supplyLowCount").textContent = low;
            document.getElementById("supplyDeliveredTotal").textContent = delivered;
            document.getElementById("supplyConsumedTotal").textContent = consumed;
            document.getElementById("supplyConsumptionRate").textContent = delivered > 0 ? `${(consumed / delivered * 100).toFixed(1)}%` : "0%";
            document.getElementById("supplyNotifications").innerHTML = low ? `<div class="supply-alert">⚠️ Replenishment needed for ${low} item${low === 1 ? "" : "s"}. Check the rows marked REPLENISH.</div>` : `<div class="supply-ok">✓ All tracked supplies are above their reorder levels.</div>`;
        }
        function openActivityModal(index = null, date = "") {
            editingActivityIndex = index;
            const item = index === null ? { date } : activities[index];
            document.getElementById("activityModalTitle").textContent = index === null ? "Schedule Activity" : "Edit Activity";
            document.getElementById("activityDate").value = item.date || date;
            document.getElementById("activityTitle").value = item.title || "";
            document.getElementById("activityTime").value = item.time || "";
            document.getElementById("activityLocation").value = item.location || "";
            document.getElementById("activityModal").classList.add("visible");
        }
        function closeActivityModal() { document.getElementById("activityModal").classList.remove("visible"); editingActivityIndex = null; }
        function saveActivity() {
            const entry = { date: document.getElementById("activityDate").value, title: document.getElementById("activityTitle").value.trim(), time: document.getElementById("activityTime").value, location: document.getElementById("activityLocation").value.trim() };
            if (!entry.date || !entry.title) return alert("Date and activity are required.");
            if (editingActivityIndex === null) activities.push(entry); else activities[editingActivityIndex] = entry;
            saveActivityData(); scheduleSharedStateSave(); closeActivityModal(); renderCalendar();
        }
        function deleteActivity(index) { if (confirm("Delete this activity?")) { activities.splice(index, 1); saveActivityData(); scheduleSharedStateSave(); renderCalendar(); } }
        function changeCalendarMonth(offset) { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + offset, 1); renderCalendar(); }
        function renderCalendar() {
            const year = calendarDate.getFullYear(), month = calendarDate.getMonth(), first = new Date(year, month, 1), days = new Date(year, month + 1, 0).getDate(), start = first.getDay();
            document.getElementById("calendarMonthLabel").textContent = calendarDate.toLocaleString("en-US", { month: "long", year: "numeric" });
            const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            let html = names.map(name => `<div class="calendar-day-name">${name}</div>`).join("");
            for (let cell = 0; cell < 42; cell++) {
                const day = cell - start + 1, date = new Date(year, month, day), dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`, current = day > 0 && day <= days, today = dateKey === new Date().toISOString().slice(0, 10);
                const entries = current ? activities.map((a, i) => ({ ...a, index: i })).filter(a => a.date === dateKey) : [];
                html += `<div class="calendar-day ${current ? "" : "other-month"} ${today ? "today" : ""}"><div class="calendar-date">${date.getDate()}</div>${entries.map(a => `<div class="activity-entry"><strong>${escapeHtml(a.title)}</strong><small>${escapeHtml([a.time, a.location].filter(Boolean).join(" • "))}</small><div class="activity-actions"><button class="edit" onclick="openActivityModal(${a.index})">Edit</button><button class="delete" onclick="deleteActivity(${a.index})">×</button></div></div>`).join("")}${current ? `<button class="calendar-add" onclick="openActivityModal(null, '${dateKey}')">＋</button>` : ""}</div>`;
            }
            document.getElementById("activityCalendar").innerHTML = html;
        }

        cache();
        setupNavigation();
        setupGoogleForm();
        setupMedicalRecords();
        setupAuth();
        resumeElapsedTime();
        updateClock();
        save();
        renderDashboard();
        renderSupplies();
        renderCalendar();
        setInterval(tick, 1000);
    
