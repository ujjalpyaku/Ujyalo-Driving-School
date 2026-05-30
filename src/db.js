import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useState, useEffect } from "react";

const firebaseConfig = {
  apiKey: "AIzaSyBB1fhajQ6t8vefEdDk1UqV9FXH-ytOQ14",
  authDomain: "ujyalo-driving-school.firebaseapp.com",
  projectId: "ujyalo-driving-school",
  storageBucket: "ujyalo-driving-school.firebasestorage.app",
  messagingSenderId: "927221501071",
  appId: "1:927221501071:web:18549379ddbbca9997b4fa",
  measurementId: "G-TTP3Y69JLZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const firestore = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});
export const auth = getAuth(app);

// Initialize default settings if they don't exist
const initDefaults = async () => {
  const pricingRef = doc(firestore, "settings", "pricing");
  const pricingSnap = await getDoc(pricingRef);
  if (!pricingSnap.exists()) {
    await setDoc(pricingRef, {
      normalRate: 63,
      packageRate: 63,
      testRate: 210,
      updatedAt: new Date().toISOString()
    });
  }

  const schoolDetailsRef = doc(firestore, "settings", "schoolDetails");
  const schoolDetailsSnap = await getDoc(schoolDetailsRef);
  if (!schoolDetailsSnap.exists()) {
    await setDoc(schoolDetailsRef, {
      phone: '+61 400 000 000',
      email: 'info@ujyalodriving.com.au',
      serviceLocations: 'Sydney CBD, Inner West, Eastern Suburbs, St George Area',
      pickupLocations: 'Home, School, Work, or nearest Train Station',
      updatedAt: new Date().toISOString()
    });
  }

  const securityRef = doc(firestore, "settings", "security");
  const securitySnap = await getDoc(securityRef);
  if (!securitySnap.exists()) {
    await setDoc(securityRef, {
      password: 'ujyalo2026',
      question1: 'In what city or town did your parents meet?',
      answer1: 'sydney',
      question2: 'What was the make and model of your first car?',
      answer2: 'mazda',
      question3: 'What is your favorite childhood movie?',
      answer3: 'shrek',
      updatedAt: new Date().toISOString()
    });
  }
};

initDefaults().catch(console.error);

// Custom hook to replace Dexie's useLiveQuery
export function useLiveQuery(queryFn, deps = []) {
  const [data, setData] = useState(undefined);

  useEffect(() => {
    let unsubscribe;
    
    const setup = async () => {
      const q = typeof queryFn === 'function' ? queryFn() : queryFn;
      if (!q) return;

      // If the query returns a single document reference (e.g. settings)
      if (q && q.type === 'document') {
         unsubscribe = onSnapshot(q, (doc) => {
           setData(doc.exists() ? { id: doc.id, ...doc.data() } : null);
         });
      } 
      // If it's a collection or query
      else if (q) {
         unsubscribe = onSnapshot(q, (snapshot) => {
           const docs = [];
           snapshot.forEach((doc) => {
             docs.push({ id: doc.id, ...doc.data() });
           });
           setData(docs);
         });
      }
    };

    setup();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, deps); // Re-run if dependencies change

  return data;
}

// Helper to wrap a Firestore query or collection ref to act as a Promise (thenable)
// when awaited, but still remain a Firestore Query object for onSnapshot / useLiveQuery.
const wrapQuery = (q) => {
  return Object.assign(q, {
    then: function(resolve, reject) {
      return getDocs(q)
        .then((snapshot) => {
          const docs = [];
          snapshot.forEach((doc) => {
            docs.push({ id: doc.id, ...doc.data() });
          });
          resolve(docs);
        })
        .catch(reject);
    }
  });
};

// Generic factory to create a Firebase-backed mock Dexie table
const createTable = (collectionName) => {
  const colRef = collection(firestore, collectionName);
  
  return {
    toArray: () => wrapQuery(colRef),
    add: async (data) => {
      if (data.id) {
        await setDoc(doc(firestore, collectionName, String(data.id)), data);
      } else {
        await addDoc(colRef, data);
      }
    },
    update: async (id, data) => {
      const docRef = doc(firestore, collectionName, String(id));
      const d = await getDoc(docRef);
      if (d.exists()) {
        await updateDoc(docRef, data);
      } else {
        const q = query(colRef, where("id", "==", id));
        const querySnap = await getDocs(q);
        const batch = [];
        querySnap.forEach(docSnap => {
          batch.push(updateDoc(doc(firestore, collectionName, docSnap.id), data));
        });
        await Promise.all(batch);
      }
    },
    delete: async (id) => {
      const docRef = doc(firestore, collectionName, String(id));
      const d = await getDoc(docRef);
      if (d.exists()) {
        await deleteDoc(docRef);
      } else {
        const q = query(colRef, where("id", "==", id));
        const querySnap = await getDocs(q);
        const batch = [];
        querySnap.forEach(docSnap => {
          batch.push(deleteDoc(doc(firestore, collectionName, docSnap.id)));
        });
        await Promise.all(batch);
      }
    },
    get: async (id) => { 
      const docRef = doc(firestore, collectionName, String(id));
      const d = await getDoc(docRef); 
      if (d.exists()) {
        return { id: d.id, ...d.data() };
      } else {
        const q = query(colRef, where("id", "==", id));
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          const firstDoc = querySnap.docs[0];
          return { id: firstDoc.id, ...firstDoc.data() };
        }
        return null;
      }
    },
    put: async (data) => {
      if (data.id) {
        await setDoc(doc(firestore, collectionName, String(data.id)), data);
      } else {
        await addDoc(colRef, data);
      }
    },
    clear: async () => {
      const snap = await getDocs(colRef);
      const batch = [];
      snap.forEach(d => {
        batch.push(deleteDoc(doc(firestore, collectionName, d.id)));
      });
      await Promise.all(batch);
    },
    bulkAdd: async (arr) => {
      const batch = [];
      for (const item of arr) {
        if (item.id) {
          batch.push(setDoc(doc(firestore, collectionName, String(item.id)), item));
        } else {
          batch.push(addDoc(colRef, item));
        }
      }
      await Promise.all(batch);
    },
    where: (field) => ({
      equals: (val) => {
        const q = query(colRef, where(field, "==", val));
        return {
          toArray: () => wrapQuery(q),
          modify: async (updates) => {
            const snap = await getDocs(q);
            const batch = [];
            snap.forEach(d => {
              batch.push(updateDoc(doc(firestore, collectionName, d.id), updates));
            });
            await Promise.all(batch);
          }
        };
      }
    })
  };
};

// Wrapper to mimic Dexie API and minimize refactoring in UI components
export const db = {
  students: createTable("students"),
  enrolments: createTable("enrolments"),
  bookings: createTable("bookings"),
  payments: createTable("payments"),
  inquiries: createTable("inquiries"),
  trash: createTable("trash"),
  settings: {
    ...createTable("settings"),
    get: (id) => {
      const docRef = doc(firestore, "settings", id);
      const wrappedRef = Object.assign(docRef, {
        then: function(resolve, reject) {
          return getDoc(docRef).then(d => {
            resolve(d.exists() ? { id: d.id, ...d.data() } : null);
          }).catch(reject);
        }
      });
      return wrappedRef;
    }
  }
};

