const firebaseConfig = {
  apiKey: "AIzaSyCr9f1gTrP5nTEJ9RHg-vIpEQQRH_Dm96E",
  authDomain: "crime-reporting-system-939aa.firebaseapp.com",
  projectId: "crime-reporting-system-939aa",
  storageBucket: "crime-reporting-system-939aa.appspot.com",
  messagingSenderId: "890706417373",
  appId: "1:890706417373:web:22b6aaf7f074aec231ad34"
};

// Guard against missing Firebase SDK (file:// or broken script load)
if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded. Use a local HTTP server or check CDN script tags.');
} else {
    // Initialize Firebase only once
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }

    // Initialize services
    const auth = firebase.auth();
    const db = firebase.firestore();
    const storage = firebase.storage();
    // const functions = firebase.functions().region('us-central1');

    // Use emulator if running locally
    if (window.location.hostname === 'localhost') {
        // functions.useEmulator('localhost', 5001);
        console.log('Firebase functions emulator enabled on localhost:5001');
    }

    // Make them globally available
    window.auth = auth;
    window.db = db;
    window.storage = storage;
    // window.functions = functions;

    // Enable offline persistence
    db.enablePersistence({ experimentalForceOwningTab: true }).catch(err => {
        if (err.code !== 'failed-precondition') {
            console.warn('Persistence error:', err.code);
        }
    });

    console.log('Firebase initialized successfully');
}

