// পেজ লোড হলে ইউজার ইনফো সেট করা
document.addEventListener('DOMContentLoaded', function() {
    const currentUser = JSON.parse(localStorage.getItem('current_user'));
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // ইউজার ইনফো শো করা
    document.getElementById('userName').textContent = currentUser.fullName;
    document.getElementById('userUniversity').textContent = getUniversityName(currentUser.university);
    document.getElementById('userDepartment').textContent = currentUser.department;
    
    // লগআউট বাটন
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('current_user');
        window.location.href = 'index.html';
    });
    
    // ড্যাশবোর্ড স্ট্যাটস লোড করা
    loadDashboardStats();
});

// ইউনিভার্সিটি কোড থেকে নাম
function getUniversityName(code) {
    const universities = {
        'du': 'ঢাকা বিশ্ববিদ্যালয়',
        'ru': 'রাজশাহী বিশ্ববিদ্যালয়',
        'cu': 'চট্টগ্রাম বিশ্ববিদ্যালয়',
        'ju': 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়'
    };
    
    return universities[code] || code;
}

// ড্যাশবোর্ড স্ট্যাটস লোড করা
function loadDashboardStats() {
    // এখানে সাধারণত API কল করা হবে
    // এখন আমরা মক ডেটা ব্যবহার করছি
    
    document.getElementById('uploadedThesis').textContent = '3';
    document.getElementById('totalDownloads').textContent = '42';
    document.getElementById('userRating').textContent = '4.5';
    
    const activities = [
        'আপনি "মেশিন লার্নিং ব্যবহার করে রোগ নির্ণয়" থিসিস আপলোড করেছেন (11/04/2025)',
        'আপনার "জলবায়ু পরিবর্তনের প্রভাব" থিসিসটি ৫ বার ডাউনলোড করা হয়েছে (11/04/2025)',
        'আপনি "কৃত্রিম বুদ্ধিমত্তা" থিসিসটি ডাউনলোড করেছেন (10/04/2025)'
    ];
    
    const activityList = document.getElementById('activityList');
    activities.forEach(activity => {
        const li = document.createElement('li');
        li.textContent = activity;
        activityList.appendChild(li);
    });
}