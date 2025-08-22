// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// আপনার Firebase প্রজেক্টের কনফিগারেশন, যা আপনার দেওয়া হয়েছে।
// এটি এখন সরাসরি এখানে যুক্ত করা হয়েছে।
// Canvas পরিবেশ থেকে __firebase_config এবং __app_id ব্যবহার করা হচ্ছে।
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    // Fallback for local development if not in Canvas
    apiKey: "AIzaSyAoUwwmxG9fq02pKKoUw63-chtMkAN0GXE",
    authDomain: "botanyapp-ca95e.firebaseapp.com",
    projectId: "botanyapp-ca95e",
    storageBucket: "botanyapp-ca95e.firebaseapp.com",
    messagingSenderId: "365997031075",
    appId: "1:365997031075:web:116b96c9232215c1260916",
    measurementId: "G-7YC5XHZ5GN"
};

const appId = typeof __app_id !== 'undefined' ? __app_id : firebaseConfig.projectId; // Canvas appId থাকলে সেটা, না হলে projectId

document.addEventListener('DOMContentLoaded', () => {
    // --- Firebase Initialization ---
    let app;
    let db;
    let auth;
    let userId = null; // Will store current user's ID (Firebase UID)
    let isAdmin = false; // Flag to check if current user is any type of admin (DOBADMIN, DEPTHEAD, CRs)
    let isSuperAdmin = false; // Flag for full admin permissions (DOBADMIN, DEPTHEAD)
    let isCR = false; // Flag for Class Representative
    let crYear = ''; // Stores the specific year for a CR (e.g., '1st', '2nd')


    // Collections paths
    const PUBLIC_COLLECTION_PATH = `artifacts/${appId}/public/data`;
    // const USER_COLLECTION_PATH_PREFIX = `artifacts/${appId}/users`; // User-specific data, currently not used for student profiles

    // --- Permanent Student ID (for Humayun Ahmed) ---
    const PERMANENT_STUDENT_ID = 'PERM_STU_HUMAYUN_AHMED_2022_2023';
    const PERMANENT_STUDENT_DATA = {
        id: PERMANENT_STUDENT_ID,
        name: 'Humayun Ahmed',
        roll: '644',
        reg: '1234', // Example registration last 4 digits
        year: '1st',
        bio: 'Developer and UI/UX enthusiast. Passionate about creating seamless user experiences.',
        imageUrl: 'https://scontent.fdac138-1.fna.fbcdn.net/v/t39.30808-6/487712294_677753404763810_6026313783861584249_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFv6SDUPFHlATw1Q4F4oLxgmK7e6xHdH-eYrt7rEd0f5wmSCrbQvvmZH6-7j4l2dzbuHcH9-HGRorQUXPBCIoA0&_nc_ohc=RuWvo2rCIE0Q7kNvwH6H4Yi&_nc_oc=AdnuXT3rbz3KAUDfkixXefzAg57vIHqjK6PYTQ5N7OVAUP0mzuz119l3ZtgXQA_A9J8&_nc_zt=23&_nc_ht=scontent.fdac138-1.fna&_nc_gid=DOCcBEYKgLCD13ZiuvxVDg&oh=00_AfWWbG5FSgdorWW6V0rwG0rxLKEZwGCsQiyCm2P5POIdTA&oe=68AE0799', // Placeholder image or replace with actual image URL
        email: 'humayunahmed04032002@gmail.com', // Replace with actual email
        phone: '+8801XXXXXXXXX', // Replace with actual phone
        facebookId: 'https://www.facebook.com/your_facebook_id', // Replace with actual Facebook ID/URL
        instagramId: 'https://www.instagram.com/humayun.ahmed.shohan/', // Instagram ID/URL
        developerPremium: true, // Custom flag for premium UI/UX look
        session: '2022-2023', // Session information
        createdBy: 'System',
        createdByUserId: 'SYSTEM_ADMIN_ID' // A system ID, not editable by regular admin
    };


    // --- STATE & currentPage ---
    let currentPage = 'home';
    let entryUserDetails = null; // Stores user details after entry form submission (from localStorage)
    let currentEditingStudentId = null; // For student edit
    let currentEditingPostId = null; // For post edit
    let currentPostForComments = null; // To hold the post object for which comments are shown

    // --- DOM Elements ---
    const pageContent = document.getElementById('page-content');
    const appContainer = document.getElementById('app-container');
    const entryFormContainer = document.getElementById('entry-form-container');
    const navContainer = document.querySelector('nav');
    const userWelcomeInfo = document.getElementById('user-welcome-info');
    const headerLeafIcon = document.getElementById('header-leaf-icon');

    // Modal Elements
    const detailModalContainer = document.getElementById('detail-modal-container');
    const detailModalBody = document.getElementById('detail-modal-body');
    const detailModalCloseBtn = document.getElementById('detail-modal-close');

    const formModalContainer = document.getElementById('form-modal-container');
    const formModalBody = document.getElementById('form-modal-body');
    const formModalCloseBtn = document.getElementById('form-modal-close');

    const commentModalContainer = document.getElementById('comment-modal-container');
    const commentModalBody = document.getElementById('comment-modal-body');
    const commentModalCloseBtn = document.getElementById('comment-modal-close');

    // Loading Modal Elements
    const loadingModalContainer = document.createElement('div');
    loadingModalContainer.id = 'loading-modal-container';
    loadingModalContainer.className = 'modal-container';
    loadingModalContainer.innerHTML = `
        <div class="modal-content loading-modal-content">
            <div class="spinner"></div>
            <p>লোডিং হচ্ছে...</p>
        </div>
    `;
    document.body.appendChild(loadingModalContainer);

    function showLoading() {
        loadingModalContainer.classList.add('active');
    }

    function hideLoading() {
        loadingModalContainer.classList.remove('active');
    }

    // --- ICONS (SVG strings) ---
    const ICONS = {
        home: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>',
        book: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path></svg>',
        users: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>',
        clipboard: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>',
        bell: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"></path><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"></path></svg>',
        leaf: '<svg xmlns="" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 4 13H2a10 10 0 0 0 10 10zM2 13a10 10 0 0 1 10-10C12 3 12 3 12 3a10 10 0 0 0 10 10h-2a7 7 0 0 1-7 7V3z"></path></svg>',
        plus: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        calendar: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>',
        mapPin: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>',
        trash: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',
        edit: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
        info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>',
        search: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',
        // UPDATED LOGIN ICON: Changed for better compatibility
        login: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>',
        mail: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>',
        phone: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',
        facebook: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>',
        instagram: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>',
        userCheck: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>',
        heart: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>',
        messageCircle: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L2 22l1.7-4.17a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>'
    };
    headerLeafIcon.innerHTML = ICONS.leaf;

    // --- Firebase Admin Role Mapping (Emails instead of just usernames) ---
    // These roles must correspond to user accounts created in Firebase Authentication
    // with the specified email addresses.
    const ADMIN_ROLES_MAP = {
        'depthead@botany.college': { designation: 'Department Head', year: '' },
        'cr1st@botany.college': { designation: 'CR 1st Year', year: '1st' },
        'cr2nd@botany.college': { designation: 'CR 2nd Year', year: '2nd' },
        'cr3rd@botany.college': { designation: 'CR 3rd Year', year: '3rd' },
        'cr4th@botany.college': { designation: 'CR 4th Year', year: '4th' },
        'dobadmin@botany.college': { designation: 'Default Admin', year: '' } // Changed from DOBADMIN username to dobadmin@botany.college
    };

    // This ADMIN_USER_ID is no longer strictly used for Firebase authentication permissions,
    // but can be kept as a conceptual ID for internal app logic if needed.
    // Firebase Auth provides its own UIDs.
    const ADMIN_CONCEPTUAL_ID = 'ADMIN_USER_ID_CONCEPTUAL';


    // --- Notification Specific Global Variables ---
    let notifiedEvents = JSON.parse(localStorage.getItem('notifiedEvents')) || {}; // Store notified event IDs to prevent duplicate reminders
    const NOTIFICATION_REMINDER_HOUR = 20; // 8 PM (20:00) for reminders
    const NOTIFICATION_PROMPT_SHOWN_KEY = 'notificationPromptShown'; // Key for localStorage to track if prompt has been shown

    // --- Date/Time Formatting ---
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.error('Invalid date string provided to formatDate:', dateString);
            return 'Invalid Date';
        }
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('bn-BD', options);
    };
    const formatTime = (timeString) => {
        if (!timeString) return '';
        // If timeString is already ISO format, use it directly. Otherwise, assume HH:MM.
        const date = new Date(timeString.includes('T') ? timeString : `2000-01-01T${timeString}`);
        if (isNaN(date.getTime())) {
            console.error('Invalid time string provided to formatTime:', timeString);
            return '';
        }
        return date.toLocaleTimeString('bn-BD', { hour: 'numeric', minute: 'numeric', hour12: true });
    };

    const getBengaliDayOfWeek = (dateString) => {
        const date = new Date(dateString);
        const days = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
        return days[date.getDay()];
    };

    // Function to convert English numerals to Bengali numerals
    const convertToBengaliNumeral = (number) => {
        const englishNumerals = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        const bengaliNumerals = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
        return String(number).split('').map(digit => {
            const index = englishNumerals.indexOf(digit);
            return index !== -1 ? bengaliNumerals[index] : digit;
        }).join('');
    };

    const convertYearToBengaliText = (year) => {
        const yearMap = {
            '1st': '১ম',
            '2nd': '২য়',
            '3rd': '৩য়',
            '4th': '৪র্থ'
        };
        return yearMap[year] || year; // Return mapped value or original if not found
    };


    const isClassExpired = (classItem) => {
        if (classItem.classType === 'routine' && classItem.isWeekly) {
            return false;
        } else {
            if (!classItem.date || !classItem.time) return false;
            const classDateTime = new Date(`${classItem.date}T${classItem.time}`);
            return classDateTime < new Date();
        }
    };

    const isExamExpired = (examDate) => {
        if (!examDate) return false;
        const examDateTime = new Date(examDate);
        const today = new Date();
        today.setHours(0,0,0,0);
        return examDateTime < today;
    };

    const studentYears = ['1st', '2nd', '3rd', '4th'];

    // --- Modals ---
    function openModal(modalContainer) {
        modalContainer.classList.add('active');
    }
    function closeModal(modalContainer) {
        modalContainer.classList.remove('active');
    }

    detailModalCloseBtn.addEventListener('click', () => closeModal(detailModalContainer));
    formModalCloseBtn.addEventListener('click', () => closeModal(formModalContainer));
    commentModalCloseBtn.addEventListener('click', () => closeModal(commentModalContainer));
    // Close modal if clicked outside content
    [detailModalContainer, formModalContainer, commentModalContainer, loadingModalContainer].forEach(modal => {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal(modal);
            }
        });
    });

    function showDetails(item, type) {
        let content = '';
        switch (type) {
            case 'class':
                content = `<h3>${item.subject}</h3>
                           <p>${item.description}</p>
                           <p><strong>তারিখ:</strong> ${formatDate(item.date)}</p>
                           <p><strong>সময়:</strong> ${formatTime(item.time)}</p>
                           ${item.classType === 'routine' ? `<p><strong>ধরন:</strong> রুটিন ক্লাস</p>` : `<p><strong>ধরন:</strong> অতিরিক্ত ক্লাস</p>`}
                           ${item.classType === 'routine' && item.isWeekly ? `<p><strong>সপ্তাহের দিন:</strong> ${item.dayOfWeek} (সাপ্তাহিক)</p>` : ''}
                           <p><strong>বর্ষ:</strong> ${item.targetYear === 'all' ? 'সকল বর্ষ' : `${convertYearToBengaliText(item.targetYear)} বর্ষ`}</p>
                           ${item.createdBy ? `<p class="text-sm text-gray-500 mt-1">যোগ করেছেন: ${item.createdBy}</p>` : ''}`;
                break;
            case 'exam':
                content = `<h3>${item.subject}</h3>
                           <p><strong>পরীক্ষার সময়:</strong> ${item.time}</p>
                           <p><strong>তারিখ:</strong> ${formatDate(item.date)}</p>
                           <p><strong>রুম:</strong> ${item.room}</p>
                           <p><strong>বর্ষ:</strong> ${item.targetYear === 'all' ? 'সকল বর্ষ' : `${convertYearToBengaliText(item.targetYear)} বর্ষ`}</p>
                           ${item.createdBy ? `<p class="text-sm text-gray-500 mt-1">যোগ করেছেন: ${item.createdBy}</p>` : ''}`;
                break;
            case 'notice':
                content = `<h3>${item.title}</h3>
                           <p>${item.description}</p>
                           <p><strong>ক্যাটাগরি:</strong> ${item.category}</p>
                           <p><strong>তারিখ:</strong> ${formatDate(item.date)}</p>
                           <p><strong>বর্ষ:</strong> ${item.targetYear === 'all' ? 'সকল বর্ষ' : `${convertYearToBengaliText(item.targetYear)} বর্ষ`}</p>
                           ${item.createdBy ? `<p class="text-sm text-gray-500 mt-1">যোগ করেছেন: ${item.createdBy}</p>` : ''}`;
                break;
            case 'post':
                content = `<h3>${item.title}</h3>
                           ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}" onerror="this.src='https://placehold.co/400x200/E0E0E0/888888?text=${encodeURIComponent(item.title)}';">` : ''}
                           <p>${item.content}</p>
                           <p><strong>পোস্ট করেছেন:</strong> ${item.createdBy}</p>
                           <p><strong>তারিখ:</strong> ${formatDate(item.timestamp)} ${formatTime(item.timestamp)}</p>
                           <p><strong>লাইক:</strong> ${item.reactions ? item.reactions.length : 0}</p>
                           <p><strong> কমেন্ট:</strong> ${item.comments ? item.comments.length : 0}</p>`;
                break;
            case 'student':
                content = `<div class="text-center">
                             <h3>${item.name}</h3>
                             ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" class="student-modal-img" style="width:100px; height:100px; border-radius:50%; margin:10px auto; object-fit:cover;" onerror="this.src='https://placehold.co/100x100/E0E0E0/888888?text=${encodeURIComponent(item.name.charAt(0))}';">` : ''}
                           </div>
                           ${item.id === PERMANENT_STUDENT_ID ? `
                                <div class="developer-premium-info">
                                    <p class="font-bold text-green-600 text-center">Developer</p>
                                    <p class="text-xs text-gray-700 text-center">সেশন: ${item.session}</p>
                                    <div class="flex justify-center space-x-2 mt-4">
                                        ${item.instagramId ? `<a href="${item.instagramId.startsWith('http') ? item.instagramId : `https://instagram.com/${item.instagramId}`}" target="_blank" rel="noopener noreferrer" class="btn btn-info btn-sm">${ICONS.instagram}</a>` : ''}
                                        ${item.email ? `<a href="mailto:${item.email}" class="btn btn-primary btn-sm">${ICONS.mail}</a>` : ''}
                                    </div>
                                </div>
                            ` : `
                                <p class="card-text">রোলঃ ${convertToBengaliNumeral(item.roll)} | রেজিঃ ${convertToBengaliNumeral(item.reg)}</p>
                                <p class="card-text">বর্ষ: ${convertYearToBengaliText(item.year)} বর্ষ</p>
                                ${item.bio ? `<p class="card-text text-sm text-gray-600">${item.bio.substring(0,50)}${item.bio.length > 50 ? '...' : ''}</p>` : ''}
                                <div class="student-contact-info mt-1">
                                    ${item.email ? `<div>${ICONS.mail} <a href="mailto:${item.email}">${item.email}</a></div>` : ''}
                                    ${item.phone ? `<div>${ICONS.phone} <a href="tel:${item.phone}">${item.phone}</a></div>` : ''}
                                    ${item.facebookId ? `<div>${ICONS.facebook} <a href="${item.facebookId.startsWith('http') ? item.facebookId : `https://facebook.com/${item.facebookId}`}" target="_blank" rel="noopener noreferrer">${item.facebookId.startsWith('http') ? 'প্রোফাইল লিংক' : item.facebookId}</a></div>` : ''}
                                    ${item.instagramId ? `<div>${ICONS.instagram} <a href="${item.instagramId.startsWith('http') ? item.instagramId : `https://instagram.com/${item.instagramId}`}" target="_blank" rel="noopener noreferrer">ইনস্টাগ্রাম প্রোফাইল</a></div>` : ''}
                                </div>
                            `}
                           `;
                break;
        }
        detailModalBody.innerHTML = content;
        openModal(detailModalContainer);
    }

    // --- Notification Functions ---
    async function requestNotificationPermission() {
        if (!("Notification" in window)) {
            console.log("This browser does not support desktop notification");
            return false; // Indicate failure
        }

        if (Notification.permission === "granted") {
            console.log("Notification permission already granted.");
            return true; // Indicate success
        }

        if (Notification.permission === "denied") {
            console.warn("Notification permission denied by the user. Please enable it in browser settings.");
            // We don't show custom alert here, as the prompt will handle it
            return false; // Indicate failure
        }

        // Request permission
        try {
            // This is the call that triggers the browser's native notification permission prompt.
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                console.log("Notification permission granted.");
                localStorage.setItem(NOTIFICATION_PROMPT_SHOWN_KEY, 'true'); // Mark as shown
                return true;
            } else {
                console.warn("Notification permission denied.");
                localStorage.setItem(NOTIFICATION_PROMPT_SHOWN_KEY, 'denied'); // Mark as denied for future
                return false;
            }
        } catch (error) {
            console.error("Error requesting notification permission:", error);
            localStorage.setItem(NOTIFICATION_PROMPT_SHOWN_KEY, 'error'); // Mark as error
            return false;
        }
    }

    function displayNotification(title, body) {
        if (Notification.permission === "granted") {
            const options = {
                body: body,
                icon: '/DOB/icons/icon-192x192.png', // Path to your app icon
                badge: '/DOB/icons/icon-72x72.png', // Badge for smaller devices
            };
            const notification = new Notification(title, options);

            // Optional: Handle notification click
            notification.onclick = (event) => {
                event.preventDefault();
                window.focus(); // Focus the current tab
                notification.close();
            };

            // Optional: Close notification after a few seconds
            setTimeout(() => notification.close(), 10 * 1000); // 10 seconds
        } else {
            console.warn("Notification permission not granted. Cannot display notification.");
        }
    }

    function checkAndScheduleReminders(classes, exams) {
        // রিমাইন্ডার শুধুমাত্র লগইন করা ছাত্র এবং নোটিফিকেশন অনুমতি থাকলে দেখাবে
        if (Notification.permission !== "granted" || !entryUserDetails || isAdmin) {
            return;
        }

        const userYear = entryUserDetails.year;
        const now = new Date();
        const currentHour = now.getHours();

        // রুটিন ক্লাস এবং পরীক্ষার জন্য রিমাইন্ডার
        classes.forEach(cls => {
            // শুধুমাত্র অতিরিক্ত ক্লাস এবং রুটিন ক্লাস যা সাপ্তাহিক নয় তার জন্য রিমাইন্ডার
            if (cls.classType === 'extra' || (cls.classType === 'routine' && !cls.isWeekly)) {
                if (cls.date) {
                    const classDate = new Date(cls.date);
                    const classTime = cls.time ? new Date(`2000-01-01T${cls.time}`) : new Date(); // Only time part
                    
                    const eventDateTime = new Date(
                        classDate.getFullYear(),
                        classDate.getMonth(),
                        classDate.getDate(),
                        classTime.getHours(),
                        classTime.getMinutes()
                    );

                    const reminderDate = new Date(eventDateTime);
                    reminderDate.setDate(reminderDate.getDate() - 1); // ইভেন্টের আগের দিন
                    reminderDate.setHours(NOTIFICATION_REMINDER_HOUR, 0, 0, 0); // আগের দিন রাত 8টা

                    // ইভেন্টটি যদি ব্যবহারকারীর বর্ষের জন্য হয় অথবা "সকল বর্ষ" এর জন্য হয়
                    const isRelevant = cls.targetYear === 'all' || cls.targetYear === userYear;

                    // রিমাইন্ডার পাঠানোর শর্ত:
                    // 1. রিমাইন্ডারের তারিখ আজকের তারিখ হতে হবে
                    // 2. বর্তমান সময় রিমাইন্ডারের নির্ধারিত সময়ের (রাত 8টা) পরে হতে হবে
                    // 3. রিমাইন্ডারটি সংশ্লিষ্ট বর্ষের জন্য হতে হবে
                    // 4. এই ইভেন্টের জন্য পূর্বে নোটিফিকেশন পাঠানো হয়নি
                    // 5. ইভেন্টটি এখনো শেষ হয়নি
                    if (reminderDate.toDateString() === now.toDateString() &&
                        currentHour >= NOTIFICATION_REMINDER_HOUR &&
                        isRelevant &&
                        !notifiedEvents[`class-reminder-${cls.id}-${reminderDate.toISOString().split('T')[0]}`] &&
                        eventDateTime > now
                    ) {
                        const title = `ক্লাস রিমাইন্ডার: ${cls.subject}`;
                        const body = `আপনার ${convertYearToBengaliText(cls.targetYear)} বর্ষের ${cls.subject} ক্লাসটি আগামীকাল ${formatDate(cls.date)}-এ ${formatTime(cls.time)} সময়ে অনুষ্ঠিত হবে।`;
                        displayNotification(title, body);
                        notifiedEvents[`class-reminder-${cls.id}-${reminderDate.toISOString().split('T')[0]}`] = true;
                        localStorage.setItem('notifiedEvents', JSON.stringify(notifiedEvents));
                    }
                }
            }
        });

        exams.forEach(exam => {
            if (exam.date) {
                const examDate = new Date(exam.date);
                const examTime = exam.time ? new Date(`2000-01-01T${exam.time}`) : new Date(); // Exams can also have specific times

                const eventDateTime = new Date(
                    examDate.getFullYear(),
                    examDate.getMonth(),
                    examDate.getDate(),
                    examTime.getHours(),
                    examTime.getMinutes()
                );

                const reminderDate = new Date(eventDateTime);
                reminderDate.setDate(reminderDate.getDate() - 1); // ইভেন্টের আগের দিন
                reminderDate.setHours(NOTIFICATION_REMINDER_HOUR, 0, 0, 0); // আগের দিন রাত 8টা

                const isRelevant = exam.targetYear === 'all' || exam.targetYear === userYear;

                if (reminderDate.toDateString() === now.toDateString() &&
                    currentHour >= NOTIFICATION_REMINDER_HOUR &&
                    isRelevant &&
                    !notifiedEvents[`exam-reminder-${exam.id}-${reminderDate.toISOString().split('T')[0]}`] &&
                    eventDateTime > now
                ) {
                    const title = `পরীক্ষার রিমাইন্ডার: ${exam.subject}`;
                    const body = `আপনার ${convertYearToBengaliText(exam.targetYear)} বর্ষের ${exam.subject} পরীক্ষা আগামীকাল ${formatDate(exam.date)}-এ ${exam.time} অনুষ্ঠিত হবে।`;
                    displayNotification(title, body);
                    notifiedEvents[`exam-reminder-${exam.id}-${reminderDate.toISOString().split('T')[0]}`] = true;
                    localStorage.setItem('notifiedEvents', JSON.stringify(notifiedEvents));
                }
            }
        });
    }


    // --- Render Functions (now use Firestore listeners) ---
    // Stores the unsubscribe functions for Firestore listeners
    const unsubscribeListeners = {};

    function startFirestoreListener(collectionName, renderCallback) {
        if (unsubscribeListeners[collectionName]) {
            unsubscribeListeners[collectionName](); // Unsubscribe existing listener
        }
        showLoading();
        const q = collection(db, `${PUBLIC_COLLECTION_PATH}/${collectionName}`);
        unsubscribeListeners[collectionName] = onSnapshot(q, (snapshot) => {
            const data = [];
            snapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });

            // For student data, ensure the permanent student card is always present and first
            if (collectionName === 'students') {
                const existingPermanentStudentIndex = data.findIndex(s => s.id === PERMANENT_STUDENT_ID);
                if (existingPermanentStudentIndex === -1) {
                    data.unshift(PERMANENT_STUDENT_DATA); // Add to the beginning if not found
                } else {
                    // If it exists, ensure it's at the beginning and update its content in case of app updates
                    const existingPermanentStudent = data.splice(existingPermanentStudentIndex, 1)[0];
                    data.unshift({ ...existingPermanentStudent, ...PERMANENT_STUDENT_DATA }); // Merge to ensure latest hardcoded data
                }
            }
            renderCallback(data); // Call the specific page render function with fetched data

            // Check for and schedule reminders after classes and exams data are fetched
            if (entryUserDetails && Notification.permission === "granted" && (collectionName === 'classes' || collectionName === 'exams')) {
                // Fetch both classes and exams to run reminder logic once if both are available
                if (collectionName === 'classes') {
                    getDocs(collection(db, `${PUBLIC_COLLECTION_PATH}/exams`)).then(examSnapshot => {
                        const examsData = examSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        checkAndScheduleReminders(data, examsData);
                    }).catch(error => console.error("Error fetching exams for reminder:", error));
                } else if (collectionName === 'exams') {
                     getDocs(collection(db, `${PUBLIC_COLLECTION_PATH}/classes`)).then(classSnapshot => {
                        const classesData = classSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        checkAndScheduleReminders(classesData, data);
                    }).catch(error => console.error("Error fetching classes for reminder:", error));
                }
            }

            hideLoading();
        }, (error) => {
            console.error(`Error fetching ${collectionName}:`, error);
            hideLoading();
            showCustomAlert('ডাটা লোড করতে সমস্যা হয়েছে।'); // Custom alert replacement
        });
    }

    // Function to filter content based on user role
    const filterContentByRole = (items) => {
        if (isSuperAdmin) {
            return items; // Super Admins see all
        } else if (isCR && crYear) {
            // CRs see items targeting 'all' years or their specific year
            {/* Explanation: This section filters items based on the 'targetYear' property.
                - If the user is a Class Representative (isCR is true) and their specific year (crYear) is set,
                  they will see items where 'targetYear' is 'all' OR 'targetYear' matches their 'crYear'.
                - This ensures that CRs see general announcements as well as content relevant to their specific academic year.
            */}
            return items.filter(item => item.targetYear === 'all' || item.targetYear === crYear);
        } else if (entryUserDetails && entryUserDetails.year) {
            // Regular students see items targeting 'all' years or their specific year
            {/* Explanation: This section filters items for regular students.
                - If the user has 'entryUserDetails' (meaning they've filled out the entry form)
                  and their 'year' is set, they will see items where 'targetYear' is 'all'
                  OR 'targetYear' matches their 'entryUserDetails.year'.
                - This ensures regular students only see content relevant to their academic year
                  or general announcements.
            */}
            return items.filter(item => item.targetYear === 'all' || item.targetYear === entryUserDetails.year);
        }
        // If not logged in, or no specific year, show 'all' items only (or empty if no 'all')
        {/* Explanation: This is the fallback for users who are not logged in or do not have a specific year defined.
            - In this case, only items with 'targetYear' set to 'all' will be displayed.
            - This prevents unauthenticated or unclassified users from seeing year-specific content.
        */}
        return items.filter(item => item.targetYear === 'all');
    };

    // Function to render content for home page (recent notices, classes, exams)
    function renderHomePage(allNotices = [], allClasses = [], allExams = []) {
        pageContent.innerHTML = `
            <section class="hero-section">
                <h1>উদ্ভিদবিদ্যা বিভাগ</h1>
                <p>প্রকৃতির রহস্য উন্মোচন করুন, সবুজ ভবিষ্যতের জন্য জ্ঞান অর্জন করুন।</p>
            </section>
            <section id="home-recent-notice"></section>
            <section id="home-next-classes"></section>
            <section id="home-next-exams"></section>
        `;

        // Check for and schedule reminders after data is loaded for home page
        if (entryUserDetails && Notification.permission === "granted") {
            checkAndScheduleReminders(allClasses, allExams);
        }

        const notices = filterContentByRole(allNotices)
                            .sort((a,b) => new Date(b.date) - new Date(a.date));
        const recentNotice = notices.length > 0 ? notices[0] : null;
        const homeRecentNoticeEl = document.getElementById('home-recent-notice');
        if (recentNotice) {
            homeRecentNoticeEl.innerHTML = `
                <h2>সাম্প্রতিক নোটিশ</h2>
                <div class="info-block">
                    <h3>${ICONS.bell} ${recentNotice.title}</h3>
                    <p class="card-text">${recentNotice.description.substring(0,150)}${recentNotice.description.length > 150 ? '...' : ''}</p>
                    <p class="card-meta">তারিখ: ${formatDate(recentNotice.date)}</p>
                    <p class="card-meta">বর্ষ: ${recentNotice.targetYear === 'all' ? 'সকল বর্ষ' : `${convertYearToBengaliText(recentNotice.targetYear)} বর্ষ`}</p>
                    ${recentNotice.createdBy ? `<p class="text-xs text-gray-500">যোগ করেছেন: ${recentNotice.createdBy}</p>` : ''}
                    <button class="btn btn-secondary btn-sm" data-item-id="${recentNotice.id}" data-item-type="notice">বিস্তারিত</button>
                    <button class="btn btn-gray btn-sm" id="view-all-notices">সকল নোটিশ দেখুন</button>
                </div>`;
            homeRecentNoticeEl.querySelector('[data-item-id]').addEventListener('click', () => showDetails(recentNotice, 'notice'));
            homeRecentNoticeEl.querySelector('#view-all-notices').addEventListener('click', () => navigateTo('notice'));

        } else {
            homeRecentNoticeEl.innerHTML = '<h2>সাম্প্রতিক নোটিশ</h2><p>কোনো সাম্প্রতিক নোটিশ নেই।</p>';
        }

        const classes = filterContentByRole(allClasses);

        const futureClasses = classes.filter(cls => !isClassExpired(cls))
                                  .sort((a, b) => {
                                      if (a.classType === 'routine' && b.classType !== 'routine') return -1;
                                      if (a.classType !== 'routine' && b.classType === 'routine') return 1;
                                      if (a.classType === 'routine' && b.classType === 'routine') {
                                          const daysOrder = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
                                          const dayCompare = daysOrder.indexOf(a.dayOfWeek) - daysOrder.indexOf(b.dayOfWeek);
                                          if (dayCompare !== 0) return dayCompare;
                                          return a.time.localeCompare(b.time);
                                      }
                                      return new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`); // Fixed variable name here
                                  })
                                  .slice(0, 3);

        const homeNextClassesEl = document.getElementById('home-next-classes');
        homeNextClassesEl.innerHTML = '<h2>পরবর্তী ক্লাস</h2>';
        if (futureClasses.length > 0) {
            const classGrid = document.createElement('div');
            classGrid.className = 'grid-container';
            futureClasses.forEach(cls => {
                const div = document.createElement('div');
                div.className = 'info-block';
                let classTimeInfo = '';
                if (cls.classType === 'routine') {
                    classTimeInfo = `<span>${cls.dayOfWeek}, ${formatTime(cls.time)}</span>`;
                } else {
                    classTimeInfo = `<span>${formatDate(cls.date)} - ${formatTime(cls.time)}</span>`;
                }
                div.innerHTML = `
                    <h3>${ICONS.calendar} ${cls.subject}</h3>
                    <p class="card-meta">${classTimeInfo}</p>
                    <p class="card-meta text-xs">বর্ষ: ${cls.targetYear === 'all' ? 'সকল বর্ষ' : `${convertYearToBengaliText(cls.targetYear)} বর্ষ`}</p>
                    ${cls.createdBy ? `<p class="text-xs text-gray-500">যোগ করেছেন: ${cls.createdBy}</p>` : ''}
                    <button class="btn btn-secondary btn-sm" data-item-id="${cls.id}" data-item-type="class">বিস্তারিত</button>`;
                div.querySelector('button').addEventListener('click', () => showDetails(cls, 'class'));
                classGrid.appendChild(div);
            });
            homeNextClassesEl.appendChild(classGrid);
        } else {
            homeNextClassesEl.innerHTML += '<p>কোনো পরবর্তী ক্লাস নেই।</p>';
        }

        const exams = filterContentByRole(allExams);
        const futureExams = exams.filter(exam => !isExamExpired(exam.date))
                               .sort((a, b) => new Date(a.date) - new Date(b.date))
                               .slice(0, 2);
        const homeNextExamsEl = document.getElementById('home-next-exams');
        homeNextExamsEl.innerHTML = '<h2>পরবর্তী পরীক্ষা</h2>';
        if (futureExams.length > 0) {
            const examGrid = document.createElement('div');
            examGrid.className = 'grid-container';
            futureExams.forEach(exam => {
                const div = document.createElement('div');
                div.className = 'info-block';
                div.innerHTML = `
                    <h3>${ICONS.clipboard} ${exam.subject}</h3>
                    <p class="card-meta">
                        <span>${formatDate(exam.date)}</span>
                        <span>${ICONS.mapPin} ${exam.room}</span>
                    </p>
                    <p class="card-meta text-xs"> বর্ষ: ${exam.targetYear === 'all' ? 'সকল বর্ষ' : `${convertYearToBengaliText(exam.targetYear)} বর্ষ`}</p>
                    ${exam.createdBy ? `<p class="text-xs text-gray-500">যোগ করেছেন: ${exam.createdBy}</p>` : ''}
                    <button class="btn btn-secondary btn-sm" data-item-id="${exam.id}" data-item-type="exam">বিস্তারিত</button>`;
                div.querySelector('button').addEventListener('click', () => showDetails(exam, 'exam'));
                examGrid.appendChild(div);
            });
            homeNextExamsEl.appendChild(examGrid);
        } else {
            homeNextExamsEl.innerHTML += '<p>কোনো পরবর্তী পরীক্ষা নেই।</p>';
        }
    }

    function renderClassPage(classes) {
        pageContent.innerHTML = `
            <div class="page-header">
                <h2>ক্লাস আপডেট</h2>
                ${entryUserDetails ? `<button id="addClassBtn" class="btn btn-primary add-new-btn">${ICONS.plus} নতুন ক্লাস যোগ করুন</button>` : ''}
            </div>
            <div id="classList" class="grid-container"></div>`;

        const filteredClasses = filterContentByRole(classes)
                            .sort((a, b) => {
                                const aExpired = isClassExpired(a);
                                const bExpired = isClassExpired(b);
                                if (aExpired && !bExpired) return 1;
                                if (!aExpired && bExpired) return -1;

                                if (a.classType === 'routine' && b.classType !== 'routine') return -1;
                                if (a.classType !== 'routine' && b.classType === 'routine') return 1;
                                if (a.classType === 'routine' && b.classType === 'routine') {
                                    const daysOrder = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
                                    const dayCompare = daysOrder.indexOf(a.dayOfWeek) - daysOrder.indexOf(b.dayOfWeek);
                                    if (dayCompare !== 0) return dayCompare;
                                    return a.time.localeCompare(b.time);
                                }
                                return new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`);
                            });

        const classListEl = document.getElementById('classList');
        classListEl.innerHTML = '';
        if (filteredClasses.length === 0) {
            classListEl.innerHTML = '<p>কোনো ক্লাস আপডেট নেই।</p>';
        } else {
            filteredClasses.forEach(cls => {
                const div = document.createElement('div');
                const expired = isClassExpired(cls);
                div.className = `card ${expired ? 'expired' : ''}`;

                let classTimeDisplay = '';
                let statusTag = '';
                if (cls.classType === 'routine') {
                    classTimeDisplay = `<span>${cls.dayOfWeek}, ${formatTime(cls.time)}</span>`;
                    statusTag = `<span class="text-xs text-blue-600">রুটিন ক্লাস</span>`;
                    if (cls.isWeekly) {
                        statusTag += `<span class="text-xs text-green-600"> (সাপ্তাহিক)</span>`;
                    }
                } else {
                    classTimeDisplay = `<span>${formatDate(cls.date)} - ${formatTime(cls.time)}</span>`;
                    if (expired) {
                        statusTag = '<span class="text-xs text-red-600">শেষ হয়েছে</span>';
                    } else {
                        statusTag = '<span class="text-xs text-green-600">আসন্ন</span>';
                    }
                }

                div.innerHTML = `
                    <h4 class="card-title">${cls.subject}</h4>
                    <p class="card-meta">${classTimeDisplay}</p>
                    <p class="card-meta">বর্ষ: ${cls.targetYear === 'all' ? 'সকল বর্ষ' : `${convertYearToBengaliText(cls.targetYear)} বর্ষ`}</p>
                    ${cls.createdBy ? `<p class="text-xs text-gray-500">যোগ করেছেন: ${cls.createdBy}</p>` : ''}
                    ${statusTag}
                    <div class="card-actions">
                        <button class="btn btn-info btn-sm details-btn">${ICONS.info} বিস্তারিত</button>
                        ${isSuperAdmin ? `<button class="btn btn-danger btn-sm delete-btn">${ICONS.trash} মুছুন</button>` : ''}
                    </div>`;
                div.querySelector('.details-btn').addEventListener('click', () => showDetails(cls, 'class'));
                if (isSuperAdmin) { // Only Super Admins can delete classes
                    div.querySelector('.delete-btn').addEventListener('click', () => {
                        showCustomConfirm('আপনি কি এই ক্লাসটি মুছে ফেলতে চান?', () => deleteDocument('classes', cls.id));
                    });
                }
                classListEl.appendChild(div);
            });
        }
        if (entryUserDetails) { // যেকোনো লগইন করা ব্যবহারকারী ক্লাস যোগ করতে পারবে
            document.getElementById('addClassBtn').addEventListener('click', showClassForm);
        }
    }

    async function showClassForm() {
        formModalBody.innerHTML = `
            <h3>নতুন ক্লাস আপডেট</h3>
            <form id="classForm">
                <div class="form-group">
                    <label for="classTargetYear">লক্ষ্য বর্ষ</label>
                    <select id="classTargetYear" required>
                        ${isAdmin ? `<option value="all">সকল বর্ষ</option>` : ''}
                        ${studentYears.map(year => `<option value="${year}" ${(!isAdmin && entryUserDetails?.year === year) ? 'selected' : ''}>${convertYearToBengaliText(year)} বর্ষ</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>ক্লাসের ধরন</label>
                    <div>
                        <input type="radio" id="classTypeRoutine" name="classType" value="routine" checked>
                        <label for="classTypeRoutine">রুটিন ক্লাস</label>
                        <input type="radio" id="classTypeExtra" name="classType" value="extra" class="ml-4">
                        <label for="classTypeExtra">অতিরিক্ত ক্লাস</label>
                    </div>
                </div>
                <div id="routineClassFields">
                    <div class="form-group">
                        <label for="classDayOfWeek">সপ্তাহের দিন</label>
                        <select id="classDayOfWeek">
                            <option value="রবিবার">রবিবার</option>
                            <option value="সোমবার">সোমবার</option>
                            <option value="মঙ্গলবার">মঙ্গলবার</option>
                            <option value="বুধবার">বুধবার</option>
                            <option value="বৃহস্পতিবার">বৃহস্পতিবার</option>
                            <option value="শুক্রবার">শুক্রবার</option>
                            <option value="শনিবার">শনিবার</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <input type="checkbox" id="classIsWeekly">
                        <label for="classIsWeekly">সাপ্তাহিক পুনরাবৃত্তি</label>
                    </div>
                     <div class="form-group">
                        <label for="classDate">রুটিন শুরুর তারিখ (ঐচ্ছিক)</label>
                        <input type="date" id="classDate">
                    </div>
                </div>
                <div id="extraClassFields" style="display: none;">
                    <div class="form-group">
                        <label for="extraClassDate">তারিখ <span class="text-red-600">*</span></label>
                        <input type="date" id="extraClassDate">
                    </div>
                </div>
                <div class="form-group">
                    <label for="classTime">সময় <span class="text-red-600">*</span></label>
                    <input type="time" id="classTime" required>
                </div>
                <div class="form-group">
                    <label for="classSubject">বিষয় <span class="text-red-600">*</span></label>
                    <input type="text" id="classSubject" placeholder="বিষয়ের নাম" required>
                </div>
                <div class="form-group">
                    <label for="classDescription">বর্ণনা <span class="text-red-600">*</span></label>
                    <textarea id="classDescription" placeholder="ক্লাস সম্পর্কে বিস্তারিত" required></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-gray" id="cancelClassForm">বাতিল</button>
                    <button type="submit" class="btn btn-primary">যোগ করুন</button>
                </div>
            </form>`;
        openModal(formModalContainer);

        const classTargetYearSelect = document.getElementById('classTargetYear');
        // Disable targetYear select and pre-select for students (non-admins)
        if (!isAdmin && entryUserDetails && entryUserDetails.year) {
            classTargetYearSelect.value = entryUserDetails.year;
            classTargetYearSelect.disabled = true;
        } else if (isCR && crYear) {
            // Pre-select CR's year for CRs, but don't disable so they can change to 'all'
            classTargetYearSelect.value = crYear;
        }


        const classTypeRoutine = document.getElementById('classTypeRoutine');
        const classTypeExtra = document.getElementById('classTypeExtra');
        const routineClassFields = document.getElementById('routineClassFields');
        const extraClassFields = document.getElementById('extraClassFields');
        const classDateInput = document.getElementById('classDate');
        const extraClassDateInput = document.getElementById('extraClassDate');

        const toggleClassFields = () => {
            if (classTypeRoutine.checked) {
                routineClassFields.style.display = 'block';
                extraClassFields.style.display = 'none';
                classDateInput.removeAttribute('required');
                extraClassDateInput.removeAttribute('required');
            } else {
                routineClassFields.style.display = 'none';
                extraClassFields.style.display = 'block';
                extraClassDateInput.setAttribute('required', 'true');
                classDateInput.removeAttribute('required');
            }
        };

        classTypeRoutine.addEventListener('change', toggleClassFields);
        classTypeExtra.addEventListener('change', toggleClassFields);
        toggleClassFields();

        const classForm = document.getElementById('classForm');
        classForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const classType = document.querySelector('input[name="classType"]:checked').value;
            let classDate = '';
            let dayOfWeek = '';
            let isWeekly = false;

            if (classType === 'routine') {
                classDate = classDateInput.value;
                dayOfWeek = document.getElementById('classDayOfWeek').value;
                isWeekly = document.getElementById('classIsWeekly').checked;
            } else {
                classDate = extraClassDateInput.value;
                if (!classDate) {
                    showCustomAlert("অতিরিক্ত ক্লাসের জন্য তারিখ আবশ্যক।");
                    return;
                }
            }

            const newClass = {
                targetYear: classTargetYearSelect.value, // Use the value from the select element
                classType: classType,
                date: classDate,
                time: document.getElementById('classTime').value,
                subject: document.getElementById('classSubject').value,
                description: document.getElementById('classDescription').value,
                dayOfWeek: dayOfWeek,
                isWeekly: isWeekly,
                createdBy: entryUserDetails ? `${entryUserDetails.name} (রোল: ${entryUserDetails.roll}, বর্ষ: ${entryUserDetails.year})` : 'Unknown',
                createdByUserId: userId // Store user ID
            };

            // Student specific restriction (applies only to non-admins)
            if (!isAdmin && entryUserDetails && newClass.targetYear !== entryUserDetails.year) {
                showCustomAlert("আপনি শুধুমাত্র আপনার নিজের বর্ষের জন্য ক্লাস যোগ করতে পারবেন।");
                return;
            }

            if (!newClass.subject || !newClass.description || !newClass.time) {
                showCustomAlert("সকল আবশ্যকীয় (*) ঘর পূরণ করুন।");
                return;
            }

            try {
                showLoading();
                const docRef = await addDoc(collection(db, `${PUBLIC_COLLECTION_PATH}/classes`), newClass);
                closeModal(formModalContainer);
                // নতুন ক্লাস যোগ হলে নোটিফিকেশন দেখান
                if (Notification.permission === "granted" && (newClass.targetYear === 'all' || (entryUserDetails && newClass.targetYear === entryUserDetails.year))) {
                    displayNotification(
                        `নতুন ক্লাস: ${newClass.subject}`,
                        `${newClass.description.substring(0, 100)}... ${newClass.targetYear === 'all' ? 'সকল বর্ষের' : `${convertYearToBengaliText(newClass.targetYear)} বর্ষের`} জন্য।`
                    );
                }
            } catch (error) {
                console.error("Error adding class:", error);
                showCustomAlert("ক্লাস যোগ করতে সমস্যা হয়েছে।");
            } finally {
                hideLoading();
            }
        });
        document.getElementById('cancelClassForm').addEventListener('click', () => closeModal(formModalContainer));
    }

    function renderExamPage(exams) {
        pageContent.innerHTML = `
            <div class="page-header">
                <h2>পরীক্ষার আপডেট</h2>
                ${entryUserDetails ? `<button id="addExamBtn" class="btn btn-primary add-new-btn">${ICONS.plus} নতুন পরীক্ষা যোগ করুন</button>` : ''}
            </div>
            <div id="examList" class="grid-container"></div>`;

        const filteredExams = filterContentByRole(exams)
                          .sort((a, b) => {
                                const aExpired = isExamExpired(a.date);
                                const bExpired = isExamExpired(b.date);
                                if (aExpired && !bExpired) return 1;
                                if (!aExpired && bExpired) return -1;
                                return new Date(b.date) - new Date(a.date);
                            });

        const examListEl = document.getElementById('examList');
        examListEl.innerHTML = '';
        if (filteredExams.length === 0) {
            examListEl.innerHTML = '<p>কোনো পরীক্ষার আপডেট নেই।</p>';
        } else {
            filteredExams.forEach(exam => {
                const div = document.createElement('div');
                const expired = isExamExpired(exam.date);
                div.className = `card ${expired ? 'expired' : ''}`;
                div.innerHTML = `
                    <h4 class="card-title">${exam.subject}</h4>
                    <p class="card-meta">${formatDate(exam.date)}</p>
                    <p class="card-text">সময়: ${exam.time}</p>
                    <p class="card-text">রুম: ${exam.room}</p>
                    <p class="card-meta">বর্ষ: ${exam.targetYear === 'all' ? 'সকল বর্ষ' : `${convertYearToBengaliText(exam.targetYear)} বর্ষ`}</p>
                    ${exam.createdBy ? `<p class="text-xs text-gray-500">যোগ করেছেন: ${exam.createdBy}</p>` : ''}
                    ${expired ? '<span class="text-xs text-red-600">শেষ হয়েছে</span>' : ''}
                    <div class="card-actions">
                        <button class="btn btn-info btn-sm details-btn">${ICONS.info} বিস্তারিত</button>
                        ${isSuperAdmin ? `<button class="btn btn-danger btn-sm delete-btn">${ICONS.trash} মুছুন</button>` : ''}
                    </div>`;
                div.querySelector('.details-btn').addEventListener('click', () => showDetails(exam, 'exam'));
                if (isSuperAdmin) { // Only Super Admins can delete exams
                    div.querySelector('.delete-btn').addEventListener('click', () => {
                        showCustomConfirm('আপনি কি এই পরীক্ষাটি মুছে ফেলতে চান?', () => deleteDocument('exams', exam.id));
                    });
                }
                examListEl.appendChild(div);
            });
        }
        if (entryUserDetails) { // যেকোনো লগইন করা ব্যবহারকারী পরীক্ষা যোগ করতে পারবে
            document.getElementById('addExamBtn').addEventListener('click', showExamForm);
        }
    }

    async function showExamForm() {
        formModalBody.innerHTML = `
            <h3>নতুন পরীক্ষা যোগ করুন</h3>
            <form id="examForm">
                <div class="form-group">
                    <label for="examTargetYear">লক্ষ্য বর্ষ</label>
                    <select id="examTargetYear" required>
                        ${isAdmin ? `<option value="all">সকল বর্ষ</option>` : ''}
                        ${studentYears.map(year => `<option value="${year}" ${(!isAdmin && entryUserDetails?.year === year) ? 'selected' : ''}>${convertYearToBengaliText(year)} বর্ষ</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="examDate">তারিখ <span class="text-red-600">*</span></label>
                    <input type="date" id="examDate" required>
                </div>
                <div class="form-group">
                    <label for="examSubject">পরীক্ষা/বিষয় নাম <span class="text-red-600">*</span></label>
                    <input type="text" id="examSubject" placeholder="পরীক্ষার নাম" required>
                </div>
                <div class="form-group">
                    <label for="examTime">সময় <span class="text-red-600">*</span></label>
                    <input type="text" id="examTime" placeholder="সকাল ১০টা - দুপুর ১টা" required>
                </div>
                <div class="form-group">
                    <label for="examRoom">রুম <span class="text-red-600">*</span></label>
                    <input type="text" id="examRoom" placeholder="রুম নাম্বার" required>
                </div>
                <div class="form-actions">
                     <button type="button" class="btn btn-gray" id="cancelExamForm">বাতিল</button>
                    <button type="submit" class="btn btn-primary">যোগ করুন</button>
                </div>
            </form>`;
        openModal(formModalContainer);

        const examTargetYearSelect = document.getElementById('examTargetYear');
        // Disable targetYear select and pre-select for students (non-admins)
        if (!isAdmin && entryUserDetails && entryUserDetails.year) {
            examTargetYearSelect.value = entryUserDetails.year;
            examTargetYearSelect.disabled = true;
        } else if (isCR && crYear) {
            // Pre-select CR's year for CRs, but don't disable so they can change to 'all'
            examTargetYearSelect.value = crYear;
        }


        document.getElementById('examForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newExam = {
                targetYear: examTargetYearSelect.value, // Use the value from the select element
                date: document.getElementById('examDate').value,
                subject: document.getElementById('examSubject').value,
                time: document.getElementById('examTime').value,
                room: document.getElementById('examRoom').value,
                createdBy: entryUserDetails ? `${entryUserDetails.name} (রোল: ${entryUserDetails.roll}, বর্ষ: ${entryUserDetails.year})` : 'Unknown',
                createdByUserId: userId
            };

            // Student specific restriction (applies only to non-admins)
            if (!isAdmin && entryUserDetails && newExam.targetYear !== entryUserDetails.year) {
                showCustomAlert("আপনি শুধুমাত্র আপনার নিজের বর্ষের জন্য পরীক্ষা যোগ করতে পারবেন।");
                return;
            }

            if (!newExam.date || !newExam.subject || !newExam.time || !newExam.room) {
                showCustomAlert("সকল আবশ্যকীয় (*) ঘর পূরণ করুন।");
                return;
            }

            try {
                showLoading();
                const docRef = await addDoc(collection(db, `${PUBLIC_COLLECTION_PATH}/exams`), newExam);
                closeModal(formModalContainer);
                // নতুন পরীক্ষা যোগ হলে নোটিফিকেশন দেখান
                if (Notification.permission === "granted" && (newExam.targetYear === 'all' || (entryUserDetails && newExam.targetYear === entryUserDetails.year))) {
                    displayNotification(
                        `নতুন পরীক্ষা: ${newExam.subject}`,
                        `${newExam.subject} পরীক্ষা ${formatDate(newExam.date)}-এ ${newExam.time} অনুষ্ঠিত হবে। আপনার ${convertYearToBengaliText(newExam.targetYear)} বর্ষের জন্য।`
                    );
                }
            } catch (error) {
                console.error("Error adding exam:", error);
                showCustomAlert("পরীক্ষা যোগ করতে সমস্যা হয়েছে।");
            } finally {
                hideLoading();
            }
        });
        document.getElementById('cancelExamForm').addEventListener('click', () => closeModal(formModalContainer));
    }

    let currentNoticeFilterCategory = 'সকল নোটিশ'; // State for notice filter
    function renderNoticePage(notices, filterCategory = currentNoticeFilterCategory) {
        currentNoticeFilterCategory = filterCategory; // Update global filter state
        pageContent.innerHTML = `
            <div class="page-header">
                <h2>নোটিশ বোর্ড</h2>
                ${entryUserDetails ? `<button id="addNoticeBtn" class="btn btn-primary add-new-btn">${ICONS.plus} নতুন নোটিশ</button>` : ''}
            </div>
            <div id="noticeFilters" class="filters-container"></div>
            <div id="noticeList"></div>`;

        const noticeFiltersEl = document.getElementById('noticeFilters');
        const categories = ['সকল নোটিশ', 'একাডেমিক', 'পরীক্ষা', 'ক্লাস রুটিন', 'ইভেন্ট', 'সেমিনার'];
        noticeFiltersEl.innerHTML = ''; // Clear existing filters
        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.textContent = cat;
            // Add a class for active state for styling
            if (cat === currentNoticeFilterCategory) btn.classList.add('active-filter');
            btn.addEventListener('click', () => renderNoticePage(notices, cat)); // Pass current notices and new filter
            noticeFiltersEl.appendChild(btn);
        });

        const filteredNotices = filterContentByRole(notices)
                            .sort((a,b) => new Date(b.date) - new Date(a.date)); // Sort by newest first

        const categoryFilteredNotices = currentNoticeFilterCategory === 'সকল নোটিশ' ? filteredNotices : filteredNotices.filter(n => n.category === currentNoticeFilterCategory);


        const noticeListEl = document.getElementById('noticeList');
        noticeListEl.innerHTML = '';
        if (categoryFilteredNotices.length === 0) {
            noticeListEl.innerHTML = '<p>কোনো নোটিশ নেই।</p>';
        } else {
            categoryFilteredNotices.forEach(notice => {
                const div = document.createElement('div');
                div.className = 'card';
                div.innerHTML = `
                    <span class="text-xs text-green-600 font-bold">${notice.category}</span>
                    <h4 class="card-title">${notice.title}</h4>
                    <p class="card-meta">${formatDate(notice.date)}</p>
                    <p class="card-meta">বর্ষ: ${notice.targetYear === 'all' ? 'সকল বর্ষ' : `${convertYearToBengaliText(notice.targetYear)} বর্ষ`}</p>
                    <p class="card-text">${notice.description.substring(0,150)}${notice.description.length > 150 ? '...' : ''}</p>
                    ${notice.createdBy ? `<p class="text-xs text-gray-500">যোগ করেছেন: ${notice.createdBy}</p>` : ''}
                    <div class="card-actions">
                        <button class="btn btn-info btn-sm details-btn">${ICONS.info} বিস্তারিত</button>
                        ${isSuperAdmin ? `<button class="btn btn-danger btn-sm delete-btn">${ICONS.trash} মুছুন</button>` : ''}
                    </div>`;
                div.querySelector('.details-btn').addEventListener('click', () => showDetails(notice, 'notice'));
                if (isSuperAdmin) { // Only Super Admins can delete notices
                    div.querySelector('.delete-btn').addEventListener('click', () => {
                        showCustomConfirm('আপনি কি এই নোটিশটি মুছে ফেলতে চান?', () => deleteDocument('notices', notice.id));
                    });
                }
                noticeListEl.appendChild(div);
            });
        }
        if (entryUserDetails) { // যেকোনো লগইন করা ব্যবহারকারী নোটিশ যোগ করতে পারবে
            document.getElementById('addNoticeBtn').addEventListener('click', showNoticeForm);
        }
    }

    async function showNoticeForm() {
        formModalBody.innerHTML = `
            <h3>নতুন নোটিশ যোগ করুন</h3>
            <form id="noticeForm">
                <div class="form-group">
                    <label for="noticeTargetYear">লক্ষ্য বর্ষ</label>
                    <select id="noticeTargetYear" required>
                        ${isAdmin ? `<option value="all">সকল বর্ষ</option>` : ''}
                        ${studentYears.map(year => `<option value="${year}" ${(!isAdmin && entryUserDetails?.year === year) ? 'selected' : ''}>${convertYearToBengaliText(year)} বর্ষ</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="noticeCategory">ক্যাটাগরি <span class="text-red-600">*</span></label>
                    <select id="noticeCategory" required>
                        <option value="">ক্যাটাগরি নির্বাচন করুন</option>
                        <option value="একাডেমিক">একাডেমিক</option>
                        <option value="পরীক্ষা">পরীক্ষা</option>
                        <option value="ক্লাস রুটিন">ক্লাস রুটিন</option>
                        <option value="ইভেন্ট">ইভেন্ট</option>
                        <option value="সেমিনার">সেমিনার</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="noticeDate">তারিখ <span class="text-red-600">*</span></label>
                    <input type="date" id="noticeDate" required>
                </div>
                <div class="form-group">
                    <label for="noticeTitle">শিরোনাম <span class="text-red-600">*</span></label>
                    <input type="text" id="noticeTitle" placeholder="নোটিশের শিরোনাম" required>
                </div>
                <div class="form-group">
                    <label for="noticeDescription">বর্ণনা <span class="text-red-600">*</span></label>
                    <textarea id="noticeDescription" placeholder="নোটিশের বিস্তারিত" required></textarea>
                </div>
                <div class="form-actions">
                     <button type="button" class="btn btn-gray" id="cancelNoticeForm">বাতিল</button>
                    <button type="submit" class="btn btn-primary">যোগ করুন</button>
                </div>
            </form>`;
        openModal(formModalContainer);

        const noticeTargetYearSelect = document.getElementById('noticeTargetYear');
        // Disable targetYear select and pre-select for students (non-admins)
        if (!isAdmin && entryUserDetails && entryUserDetails.year) {
            noticeTargetYearSelect.value = entryUserDetails.year;
            noticeTargetYearSelect.disabled = true;
        } else if (isCR && crYear) {
            // Pre-select CR's year for CRs, but don't disable so they can change to 'all'
            noticeTargetYearSelect.value = crYear;
        }

        document.getElementById('noticeForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newNotice = {
                targetYear: noticeTargetYearSelect.value, // Use the value from the select element
                category: document.getElementById('noticeCategory').value,
                date: document.getElementById('noticeDate').value,
                title: document.getElementById('noticeTitle').value,
                description: document.getElementById('noticeDescription').value,
                createdBy: entryUserDetails ? `${entryUserDetails.name} (রোল: ${entryUserDetails.roll}, বর্ষ: ${entryUserDetails.year})` : 'Unknown',
                createdByUserId: userId
            };

            // Student specific restriction (applies only to non-admins)
            if (!isAdmin && entryUserDetails && newNotice.targetYear !== entryUserDetails.year) {
                showCustomAlert("আপনি শুধুমাত্র আপনার নিজের বর্ষের জন্য নোটিশ যোগ করতে পারবেন।");
                return;
            }

            if (!newNotice.category || !newNotice.date || !newNotice.title || !newNotice.description) {
                showCustomAlert("সকল আবশ্যকীয় (*) ঘর পূরণ করুন।");
                return;
            }

            try {
                showLoading();
                const docRef = await addDoc(collection(db, `${PUBLIC_COLLECTION_PATH}/notices`), newNotice);
                closeModal(formModalContainer);
                 // নতুন নোটিশ যোগ হলে নোটিফিকেশন দেখান
                if (Notification.permission === "granted" && (newNotice.targetYear === 'all' || (entryUserDetails && newNotice.targetYear === entryUserDetails.year))) {
                    displayNotification(
                        `নতুন নোটিশ: ${newNotice.title}`,
                        `${newNotice.description.substring(0, 100)}... ${newNotice.targetYear === 'all' ? 'সকল বর্ষের' : `${convertYearToBengaliText(newNotice.targetYear)} বর্ষের`} জন্য।`
                    );
                }
            } catch (error) {
                console.error("Error adding notice:", error);
                showCustomAlert("নোটিশ যোগ করতে সমস্যা হয়েছে।");
            } finally {
                hideLoading();
            }
        });
        document.getElementById('cancelNoticeForm').addEventListener('click', () => closeModal(formModalContainer));
    }

    function renderStudentInfoPage(students) {
        pageContent.innerHTML = `
            <div class="page-header">
                <h2>ছাত্র-ছাত্রীদের তথ্য</h2>
                ${entryUserDetails ? `<button id="addStudentBtn" class="btn btn-primary add-new-btn">${ICONS.plus} নতুন ছাত্র যোগ করুন</button>` : ''}
            </div>
            <div id="studentList" class="grid-container"></div>`;

        const studentListEl = document.getElementById('studentList');
        studentListEl.innerHTML = '';
        if (students.length === 0) {
            studentListEl.innerHTML = '<p>কোনো ছাত্র-ছাত্রীর তথ্য নেই।</p>';
        } else {
            students.forEach(student => {
                const div = document.createElement('div');
                div.className = 'card student-card';
                // Check if the current logged-in user (based on userId) is the creator of this student profile
                // This allows students to edit their own profile
                const isPermanentStudent = student.id === PERMANENT_STUDENT_ID;
                // Super Admins can edit any student. Non-super admins (including CRs and regular students) can only edit their own profile.
                const canEditStudent = !isPermanentStudent && (isSuperAdmin || student.createdByUserId === userId);
                const canDeleteStudent = !isPermanentStudent && isSuperAdmin; // Only Super Admins can delete student profiles


                div.innerHTML = `
                    <img src="${student.imageUrl || `https://placehold.co/100x100/E0E0E0/888888?text=${encodeURIComponent(student.name.charAt(0))}`}" alt="${student.name}" onerror="this.src='https://placehold.co/100x100/E0E0E0/888888?text=${encodeURIComponent(student.name.charAt(0))}';">
                    <h4 class="card-title">${student.name}</h4>
                    ${isPermanentStudent ? `
                        <div class="developer-premium-info card-developer-info">
                            <p class="font-bold text-green-600 text-center text-sm">Developer</p>
                            <p class="text-xs text-gray-700 text-center">সেশন: ${student.session}</p>
                            <div class="flex justify-center space-x-2 mt-4">
                                ${student.instagramId ? `<a href="${student.instagramId.startsWith('http') ? student.instagramId : `https://instagram.com/${student.instagramId}`}" target="_blank" rel="noopener noreferrer" class="btn btn-info btn-sm">${ICONS.instagram} </a>` : ''}
                                ${student.email ? `<a href="mailto:${student.email}" class="btn btn-primary btn-sm">${ICONS.mail}</a>` : ''}
                            </div>
                        </div>
                    ` : `
                        <p class="card-text">রোলঃ ${convertToBengaliNumeral(student.roll)} | রেজিঃ ${convertToBengaliNumeral(student.reg)}</p>
                        <p class="card-text">বর্ষ: ${convertYearToBengaliText(student.year)} বর্ষ</p>
                        ${student.bio ? `<p class="card-text text-sm text-gray-600">${student.bio.substring(0,50)}${student.bio.length > 50 ? '...' : ''}</p>` : ''}
                        <div class="student-contact-info mt-1">
                            ${student.email ? `<div>${ICONS.mail} <a href="mailto:${student.email}">${student.email}</a></div>` : ''}
                            ${student.phone ? `<div>${ICONS.phone} <a href="tel:${student.phone}">${student.phone}</a></div>` : ''}
                            ${student.facebookId ? `<div>${ICONS.facebook} <a href="${student.facebookId.startsWith('http') ? student.facebookId : `https://facebook.com/${student.facebookId}`}" target="_blank" rel="noopener noreferrer">${student.facebookId.startsWith('http') ? 'প্রোফাইল লিংক' : student.facebookId}</a></div>` : ''}
                            ${student.instagramId ? `<div>${ICONS.instagram} <a href="${student.instagramId.startsWith('http') ? student.instagramId : `https://instagram.com/${student.instagramId}`}" target="_blank" rel="noopener noreferrer">ইনস্টাগ্রাম প্রোফাইল</a></div>` : ''}
                        </div>
                    `}
                    <div class="card-actions">
                        <button class="btn btn-info btn-sm details-btn">${ICONS.info} বিস্তারিত</button>
                        ${canEditStudent ? `<button class="btn btn-warning btn-sm edit-btn">${ICONS.edit} সম্পাদনা</button>` : ''}
                        ${canDeleteStudent ? `<button class="btn btn-danger btn-sm delete-btn">${ICONS.trash} মুছুন</button>` : ''}
                    </div>`;
                div.querySelector('.details-btn').addEventListener('click', () => showDetails(student, 'student'));
                if (canEditStudent) {
                    div.querySelector('.edit-btn').addEventListener('click', () => showStudentForm(student));
                }
                if (canDeleteStudent) {
                    div.querySelector('.delete-btn').addEventListener('click', () => {
                        showCustomConfirm('আপনি কি এই ছাত্র/ছাত্রীর তথ্য মুছে ফেলতে চান?', () => deleteDocument('students', student.id));
                    });
                }
                studentListEl.appendChild(div);
            });
        }
        if (entryUserDetails) { // যেকোনো লগইন করা ব্যবহারকারী ছাত্রের তথ্য যোগ করতে পারবে
            document.getElementById('addStudentBtn').addEventListener('click', () => showStudentForm());
        }
    }

    async function showStudentForm(studentToEdit = null) {
        currentEditingStudentId = studentToEdit ? studentToEdit.id : null;
        formModalBody.innerHTML = `
            <h3>${studentToEdit ? 'ছাত্রের তথ্য সম্পাদনা করুন' : 'নতুন ছাত্র যোগ করুন'}</h3>
            <form id="studentForm">
                <div class="form-group">
                    <label for="studentName">নাম <span class="text-red-600">*</span></label>
                    <input type="text" id="studentName" value="${studentToEdit?.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="studentRoll">রোল নাম্বার <span class="text-red-600">*</span></label>
                    <input type="text" id="studentRoll" value="${studentToEdit?.roll || ''}" required>
                </div>
                <div class="form-group">
                    <label for="studentReg">রেজিস্ট্রেশন <span class="text-red-600">*</span></label>
                    <input type="text" id="studentReg" value="${studentToEdit?.reg || ''}" required>
                </div>
                <div class="form-group">
                    <label for="studentYear">বর্ষ <span class="text-red-600">*</span></label>
                    <select id="studentYear" required>
                        <option value="">বর্ষ নির্বাচন করুন</option>
                        ${studentYears.map(year => `<option value="${year}" ${studentToEdit?.year === year ? 'selected' : ''}>${convertYearToBengaliText(year)} বর্ষ</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="studentBio">সংক্ষিপ্ত বায়ো</label>
                    <textarea id="studentBio">${studentToEdit?.bio || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="studentImageUrl">ছবির URL</label>
                    <input type="url" id="studentImageUrl" placeholder="https://example.com/image.jpg" value="${studentToEdit?.imageUrl || ''}">
                </div>
                 <div class="form-group">
                    <label for="studentEmail">ইমেইল</label>
                    <input type="email" id="studentEmail" value="${studentToEdit?.email || ''}">
                </div>
                 <div class="form-group">
                    <label for="studentPhone">ফোন</label>
                    <input type="tel" id="studentPhone" value="${studentToEdit?.phone || ''}">
                </div>
                 <div class="form-group">
                    <label for="studentFacebookId">ফেসবুক আইডি/লিংক</label>
                    <input type="text" id="studentFacebookId" value="${studentToEdit?.facebookId || ''}">
                </div>
                <div class="form-group">
                    <label for="studentInstagramId">ইনস্টাগ্রাম আইডি/লিংক</label>
                    <input type="text" id="studentInstagramId" value="${studentToEdit?.instagramId || ''}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-gray" id="cancelStudentForm">বাতিল</button>
                    <button type="submit" class="btn btn-primary">${studentToEdit ? ICONS.edit : ICONS.userCheck} ${studentToEdit ? 'আপডেট করুন' : 'তথ্য যোগ করুন'}</button>
                </div>
            </form>`;
        openModal(formModalContainer);

        document.getElementById('studentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const studentData = {
                name: document.getElementById('studentName').value,
                // Removed fatherName as per request
                roll: document.getElementById('studentRoll').value,
                reg: document.getElementById('studentReg').value,
                year: document.getElementById('studentYear').value,
                bio: document.getElementById('studentBio').value,
                imageUrl: document.getElementById('studentImageUrl').value,
                email: document.getElementById('studentEmail').value,
                phone: document.getElementById('studentPhone').value,
                facebookId: document.getElementById('studentFacebookId').value,
                instagramId: document.getElementById('studentInstagramId').value, // Save Instagram ID
                createdBy: entryUserDetails ? `${entryUserDetails.name} (রোল: ${entryUserDetails.roll}, বর্ষ: ${entryUserDetails.year})` : 'Unknown',
                createdByUserId: userId // Firebase UID is stored here
            };

            if (!studentData.name || !studentData.roll || !studentData.reg || !studentData.year) {
                showCustomAlert("সকল আবশ্যকীয় (*) ঘর পূরণ করুন।");
                return;
            }

            try {
                showLoading();
                if (currentEditingStudentId) {
                    await updateDoc(doc(db, `${PUBLIC_COLLECTION_PATH}/students`, currentEditingStudentId), studentData);
                } else {
                    await addDoc(collection(db, `${PUBLIC_COLLECTION_PATH}/students`), {
                        ...studentData,
                        developerPremium: false, // New students are not premium by default
                        session: '' // Session for new students can be empty
                    });
                }
                closeModal(formModalContainer);
            } catch (error) {
                console.error("Error saving student:", error);
                showCustomAlert("ছাত্রের তথ্য সংরক্ষণ করতে সমস্যা হয়েছে।");
            } finally {
                hideLoading();
            }
        });
        document.getElementById('cancelStudentForm').addEventListener('click', () => closeModal(formModalContainer));
    }

    async function deleteDocument(collectionName, docId) {
        // Prevent deletion of permanent student card
        if (collectionName === 'students' && docId === PERMANENT_STUDENT_ID) {
            showCustomAlert('এই ছাত্রের তথ্য মোছা যাবে না। এটি একটি স্থায়ী প্রোফাইল।');
            return;
        }

        const itemRef = doc(db, `${PUBLIC_COLLECTION_PATH}/${collectionName}`, docId);
        let itemSnap;
        try {
            itemSnap = await getDoc(itemRef);
        } catch (error) {
            console.error(`Error fetching document for deletion check:`, error);
            showCustomAlert('ডাটা লোড করতে সমস্যা হয়েছে।');
            return;
        }

        if (!itemSnap.exists()) {
            showCustomAlert('আইটেম খুঁজে পাওয়া যায়নি।');
            return;
        }

        const itemData = itemSnap.data();

        let hasPermission = false;
        if (isSuperAdmin) {
            hasPermission = true; // Super Admins can delete anything
        } else if (isAdmin && collectionName === 'posts' && itemData.createdByUserId === userId) {
            // Any admin (including CRs) can delete their own posts
            hasPermission = true;
        }

        if (hasPermission) {
            try {
                showLoading();
                await deleteDoc(itemRef);
                // No need to re-render, onSnapshot will handle it.
            } catch (error) {
                console.error(`Error deleting ${collectionName} document:`, error);
                showCustomAlert("মুছে ফেলতে সমস্যা হয়েছে।");
            } finally {
                hideLoading();
            }
        } else {
            showCustomAlert('আপনার এটি মুছে ফেলার অনুমতি নেই।');
        }
    }


    async function toggleReaction(postId) {
        if (!entryUserDetails) {
            showCustomAlert('পোস্টে রিয়্যাক্ট করতে লগইন করুন।');
            return;
        }

        try {
            showLoading();
            const postRef = doc(db, `${PUBLIC_COLLECTION_PATH}/posts`, postId);
            const postSnap = await getDoc(postRef);

            if (postSnap.exists()) {
                const post = postSnap.data();
                let reactions = post.reactions || [];

                if (reactions.includes(userId)) { // Use Firebase UID to track reactions
                    reactions = reactions.filter(id => id !== userId);
                } else {
                    reactions.push(userId);
                }
                await updateDoc(postRef, { reactions: reactions });
            }
        } catch (error) {
            console.error("Error toggling reaction:", error);
            showCustomAlert("রিয়্যাক্ট করতে সমস্যা হয়েছে।");
        } finally {
            hideLoading();
        }
    }

    async function showCommentModal(postId) {
        if (!entryUserDetails) {
            showCustomAlert('কমেন্ট দেখতে লগইন করুন।');
            return;
        }
        showLoading();
        try {
            const postRef = doc(db, `${PUBLIC_COLLECTION_PATH}/posts`, postId);
            const postSnap = await getDoc(postRef);

            if (postSnap.exists()) {
                currentPostForComments = { id: postSnap.id, ...postSnap.data() };
                if (!currentPostForComments.comments) {
                    currentPostForComments.comments = [];
                }

                commentModalBody.innerHTML = `
                    <h3>কমেন্টস</h3>
                    <div id="commentsList" class="comments-list"></div>
                    <form id="commentForm" class="comment-form mt-2">
                        <textarea id="commentText" placeholder="আপনার কমেন্ট লিখুন..." required></textarea>
                        <button type="submit" class="btn btn-primary btn-sm mt-1">কমেন্ট করুন</button>
                    </form>
                `;

                renderComments(); // Render comments initially
                openModal(commentModalContainer);

                document.getElementById('commentForm').addEventListener('submit', (e) => {
                    e.preventDefault();
                    addComment(currentPostForComments.id);
                });
            } else {
                showCustomAlert("পোস্ট খুঁজে পাওয়া যায়নি।");
            }
        } catch (error) {
            console.error("Error showing comment modal:", error);
            showCustomAlert("কমেন্ট লোড করতে সমস্যা হয়েছে।");
        } finally {
            hideLoading();
        }
    }

    async function addComment(postId) {
        if (!entryUserDetails) {
            showCustomAlert('কমেন্ট করতে লগইন করুন।');
            return;
        }

        const commentText = document.getElementById('commentText').value.trim();
        if (!commentText) {
            showCustomAlert('কমেন্ট লিখুন।');
            return;
        }

        try {
            showLoading();
            const postRef = doc(db, `${PUBLIC_COLLECTION_PATH}/posts`, postId);
            const postSnap = await getDoc(postRef);

            if (postSnap.exists()) {
                const post = postSnap.data();
                let comments = post.comments || [];
                const newComment = {
                    userId: userId, // Firebase UID is stored here
                    userName: entryUserDetails.name,
                    commentText: commentText,
                    timestamp: new Date().toISOString()
                };
                comments.push(newComment);
                await updateDoc(postRef, { comments: comments });

                document.getElementById('commentText').value = ''; // Clear input
                // Update currentPostForComments to reflect changes immediately in the modal
                currentPostForComments.comments = comments;
                renderComments(); // Re-render comments in modal
            }
        } catch (error) {
            console.error("Error adding comment:", error);
            showCustomAlert("কমেন্ট যোগ করতে সমস্যা হয়েছে।");
            console.error("Error adding comment:", error);
        } finally {
            hideLoading();
        }
    }

    function renderComments() {
        const commentsListEl = commentModalBody.querySelector('#commentsList');
        if (!commentsListEl) return;

        commentsListEl.innerHTML = '';

        if (currentPostForComments && currentPostForComments.comments.length > 0) {
            // Sort comments by timestamp, newest first
            const sortedComments = [...currentPostForComments.comments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            sortedComments.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment-item';
                commentDiv.innerHTML = `
                    <p class="comment-author"><strong>${comment.userName}</strong> <span class="text-xs text-gray-500">${formatDate(comment.timestamp)} ${formatTime(comment.timestamp)}</span></p>
                    <p class="comment-text">${comment.commentText}</p>
                `;
                commentsListEl.appendChild(commentDiv);
            });
        } else {
            commentsListEl.innerHTML = '<p class="text-center text-gray-500">কোনো কমেন্ট নেই।</p>';
        }
    }

    // --- Custom Alert/Confirm Modals (replacing native alert/confirm) ---
    function showCustomAlert(message) {
        const alertModalContainer = document.createElement('div');
        alertModalContainer.className = 'modal-container';
        alertModalContainer.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <p>${message}</p>
                <button class="btn btn-primary mt-2" id="custom-alert-ok">ওকে</button>
            </div>
        `;
        document.body.appendChild(alertModalContainer);
        openModal(alertModalContainer);

        document.getElementById('custom-alert-ok').addEventListener('click', () => {
            closeModal(alertModalContainer);
            alertModalContainer.remove();
        });
        alertModalContainer.addEventListener('click', (event) => {
            if (event.target === alertModalContainer) {
                closeModal(alertModalContainer);
                alertModalContainer.remove();
            }
        });
    }

    function showCustomConfirm(message, onConfirm) {
        const confirmModalContainer = document.createElement('div');
        confirmModalContainer.className = 'modal-container';
        confirmModalContainer.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <p>${message}</p>
                <div class="form-actions" style="justify-content: center;">
                    <button class="btn btn-gray" id="custom-confirm-cancel">বাতিল</button>
                    <button class="btn btn-danger" id="custom-confirm-ok">নিশ্চিত করুন</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModalContainer);
        openModal(confirmModalContainer);

        document.getElementById('custom-confirm-ok').addEventListener('click', () => {
            closeModal(confirmModalContainer);
            confirmModalContainer.remove();
            onConfirm();
        });
        document.getElementById('custom-confirm-cancel').addEventListener('click', () => {
            closeModal(confirmModalContainer);
            confirmModalContainer.remove();
        });
        confirmModalContainer.addEventListener('click', (event) => {
            if (event.target === confirmModalContainer) {
                closeModal(confirmModalContainer);
                confirmModalContainer.remove();
            }
        });
    }

    // --- Notification Permission Prompt Modal ---
    function showNotificationPermissionPrompt() {
        // Only show if notification permission is not granted AND it hasn't been explicitly hidden before
        const promptStatus = localStorage.getItem(NOTIFICATION_PROMPT_SHOWN_KEY);
        if (Notification.permission === "granted" || promptStatus === 'true' || promptStatus === 'denied') {
            return;
        }

        const notificationPromptModalContainer = document.createElement('div');
        notificationPromptModalContainer.className = 'modal-container';
        notificationPromptModalContainer.id = 'notification-prompt-modal';
        notificationPromptModalContainer.innerHTML = `
            <div class="modal-content" style="max-width: 450px; text-align: center;">
                <h3>নোটিফিকেশন</h3>
                <p>ক্লাস আপডেট, পরীক্ষার রিমাইন্ডার এবং গুরুত্বপূর্ণ নোটিশ পেতে নোটিফিকেশন চালু করুন।</p>
                <div class="form-actions" style="justify-content: center; margin-top: 20px;">
                    <button class="btn btn-primary" id="allow-notifications-btn">অনুমতি দিন</button>
                    <button class="btn btn-gray" id="deny-notifications-btn">পরে করুন</button>
                </div>
            </div>
        `;
        document.body.appendChild(notificationPromptModalContainer);
        openModal(notificationPromptModalContainer);

        document.getElementById('allow-notifications-btn').addEventListener('click', async () => {
            const granted = await requestNotificationPermission();
            // No custom alert here, as the modal itself handles the feedback implicitly by closing
            closeModal(notificationPromptModalContainer);
            notificationPromptModalContainer.remove();
        });

        document.getElementById('deny-notifications-btn').addEventListener('click', () => {
            localStorage.setItem(NOTIFICATION_PROMPT_SHOWN_KEY, 'denied'); // Mark as denied explicitly
            // No custom alert here, as the modal itself handles the feedback implicitly by closing
            closeModal(notificationPromptModalContainer);
            notificationPromptModalContainer.remove();
        });

        // If user closes modal without clicking a button, also mark as denied for future prompts
        notificationPromptModalContainer.addEventListener('click', (event) => {
            if (event.target === notificationPromptModalContainer) {
                localStorage.setItem(NOTIFICATION_PROMPT_SHOWN_KEY, 'denied');
                closeModal(notificationPromptModalContainer);
                notificationPromptModalContainer.remove();
            }
        });
    }


    // --- Navigation ---
    const navItems = [
        { id: 'home', label: 'হোম', icon: ICONS.home, render: () => {
            startFirestoreListener('notices', (notices) => {
                startFirestoreListener('classes', (classes) => {
                    startFirestoreListener('exams', (exams) => {
                        renderHomePage(notices, classes, exams);
                    });
                });
            });
        }},
        { id: 'class', label: 'ক্লাস', icon: ICONS.book, render: () => startFirestoreListener('classes', renderClassPage) },
        { id: 'exam', label: 'পরীক্ষা', icon: ICONS.clipboard, render: () => startFirestoreListener('exams', renderExamPage) },
        { id: 'notice', label: 'নোটিশ', icon: ICONS.bell, render: (filterCategory) => startFirestoreListener('notices', (notices) => renderNoticePage(notices, filterCategory)) },
        { id: 'studentInfo', label: 'ছাত্র', icon: ICONS.users, render: () => startFirestoreListener('students', renderStudentInfoPage) },
        { id: 'postInfo', label: 'পোস্ট', icon: ICONS.plus, render: () => startFirestoreListener('posts', renderPostPage) }
    ];

    function renderNav() {
        navContainer.innerHTML = '';
        navItems.forEach(item => {
            const btn = document.createElement('button');
            btn.id = `nav-${item.id}`;
            btn.innerHTML = `${item.icon}<span>${item.label}</span>`;
            if (item.id === currentPage) btn.classList.add('active');
            btn.addEventListener('click', () => navigateTo(item.id));
            navContainer.appendChild(btn);
        });
    }

    function navigateTo(pageId) {
        // Unsubscribe from previous page's listeners if any, before rendering new page
        Object.keys(unsubscribeListeners).forEach(key => {
            if (unsubscribeListeners[key]) {
                unsubscribeListeners[key]();
                unsubscribeListeners[key] = null; // Clear the reference
            }
            // For Firebase Auth onAuthStateChanged listener, it's global and should not be unsubscribed here.
            // Only data listeners (onSnapshot) should be managed this way.
        });

        currentPage = pageId;
        const page = navItems.find(item => item.id === pageId);
        if (page) {
            page.render();
            renderNav();
        }
    }


    // --- Post Page Functionality ---
    function renderPostPage(posts) {
        pageContent.innerHTML = `
            <div class="page-header">
                <h2>সাম্প্রতিক পোস্ট</h2>
                ${entryUserDetails ? `<button id="addPostBtn" class="btn btn-primary add-new-btn">${ICONS.plus} নতুন পোস্ট</button>` : ''}
            </div>
            <div id="postList" class="grid-container"></div>`;

        const postListEl = document.getElementById('postList');
        postListEl.innerHTML = '';
        if (posts.length === 0) {
            postListEl.innerHTML = '<p>কোনো পোস্ট নেই।</p>';
        } else {
            // Sort posts by timestamp, newest first
            const sortedPosts = [...posts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            sortedPosts.forEach(post => {
                const div = document.createElement('div');
                div.className = 'card post-card';

                // Any user can edit their own posts, Super Admins can edit any posts
                const canEditPost = entryUserDetails && (post.createdByUserId === userId || isSuperAdmin);
                // Only Super Admins can delete any post. Any admin (including CRs) can delete their own posts.
                const canDeletePost = isSuperAdmin || (isAdmin && post.createdByUserId === userId);

                // Check if the current user has reacted to this post
                const userLiked = post.reactions && post.reactions.includes(userId);

                div.innerHTML = `
                    <h4 class="card-title">${post.title}</h4>
                    ${post.imageUrl ? `<img src="${post.imageUrl}" alt="${post.title}" onerror="this.src='https://placehold.co/400x200/E0E0E0/888888?text=${encodeURIComponent(post.title)}';">` : ''}
                    <p class="card-text">${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}</p>
                    <p class="card-meta">পোস্ট করেছেন: ${post.createdBy}</p>
                    <p class="card-meta">তারিখ: ${formatDate(post.timestamp)} ${formatTime(post.timestamp)}</p>
                    <div class="post-actions">
                        <button class="btn btn-secondary btn-sm like-btn ${userLiked ? 'liked' : ''}" data-post-id="${post.id}">
                            ${ICONS.heart} <span>${post.reactions ? post.reactions.length : 0}</span>
                        </button>
                        <button class="btn btn-secondary btn-sm comment-btn" data-post-id="${post.id}">
                            ${ICONS.messageCircle} <span>${post.comments ? post.comments.length : 0}</span>
                        </button>
                        <button class="btn btn-info btn-sm details-btn" data-post-id="${post.id}">${ICONS.info} বিস্তারিত</button>
                        ${canEditPost ? `<button class="btn btn-warning btn-sm edit-btn" data-post-id="${post.id}">${ICONS.edit} সম্পাদনা</button>` : ''}
                        ${canDeletePost ? `<button class="btn btn-danger btn-sm delete-btn" data-post-id="${post.id}">${ICONS.trash} মুছুন</button>` : ''}
                    </div>`;

                div.querySelector('.details-btn').addEventListener('click', () => showDetails(post, 'post'));
                if (entryUserDetails) { // Only add listener if user is logged in
                    div.querySelector('.like-btn').addEventListener('click', () => toggleReaction(post.id));
                }
                div.querySelector('.comment-btn').addEventListener('click', () => showCommentModal(post.id));

                if (canEditPost) {
                    div.querySelector('.edit-btn').addEventListener('click', () => showPostForm(post));
                }
                if (canDeletePost) {
                    div.querySelector('.delete-btn').addEventListener('click', () => {
                        showCustomConfirm('আপনি কি এই পোস্টটি মুছে ফেলতে চান?', () => deleteDocument('posts', post.id));
                    });
                }
                postListEl.appendChild(div);
            });
        }
        if (entryUserDetails) {
            document.getElementById('addPostBtn').addEventListener('click', () => showPostForm());
        }
    }

    async function showPostForm(postToEdit = null) {
        currentEditingPostId = postToEdit ? postToEdit.id : null;
        formModalBody.innerHTML = `
            <h3>${postToEdit ? 'পোস্ট সম্পাদনা করুন' : 'নতুন পোস্ট যোগ করুন'}</h3>
            <form id="postForm">
                <div class="form-group">
                    <label for="postTitle">শিরোনাম <span class="text-red-600">*</span></label>
                    <input type="text" id="postTitle" value="${postToEdit?.title || ''}" required>
                </div>
                <div class="form-group">
                    <label for="postContent">বর্ণনা <span class="text-red-600">*</span></label>
                    <textarea id="postContent" placeholder="আপনার পোস্টের বিস্তারিত লিখুন" required>${postToEdit?.content || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="postImageUrl">ছবির URL (ঐচ্ছিক)</label>
                    <input type="url" id="postImageUrl" placeholder="https://example.com/image.jpg" value="${postToEdit?.imageUrl || ''}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-gray" id="cancelPostForm">বাতিল</button>
                    <button type="submit" class="btn btn-primary">${postToEdit ? ICONS.edit : ICONS.plus} ${postToEdit ? 'আপডেট করুন' : 'পোস্ট করুন'}</button>
                </div>
            </form>`;
        openModal(formModalContainer);

        document.getElementById('postForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const postData = {
                title: document.getElementById('postTitle').value,
                content: document.getElementById('postContent').value,
                imageUrl: document.getElementById('postImageUrl').value,
                // Reactions and comments will be handled separately, initialize empty arrays if new post
                reactions: postToEdit?.reactions || [],
                comments: postToEdit?.comments || [],
                createdBy: entryUserDetails ? `${entryUserDetails.name} (রোল: ${entryUserDetails.roll}, বর্ষ: ${entryUserDetails.year})` : 'Unknown',
                createdByUserId: userId,
                timestamp: postToEdit?.timestamp || new Date().toISOString() // Keep original timestamp if editing
            };

            if (!postData.title || !postData.content) {
                showCustomAlert("শিরোনাম এবং বর্ণনা উভয়ই পূরণ করুন।");
                return;
            }

            try {
                showLoading();
                if (currentEditingPostId) {
                    await updateDoc(doc(db, `${PUBLIC_COLLECTION_PATH}/posts`, currentEditingPostId), postData);
                } else {
                    await addDoc(collection(db, `${PUBLIC_COLLECTION_PATH}/posts`), postData);
                }
                closeModal(formModalContainer);
            } catch (error) {
                console.error("Error saving post:", error);
                showCustomAlert("পোস্ট সংরক্ষণ করতে সমস্যা হয়েছে।");
            } finally {
                hideLoading();
            }
        });
        document.getElementById('cancelPostForm').addEventListener('click', () => closeModal(formModalContainer));
    }


    // --- Entry Form ---
    function renderEntryForm() {
        entryFormContainer.innerHTML = `
            <div class="modal-content">
                <div class="entry-form-header">
                    ${ICONS.leaf}
                    <h2>উদ্ভিদবিদ্যা বিভাগে স্বাগতম</h2>
                    <p class="text-gray-600">আপনার তথ্য প্রদান করে প্রবেশ করুন।</p>
                </div>
                <form id="studentEntryForm">
                    <div class="form-group">
                        <label for="entryName">আপনার নাম <span class="text-red-600">*</span></label>
                        <input type="text" id="entryName" required>
                    </div>
                    <div class="form-group">
                        <label for="entryRoll">রোল নাম্বার <span class="text-red-600">*</span></label>
                        <input type="text" id="entryRoll" required>
                    </div>
                     <div class="form-group">
                        <label for="entryYear">আপনার বর্ষ <span class="text-red-600">*</span></label>
                        <select id="entryYear" required>
                            <option value="">বর্ষ নির্বাচন করুন</option>
                            ${studentYears.map(year => `<option value="${year}">${convertYearToBengaliText(year)} বর্ষ</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="entryReg">রেজিস্ট্রেশন (শেষ ৪ সংখ্যা) <span class="text-red-600">*</span></label>
                        <input type="text" id="entryReg" maxlength="4" pattern="\\d{4}" title="অনুগ্রহ করে রেজিস্ট্রেশন নাম্বারের শেষ ৪টি সংখ্যা দিন।" required>
                    </div>
                    <div class="form-group flex items-center mt-2">
                        <input type="checkbox" id="loginAsAdmin" class="mr-2">
                        <label for="loginAsAdmin" class="font-bold">অ্যাডমিন হিসেবে লগইন করুন</label>
                    </div>
                    <div id="adminLoginFields" style="display: none;">
                        <div class="form-group">
                            <label for="adminEmail">অ্যাডমিন ইমেইল</label>
                            <input type="email" id="adminEmail">
                        </div>
                        <div class="form-group">
                            <label for="adminPassword">পাসওয়ার্ড</label>
                            <input type="password" id="adminPassword">
                        </div>
                    </div>
                    <p id="entryError" class="error-message" style="display:none;"></p>
                    <button type="submit" class="btn btn-primary" style="width:100%; margin-top:10px;">${ICONS.login} প্রবেশ করুন</button>
                </form>
            </div>`;

        const studentEntryForm = document.getElementById('studentEntryForm');
        const entryErrorEl = document.getElementById('entryError');
        const loginAsAdminCheckbox = document.getElementById('loginAsAdmin');
        const adminLoginFields = document.getElementById('adminLoginFields');
        const adminEmailInput = document.getElementById('adminEmail'); // Changed from adminUsernameInput
        const adminPasswordInput = document.getElementById('adminPassword');

        loginAsAdminCheckbox.addEventListener('change', () => {
            if (loginAsAdminCheckbox.checked) {
                adminLoginFields.style.display = 'block';
                // Make student fields optional when admin login is checked
                document.getElementById('entryName').removeAttribute('required');
                document.getElementById('entryRoll').removeAttribute('required');
                document.getElementById('entryYear').removeAttribute('required');
                document.getElementById('entryReg').removeAttribute('required');

                adminEmailInput.setAttribute('required', 'true');
                adminPasswordInput.setAttribute('required', 'true');
            } else {
                adminLoginFields.style.display = 'none';
                document.getElementById('entryName').setAttribute('required', 'true');
                document.getElementById('entryRoll').setAttribute('required', 'true');
                document.getElementById('entryYear').setAttribute('required', 'true');
                document.getElementById('entryReg').setAttribute('required', 'true');

                adminEmailInput.removeAttribute('required');
                adminPasswordInput.removeAttribute('required');
                adminEmailInput.value = '';
                adminPasswordInput.value = '';
            }
        });

        studentEntryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            let name, roll, year, regLast4;
            let role = 'student';
            let designation = ''; // Store designation for admin roles
            let currentUserId = auth.currentUser ? auth.currentUser.uid : crypto.randomUUID(); // Default to anonymous UID or a random one

            if (loginAsAdminCheckbox.checked) {
                const adminEmail = adminEmailInput.value.trim();
                const adminPass = adminPasswordInput.value.trim();

                if (!adminEmail || !adminPass) {
                    entryErrorEl.textContent = 'অ্যাডমিন ইমেইল এবং পাসওয়ার্ড আবশ্যক।';
                    entryErrorEl.style.display = 'block';
                    return;
                }

                try {
                    showLoading();
                    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPass);
                    currentUserId = userCredential.user.uid; // Use Firebase Auth UID
                    const matchedAdmin = ADMIN_ROLES_MAP[adminEmail];

                    if (matchedAdmin) {
                        role = 'admin';
                        name = matchedAdmin.designation;
                        designation = matchedAdmin.designation;
                        roll = '';
                        year = matchedAdmin.year || '';
                        regLast4 = '';
                        entryErrorEl.style.display = 'none';
                    } else {
                        // User logged in via Firebase Auth, but not recognized as an admin by our map
                        // This case implies an unknown email/password user logged in
                        showCustomAlert("আপনার অ্যাকাউন্টটি অ্যাডমিন হিসাবে চিহ্নিত করা যায়নি। সাধারণ ব্যবহারকারী হিসাবে প্রবেশ করছেন।");
                        role = 'student'; // Fallback to student role if admin email not in map
                        name = userCredential.user.email; // Use email as name
                        roll = '';
                        year = '';
                        regLast4 = '';
                        designation = 'Student'; // This is a safe fallback
                    }
                } catch (error) {
                    console.error("Firebase Admin Login Error:", error);
                    entryErrorEl.textContent = 'অ্যাডমিন লগইন ব্যর্থ হয়েছে। ভুল ইমেইল বা পাসওয়ার্ড।';
                    entryErrorEl.style.display = 'block';
                    hideLoading();
                    return;
                } finally {
                    hideLoading();
                }

            } else { // Student login flow
                 name = document.getElementById('entryName').value.trim();
                 roll = document.getElementById('entryRoll').value.trim();
                 year = document.getElementById('entryYear').value.trim();
                 regLast4 = document.getElementById('entryReg').value.trim();
                 designation = 'Student'; // Default designation for students

                 if (!name || !roll || !year || !regLast4) {
                    entryErrorEl.textContent = 'সকল তথ্য পূরণ করুন।';
                    entryErrorEl.style.display = 'block';
                    return;
                }
                if (regLast4.length !== 4 || !/^\d{4}$/.test(regLast4)) {
                    entryErrorEl.textContent = 'রেজিস্ট্রেশন নাম্বারের শেষ ৪টি সংখ্যা সঠিকভাবে দিন।';
                    entryErrorEl.style.display = 'block';
                    return;
                }
                entryErrorEl.style.display = 'none';

                // Ensure an anonymous user is signed in for Firestore
                if (!auth.currentUser) {
                    try {
                        showLoading();
                        const userCredential = await signInAnonymously(auth);
                        currentUserId = userCredential.user.uid;
                    } catch (error) {
                        console.error("Anonymous Sign-in Error:", error);
                        showCustomAlert("সাধারণ ব্যবহারকারী হিসাবে প্রবেশ করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ বা কনফিগারেশন পরীক্ষা করুন।");
                        hideLoading();
                        return;
                    } finally {
                        hideLoading();
                    }
                } else {
                    currentUserId = auth.currentUser.uid;
                }

                // Save student's profile to Firestore
                try {
                    await setDoc(doc(db, `${PUBLIC_COLLECTION_PATH}/user_profiles`, currentUserId), {
                        name: name,
                        roll: roll,
                        year: year,
                        regLast4: regLast4,
                        role: 'student', // Explicitly set role
                        designation: 'Student', // Explicitly set designation
                        createdBy: 'Self-Registered',
                        createdByUserId: currentUserId,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    console.error("Error saving student profile to Firestore:", error);
                    showCustomAlert("আপনার প্রোফাইল সংরক্ষণ করতে সমস্যা হয়েছে।");
                    hideLoading();
                    return;
                }
            }

            // Update global userId and other flags AFTER successful authentication
            userId = currentUserId; // Set the global userId to the Firebase UID
            entryUserDetails = { name, roll, year, regLast4, role, id: userId, designation: designation };
            localStorage.setItem('entryFormSubmitted', JSON.stringify(entryUserDetails));

            // Re-evaluate admin roles based on the authenticated user's email
            const currentUserEmail = auth.currentUser?.email;
            const adminRoleDetails = ADMIN_ROLES_MAP[currentUserEmail]; // This can be undefined for non-admin emails

            if (adminRoleDetails) { // Only proceed if adminRoleDetails is a valid object
                isAdmin = true;
                const currentDesignation = adminRoleDetails.designation || ''; // Ensure it's a string
                isSuperAdmin = (currentDesignation === 'Department Head' || currentDesignation === 'Default Admin');
                isCR = currentDesignation.includes('CR');
                crYear = isCR ? adminRoleDetails.year || '' : ''; // Safely access year
                entryUserDetails.role = 'admin';
                entryUserDetails.id = userId;
                entryUserDetails.designation = currentDesignation;
                entryUserDetails.year = crYear;
                localStorage.setItem('entryFormSubmitted', JSON.stringify(entryUserDetails));
            } else {
                // Regular (or anonymous) user
                isAdmin = false;
                isSuperAdmin = false;
                isCR = false;
                crYear = '';
                // If previously admin from localStorage but now not recognized by Firebase Auth (e.g., email changed or role removed), reset to student.
                if (entryUserDetails.role === 'admin') {
                    entryUserDetails.role = 'student';
                    entryUserDetails.designation = 'Student';
                    entryUserDetails.id = userId; // Update ID to current anonymous UID
                    entryUserDetails.year = entryUserDetails.year || ''; // Keep existing year if any, otherwise empty
                    localStorage.setItem('entryFormSubmitted', JSON.stringify(entryUserDetails));
                }
            }

            initializeAppUI();
        });
    }

    function initializeAppUI() {
        closeModal(entryFormContainer);
        appContainer.style.display = 'block';
        // Display userId (Firebase Auth UID)
        // Ensure entryUserDetails is available before accessing its properties
        if (entryUserDetails) {
            // Updated line: Use convertYearToBengaliText for year and convertToBengaliNumeral for roll
            userWelcomeInfo.textContent = `স্বাগতম: ${entryUserDetails.name} ${entryUserDetails.roll ? `(রোল: ${convertToBengaliNumeral(entryUserDetails.roll)})` : ''}${entryUserDetails.year ? `, বর্ষ: ${convertYearToBengaliText(entryUserDetails.year)}` : ''}${isAdmin ? ` (${entryUserDetails.designation})` : ''}`;
        } else {
            // Fallback if somehow entryUserDetails is not set (should not happen with current logic)
            userWelcomeInfo.textContent = `স্বাগতম: ব্যবহারকারী`; // Removed ID from fallback too
        }
        renderNav();
        navigateTo('home');
        // Show notification permission prompt after UI is initialized, if applicable
        showNotificationPermissionPrompt();
    }

    // --- Initial Load & Firebase Authentication ---
    async function initFirebaseAndAuth() {
        try {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);

            // Listen for auth state changes
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    // Firebase user exists (either from custom token, email/password, or anonymous)
                    userId = user.uid; // Always use the Firebase UID for all Firestore operations

                    const storedUserDetails = localStorage.getItem('entryFormSubmitted');
                    if (storedUserDetails) {
                        entryUserDetails = JSON.parse(storedUserDetails);
                        // Re-evaluate admin roles based on the authenticated user's email
                        const currentUserEmail = user.email; // Email will be null for anonymous users
                        const adminRoleDetails = ADMIN_ROLES_MAP[currentUserEmail]; // This can be undefined

                        if (adminRoleDetails) { // If adminRoleDetails is a valid object
                            isAdmin = true;
                            const currentDesignation = adminRoleDetails.designation || ''; // Ensure it's a string
                            isSuperAdmin = (currentDesignation === 'Department Head' || currentDesignation === 'Default Admin');
                            isCR = currentDesignation.includes('CR');
                            crYear = isCR ? adminRoleDetails.year || '' : ''; // Safely access year
                            entryUserDetails.role = 'admin'; // Update stored role if it was student but now Firebase user is admin
                            entryUserDetails.id = userId; // Ensure stored ID is Firebase UID
                            entryUserDetails.designation = currentDesignation;
                            entryUserDetails.year = crYear;
                            localStorage.setItem('entryFormSubmitted', JSON.stringify(entryUserDetails));
                        } else {
                            // Regular (or anonymous) user
                            isAdmin = false;
                            isSuperAdmin = false;
                            isCR = false;
                            crYear = '';
                            // Attempt to load student profile from Firestore if they are a registered student (not just anonymous)
                            const userProfileRef = doc(db, `${PUBLIC_COLLECTION_PATH}/user_profiles`, userId);
                            const userProfileSnap = await getDoc(userProfileRef);

                            if (userProfileSnap.exists()) {
                                // If a profile exists for this UID, update entryUserDetails with it
                                const profileData = userProfileSnap.data();
                                entryUserDetails = {
                                    name: profileData.name,
                                    roll: profileData.roll,
                                    year: profileData.year,
                                    regLast4: profileData.regLast4,
                                    role: 'student',
                                    id: userId,
                                    designation: 'Student'
                                };
                                localStorage.setItem('entryFormSubmitted', JSON.stringify(entryUserDetails));
                            } else if (entryUserDetails.role === 'admin') {
                                // If localStorage said 'admin' but no matching Firebase Auth or user_profile, revert to default student
                                entryUserDetails.role = 'student';
                                entryUserDetails.designation = 'Student';
                                entryUserDetails.id = userId; // Update ID to current anonymous UID
                                entryUserDetails.year = entryUserDetails.year || ''; // Keep existing year if any, otherwise empty
                                localStorage.setItem('entryFormSubmitted', JSON.stringify(entryUserDetails));
                            }
                        }
                    } else {
                        // No user details in localStorage, even though Firebase Auth has a user.
                        // Check if a user_profile exists for this UID (e.g., if localStorage was cleared)
                        const userProfileRef = doc(db, `${PUBLIC_COLLECTION_PATH}/user_profiles`, user.uid);
                        const userProfileSnap = await getDoc(userProfileRef);

                        if (userProfileSnap.exists()) {
                            // Load profile from Firestore
                            const profileData = userProfileSnap.data();
                            entryUserDetails = {
                                name: profileData.name,
                                roll: profileData.roll,
                                year: profileData.year,
                                regLast4: profileData.regLast4,
                                role: 'student',
                                id: user.uid,
                                designation: 'Student'
                            };
                            localStorage.setItem('entryFormSubmitted', JSON.stringify(entryUserDetails));
                            // Also check if this user is an admin via email (for cases where they might have a student profile AND an admin email)
                            const currentUserEmail = user.email;
                            const adminRoleDetails = ADMIN_ROLES_MAP[currentUserEmail];
                            if (adminRoleDetails) {
                                isAdmin = true;
                                const currentDesignation = adminRoleDetails.designation || '';
                                isSuperAdmin = (currentDesignation === 'Department Head' || currentDesignation === 'Default Admin');
                                isCR = currentDesignation.includes('CR');
                                crYear = isCR ? adminRoleDetails.year || '' : '';
                                entryUserDetails.role = 'admin';
                                entryUserDetails.designation = currentDesignation;
                                entryUserDetails.year = crYear;
                                localStorage.setItem('entryFormSubmitted', JSON.stringify(entryUserDetails));
                            }
                            initializeAppUI();
                        } else {
                            // No stored details in localStorage and no profile in Firestore for this UID
                            // Force showing the entry form to collect details.
                            renderEntryForm();
                            openModal(entryFormContainer);
                            return; // Stop further UI initialization until form is submitted
                        }
                    }

                    // Initialize the UI only after everything is set
                    initializeAppUI();
                } else {
                    // No Firebase user signed in initially.
                    // If no user details in localStorage, show entry form immediately.
                    const storedUserDetailsOnLoad = localStorage.getItem('entryFormSubmitted');
                    if (!storedUserDetailsOnLoad) {
                         renderEntryForm();
                         openModal(entryFormContainer);
                    } else {
                        // If stored details exist but no Firebase user, attempt anonymous sign-in
                        try {
                            // If a token from Canvas environment is provided, try that first.
                            if (typeof __initial_auth_token !== 'undefined') {
                                await signInWithCustomToken(auth, __initial_auth_token);
                            } else {
                                await signInAnonymously(auth);
                            }
                        } catch (error) {
                            console.error("Firebase initialization or anonymous sign-in failed:", error);
                            showCustomAlert("অ্যাপ শুরু করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ বা Firebase কনফিগারেশন পরীক্ষা করুন।");
                             renderEntryForm(); // Show form as fallback
                             openModal(entryFormContainer);
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Error during Firebase initialization:", error);
            showCustomAlert("Firebase শুরু করতে সমস্যা হয়েছে। আপনার Firebase কনফিগারেশন সঠিক আছে কিনা নিশ্চিত করুন।");
             renderEntryForm(); // Show entry form as fallback
             openModal(entryFormContainer);
        }
    }

    // Call the async initialization function
    initFirebaseAndAuth();

    // --- Initialize `userId` and `isAdmin` from `localStorage` on initial load BEFORE Firebase auth completes --
    // This is important for ensuring the UI components (like add buttons) are rendered correctly even before Firebase Auth finishes its handshake.
    const storedUserDetailsOnLoad = localStorage.getItem('entryFormSubmitted');
    if (storedUserDetailsOnLoad) {
        entryUserDetails = JSON.parse(storedUserDetailsOnLoad);
        // userId here will be the ID stored in localStorage, which might be a crypto.randomUUID for previous guests
        // or ADMIN_USER_ID for previous admins, or a Firebase UID if anonymous auth happened previously.
        // It will be updated by onAuthStateChanged with the actual Firebase UID later.
        userId = entryUserDetails.id;
        // Re-evaluate admin roles based on the stored email (if any)
        const storedEmail = entryUserDetails.email; // Assuming email might be stored for admin entries
        const adminRoleDetails = ADMIN_ROLES_MAP[storedEmail]; // This can be undefined for non-admin emails

        isAdmin = (adminRoleDetails !== undefined); // Set isAdmin based on existence in map

        if (isAdmin) { // Only evaluate these if isAdmin is true, meaning adminRoleDetails is an object
            const currentDesignation = adminRoleDetails.designation || ''; // Ensures currentDesignation is always a string
            isSuperAdmin = (currentDesignation === 'Department Head' || currentDesignation === 'Default Admin');
            isCR = currentDesignation.includes('CR');
            crYear = isCR ? adminRoleDetails.year || '' : ''; // Safely access year too
        } else {
            // Ensure non-admin flags are false
            isSuperAdmin = false;
            isCR = false;
            crYear = '';
        }

        // If app is reloaded and entryUserDetails exists, show app immediately. Firebase auth will catch up.
        initializeAppUI(); // Changed to immediately show UI if stored details exist
    } else {
        // If no stored details, show entry form immediately. Firebase auth will also be initializing in background.
        renderEntryForm();
        openModal(entryFormContainer);
    }
});
