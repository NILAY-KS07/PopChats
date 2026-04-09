const socket = io({
    transports: ["websocket"], 
    upgrade: false,
    rememberUpgrade: true,
    reconnectionAttempts: 5,
    timeout: 10000
});

const chatWindow = document.getElementById('chat-window');
const messageForm = document.querySelector('.input-wrapper');
const messageInput = document.getElementById('user-msg');

let isCooldown = false;

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
