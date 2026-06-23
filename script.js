// ============================================
// CONFIGURATION
// ============================================
const API_URL = "https://script.google.com/macros/s/AKfycby3XId4hX3cHKxp4VYgqxL9Gsv6TpkUnFjJnx_zPQnllMc_sjoataYTeo68dFzjR5Iq/exec";
const MY_PHONE = "96170510183"; // Your active sender number

// ============================================
// STATE MANAGEMENT
// ============================================
let currentGuest = {
    name: "",
    seats: 0,
    maxSeats: 0,
    status: "",
    hasResponded: false,
    rowIndex: null,
    pin: "",
    pinSetupRequired: true
};

// ============================================
// DOM REFERENCES
// ============================================
const btnSearch = document.getElementById('btn-search');
const guestNameInput = document.getElementById('guest-name');
const namesDatalist = document.getElementById('guest-names-list');
const searchSection = document.getElementById('search-section');
const rsvpSection = document.getElementById('rsvp-section');
const welcomeText = document.getElementById('welcome-text');
const seatNumber = document.getElementById('seat-number');
const messageDiv = document.getElementById('message');
const btnAccept = document.getElementById('btn-accept');
const btnDecline = document.getElementById('btn-decline');
const btnReset = document.getElementById('btn-reset');
const statusBadgeContainer = document.getElementById('status-badge-container');
const btnDecreaseSeat = document.getElementById('btn-decrease-seat');
const btnIncreaseSeat = document.getElementById('btn-increase-seat');
const seatWarning = document.getElementById('seat-warning');

// Security UI Elements
const securitySection = document.getElementById('security-section');
const securityTitle = document.getElementById('security-title');
const securityInstructions = document.getElementById('security-instructions');
const securityPinInput = document.getElementById('security-pin');
const btnVerifyPin = document.getElementById('btn-verify-pin');
const btnSecurityBack = document.getElementById('btn-security-back');

// ============================================
// HELPER FUNCTIONS
// ============================================
function setMessage(text, type = '') {
    messageDiv.textContent = text;
    messageDiv.className = type;
}

function showStatusBadge(status) {
    if (!status) return '';
    const statusMap = {
        'Attending': { class: 'attending', label: '✅ Currently Attending' },
        'Declined': { class: 'declined', label: '✖ Currently Declined' }
    };
    const info = statusMap[status];
    return info ? `<span class="status-badge ${info.class}">${info.label}</span>` : '';
}

function resetToSearch() {
    searchSection.classList.remove('hidden');
    securitySection.classList.add('hidden');
    rsvpSection.classList.add('hidden');
    setMessage('Enter your name to begin');
    guestNameInput.value = '';
    securityPinInput.value = '';
    guestNameInput.focus();
}

function updateSeatAdjustmentButtons() {
    btnDecreaseSeat.disabled = currentGuest.seats <= 1;
    btnIncreaseSeat.disabled = currentGuest.seats >= currentGuest.maxSeats;
    
    if (currentGuest.seats >= currentGuest.maxSeats) {
        seatWarning.innerHTML = `⚠️ You've hit your maximum allowed limit of <strong>${currentGuest.maxSeats}</strong> seats.`;
        seatWarning.style.color = "#8c7a6b";
    } else {
        seatWarning.innerHTML = `Allowed maximum: ${currentGuest.maxSeats} seats.`;
        seatWarning.style.color = "#a89a8d";
    }
}

// ============================================
// AUTOCOMPLETE SETUP: FETCH NAMES UPFRONT
// ============================================
async function loadAutocompleteNames() {
    try {
        const response = await fetch(`${API_URL}?type=getNames`);
        const data = await response.json();
        if (data.names && data.names.length > 0) {
            namesDatalist.innerHTML = data.names
                .map(name => `<option value="${name}"></option>`)
                .join('');
            setMessage('Enter your name to begin');
        }
    } catch (error) {
        console.error('Error fetching autocomplete guest names:', error);
        setMessage('Notice: Dynamic dropdown unavailable. Type manual name.', 'info');
    }
}

// ============================================
// 1. SEARCH FOR GUEST
// ============================================
btnSearch.addEventListener('click', async () => {
    const name = guestNameInput.value.trim();
    if (!name) {
        setMessage('Please enter your name', 'error');
        return;
    }

    setMessage('Searching...', 'info');
    btnSearch.disabled = true;
    btnSearch.textContent = 'Searching...';
    
    try {
        const response = await fetch(`${API_URL}?type=search&name=${encodeURIComponent(name)}`);
        const data = await response.json();

        if (data.found) {
            setMessage('');
            
            // Populate global state attributes
            currentGuest.name = data.name;
            currentGuest.maxSeats = data.maxSeats || 1;
            currentGuest.status = data.status || '';
            currentGuest.hasResponded = data.hasResponded || false;
            currentGuest.rowIndex = data.rowIndex;
            currentGuest.pinSetupRequired = data.isNewPin;

            // Compute initial UI seat structures
            let initialSeats = data.hasResponded && data.status === "Attending" 
                ? data.confirmedSeats || data.maxSeats 
                : data.maxSeats;

            currentGuest.seats = initialSeats;

            // Route to Security UI layer
            searchSection.classList.add('hidden');
            securitySection.classList.remove('hidden');
            securityTitle.textContent = `🔒 ${data.name}`;
            securityPinInput.value = '';

            const linkContainer = document.getElementById('whatsapp-link-container');
            
            if (data.isNewPin) {
                securityInstructions.innerHTML = `A verification code was generated! Click the green button below to receive your code on WhatsApp, then type it below. <br><small style="color:#a89a8d;">Target Number: ${data.maskedPhone}</small>`;
                btnVerifyPin.textContent = "Verify PIN & Unlock";
                
                // Build the secure WhatsApp link destination
                const pinMsg = encodeURIComponent(`Hello! Your wedding RSVP verification security code is: ${data.pin}`);
                const waUrl = `https://wa.me/${data.phone}?text=${pinMsg}`;
                
                // Inject a beautiful clickable button link into the DOM
                linkContainer.innerHTML = `
                    <a href="${waUrl}" target="_blank" style="display: inline-block; background-color: #25D366; color: white; padding: 10px 15px; border-radius: 25px; text-decoration: none; font-weight: bold; font-size: 14px; box-shadow: 0 2px 5px rgba(0,0,0,0.15); margin: 5px 0;">
                        🟢 Send Code to WhatsApp
                    </a>
                `;
                
                // Fallback attempt to open it automatically 
                window.open(waUrl, '_blank');
            } else {
                securityInstructions.innerHTML = `Your invitation is locked. Enter your secret 4-digit verification code previously sent to your WhatsApp number. <br><small style="color:#a89a8d;">Sent to: ${data.maskedPhone}</small>`;
                btnVerifyPin.textContent = "Verify PIN & Unlock";
                
                // Clear the link space if it's an old returning guest who already has a code
                linkContainer.innerHTML = '';
            }
            securityPinInput.focus();

        } else {
            setMessage('❌ Name not found. Please select from the dropdown options.', 'error');
        }
        
    } catch (error) {
        console.error('Search error:', error);
        setMessage('❌ Error connecting to server. Please try again.', 'error');
    } finally {
        btnSearch.disabled = false;
        btnSearch.innerHTML = '<span class="search-icon">🔍</span> Find My Invitation';
    }
});

// ============================================
// STEP 2: STRICT SECURE SERVER VALIDATION GATE (FIXES "5555" BUG)
// ============================================
btnVerifyPin.addEventListener('click', async () => {
    const enteredPin = securityPinInput.value.trim();
    if (enteredPin.length < 4 || isNaN(enteredPin)) {
        setMessage('❌ PIN must be a 4-digit number code.', 'error');
        return;
    }

    setMessage('Verifying verification credentials...', 'info');
    btnVerifyPin.disabled = true;

    try {
        // Hit custom endpoint on your script to check if entry matches Column H database record
        const checkResponse = await fetch(`${API_URL}?type=verifyPin&rowIndex=${currentGuest.rowIndex}&pin=${encodeURIComponent(enteredPin)}`);
        const gateCheck = await checkResponse.json();

        if (!gateCheck.valid) {
            setMessage(gateCheck.error || '❌ Invalid validation PIN.', 'error');
            securityPinInput.value = '';
            securityPinInput.focus();
            btnVerifyPin.disabled = false;
            return; // HALT ACCESS: Bypasses like "5555" are fully terminated here!
        }

        // Save authenticated PIN locally for submission payload tracking
        currentGuest.pin = enteredPin;
        setMessage('');
        
        // Smooth transition to form container
        securitySection.classList.add('hidden');
        rsvpSection.classList.remove('hidden');
        
        welcomeText.textContent = `👋 ${currentGuest.name}`;
        seatNumber.textContent = currentGuest.seats;
        updateSeatAdjustmentButtons();
        
        if (currentGuest.hasResponded) {
            statusBadgeContainer.innerHTML = showStatusBadge(currentGuest.status);
            setMessage(`You already responded: ${currentGuest.status}. Updates allowed.`, 'info');
            btnAccept.textContent = '🔄 Update Attendance';
            btnDecline.textContent = '🔄 Update to Decline';
        } else {
            statusBadgeContainer.innerHTML = '';
            setMessage('Please select your response below');
            btnAccept.textContent = '✅ Accept';
            btnDecline.textContent = '✖ Decline';
        }

        btnAccept.disabled = false;
        btnDecline.disabled = false;
        btnAccept.style.opacity = '1';
        btnDecline.style.opacity = '1';

    } catch (error) {
        console.error('Gate Validation Failure:', error);
        setMessage('❌ Error validating code with database. Try again.', 'error');
    } finally {
        btnVerifyPin.disabled = false;
    }
});

// ============================================
// 2. SEAT ADJUSTMENT HANDLERS
// ============================================
btnDecreaseSeat.addEventListener('click', () => {
    if (currentGuest.seats > 1) {
        currentGuest.seats--;
        seatNumber.textContent = currentGuest.seats;
        updateSeatAdjustmentButtons();
    }
});

btnIncreaseSeat.addEventListener('click', () => {
    if (currentGuest.seats < currentGuest.maxSeats) {
        currentGuest.seats++;
        seatNumber.textContent = currentGuest.seats;
        updateSeatAdjustmentButtons();
    }
});

// ============================================
// 3. SUBMIT RESPONSE
// ============================================
function submitRSVP(status) {
    btnAccept.disabled = true;
    btnDecline.disabled = true;
    
    const statusLabel = status === 'Attending' ? 'Accepting' : 'Declining';
    setMessage(`${statusLabel}...`, 'info');
    
    const nameParam = encodeURIComponent(currentGuest.name);
    const seatsParam = status === 'Attending' ? currentGuest.seats : 0;
    const statusParam = encodeURIComponent(status);
    const rowIndexParam = currentGuest.rowIndex;
    const pinParam = encodeURIComponent(currentGuest.pin);

    const postUrl = `${API_URL}?type=submit&name=${nameParam}&seats=${seatsParam}&status=${statusParam}&rowIndex=${rowIndexParam}&pin=${pinParam}`;

    fetch(postUrl)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const successMsg = status === 'Attending' 
                    ? '✅ Thank you! Your attendance has been confirmed.' 
                    : '✅ Thank you for letting us know. You will be missed.';
                
                setMessage(successMsg, 'success');
                
                currentGuest.status = status;
                currentGuest.hasResponded = true;
                statusBadgeContainer.innerHTML = showStatusBadge(status);
                
                if (status === 'Declined') {
                    currentGuest.seats = 0;
                    seatNumber.textContent = '0';
                }
                
                btnDecreaseSeat.disabled = true;
                btnIncreaseSeat.disabled = true;
                btnAccept.style.opacity = '0.5';
                btnDecline.style.opacity = '0.5';
                btnAccept.textContent = '✅ Response Saved';
                btnDecline.textContent = '✖ Declined';

                // Final summary trigger to notify host
                setTimeout(() => {
                    const hostPhone = MY_PHONE; 
                    const whatsappMessage = encodeURIComponent(`Hello! This is ${currentGuest.name}. I have just confirmed my RSVP registration status as: *${status}* with *${seatsParam}* seats allocated. Secure Registry Pin Track ID: [${currentGuest.pin}].`);
                    window.open(`https://wa.me/${hostPhone}?text=${whatsappMessage}`, '_blank');
                }, 1500);
                
            } else {
                setMessage(data.error || 'Security or operational failure.', 'error');
                btnAccept.disabled = false;
                btnDecline.disabled = false;
            }
        })
        .catch(error => {
            console.error('Submission failure handling track:', error);
            setMessage('❌ Critical Server Communication Interruption. Try again.', 'error');
            btnAccept.disabled = false;
            btnDecline.disabled = false;
        });
}

// ============================================
// EVENT LISTENERS & COUPLING CONTROL
// ============================================
btnAccept.addEventListener('click', () => { if (!btnAccept.disabled) submitRSVP('Attending'); });
btnDecline.addEventListener('click', () => { if (!btnDecline.disabled) submitRSVP('Declined'); });
btnReset.addEventListener('click', resetToSearch);
btnSecurityBack.addEventListener('click', resetToSearch);

guestNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnSearch.click(); });
securityPinInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') btnVerifyPin.click(); });

// Load dropdown entries on initial page setup
loadAutocompleteNames();