// ===== Bloke Chat - script.js =====

// Import Firebase modules (these will only work if you include type="module" in your HTML)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Your Firebase configuration
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
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let username = "";
let room = "";

// ===== Join Chat Room =====
window.joinChat = function() {
  username = document.getElementById("username").value.trim();
  room = document.getElementById("room").value.trim();

  if (!username || !room) {
    alert("Enter both a username and room code!");
    return;
  }

  document.getElementById("login").style.display = "none";
  document.getElementById("chat").style.display = "flex";
  document.getElementById("roomLabel").innerText = "Room: " + room;

  const messagesRef = ref(db, "rooms/" + room);

  // Listen for new messages
  onChildAdded(messagesRef, (snapshot) => {
    const msg = snapshot.val();
    const div = document.createElement("div");
    div.className = "msg";
    div.innerHTML = `<strong>${msg.user}:</strong> ${msg.text}`;
    document.getElementById("messages").appendChild(div);
    div.scrollIntoView();
  });
};

// ===== Send Message =====
window.sendMessage = function() {
  const text = document.getElementById("message").value.trim();
  if (!text) return;

  const messagesRef = ref(db, "rooms/" + room);
  push(messagesRef, { user: username, text });

  document.getElementById("message").value = "";
};

// ===== Optional: Send with Enter Key =====
document.addEventListener("keypress", function(e) {
  if (e.key === "Enter" && document.getElementById("chat").style.display === "flex") {
    sendMessage();
  }
});
