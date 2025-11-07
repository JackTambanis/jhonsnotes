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
const db = firebase.database(); // Realtime Database

// Auth elements
const signupBtn = document.getElementById('signup');
const loginBtn = document.getElementById('login');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const chatDiv = document.getElementById('chat');
const authDiv = document.getElementById('auth');

signupBtn.addEventListener('click', () => {
  auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .then(() => alert("Signed Up!"))
    .catch(err => alert(err.message));
});

loginBtn.addEventListener('click', () => {
  auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
    .then(() => {
      authDiv.style.display = 'none';
      chatDiv.style.display = 'block';
      loadMessages();
    })
    .catch(err => alert(err.message));
});

// Messaging
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendMsg');
const messagesDiv = document.getElementById('messages');

sendBtn.addEventListener('click', () => {
  if (msgInput.value.trim() === "") return;
  const newMsg = {
    text: msgInput.value,
    uid: auth.currentUser.uid,
    timestamp: Date.now()
  };
  db.ref('messages').push(newMsg);
  msgInput.value = '';
});

// Real-time listener
function loadMessages() {
  db.ref('messages').orderByChild('timestamp').on('value', snapshot => {
    messagesDiv.innerHTML = '';
    snapshot.forEach(childSnapshot => {
      const msg = childSnapshot.val();
      const msgEl = document.createElement('div');
      msgEl.textContent = msg.text;
      messagesDiv.appendChild(msgEl);
    });
  });
}
