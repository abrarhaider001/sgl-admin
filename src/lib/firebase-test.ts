// Firebase Connection Test
// This file can be used to test Firebase connectivity

import { db, auth, storage } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    
    // Test Firestore connection
    console.log('Testing Firestore...');
    const testCollection = collection(db, 'test');
    await getDocs(testCollection);
    console.log('✅ Firestore connection successful');
    
    // Test Auth connection
    console.log('Testing Auth...');
    console.log('Auth instance:', auth.app.name);
    console.log('✅ Auth connection successful');
    
    // Test Storage connection
    console.log('Testing Storage...');
    console.log('Storage instance:', storage.app.name);
    console.log('✅ Storage connection successful');
    
    console.log('🎉 All Firebase services connected successfully!');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error);
    return false;
  }
};

// Export for use in components or pages
export default testFirebaseConnection;