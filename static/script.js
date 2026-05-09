const isLocal =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost";

const API_BASE = isLocal
  ? "http://127.0.0.1:5000"
  : "";

const API = (path, options = {}) =>
  fetch(`${API_BASE}/api${path}`, {
    credentials: "include",
    ...options
  });

API("/ping").catch(() => {});

let socket = null;

const SOCKET_URL = isLocal
  ? "http://127.0.0.1:5000"
  : undefined;

if (document.getElementById('chat-window')) {
    socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        timeout: 10000,
        withCredentials: true
    });
}
const params = new URLSearchParams(window.location.search);
let room = params.get("room");

if (room) {
    localStorage.setItem("room", room);
    window.__popchats_currentRoom = room;
}

const currentRoom =
    window.__popchats_currentRoom ||
    localStorage.getItem("room") ||
    "public";

const updateStatus = (statusClass, text) => {
    const status = document.querySelector('.server-status');
    if (status) {
        status.className = `server-status ${statusClass}`;
        status.innerHTML = '<span></span>';
        status.append(` ${text}`);
    }
};

if (socket) {
    socket.on('connect', () => {
        updateStatus('active', 'Active');
    });
}

const loginForm = document.getElementById('login-form');
const loader = document.getElementById('loader');
const errorDiv = document.getElementById('error-message');

if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        
        loginForm.style.display = 'none';
        loader.style.display = 'flex';
        errorDiv.style.display = 'none';

        const username = document.getElementById('username-input').value.trim();

        try {
            const response = await API("/login-user", {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                },
                body: JSON.stringify({ username: username })
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = `chat.html?room=${currentRoom || "public"}`;
            } else {
                loginForm.style.display = 'block';
                loader.style.display = 'none';
                errorDiv.innerText = data.error;
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            loginForm.style.display = 'block';
            loader.style.display = 'none';
            errorDiv.innerText = "Something went wrong! Try Again?";
            errorDiv.style.display = 'block';
        }
    };
}

const chatWindow = document.getElementById('chat-window');
const messageForm = document.querySelector('.input-wrapper');
const messageInput = document.getElementById('user-msg');
let currentUser = '';

API("/me")
.then(res => {

    if (!res.ok) {

        if (window.location.pathname.includes("chat.html")) {
            window.location.href = "login.html";
        }

        return null;
    }

    return res.json();
})
.then(data => {

    if (!data) return;

    currentUser = data.username;

    if (!socket) return;

    const joinRoom = () => {
        socket.emit("join_room", { room: currentRoom });
    };

    if (socket.connected) {
        joinRoom();
    }

    socket.off("connect", joinRoom);
    socket.on("connect", joinRoom);

});

let isCooldown = false;

if (messageForm && socket) {
    let hasJoined = false;

    messageForm.onsubmit = (e) => {
        e.preventDefault();
        const msg = messageInput.value.trim();
        const sendBtn = document.querySelector('.send-btn');

        if (isCooldown) return;
        if (!hasJoined) {
            const errorNotif = document.getElementById('error-toast');
            if (errorNotif) {
                errorNotif.innerText = 'Joining room...';
                errorNotif.classList.add('show');
                setTimeout(() => errorNotif.classList.remove('show'), 2000);
            }
            return;
        }

        if (msg) {
            socket.emit('send_message', { 
                message: msg,
                room: currentRoom
            });
            messageInput.value = '';

            isCooldown = true;
            sendBtn.disabled = true;
            sendBtn.style.opacity = "0.5";
            sendBtn.style.cursor = "not-allowed";

            setTimeout(() => {
                isCooldown = false;
                sendBtn.disabled = false;
                sendBtn.style.opacity = "1";
                sendBtn.style.cursor = "pointer";
            }, 2000);
        }
    };

socket.on('receive_message', (data) => {

    const isMe = data.username === currentUser;

    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${isMe ? 'me' : ''}`;

    const usernameSpan = document.createElement('span');
    usernameSpan.className = 'msg-username';
    usernameSpan.textContent = isMe ? 'You' : data.username;

    const msgBox = document.createElement('div');
    msgBox.className = 'msg-box';
    msgBox.textContent = data.message;

    wrapper.appendChild(usernameSpan);
    wrapper.appendChild(msgBox);

    chatWindow.appendChild(wrapper);

    const chatContainer = document.querySelector('.chat-container');

    chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
    });
});

    socket.on('user_joined', (data) => {
        if (data.username !== currentUser) {
            showJoinNotification(data.username);
        }
    });

    socket.on('update_count', (data) => {
        document.getElementById('count').innerText = data.count;
        hasJoined = true;
    });

    function showJoinNotification(name) {
        const notif = document.getElementById('join-notif');
        const nameSpan = document.getElementById('joined-username');
        
        if (notif && nameSpan) {
            nameSpan.innerText = name;
            notif.classList.add('show');
            setTimeout(() => {
                notif.classList.remove('show');
            }, 1500);
        }
    }

    socket.on('disconnect', () => updateStatus('connecting', 'Reconnecting...'));
    socket.on('connect_error', () => updateStatus('connecting', 'Connection Error'));

    socket.on('error_message', (data) => {
        const errorNotif = document.getElementById('error-toast');
        if (errorNotif) {
            errorNotif.innerText = data.error;
            errorNotif.classList.add('show');
            setTimeout(() => errorNotif.classList.remove('show'), 3000);
        }
    });
};


const roomForm = document.getElementById('createRoomForm');

if (roomForm) {

    roomForm.onsubmit = async (e) => {

        e.preventDefault();

        const rName = document.getElementById('roomName').value.trim();
        const rDesc = document.getElementById('roomDesc').value.trim();
        const errorEl = document.getElementById('roomFormError');

        const showError = (msg) => {
            if (!errorEl) return;
            errorEl.innerText = msg;
            errorEl.style.display = 'block';
        };

        // Reset error on each submit
        if (errorEl) {
            errorEl.innerText = '';
            errorEl.style.display = 'none';
        }

        // Basic client-side validation (server will re-validate too)
        if (!rName) {
            showError('Room name is required.');
            return;
        }
        if (rName.length < 3 || rName.length > 50) {
            showError('Room name length is invalid.');
            return;
        }
        if (!rDesc) {
            showError('Room description is required.');
            return;
        }
        if (rDesc.length > 200) {
            showError('Room description is too long.');
            return;
        }

        try {
            const response = await API("/check-roomname", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: rName,
                    description: rDesc
                })
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                window.location.href = `login.html?room=${encodeURIComponent(rName)}`;
            } else {
                showError(data.error || 'Failed to create room.');
            }

        } catch (err) {
            console.error("Room creation error:", err);
            showError('Server/network error.');
        }
    };
}

