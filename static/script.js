const isLocal = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
const API_BASE = isLocal ? "http://127.0.0.1:5000" : "";
const SOCKET_URL = isLocal ? "http://127.0.0.1:5000" : undefined;

// --- 1. STATE & PERSISTENCE ---
const params = new URLSearchParams(window.location.search);
const roomFromURL = params.get("room");

if (roomFromURL) {
    localStorage.setItem("current_room", roomFromURL);
}

const currentRoom = roomFromURL || localStorage.getItem('current_room') || 'public';
localStorage.setItem('current_room', currentRoom);
const currentUser = localStorage.getItem("username");

const API = (path, options = {}) => {

    const headers = {
        ...(options.headers || {})
    };

    // Only attach JSON header if body exists
    if (options.body) {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(`${API_BASE}/api${path}`, {
        credentials: 'include',
        ...options,
        headers
    });
};

// --- 2. UI HELPERS ---
const updateStatus = (statusClass, text) => {
    const status = document.querySelector('.server-status');
    if (status) {
        status.className = `server-status ${statusClass}`;
        status.innerHTML = `<span></span> ${text}`;
    }
};

const showNotification = (name) => {
    const notif = document.getElementById('join-notif');
    const nameSpan = document.getElementById('joined-username');
    if (notif && nameSpan) {
        nameSpan.innerText = name;
        notif.classList.add('show');
        setTimeout(() => notif.classList.remove('show'), 3000);
    }
};

const scrollToBottom = () => {
    const chatContainer = document.querySelector('.chat-container');
    if (chatContainer) {
        chatContainer.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
    }
};

// --- 3. CHAT LOGIC ---
let socket = null;
const chatWindow = document.getElementById('chat-window');

if (chatWindow) {
    // Security check
    async function verifySession() {
        try {
            const res = await API('/me');

            if (!res.ok) {
                localStorage.removeItem('username');
                window.location.href = `login.html?room=${encodeURIComponent(currentRoom)}`;
                return false;
            }

            return true;
        } catch {
            updateStatus('connecting', 'Server Offline');
            return false;
        }
    }

(async () => {
    const valid = await verifySession();

    if (!valid) return;

    socket = io(SOCKET_URL, {
        transports: ['polling', 'websocket'],
        upgrade: true,
        rememberUpgrade: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        withCredentials: true,
        auth: {
            username: currentUser
        }
    });

    initializeSocketEvents();
})();

function initializeSocketEvents() {
    socket.on('connect', () => {
        updateStatus('active', 'Active');
        socket.emit('join_room', {
            room: currentRoom
        });
    });

    socket.on('receive_message', (data) => {
        const isMe = data.username === currentUser;
        const wrapper = document.createElement('div');
        wrapper.className = `message-wrapper ${isMe ? 'me' : ''}`;
        
        wrapper.innerHTML = `
            <span class="msg-username">${isMe ? 'You' : data.username}</span>
            <div class="msg-box">${data.message}</div>
        `;

        chatWindow.appendChild(wrapper);
        scrollToBottom();
    });

    socket.on('user_joined', (data) => {
        if (data.username !== currentUser) {
            showNotification(data.username);
        }
    });

    socket.on('update_count', (data) => {
        const countEl = document.getElementById('count');
        if (countEl) countEl.innerText = data.count;
    });

    socket.on('error_message', (data) => {
        const errorToast = document.getElementById('error-toast');
        if (errorToast) {
            errorToast.innerText = data.error;
            errorToast.classList.add('show');
            setTimeout(() => errorToast.classList.remove('show'), 5000);
        }
    });

    socket.on('disconnect', () => updateStatus('connecting', 'Reconnecting...'));
    socket.on('connect_error', () => updateStatus('connecting', 'Connection Failed'));
}

    // --- MESSAGE SENDING & COOLDOWN ---
    const messageForm = document.querySelector('.input-wrapper');
    const messageInput = document.getElementById('user-msg');
    let isCooldown = false;

    if (messageForm) {
        messageForm.onsubmit = (e) => {
            e.preventDefault();
            const msg = messageInput.value.trim();
            const sendBtn = document.querySelector('.send-btn');

            if (isCooldown || !msg || !socket.connected) return;

            // Send room name with message so backend knows where it goes
            socket.emit('send_message', { 
                message: msg,  
            });

            messageInput.value = '';
            
            // Cooldown Logic
            isCooldown = true;
            if (sendBtn) sendBtn.style.opacity = "0.5";
            setTimeout(() => {
                isCooldown = false;
                if (sendBtn) sendBtn.style.opacity = "1";
            }, 1000);
        };
    }
}

// --- Cloudflare ---

let captchaVerified = false;
let turnstileToken = null;

window.captchaSolved = function(token) {

    captchaVerified = true;
    turnstileToken = token;

    const joinBtn = document.getElementById("join-btn");

    if (joinBtn) {
        joinBtn.style.display = "block";
    }
};

// --- 4. LOGIN LOGIC ---
const loginForm = document.getElementById('login-form');

function isSuspiciousUser() {

    if (navigator.webdriver) {
        return true;
    }

    if (!navigator.cookieEnabled) {
        return true;
    }

    return false;
}

const joinBtn = document.getElementById("join-btn");
const captchaBox = document.getElementById("captcha-box");

if (joinBtn && captchaBox) {

    if (isSuspiciousUser()) {

        captchaBox.style.display = "block";

    } else {

        joinBtn.style.display = "block";
    }
}

if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('username-input').value.trim();
        const loader = document.getElementById('loader');
        const errorDiv = document.getElementById('error-message');

        if (loader) loader.style.display = 'flex';
        loginForm.style.display = 'none';

        try {
            const response = await API("/login-user", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: usernameInput,
                    turnstileToken
                })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("username", usernameInput);
                window.location.href = `chat.html?room=${currentRoom}`;
            } else {
                if (loader) loader.style.display = 'none';
                loginForm.style.display = 'block';
                if (errorDiv) {
                    errorDiv.innerText = data.error;
                    errorDiv.style.display = 'block';
                }
            }
        } catch (err) {
            if (loader) loader.style.display = 'none';
            loginForm.style.display = 'block';
            alert("Server connection failed.");
        }
    };
}

// --- 6. ROOM CREATION PAGE LOGIC ---
const roomForm = document.getElementById('createRoomForm');
if (roomForm) {
    roomForm.onsubmit = async (e) => {
        e.preventDefault();
        const rName = document.getElementById('roomName').value.trim();
        const rDesc = document.getElementById('roomDesc').value.trim();
        const errorEl = document.getElementById('roomFormError');

        try {
            const response = await API("/check-roomname", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: rName, description: rDesc })
            });
            const data = await response.json();

            if (response.ok) {
                localStorage.setItem("current_room", rName);
                window.location.href = `login.html?room=${encodeURIComponent(rName)}`;
            } else {
                if (errorEl) {
                    errorEl.innerText = data.error;
                    errorEl.style.display = 'block';
                }
            }
        } catch (err) {
            alert("Error creating room.");
        }
    };
}