        const ADMIN_PASSWORD = "admin123";
        const GOOGLE_FORM_URL = "https://forms.gle/gGK2eZs595GSyFWv6";
        // Set this to the deployed Google Apps Script web-app URL to use the spreadsheet.
        // Leave blank to keep using the existing Supabase medical_records table.
        // Add the deployed Apps Script /exec URL here after deploying the Sheets API.
        // A placeholder URL must remain disabled; otherwise every refresh fails with "Failed to fetch".
        const GOOGLE_SHEETS_API_URL = "https://script.google.com/macros/s/AKfycbywdPp6K_UC9Me-9fGJNBmZOThr2WO59Fxs-PKdr7gF6LJTZuZ6hruBkMeh2WMpnIu5Xg/exec";
        const GOOGLE_SHEET_TAB = "Form Responses 1";
        const SUPABASE_URL = "https://waklvnbjhjqyykgdfacg.supabase.co";
        const SUPABASE_KEY = "sb_publishable_AEa9iIzus4ziOzax0wcH6w_3aHz_evn";
        const MEDICAL_TABLE = "medical_records";
        const SUPABASE_AUTH_URL = `${SUPABASE_URL}/auth/v1`;
        let realtimeChannel = null;
        let medicalRefreshTimer = null;
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
            ["liveClock","authGate","loginForm","loginEmail","loginPassword","togglePassword","authError","signedInUser","logoutButton","googleFormFrame","googleFormOpenLink","formResponseCount","formEmployeeCount","formMaleCount","formFemaleCount","formLatestResponse","formResponseInput","medicalSyncStatus","displayPeriodHours","periodSelect","displayHoursLost","displayDaysLost","displayTotalCount","displayMaleCount","displayFemaleCount","displayIncidentFreeDays","displayRatio","displayCompliance","adminPanelModal","inputMale","inputFemale","inputDaysLost","adminPassword","incidentLogBody","medicalRecordsHead","incidentModal","incidentDateTimeInput","incidentPersonInput","incidentTypeInput","incidentNatureInput","incidentCauseInput","incidentDaysAbsentInput","incidentSummaryInput","incidentPasswordInput","modalTitle","passwordModal","passwordInput","monthList","medicalRecordModal","medicalRecordsBody","topMedicines","topComplaints","topDiagnoses","recordBp","recordO2","recordPulse","recordTemp","recordMedicine","recordStaff","recordComplaint","recordDiagnosis","recordRecommendation"].forEach(id => els[id] = document.getElementById(id));
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
            medicalRefreshTimer = null;
            medicalRecords = [];
            medicalRecordsInitialized = false;
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
            // Polling keeps Google Form rows current even when no realtime bridge is configured.
            if (medicalRefreshTimer) clearInterval(medicalRefreshTimer);
            medicalRefreshTimer = setInterval(() => {
                if (document.visibilityState === "visible") loadMedicalRecords();
            }, 3000);
            document.addEventListener("visibilitychange", () => {
                if (document.visibilityState === "visible" && currentUser?.access_token) loadMedicalRecords();
            });
        }

        function setupMedicalRecords() {
            MEDICINES.forEach(medicine => els.recordMedicine.add(new Option(medicine, medicine)));
            if (currentUser) loadMedicalRecords();
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
                        const payload = await googleSheetsRequest(`${GOOGLE_SHEETS_API_URL}?action=list&sheet=${encodeURIComponent(GOOGLE_SHEET_TAB)}&accessToken=${encodeURIComponent(currentUser.access_token)}`, {
                            method: "GET",
                            cache: "no-store"
                        });
                        const sheetHeaders = payload.headers || payload.header || payload.columns || payload.data?.headers || [];
                        const rawRecords = Array.isArray(payload)
                            ? payload
                            : (payload.records || payload.rows || payload.data?.records || payload.data?.rows || payload.data?.values || []);
                        const nextRecords = rawRecords.map(record => normalizeMedicalRecord(record, sheetHeaders));
                        const previousIds = new Set(medicalRecords.map(record => String(record.id)));
                        const hasNewRecords = medicalRecordsInitialized && nextRecords.some(record => !previousIds.has(String(record.id)));
                        medicalRecords = nextRecords;
                        medicalRecordsInitialized = true;
                        if (hasNewRecords) playNewRecordNotification();
                        renderMedicalRecords();
                        renderFormStatistics();
                        setMedicalSyncStatus(`Live • ${medicalRecords.length.toLocaleString()} record${medicalRecords.length === 1 ? "" : "s"} • Updated ${new Date().toLocaleTimeString()}`, "connected");
                        return;
                    } catch (googleError) {
                        console.warn("Apps Script unavailable; falling back to Supabase", googleError);
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
                els.medicalRecordsHead.innerHTML = `<tr><th>Medical Records</th></tr>`;
                els.medicalRecordsBody.innerHTML = `<tr><td colspan="1" class="no-log">Unable to load records from ${source}: ${escapeHtml(message)}<br><small>${escapeHtml(setupMessage)}</small></td></tr>`;
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

        async function googleSheetsRequest(url, options) {
            const response = await fetch(url, options);
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
            els.recordBp.value = clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.bp);
            els.recordO2.value = clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.o2);
            els.recordPulse.value = clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.pulse);
            els.recordTemp.value = clinicalValue(editingMedicalRecord, MEDICAL_FIELD_ALIASES.temp);
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
                    await googleSheetsRequest(GOOGLE_SHEETS_API_URL, {
                        method: "POST",
                        headers: { "Content-Type": "text/plain;charset=utf-8" },
                        // The Apps Script must recognize action=delete. Do not send
                        // action=update here because that produces Invalid update request.
                        body: JSON.stringify({ action: "delete", sheet: GOOGLE_SHEET_TAB, rowNumber: Number(rowNumber), accessToken: currentUser.access_token })
                    });
                } else {
                    if (!record.id) throw new Error("This record has no row identifier.");
                    await supabaseRequest(`${MEDICAL_TABLE}?id=eq.${encodeURIComponent(record.id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
                }
                medicalRecords.splice(index, 1);
                renderMedicalRecords();
                renderFormStatistics();
                loadMedicalRecords();
            } catch (error) {
                alert(`Unable to delete this medical record: ${error.message || "Unknown error"}`);
                console.error(error);
            }
        }
        function closeMedicalRecordModal() { els.medicalRecordModal.classList.remove("visible"); editingMedicalRecord = null; }
        async function saveMedicalRecord() {
            if (!editingMedicalRecord?.id) return alert("This record has no row identifier and cannot be edited.");
            const record = editingMedicalRecord;
            const update = {
                vitals_bp: els.recordBp.value.trim(),
                vitals_o2: els.recordO2.value.trim(),
                vitals_pulse_rate: els.recordPulse.value.trim(),
                vitals_temperature: els.recordTemp.value.trim(),
                medicine_given: els.recordMedicine.value,
                attending_staff: els.recordStaff.value.trim(),
                chief_complaint: els.recordComplaint.value.trim(),
                diagnosis: els.recordDiagnosis.value.trim(),
                recommendation: els.recordRecommendation.value
            };

            // Update the visible row immediately so the UI does not wait for Apps Script.
            Object.assign(record, update);
            closeMedicalRecordModal();
            renderMedicalRecords();
            renderFormStatistics();

            try {
                if (GOOGLE_SHEETS_API_URL) {
                    await googleSheetsRequest(GOOGLE_SHEETS_API_URL, {
                        method: "POST",
                        headers: { "Content-Type": "text/plain;charset=utf-8" },
                        body: JSON.stringify({ action: "update", sheet: GOOGLE_SHEET_TAB, rowNumber: record.rowNumber || record.id, fields: update, accessToken: currentUser.access_token })
                    });
                } else {
                    await supabaseRequest(`${MEDICAL_TABLE}?id=eq.${encodeURIComponent(record.id)}`, { method:"PATCH", body: JSON.stringify(update), headers:{ Prefer:"return=minimal" } });
                }
            } catch (error) {
                // Keep the edited values visible and let the next refresh retry the sync.
                console.error("Medical record save failed", error);
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
        function downloadMedicalReport() {
            const summary = getFormSummary();
            const rows = [
                ["Medical Records Statistics"],
                ["Generated", new Date().toLocaleString("en-PH")],
                [],
                ["Employee Statistics"],
                ["Total responses", medicalRecords.length],
                ["Total employees who logged", summary.employees],
                ["Male", summary.male],
                ["Female", summary.female],
                [],
                ["Top 10 Medicines Given", "Count"],
                ...topTenRows(["medicine_given"]),
                [],
                ["Top 10 Chief Complaints", "Count"],
                ...topTenRows(["chief_complaint"]),
                [],
                ["Top 10 Diagnoses", "Count"],
                ...topTenRows(["diagnosis"])
            ];
            const csv = rows.map(row => row.map(csvCell).join(",")).join("\\r\\n");
            const url = URL.createObjectURL(new Blob(["\\ufeff" + csv], { type: "text/csv;charset=utf-8;" }));
            const link = document.createElement("a");
            link.href = url;
            link.download = `Medical_Statistics_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
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
            renderDashboard();
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
        setInterval(tick, 1000);
    