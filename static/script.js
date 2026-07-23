const hostname = window.location.hostname;

const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    /^192\.168\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

const API_BASE = isLocal
    ? `http://${hostname}:5000`
    : "";

const SOCKET_URL = isLocal
    ? `http://${hostname}:5000`
    : undefined;

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

    if (options.body) {
        headers['Content-Type'] = 'application/json';
    }

    return fetch(`${API_BASE}/api${path}`, {
        credentials: 'include',
        ...options,
        headers
    });
};

(async function awake() {
    try {
        await API('/ping'); 
    } catch {
        // Fallback, handled by other routes
    }
})();


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

let socket = null;
const chatWindow = document.getElementById('chat-window');

if (chatWindow) {
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
        withCredentials: true
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
        const isMe = data.sender_sid === socket.id;
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

    const messageForm = document.querySelector('.input-wrapper');
    const messageInput = document.getElementById('user-msg');
    let isCooldown = false;

    if (messageForm) {
        messageForm.onsubmit = (e) => {
            e.preventDefault();
            const msg = messageInput.value.trim();
            const sendBtn = document.querySelector('.send-btn');

            if (isCooldown || !msg || !socket.connected) return;

            socket.emit('send_message', { 
                message: msg,  
            });

            messageInput.value = '';
            
            isCooldown = true;
            if (sendBtn) sendBtn.style.opacity = "0.5";
            setTimeout(() => {
                isCooldown = false;
                if (sendBtn) sendBtn.style.opacity = "1";
            }, 1000);
        };
    }
}

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

        if (errorDiv) errorDiv.style.display = 'none';
        if (loader) loader.style.display = 'flex';
        loginForm.style.display = 'none';

        const stages = [
            "Joining Server...",
            "Connecting...",
            "Preparing chat...",
            "Almost there..."
        ];

        let stage = 0;
        let skeletonTimer = null;
        let stageTimer = null;

        skeletonTimer = setTimeout(() => {
            document.body.classList.remove("center-mode");
            document.body.classList.add("chat-mode");

            const pageRoot = document.getElementById("page-root");
            const template = document.getElementById("chat-loading-template");
            if (pageRoot && template) {
                pageRoot.innerHTML = template.innerHTML;
            }

            stageTimer = setInterval(() => {
                if (stage < stages.length - 1) stage++;
                const el = document.getElementById("loading-stage");
                if (el) el.textContent = stages[stage];
            }, 7000);

        }, 5000);

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

            clearTimeout(skeletonTimer);
            if (stageTimer) clearInterval(stageTimer);

            if (response.ok) {
                localStorage.setItem("username", usernameInput);
                window.location.href = `chat.html?room=${encodeURIComponent(currentRoom)}`;
            } else {
                if (loader) loader.style.display = 'none';
                loginForm.style.display = 'block';
                if (errorDiv) {
                    errorDiv.innerText = data.error || "Invalid details. Please try again.";
                    errorDiv.style.display = 'block';
                }
            }
        } catch (err) {
            clearTimeout(skeletonTimer);
            if (stageTimer) clearInterval(stageTimer);
            if (loader) loader.style.display = 'none';
            loginForm.style.display = 'block';
            if (errorDiv) {
                errorDiv.innerText = "Server couldn't be reached. Please try again later.";
                errorDiv.style.display = 'block';
            }
        }
    };
}

const roomForm = document.getElementById('createRoomForm');
if (roomForm) {
    roomForm.onsubmit = async (e) => {
    e.preventDefault();

    const rName = document.getElementById('roomName').value.trim();
    const rDesc = document.getElementById('roomDesc').value.trim();
    const errorEl = document.getElementById('roomFormError');

    const loader = document.getElementById('roomLoader');
    const roomModal = document.querySelector('.roomModal');

    loader.style.display = 'flex';
    roomModal.style.display = 'none';

    roomForm.querySelectorAll("input, button").forEach(el => {
        el.disabled = true;
    });

    try {
        const response = await API("/check-roomname", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: rName,
                description: rDesc
            })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem("current_room", rName);
            window.location.href =
                `login.html?room=${encodeURIComponent(rName)}`;
        } else {

            loader.style.display = 'none';
            roomModal.style.display = 'block';

            roomForm.querySelectorAll("input, button").forEach(el => {
                el.disabled = false;
            });

            if (errorEl) {
                errorEl.innerText = data.error;
                errorEl.style.display = 'block';
            }
        }
    } catch (err) {

        loader.style.display = 'none';
        roomModal.style.display = 'block';

        roomForm.querySelectorAll("input, button").forEach(el => {
            el.disabled = false;
        });

        alert("Error creating room.");
        }
    };
}
