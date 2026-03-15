// Render/static hosting config. Fill these values from Firebase project settings.
window.FIREBASE_CONFIG = {
    apiKey: "AIzaSyCJUOtcne5Y2WTW4vmNxfmzM9Dwmm3mZIU",
    authDomain: "general-nstp-attendance.firebaseapp.com",
    projectId: "general-nstp-attendance",
    storageBucket: "general-nstp-attendance.firebasestorage.app",
    messagingSenderId: "279254627564",
    appId: "1:279254627564:web:0bd8639e5ee93114caa1c9"
};

// Keep this constant across all users so shared documents are consistent.
window.APP_ID = "evsu-nstp-attendance";

// Only these email addresses can access the admin dashboard and write to Firestore.
window.ADMIN_EMAILS = [
    "acostajohncarl33@gmail.com"
];
