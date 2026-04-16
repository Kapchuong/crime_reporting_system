// auth.js - Complete authentication module

// Wait for Firebase to be ready
function waitForFirebase() {
    return new Promise((resolve) => {
        if (window.firebase && window.firebase.auth) {
            resolve(true);
            return;
        }
        
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (window.firebase && window.firebase.auth) {
                clearInterval(interval);
                resolve(true);
            } else if (attempts > 20) {
                clearInterval(interval);
                console.warn('Firebase not loaded after 2 seconds');
                resolve(false);
            }
        }, 100);
    });
}

// Check authentication and redirect
async function checkAuth() {
    const ready = await waitForFirebase();
    if (!ready) {
        console.warn('Firebase not ready, using local fallback');
        return;
    }
    
    const currentPage = window.location.pathname.split('/').pop();
    const publicPages = ['index.html', 'login.html', 'register.html', 'unauthorized.html'];
    
    if (publicPages.includes(currentPage)) return;
    
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            const localUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
            if (localUser) {
                // Check local user role
                const users = JSON.parse(localStorage.getItem('localUsers') || '[]');
                const userData = users.find(u => u.uid === localUser.uid);
                if (userData && checkRoleAccess(userData.role, currentPage)) {
                    return;
                }
            }
            window.location.href = 'login.html';
        } else {
            try {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const userRole = userDoc.data().role;
                    if (!checkRoleAccess(userRole, currentPage)) {
                        window.location.href = 'unauthorized.html';
                    }
                }
            } catch (error) {
                console.error('Error checking user role:', error);
            }
        }
    });
}

function checkRoleAccess(role, page) {
    if (page === 'citizen-dashboard.html' && role !== 'citizen') return false;
    if (page === 'police-dashboard.html' && role !== 'police') return false;
    if (page === 'admin-dashboard.html' && role !== 'admin') return false;
    return true;
}

// Logout function
window.logout = async function() {
    try {
        if (window.firebase && window.firebase.auth) {
            await firebase.auth().signOut();
        }
        localStorage.removeItem('currentUser');
        window.location.href = '../index.html';
    } catch (error) {
        console.error('Logout error:', error);
        localStorage.removeItem('currentUser');
        window.location.href = '../index.html';
    }
};

// Helper functions
function getErrorMessage(errorCode) {
    const errors = {
        'auth/email-already-in-use': 'This email is already registered',
        'auth/invalid-email': 'Please enter a valid email address',
        'auth/weak-password': 'Password should be at least 6 characters',
        'auth/user-not-found': 'No account found with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/too-many-requests': 'Too many attempts. Try again later'
    };
    return errors[errorCode] || 'An error occurred. Please try again';
}

window.getErrorMessage = getErrorMessage;
window.checkAuth = checkAuth;
window.waitForFirebase = waitForFirebase;

// Initialize auth check on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});