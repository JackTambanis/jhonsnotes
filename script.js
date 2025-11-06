// ---------- Firebase Setup ----------
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, onValue, update } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your Firebase config
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

// ---------- DOM Elements ----------
const displayNameInput = document.getElementById('displayName');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const profilePicInput = document.getElementById('profilePic');
const registerBtn = document.getElementById('registerBtn');

const adminDiv = document.getElementById('admin');
const pendingUsersDiv = document.getElementById('pendingUsers');

const roomInput = document.getElementById('roomCode');
const joinRoomBtn = document.getElementById('joinRoom');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendMessageBtn = document.getElementById('sendMessage');

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

  if (!displayName || !username || !password || !file) {
    return alert("Fill all fields and select a profile picture");
  }

  const code4digit = generate4DigitCode();

  // Upload profile pic
  const picRef = storageRef(storage, `profilePics/${username}`);
  await uploadBytes(picRef, file);
  const picURL = await getDownloadURL(picRef);

  const newUserRef = push(ref(db, "users"));
  await set(newUserRef, {
    displayName,
    username,
    password,
    profilePicURL: picURL,
    code4digit,
    approved: false,
    lastActive: Date.now()
  });

  alert(`Registered! Your 4-digit code: ${code4digit}. Waiting for admin approval.`);
};

// ---------- ADMIN APPROVAL ----------
async function loadPendingUsers() {
  pendingUsersDiv.innerHTML = "";
  const usersRef = ref(db, "users");
  onValue(usersRef, (snapshot) => {
    const users = snapshot.val() || {};
    for (let userID in users) {
      if (!users[userID].approved) {
        const user = users[userID];
        const div = document.createElement('div');
        div.textContent = `${user.username} (${user.displayName})`;
        const approveBtn = document.createElement('button');
        approveBtn.textContent = "Approve";
        approveBtn.onclick = async () => {
          update(ref(db, `users/${userID}`), { approved: true });
          div.remove();
        };
        div.appendChild(approveBtn);
        pendingUsersDiv.appendChild(div);
      }
    }
  });
}

// ---------- LOGIN WITH 4-DIGIT CODE ----------
async function loginWithCode(inputCode) {
  const usersRef = ref(db, "users");
  onValue(usersRef, (snapshot) => {
    const users = snapshot.val() || {};
    for (let userID in users) {
      const user = users[userID];
      if (user.code4digit == inputCode) {
        if (!user.approved) return alert("Waiting for admin approval");
        currentUser = { id: userID, ...user };
        trackActiveUser();
        alert(`Logged in as ${user.username}`);
        return;
      }
    }
    alert("Invalid code");
  });
}

// ---------- ACTIVE USER TRACKING ----------
function trackActiveUser() {
  setInterval(() => {
    if (currentUser) {
      update(ref(db, `users/${currentUser.id}`), { lastActive: Date.now() });
    }
  }, 5000);
}

// ---------- CREATE / JOIN DM ----------
async function createDM(targetCode) {
  const usersRef = ref(db, "users");
  onValue(usersRef, async (snapshot) => {
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
    alert(`DM room ready with ${targetName}`);
  });
}

// ---------- LISTEN FOR MESSAGES ----------
function listenToRoom(roomID) {
  const messagesRef = ref(db, `rooms/${roomID}/messages`);
  onValue(messagesRef, (snapshot) => {
    const messages = snapshot.val() || {};
    messagesDiv.innerHTML = "";
    for (let msgID in messages) {
      const msg = messages[msgID];
      const el = document.createElement('div');
      el.textContent = `${msg.sender}: ${msg.text}`;
      if (msg.ping) el.style.background = "#fffa8d";
      messagesDiv.appendChild(el);
    }
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// ---------- SEND MESSAGE ----------
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
};

// ---------- JOIN ROOM / DM ----------
joinRoomBtn.onclick = async () => {
  const targetCode = roomInput.value.trim();
  if (!targetCode) return;
  createDM(targetCode);
};

// ---------- INVITE SYSTEM ----------
async function sendInvite(toCode) {
  const usersRef = ref(db, "users");
  onValue(usersRef, async (snapshot) => {
    const users = snapshot.val() || {};
    let targetID = null;
    for (let userID in users) {
      const user = users[userID];
      if (user.code4digit == toCode && user.approved) {
        targetID = userID;
        break;
      }
    }
    if (!targetID) return alert("User not found or not approved");

    const inviteRef = push(ref(db, "invites"));
    await set(inviteRef, {
      fromUser: currentUser.id,
      toUser: targetID,
      roomID: currentRoomID,
      status: "pending",
      timestamp: Date.now()
    });
    alert("Invite sent!");
  });
}

// Listen for incoming invites
const invitesRef = ref(db, "invites");
onValue(invitesRef, (snapshot) => {
  const invites = snapshot.val() || {};
  for (let inviteID in invites) {
    const invite = invites[inviteID];
    if (currentUser && invite.toUser === currentUser.id && invite.status === "pending") {
      alert(`You received an invite from ${invite.fromUser}`);
      // Optional: auto-join room
      // currentRoomID = invite.roomID;
      // listenToRoom(currentRoomID);
    }
  }
});
