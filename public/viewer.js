import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { initializeFirestore, doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const THEME_KEY = 'app_theme';

const applyTheme = (theme) => {
    const next = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch (err) { /* ignore */ }
    const icon = document.getElementById('viewerThemeIcon');
    const label = document.getElementById('viewerThemeLabel');
    if (icon) icon.innerText = next === 'dark' ? 'light_mode' : 'dark_mode';
    if (label) label.innerText = next === 'dark' ? 'Light' : 'Dark';
};

const initThemeToggle = () => {
    const btn = document.getElementById('viewerThemeToggle');
    if (btn) {
        btn.addEventListener('click', () => {
            const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
            applyTheme(current === 'dark' ? 'light' : 'dark');
        });
    }
    const saved = typeof localStorage !== 'undefined' ? (localStorage.getItem(THEME_KEY) || 'light') : 'light';
    applyTheme(saved);
};

const initQuickActions = () => {
    const quickActions = document.getElementById('viewerQuickActions');
    const searchFab = document.getElementById('viewerSearchFab');
    const topFab = document.getElementById('viewerTopFab');
    const searchInput = document.getElementById('searchBox');
    if (!quickActions || !searchFab || !topFab || !searchInput) return;

    const toggleVisibility = () => {
        const show = window.scrollY > 420;
        quickActions.classList.toggle('is-visible', show);
        quickActions.setAttribute('aria-hidden', show ? 'false' : 'true');
    };

    window.addEventListener('scroll', toggleVisibility, { passive: true });
    toggleVisibility();

    searchFab.addEventListener('click', () => {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    topFab.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
};

const injectedFirebaseConfig = typeof window !== 'undefined' ? window.FIREBASE_CONFIG : undefined;
const appId = typeof window !== 'undefined' && window.APP_ID ? window.APP_ID : 'evsu-nstp-attendance';

const firebaseConfig = (() => {
    if (!injectedFirebaseConfig) return null;
    try {
        return typeof injectedFirebaseConfig === 'string' ? JSON.parse(injectedFirebaseConfig) : injectedFirebaseConfig;
    } catch (err) {
        console.error('Invalid Firebase config format:', err);
        return null;
    }
})();

const SHARED_DOC_KEYS = { state: 'daily_state', records: 'daily_records' };

let students = [];
let attendanceData = {};
let contributionNotes = {};
let categoryMap = {};
let isViewingRecord = false;

const setStatus = (msg, isError = false) => {
    const el = document.getElementById('statusMsg');
    el.innerText = msg;
    el.classList.remove('text-yellow-300', 'text-green-300', 'text-red-400');
    el.classList.add(isError ? 'text-red-400' : 'text-green-300');
};

const setActionMsg = (msg) => {
    document.getElementById('cloudActionMsg').innerText = msg;
};

const normalizeContributionEntry = (entry) => {
    if (typeof entry === 'string') return { status: '', details: entry };
    if (!entry || typeof entry !== 'object') return { status: '', details: '' };
    return {
        status: typeof entry.status === 'string' ? entry.status : '',
        details: typeof entry.details === 'string' ? entry.details : ''
    };
};

const getStateRef = (db) => doc(db, 'artifacts', appId, 'public_data', SHARED_DOC_KEYS.state);
const getRecordsDocRef = (db) => doc(db, 'artifacts', appId, 'public_data', SHARED_DOC_KEYS.records);

const applyPayload = (payload) => {
    if (!payload || typeof payload !== 'object') return;

    if (Array.isArray(payload.students) && payload.students.length > 0) {
        students = payload.students
            .map((student, index) => ({
                id: Number.isFinite(student?.id) ? Number(student.id) : (index + 1),
                name: String(student?.name || '').trim(),
                category: String(student?.category || 'Team Members').trim() || 'Team Members'
            }))
            .filter(student => student.name.length > 0);
    }

    attendanceData = payload.attendanceData || {};
    contributionNotes = payload.contributionNotes || {};
    categoryMap = payload.categories || {};

    students = students.map(student => ({
        ...student,
        category: categoryMap[student.id] || student.category
    }));

    document.getElementById('updatedAt').innerText = payload.updatedAtIso || '--';
};

const renderTable = () => {
    const queryText = document.getElementById('searchBox').value.toLowerCase();
    const filtered = students.filter(s => s.name.toLowerCase().includes(queryText));
    const tbody = document.getElementById('tableBody');

    tbody.innerHTML = filtered.map(s => {
        const present = !!attendanceData[s.id];
        const note = normalizeContributionEntry(contributionNotes[s.id]);
        const noteText = [note.status, note.details].filter(Boolean).join(' - ') || '-';

        return `
            <tr>
                <td data-label="Name" class="px-6 py-4 font-medium">${s.name}</td>
                <td data-label="Assignment" class="px-6 py-4 text-center">${s.category}</td>
                <td data-label="Status" class="px-6 py-4 text-center">
                    <span class="status-chip ${present ? 'present' : 'absent'} px-4 py-1 rounded-full text-xs font-bold">${present ? 'Present' : 'Absent'}</span>
                </td>
                <td data-label="Contribution" class="px-6 py-4 text-sm text-slate-700">${noteText}</td>
            </tr>
        `;
    }).join('');

    const presentCount = Object.values(attendanceData).filter(v => v === true).length;
    document.getElementById('presentCount').innerText = presentCount;
    document.getElementById('totalCount').innerText = students.length;
    document.getElementById('rateCount').innerText = students.length ? ((presentCount / students.length) * 100).toFixed(1) + '%' : '0%';
};

const refreshRecordOptions = async (db) => {
    const select = document.getElementById('recordSelect');
    const snap = await getDoc(getRecordsDocRef(db));
    const options = ['<option value="">Select saved record...</option>'];

    const recordsMap = snap.exists() ? (snap.data().records || {}) : {};
    const sortedRecords = Object.entries(recordsMap)
        .sort((a, b) => (b[1].savedAtMs || 0) - (a[1].savedAtMs || 0))
        .slice(0, 100);

    sortedRecords.forEach(([recordId, data]) => {
        options.push(`<option value="${recordId}">${data.savedAtLabel || recordId}</option>`);
    });

    select.innerHTML = options.join('');
};

const init = async () => {
    initThemeToggle();
    initQuickActions();
    document.getElementById('searchBox').addEventListener('input', renderTable);

    if (!firebaseConfig) {
        setStatus('Cloud unavailable: missing firebase-config.js values', true);
        renderTable();
        return;
    }

    const app = initializeApp(firebaseConfig);
    const db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
        useFetchStreams: false
    });

    await refreshRecordOptions(db);

    document.getElementById('loadRecordBtn').addEventListener('click', async () => {
        const recordId = document.getElementById('recordSelect').value;
        if (!recordId) {
            setActionMsg('Please choose a record first');
            return;
        }

        const recordsSnap = await getDoc(getRecordsDocRef(db));
        const recordsMap = recordsSnap.exists() ? (recordsSnap.data().records || {}) : {};
        const recordData = recordsMap[recordId];

        if (!recordData) {
            setActionMsg('Record not found');
            return;
        }

        isViewingRecord = true;
        applyPayload(recordData);
        renderTable();
        setActionMsg(`Viewing record: ${recordData.savedAtLabel || recordId}`);
        setStatus('Viewing historical record');
    });

    document.getElementById('returnLiveBtn').addEventListener('click', async () => {
        isViewingRecord = false;
        const liveSnap = await getDoc(getStateRef(db));
        if (liveSnap.exists()) {
            applyPayload(liveSnap.data());
            renderTable();
        }
        setActionMsg('Returned to live cloud state');
    });

    onSnapshot(getStateRef(db), (docSnap) => {
        if (!isViewingRecord && docSnap.exists()) {
            applyPayload(docSnap.data());
            renderTable();
            setStatus('Cloud Sync Active');
        }
    }, (error) => {
        console.error(error);
        setStatus(`Cloud read failed: ${error.code || 'unknown-error'}`, true);
    });
};

init();
