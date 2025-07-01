// Replace these with your Supabase project URL and anon key
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Elements
const authModal = document.getElementById('authModal');
const authTitle = document.getElementById('authTitle');
const authForm = document.getElementById('authForm');
const authMessage = document.getElementById('authMessage');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authButton = document.getElementById('authButton');

const profileSection = document.getElementById('profileSection');
const profileForm = document.getElementById('profileForm');
const displayName = document.getElementById('displayName');
const avatarUpload = document.getElementById('avatarUpload');
const profilePreview = document.getElementById('profilePreview');
const avatarPreview = document.getElementById('avatarPreview');
const namePreview = document.getElementById('namePreview');

const matchSection = document.getElementById('matchSection');
const matchContainer = document.getElementById('matchContainer');

const chatSection = document.getElementById('chatSection');
const matchedUsersSelect = document.getElementById('matchedUsersSelect');
const chatBox = document.getElementById('chatBox');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');

let currentUser = null;
let profiles = [];
let currentMatchIndex = 0;
let matchedUsers = [];
let currentChatUserId = null;
let chatSubscription = null;

// Utility to show/hide elements
function show(el) { el.classList.remove('hidden'); }
function hide(el) { el.classList.add('hidden'); }

// Show Login modal
function showLogin() {
  authTitle.textContent = 'Login';
  authButton.textContent = 'Login';
  authForm.onsubmit = loginUser;
  show(authModal);
}
// Show Signup modal
function showSignup() {
  authTitle.textContent = 'Sign Up';
  authButton.textContent = 'Sign Up';
  authForm.onsubmit = signUpUser;
  show(authModal);
}
// Hide modal
function hideModal() {
  hide(authModal);
  authMessage.textContent = '';
  authForm.reset();
}

// Sign up
async function signUpUser(e) {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;
  const { user, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    authMessage.textContent = error.message;
  } else {
    authMessage.textContent = 'Sign up successful! Please check your email for confirmation.';
  }
}

// Login
async function loginUser(e) {
  e.preventDefault();
  const email = emailInput.value;
  const password = passwordInput.value;
  const { user, error } = await supabase.auth.signIn({ email, password });
  if (error) {
    authMessage.textContent = error.message;
  } else {
    currentUser = user;
    hideModal();
    onLogin();
  }
}

// After login actions
async function onLogin() {
  hideSections();
  show(profileSection);
  await loadUserProfile();
  await loadProfiles();
}

// Load current user profile info
async function loadUserProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (data) {
    displayName.value = data.display_name || '';
    if (data.avatar_url) {
      avatarPreview.src = data.avatar_url;
      show(profilePreview);
      namePreview.textContent = data.display_name;
    }
  }
}

// Upload profile
profileForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!displayName.value || !avatarUpload.files.length) {
    alert('Please provide a name and select a photo.');
    return;
  }
  const file = avatarUpload.files[0];
  const fileExt = file.name.split('.').pop();
  const fileName = `${currentUser.id}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  // Upload to Supabase storage
  let { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { upsert: true });

  if (uploadError) {
    alert('Error uploading image: ' + uploadError.message);
    return;
  }

  // Get public URL
  const { publicURL, error: urlError } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  if (urlError) {
    alert('Error getting public URL: ' + urlError.message);
    return;
  }

  // Upsert profile info
  const { error: dbError } = await supabase
    .from('profiles')
    .upsert({
      id: currentUser.id,
      display_name: displayName.value,
      avatar_url: publicURL,
    });

  if (dbError) {
    alert('Error saving profile: ' + dbError.message);
    return;
  }

  avatarPreview.src = publicURL;
  namePreview.textContent = displayName.value;
  show(profilePreview);

  // Load matchmaking now
  await loadProfiles();
  hide(profileSection);
  show(matchSection);
  currentMatchIndex = 0;
  displayCurrentProfile();
});

// Load all profiles except current user
async function loadProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', currentUser.id);
  if (error) {
    console.error('Error loading profiles:', error);
    profiles = [];
  } else {
    profiles = data;
  }
}

// Show current profile for matchmaking
function displayCurrentProfile() {
  matchContainer.innerHTML = '';
  if (profiles.length === 0) {
    matchContainer.innerHTML = '<p>No profiles to show.</p>';
    return;
  }
  if (currentMatchIndex >= profiles.length) {
    matchContainer.innerHTML = '<p>You have viewed all profiles.</p>';
    return;
  }
  const profile = profiles[currentMatchIndex];
  const card = document.createElement('div');
  card.className = 'match-card';
  card.innerHTML = `
    <img src="${profile.avatar_url || ''}" alt="${profile.display_name}" />
    <h3>${profile.display_name}</h3>
  `;
  matchContainer.appendChild(card);
}

// Pass profile
function passProfile() {
  currentMatchIndex++;
  displayCurrentProfile();
}

// Like profile (add to matched users)
function likeProfile() {
  const likedProfile = profiles[currentMatchIndex];
  if (!matchedUsers.find(u => u.id === likedProfile.id)) {
    matchedUsers.push(likedProfile);
  }
  currentMatchIndex++;
  displayCurrentProfile();
  updateMatchedUsersSelect();
}

// Update matched users dropdown
function updateMatchedUsersSelect() {
  matchedUsersSelect.innerHTML = '';
  if (matchedUsers.length === 0) {
    matchedUsersSelect.innerHTML = '<option>No matches yet</option>';
    return;
  }
  matchedUsers.forEach(user => {
    const option = document.createElement('option');
    option.value = user.id;
    option.textContent = user.display_name;
    matchedUsersSelect.appendChild(option);
  });
  currentChatUserId = matchedUsers[0].id;
  loadChatMessages(currentChatUserId);
  show(chatSection);
}

// When user selects a different chat
matchedUsersSelect.addEventListener('change', (e) => {
  currentChatUserId = e.target.value;
  loadChatMessages(currentChatUserId);
});

// Load chat messages with selected user
async function loadChatMessages(otherUserId) {
  chatBox.innerHTML = '';
  if (!otherUserId) return;

  // Fetch messages between current user and otherUserId
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
    )
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading messages:', error);
    return;
  }

  data.forEach(msg => {
    appendMessage(msg);
  });

  subscribeToNewMessages(otherUserId);
}

// Append message to chat box
function appendMessage(msg) {
  const div = document.createElement('div');
  div.className = 'message' + (msg.sender_id === currentUser.id ? ' self' : '');
  div.textContent = msg.content;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Subscribe to new messages realtime
function subscribeToNewMessages(otherUserId) {
  if (chatSubscription) {
    supabase.removeSubscription(chatSubscription);
  }
  chatSubscription = supabase
    .from(`messages:receiver_id=eq.${currentUser.id}`)
    .on('INSERT', payload => {
      const msg = payload.new;
      if (msg.sender_id === otherUserId) {
        appendMessage(msg);
      }
    })
    .subscribe();
}

// Send chat message
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!chatInput.value.trim() || !currentChatUserId) return;
  const content = chatInput.value.trim();

  const { error } = await supabase.from('messages').insert([{
    sender_id: currentUser.id,
    receiver_id: currentChatUserId,
    content: content,
    created_at: new Date().toISOString(),
  }]);

  if (error) {
    alert('Error sending message: ' + error.message);
  } else {
    chatInput.value = '';
    // Message will be appended via realtime subscription
  }
});

// Hide all main sections
function hideSections() {
  hide(profileSection);
  hide(matchSection);
  hide(chatSection);
}

// Check if user already logged in on page load
async function checkAuth() {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    currentUser = user;
    onLogin();
  }
}

// Init
checkAuth();
