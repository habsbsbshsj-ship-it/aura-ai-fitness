import { db, auth, storage } from './firebase';
import { 
  doc, 
  getDocs, 
  collection, 
  writeBatch
} from 'firebase/firestore';
import { ref, deleteObject, listAll } from 'firebase/storage';
import { UserProfile } from '../types';

/**
 * Permanently deletes all user data from Aura Ecosystem
 */
export async function deleteUserData(profile: UserProfile) {
  console.log("DataManagement: Critical Protocol - Starting permanent data erasure...");
  
  // 1. Clear Local Storage
  const localKeys = Object.keys(localStorage);
  localKeys.forEach(key => {
    if (key.includes('aura_') || key.includes(profile.uid)) {
      localStorage.removeItem(key);
    }
  });

  // 2. Delete Cloud Data
  if (auth.currentUser && !profile.isAnonymous) {
    const batch = writeBatch(db);
    
    // Delete main profile and settings
    batch.delete(doc(db, 'users', profile.uid));
    batch.delete(doc(db, 'settings', profile.uid));

    // Simple subcollection cleanup (for deep nesting, a cloud function is better, but this handles Aura v2 schema)
    const collectionsToDelete = ['daily_stats', 'meals', 'water_logs'];
    for (const collName of collectionsToDelete) {
      const snap = await getDocs(collection(db, `users/${profile.uid}/${collName}`));
      snap.forEach(d => batch.delete(d.ref));
    }

    await batch.commit();

    // 3. Delete Storage Assets (Avatar)
    try {
      const storageRef = ref(storage, `profiles/${profile.uid}`);
      const fileList = await listAll(storageRef);
      await Promise.all(fileList.items.map(file => deleteObject(file)));
    } catch (e) {
      console.warn("DataManagement: Storage deletion skipped or failed (might be empty)", e);
    }
  }

  console.log("DataManagement: Erasure complete. System reset required.");
}
