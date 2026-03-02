// Firebase Configuration for codenprofit
const firebaseConfig = {
  apiKey: "AIzaSyC1Ps2vP8ilQNPp9zeaxP9sGBglGVKBSPM",
  authDomain: "codenprofit-17152.firebaseapp.com",
  projectId: "codenprofit-17152",
  storageBucket: "codenprofit-17152.firebasestorage.app",
  messagingSenderId: "340619486766",
  appId: "1:340619486766:web:4600dd0ce05467c46ba1bf",
  measurementId: "G-0KMHJ2Z0PP"
};

// Initialize Firebase
let app, auth, db, storage, analytics;
let isFirebaseInitialized = false;

// Check if Firebase SDK is loaded
if (typeof firebase !== 'undefined') {
  try {
    if (!firebase.apps.length) {
      app = firebase.initializeApp(firebaseConfig);
    } else {
      app = firebase.apps[0];
    }
    
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    
    // Initialize Analytics if available
    if (typeof firebase.analytics !== 'undefined') {
      analytics = firebase.analytics();
    }
    
    // Enable offline persistence
    db.enablePersistence({ synchronizeTabs: true })
      .catch(err => {
        if (err.code === 'failed-precondition') {
          console.warn('Multiple tabs open, persistence enabled in single tab only');
        } else if (err.code === 'unimplemented') {
          console.warn('Browser doesn\'t support persistence');
        }
      });
    
    isFirebaseInitialized = true;
    console.log('✅ Firebase initialized successfully with new config');
    console.log('Project ID:', firebaseConfig.projectId);
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    isFirebaseInitialized = false;
  }
} else {
  console.error('❌ Firebase SDK not loaded');
  isFirebaseInitialized = false;
}

// Firebase Service Object
window.FirebaseService = {
  isInitialized: () => isFirebaseInitialized,
  getAuth: () => auth,
  getDb: () => db,
  getStorage: () => storage,
  getAnalytics: () => analytics,
  
  // Auth Methods
  signUp: async (email, password, userData) => {
    try {
      if (!isFirebaseInitialized) throw new Error('Firebase not initialized');
      
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      await user.updateProfile({ displayName: userData.displayName });
      
      // Save to Firestore
      await db.collection(userData.userType + 's').doc(user.uid).set({
        ...userData,
        uid: user.uid,
        email: user.email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        onboardingComplete: false,
        totalEarnings: 0,
        pendingEarnings: 0,
        activeProjects: 0,
        completedProjects: 0,
        avgRating: 5.0,
        strikes: 0,
        badges: ['New Member']
      });
      
      // Track signup in analytics
      if (analytics) {
        analytics.logEvent('sign_up', { method: 'email', userType: userData.userType });
      }
      
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  signIn: async (email, password) => {
    try {
      if (!isFirebaseInitialized) throw new Error('Firebase not initialized');
      
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      
      // Track login in analytics
      if (analytics) {
        analytics.logEvent('login', { method: 'email' });
      }
      
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  signOut: async () => {
    try {
      if (auth) await auth.signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // Get User Data
  getUserData: async (userId, userType) => {
    try {
      if (!isFirebaseInitialized) throw new Error('Firebase not initialized');
      
      const doc = await db.collection(userType + 's').doc(userId).get();
      if (doc.exists) {
        return { success: true, data: { id: doc.id, ...doc.data() } };
      }
      return { success: false, error: 'User not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // Update User Data
  updateUserData: async (userId, userType, data) => {
    try {
      if (!isFirebaseInitialized) throw new Error('Firebase not initialized');
      
      await db.collection(userType + 's').doc(userId).set({
        ...data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // Get User Type
  getUserType: async (userId) => {
    try {
      if (!isFirebaseInitialized) throw new Error('Firebase not initialized');
      
      const devDoc = await db.collection('developers').doc(userId).get();
      if (devDoc.exists) {
        return { success: true, type: 'developer', data: devDoc.data() };
      }
      
      const hostDoc = await db.collection('hosts').doc(userId).get();
      if (hostDoc.exists) {
        return { success: true, type: 'host', data: hostDoc.data() };
      }
      
      return { success: false, error: 'User type not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // Get Available Projects
  getAvailableProjects: async () => {
    try {
      if (!isFirebaseInitialized) throw new Error('Firebase not initialized');
      
      const snapshot = await db.collection('projects')
        .where('status', '==', 'open')
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, projects };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // Get Projects by Developer
  getProjectsByDeveloper: async (developerId) => {
    try {
      if (!isFirebaseInitialized) throw new Error('Firebase not initialized');
      
      const snapshot = await db.collection('projects')
        .where('developerId', '==', developerId)
        .orderBy('createdAt', 'desc')
        .get();

      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, projects };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // Apply for Project
  applyForProject: async (projectId, developerId, developerData) => {
    try {
      if (!isFirebaseInitialized) throw new Error('Firebase not initialized');
      
      const application = {
        projectId,
        developerId,
        developerName: developerData.displayName,
        developerEmail: developerData.email,
        appliedAt: new Date().toISOString(),
        status: 'pending'
      };

      await db.collection('applications').add(application);

      // Update project applications array
      await db.collection('projects').doc(projectId).update({
        applications: firebase.firestore.FieldValue.arrayUnion(developerId)
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
  
  // Create a new project (for hosts)
  createProject: async (projectData) => {
    try {
      if (!isFirebaseInitialized) throw new Error('Firebase not initialized');
      
      const project = {
        ...projectData,
        applications: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const docRef = await db.collection('projects').add(project);
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

window.firebaseInitialized = isFirebaseInitialized;
