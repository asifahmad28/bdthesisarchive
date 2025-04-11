// রেজিস্ট্রেশন ফর্ম হ্যান্ডলিং
document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // ফর্ম ডেটা কালেক্ট করা
    const userData = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        university: document.getElementById('university').value,
        department: document.getElementById('department').value,
        studentId: document.getElementById('studentId').value
    };
    
    // ভ্যালিডেশন
    if (!validateEmail(userData.email)) {
        alert('দয়া করে একটি বৈধ ইমেইল ঠিকানা দিন');
        return;
    }
    
    if (userData.password.length < 6) {
        alert('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
        return;
    }
    
    // লোকাল স্টোরেজে ইউজার সেভ করা (প্রোডাকশনে সার্ভার API কল করতে হবে)
    const users = JSON.parse(localStorage.getItem('thesis_users')) || [];
    
    // চেক করা যে ইমেইল ইতিমধ্যে রেজিস্টার্ড কিনা
    if (users.some(user => user.email === userData.email)) {
        alert('এই ইমেইল দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে');
        return;
    }
    
    users.push(userData);
    localStorage.setItem('thesis_users', JSON.stringify(users));
    localStorage.setItem('current_user', JSON.stringify(userData));
    
    alert('রেজিস্ট্রেশন সফল! আপনি এখন লগইন করতে পারেন');
    window.location.href = 'dashboard.html';
});

// ইমেইল ভ্যালিডেশন ফাংশন
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// লগইন ফাংশন (login.html এর জন্য)
function handleLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    const users = JSON.parse(localStorage.getItem('thesis_users')) || [];
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        localStorage.setItem('current_user', JSON.stringify(user));
        window.location.href = 'dashboard.html';
    } else {
        alert('ভুল ইমেইল বা পাসওয়ার্ড');
    }
}

// ফ্রন্টএন্ড JS ফাইলে (auth.js/main.js)
const API_BASE_URL = 'http://localhost:5000/api';

async function loginUser(credentials) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return await response.json();
}

// auth.js - অথেন্টিকেশন সম্পর্কিত ফাংশনালিটি

/**
 * ইউজার লগইন ফাংশন
 * @param {string} email - ইউজার ইমেইল
 * @param {string} password - ইউজার পাসওয়ার্ড
 * @returns {Promise} - API রেস্পন্স
 */
async function loginUser(email, password) {
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'লগইন ব্যর্থ হয়েছে');
        }
        
        return await response.json();
    } catch (error) {
        console.error('লগইন এরর:', error);
        throw error;
    }
}

/**
 * ইউজার লগআউট ফাংশন
 */
function logoutUser() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

/**
 * বর্তমান ইউজার ডেটা পাওয়া
 * @returns {Object|null} - ইউজার ডেটা অথবা null
 */
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

/**
 * প্রোটেক্টেড রাউট চেক করা
 * @returns {boolean} - লগইন করা আছে কিনা
 */
function checkAuth() {
    return !!localStorage.getItem('token');
}

// অন্যান্য অথেন্টিকেশন ফাংশন (পাসওয়ার্ড রিসেট ইত্যাদি)...