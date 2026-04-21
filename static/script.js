const API_BASE_URL = "https://popchats.onrender.com";
fetch(`${API_BASE_URL}/ping`).catch(() => {});

const socket = io(API_BASE_URL, {
    query: {
        username: localStorage.getItem('username') 
    },
    transports: ["websocket"], 
    upgrade: false,
    rememberUpgrade: true,
    reconnectionAttempts: 5,
    timeout: 10000
});

const loginForm = document.getElementById('login-form');
const loader = document.getElementById('loader');
const errorDiv = document.getElementById('error-message');

if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        
        loginForm.style.display = 'none';
        loader.style.display = 'flex';
        errorDiv.style.display = 'none';

        const username = document.getElementById('username-input').value;

        try {
            const response = await fetch(`${API_BASE_URL}/login-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('username', username);
                window.location.href = 'chat.html';
            } else {
                loginForm.style.display = 'block';
                loader.style.display = 'none';
                errorDiv.innerText = data.error;
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            loginForm.style.display = 'block';
            loader.style.display = 'none';
            errorDiv.innerText = "The server is taking its time to wake up. Try again?";
            errorDiv.style.display = 'block';
        }
    };
}

const chatWindow = document.getElementById('chat-window');
const messageForm = document.querySelector('.input-wrapper');
const messageInput = document.getElementById('user-msg');
const currentUser = localStorage.getItem('username');

let isCooldown = false;

if (messageForm) {
    messageForm.onsubmit = (e) => {
        e.preventDefault();
        const msg = messageInput.value.trim();
        const sendBtn = document.querySelector('.send-btn');

        if (isCooldown) return; 

        if (msg) {
            socket.emit('send_message', { message: msg });
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
        const msgHtml = `
            <div class="message-wrapper ${isMe ? 'me' : ''}">
                <span class="msg-username">${isMe ? 'You' : data.username}</span>
                <div class="msg-box">${data.message}</div>
            </div>
        `;
        
        chatWindow.insertAdjacentHTML('beforeend', msgHtml);
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

    const updateStatus = (statusClass, text) => {
        const status = document.querySelector('.server-status');
        if (status) {
            status.className = `server-status ${statusClass}`;
            status.innerHTML = `<span></span> ${text}`;
        }
    };

    socket.on('connect', () => updateStatus('active', 'Active'));
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