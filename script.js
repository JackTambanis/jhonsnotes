// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBG6J5vESmji-k5Z1N1h9Ssya6f1aQGgnE",
  authDomain: "bloke-f55ca.firebaseapp.com",
  databaseURL: "https://bloke-f55ca-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bloke-f55ca",
  storageBucket: "bloke-f55ca.firebasestorage.app",
  messagingSenderId: "480383058927",
  appId: "1:480383058927:web:5c7b6cd56f82536f01ec1a",
  measurementId: "G-XLN2DQ823C"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// UI elements
const signupBtn = document.getElementById('signup');
const loginBtn = document.getElementById('login');
const logoutBtn = document.getElementById('logout');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const chatDiv = document.getElementById('chat');
const authDiv = document.getElementById('auth');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendMsg');
const messagesDiv = document.getElementById('messages');

// Sign Up
signupBtn.addEventListener('click', () => {
  auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .then(() => alert("Signed Up!"))
    .catch(err => alert(err.message));
});

// Log In
loginBtn.addEventListener('click', () => {
  auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
    .then(() => {
      authDiv.style.display = 'none';
      chatDiv.style.display = 'flex';
      loadMessages();
    })
    .catch(err => alert(err.message));
});

// Log Out
logoutBtn.addEventListener('click', () => {
  auth.signOut().then(() => {
    chatDiv.style.display = 'none';
    authDiv.style.display = 'flex';
    messagesDiv.innerHTML = '';
  });
});

// Send Message
sendBtn.addEventListener('click', () => {
  const text = msgInput.value.trim();
  if (!text) return;
  const newMsg = {
    text,
    uid: auth.currentUser.uid,
    timestamp: Date.now()
  };
  db.ref('messages').push(newMsg);
  msgInput.value = '';
});

// Load Messages
function loadMessages() {
  db.ref('messages').orderByChild('timestamp').on('value', snapshot => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(childSnapshot => {
      const msg = childSnapshot.val();
      const msgEl = document.createElement('div');
      msgEl.textContent = msg.text;
      if (msg.uid === auth.currentUser.uid) msgEl.classList.add('user-msg');
      messagesDiv.appendChild(msgEl);
    });
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}
