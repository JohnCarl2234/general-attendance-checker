import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { initializeFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = typeof window !== 'undefined' ? window.FIREBASE_CONFIG : null;
const appId = typeof window !== 'undefined' && window.APP_ID ? window.APP_ID : 'evsu-nstp-attendance';
const statusEl = document.getElementById('loginStatus');
const form = document.getElementById('loginForm');
const themeKey = 'app_theme';

const applyTheme = (theme) => {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    localStorage.setItem(themeKey, next);
    const icon = document.getElementById('loginThemeIcon');
    if (icon) icon.innerText = next === 'dark' ? 'light_mode' : 'dark_mode';
};

const initThemeToggle = () => {
    const btn = document.getElementById('loginThemeToggle');
    if (btn) {
        btn.addEventListener('click', () => {
            const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });
    }
    const saved = localStorage.getItem(themeKey) || 'dark';
    applyTheme(saved);
};

const setStatus = (message, isError = false) => {
    statusEl.innerText = message;
    statusEl.classList.remove('text-slate-500', 'text-red-600', 'text-green-700');
    statusEl.classList.add(isError ? 'text-red-600' : 'text-slate-500');
};

initThemeToggle();

if (!firebaseConfig) {
    setStatus('Missing Firebase configuration. Update firebase-config.js first.', true);
} else {
    const app = initializeApp(firebaseConfig);
    const db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        useFetchStreams: false
    });
    const auth = getAuth(app);
    const adminGateRef = doc(db, 'artifacts', appId, 'private_data', 'admin_gate');

    const verifyAdminAccess = async () => {
        try {
            // If this read is denied, Firestore rules rejected admin access.
            await getDoc(adminGateRef);
            return true;
        } catch (error) {
            if (error?.code === 'permission-denied') {
                return false;
            }
            throw error;
        }
    };

    onAuthStateChanged(auth, async (user) => {
        if (!user) return;

        try {
            const isAdmin = await verifyAdminAccess();
            if (!isAdmin) {
                await signOut(auth);
                setStatus('This account is not authorized for admin access.', true);
                return;
            }

            window.location.replace('./main.html');
        } catch (error) {
            console.error(error);
            setStatus(`Authorization check failed: ${error.code || 'unknown-error'}`, true);
        }
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        try {
            setStatus('Signing in...');
            await setPersistence(auth, browserLocalPersistence);
            await signInWithEmailAndPassword(auth, email, password);
            setStatus('Login successful. Redirecting...');
        } catch (error) {
            console.error(error);
            setStatus(`Login failed: ${error.code || 'unknown-error'}`, true);
        }
    });
}
