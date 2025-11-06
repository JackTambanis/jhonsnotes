// ---------- Firebase CDN Imports ----------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";

// ---------- Firebase Config ----------
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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// ---------- DOM ELEMENTS ----------
const displayNameInput = document.getElementById('displayName');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const profilePicInput = document.getElementById('profilePic');
const registerBtn = document.getElementById('registerBtn');

const loginCodeInput = document.getElementById('loginCode');
const loginBtn = document.getElementById('loginBtn');

const adminDiv = document.getElementById('admin');
const pendingUsersDiv = document.getElementById('pendingUsers');

const chatDiv = document.getElementById('chat');
const roomLabel = document.getElementById('roomLabel');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('message');
const sendMessageBtn = document.getElementById('sendMessage');

const invitePanel = document.getElementById('invitePanel');
const dmCodeInput = document.getElementById('dmCode');
const dmBtn = document.getElementById('dmBtn');
const inviteCodeInput = document.getElementById('inviteCode');
const sendInviteBtn = document.getElementById('sendInviteBtn');

let currentUser = null;
let currentRoomID = null;

// ---------- UTILITIES ----------
function generate4DigitCode() {
  return Math.floor(1000 + Math.random() * 9000);
}

// ---------- REGISTRATION ----------
registerBtn.onclick = async () => {
  const displayName = displayNameInput.value.trim();
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();
  const file = profilePicInput.files[0];

  if (!displayName || !username || !password || !file) 
      return alert("Fill all fields and select a profile picture");

  const code4digit = generate4DigitCode();

  // Upload profile pic
  const picRef = storageRef(storage, `profilePics/${username}`);
  await uploadBytes(picRef, file);
  const picURL = await getDownloadURL(picRef);

  const usersRef = ref(db, "users");
  let isAdmin = false;

  // Check if first user
  onValue(usersRef, async (snapshot) => {
    const users = snapshot.val() || {};
    if (Object.keys(users).length === 0) isAdmin = true; // first user = admin

    const newUserRef = push(ref(db, "users"));
    await set(newUserRef, {
      displayName,
      username,
      password,
      profilePicURL: picURL,
      code4digit,
      approved: isAdmin, // first user auto-approved
      isAdmin,
      lastActive: Date.now()
    });

    alert(`Registered! Your 4-digit code: ${code4digit}.` + 
          `${isAdmin ? " You are admin and auto-approved." : " Waiting for admin approval."}`);
  }, { onlyOnce: true });
};

// ---------- LOGIN ----------
loginBtn.onclick = async () => {
  const code = loginCodeInput.value.trim();
  if (!code) return alert("Enter your 4-digit code");

  const usersRef = ref(db, "users");
  onValue(usersRef, (snapshot) => {
    const users = snapshot.val() || {};
    for (let userID in users) {
      const user = users[userID];
      if (user.code4digit == code) {
        if (!user.approved) return alert("Waiting for admin approval");
        currentUser = { id: userID, ...user };
        alert(`Logged in as ${user.username}`);

        loginCodeInput.value = "";
        showChatUI();
        trackActiveUser();

        // Show admin panel if user is admin
        if (user.isAdmin) loadPendingUsers();
        return;
      }
    }
    alert("Invalid code");
  }, { onlyOnce: true });
};

// ---------- ADMIN PANEL ----------
function loadPendingUsers() {
  adminDiv.style.display = "block";
  pendingUsersDiv.innerHTML = "";
  const usersRef = ref(db, "users");
  onValue(usersRef, (snapshot) => {
    const users = snapshot.val() || {};
    pendingUsersDiv.innerHTML = "";
    for (let userID in users) {
      const user = users[userID];
      if (!user.approved) {
        const div = document.createElement('div');
        div.textContent = `${user.username} (${user.displayName}) `;
        const approveBtn = document.createElement('button');
        approveBtn.textContent = "Approve";
        approveBtn.onclick = () => update(ref(db, `users/${userID}`), { approved: true });
        div.appendChild(approveBtn);
        pendingUsersDiv.appendChild(div);
      }
    }
  });
}

// ---------- CHAT / DM ----------
function showChatUI() {
  document.getElementById('register').style.display = "none";
  chatDiv.style.display = "block";
  invitePanel.style.display = "block";
}

function joinDM(targetCode) {
  const usersRef = ref(db, "users");
  onValue(usersRef, (snapshot) => {
    const users = snapshot.val() || {};
    let targetID = null;
    let targetName = "";
    for (let userID in users) {
      const user = users[userID];
      if (user.code4digit == targetCode && user.approved) {
        targetID = userID;
        targetName = user.username;
        break;
      }
    }
    if (!targetID) return alert("User not found or not approved");

    const roomID = [currentUser.id, targetID].sort().join("_");
    const roomRef = ref(db, `rooms/${roomID}`);
    set(roomRef, { members: [currentUser.id, targetID] }, { merge: true });
    currentRoomID = roomID;
    listenToRoom(roomID);
    roomLabel.innerText = `DM: ${targetName}`;
    alert(`DM ready with ${targetName}`);
  }, { onlyOnce: true });
}

function listenToRoom(roomID) {
  const messagesRef = ref(db, `rooms/${roomID}/messages`);
  onValue(messagesRef, (snapshot) => {
    const messages = snapshot.val() || {};
    messagesDiv.innerHTML = "";
    for (let msgID in messages) {
      const msg = messages[msgID];
      const div = document.createElement('div');
      div.className = "msg";
      div.textContent = `${msg.sender}: ${msg.text}`;
      if (msg.ping) div.classList.add("ping");
      messagesDiv.appendChild(div);
      div.scrollIntoView();
    }
  });
}

sendMessageBtn.onclick = async () => {
  const text = messageInput.value.trim();
  if (!text || !currentRoomID) return;
  const messageRef = push(ref(db, `rooms/${currentRoomID}/messages`));
  await set(messageRef, {
    sender: currentUser.username,
    text,
    ping: text.toLowerCase() === "ping",
    timestamp: Date.now()
  });
  messageInput.value = "";
}

dmBtn.onclick = () => {
  const code = dmCodeInput.value.trim();
  if (!code) return alert("Enter a code");
  joinDM(code);
  dmCodeInput.value = "";
}

// ---------- INVITE ----------
sendInviteBtn.onclick = () => {
  const code = inviteCodeInput.value.trim();
  if (!code) return alert("Enter a code");
  const invitesRef = push(ref(db, "invites"));
  set(invitesRef, {
    fromUser: currentUser.id,
    toCode: code,
    roomID: currentRoomID,
    status: "pending",
    timestamp: Date.now()
  });
  inviteCodeInput.value = "";
  alert("Invite sent!");
}

// Listen for incoming invites
const invitesRef = ref(db, "invites");
onValue(invitesRef, (snapshot) => {
  const invites = snapshot.val() || {};
  for (let inviteID in invites) {
    const invite = invites[inviteID];
    if (currentUser && invite.toCode == currentUser.code4digit && invite.status === "pending") {
      alert(`You received an invite from user ID: ${invite.fromUser}`);
      // Optional: auto-join room
      // currentRoomID = invite.roomID;
      // listenToRoom(currentRoomID);
    }
  }
});

// ---------- ACTIVE USER TRACKING ----------
function trackActiveUser() {
  setInterval(() => {
    if (currentUser) {
      update(ref(db, `users/${currentUser.id}`), { lastActive: Date.now() });
    }
  }, 5000);
}
