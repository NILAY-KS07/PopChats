const hostname = window.location.hostname;

// Added a utility function to sanitize HTML before we inject it into the DOM.
// This is critical to prevent Cross-Site Scripting (XSS) attacks. Without this, 
// a malicious user could send a message containing <script> tags or malformed HTML
// and it would execute in everyone's browser, potentially stealing data or crashing the app.
const escapeHTML = (str) => {
    if (!str) return "";
    return str.toString().replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
};

const isLocal =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname.startsWith("192.168.");

const API_BASE_URL = isLocal
  ? `${window.location.protocol}//${hostname}:5000`
  : "https://popchats.onrender.com";

fetch(`${API_BASE_URL}/ping`).catch(() => {});

const socket = io(API_BASE_URL, {
    query: {
        username: localStorage.getItem('username') 
    },
    transports: ["websocket", "polling"], 
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
            errorDiv.innerText = "Something went wrong! Try Again?";
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
        const message = data.message;
        let isMentioned = false;

        // Detect if the current user is mentioned (@Username)
        // We do this BEFORE escaping for the check, but use the escaped version for display
        if (currentUser && message.includes(`@${currentUser}`)) {
            isMentioned = true;
            if (!isMe) { // Don't notify if I mention myself
                showMentionNotification(data.username);
            }
        }

        // 1. Sanitize the message first to prevent XSS
        const sanitizedMsg = escapeHTML(message);

        // 2. Wrap any @mention in a styled span for everyone to see
        const mentionRegex = /@(\w+)/g;
        const highlightedMsg = sanitizedMsg.replace(mentionRegex, (match) => {
            return `<span class="mention-tag">${match}</span>`;
        });

        const msgHtml = `
            <div class="message-wrapper ${isMe ? 'me' : ''} ${isMentioned && !isMe ? 'mentioned' : ''}">
                <span class="msg-username">${isMe ? 'You' : escapeHTML(data.username)}</span>
                <div class="msg-box">${highlightedMsg}</div>
            </div>
        `;
        
        chatWindow.insertAdjacentHTML('beforeend', msgHtml);
        const chatContainer = document.querySelector('.chat-container');
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    });

    function showMentionNotification(from) {
        const notif = document.getElementById('mention-toast');
        const msg = document.getElementById('mention-msg');
        if (notif && msg) {
            msg.innerText = `${from} mentioned you!`;
            notif.classList.add('show');
            setTimeout(() => {
                notif.classList.remove('show');
            }, 5000); // 5 seconds as requested
        }
    }

    // --- Mention Suggestions Logic ---
    const mentionSuggestions = document.getElementById('mention-suggestions');
    let onlineUsers = [];

    socket.on('update_users', (data) => {
        // Filter out ourselves from the mention list
        onlineUsers = data.users.filter(u => u !== currentUser);
        const countEl = document.getElementById('count');
        if (countEl) countEl.innerText = data.count;
    });

    if (messageInput) {
        messageInput.addEventListener('input', (e) => {
            const value = e.target.value;
            const cursorPosition = e.target.selectionStart;
            const textBeforeCursor = value.substring(0, cursorPosition);
            const lastAtSymbol = textBeforeCursor.lastIndexOf('@');

            if (lastAtSymbol !== -1) {
                const charBeforeAt = textBeforeCursor[lastAtSymbol - 1];
                if (lastAtSymbol === 0 || charBeforeAt === ' ' || charBeforeAt === '\n') {
                    const query = textBeforeCursor.substring(lastAtSymbol + 1);
                    if (!query.includes(' ')) {
                        showSuggestions(query, lastAtSymbol);
                        return;
                    }
                }
            }
            hideSuggestions();
        });

        document.addEventListener('click', (e) => {
            if (mentionSuggestions && !mentionSuggestions.contains(e.target) && e.target !== messageInput) {
                hideSuggestions();
            }
        });
    }

    function showSuggestions(query, atIndex) {
        if (!mentionSuggestions) return;
        const filtered = onlineUsers.filter(u => u.toLowerCase().startsWith(query.toLowerCase()));
        if (filtered.length > 0) {
            mentionSuggestions.innerHTML = '';
            filtered.forEach(user => {
                const div = document.createElement('div');
                div.className = 'mention-item';
                div.innerText = user;
                div.onclick = () => insertMention(user, atIndex);
                mentionSuggestions.appendChild(div);
            });
            mentionSuggestions.classList.add('show');
        } else {
            hideSuggestions();
        }
    }

    function hideSuggestions() {
        if (mentionSuggestions) mentionSuggestions.classList.remove('show');
    }

    function insertMention(username, atIndex) {
        const value = messageInput.value;
        const textBeforeAt = value.substring(0, atIndex);
        const textAfterCursor = value.substring(atIndex);
        const spaceAfterAt = textAfterCursor.indexOf(' ');
        const endOfQuery = spaceAfterAt === -1 ? value.length : atIndex + spaceAfterAt;
        const textAfterMention = value.substring(endOfQuery);
        messageInput.value = `${textBeforeAt}@${username} ${textAfterMention.startsWith(' ') ? textAfterMention : ' ' + textAfterMention}`;
        hideSuggestions();
        messageInput.focus();
    }

    socket.on('user_joined', (data) => {
        if (data.username !== currentUser) {
            showJoinNotification(data.username);
        }
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

    // --- Typing Indicator Logic ---
    const typingIndicator = document.getElementById('typing-indicator');
    let typingUsers = new Set();
    let typingTimeouts = {};

    if (messageInput) {
        messageInput.addEventListener('input', () => {
            socket.emit('typing', {});
        });
    }

    socket.on('user_typing', (data) => {
        if (!typingIndicator) return;
        
        const username = data.username;
        typingUsers.add(username);
        updateTypingIndicator();

        // Clear existing timeout for this specific user
        if (typingTimeouts[username]) {
            clearTimeout(typingTimeouts[username]);
        }

        // Remove user from "typing" set after 3 seconds of inactivity
        typingTimeouts[username] = setTimeout(() => {
            typingUsers.delete(username);
            delete typingTimeouts[username];
            updateTypingIndicator();
        }, 3000);
    });

    function updateTypingIndicator() {
        if (typingUsers.size === 0) {
            typingIndicator.innerText = '';
            typingIndicator.classList.remove('show');
        } else if (typingUsers.size === 1) {
            typingIndicator.innerText = `${Array.from(typingUsers)[0]} is typing...`;
            typingIndicator.classList.add('show');
        } else {
            typingIndicator.innerText = 'Multiple people are typing...';
            typingIndicator.classList.add('show');
        }
    }
};
