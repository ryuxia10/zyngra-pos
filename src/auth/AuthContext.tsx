import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { auth, db } from "../firebase";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
} from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { Org } from "../types";

interface UserDoc {
  uid: string;
  email: string;
  orgId: string;
  createdAt: any;
}
import dayjs from "dayjs";

interface Ctx {
  user: User | null;
  userDoc: UserDoc | null;
  org: Org | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, orgName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const C = createContext<Ctx>(null as any);
export const useAuth = () => useContext(C);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u);
        if (u) {
          await loadUser(u);
        } else {
          setUserDoc(null);
          setOrg(null);
        }
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const loadUser = async (u: User) => {
    const uref = doc(db, "users", u.uid);
    const usnap = await getDoc(uref);
    let udoc: UserDoc;
    if (!usnap.exists()) {
      const orgRef = await addDoc(collection(db, "orgs"), {
        name: "Zyngra POS Org",
        ownerUid: u.uid,
        createdAt: serverTimestamp(),
        trialExpiresAt: Timestamp.fromDate(dayjs().add(3, "day").toDate()),
        settings: {
          permissions: {
            cashierCanEditSales: false,
            cashierCanDeleteSales: false,
            cashierCanApplyDiscount: false,
          },
          theme: "dark",
        },
        themeUnlocks: [],
        missions: {
          salesCount: 0,
          salesGrabCount: 0,
          qrisCount: 0,
          lastUpdated: serverTimestamp(),
        },
      });
      udoc = {
        uid: u.uid,
        email: u.email || "",
        orgId: orgRef.id,
        createdAt: serverTimestamp() as any,
      };
      await setDoc(uref, udoc as any, { merge: true });
    } else {
      udoc = usnap.data() as any;
    }
    setUserDoc(udoc);
    const osnap = await getDoc(doc(db, "orgs", udoc.orgId));
    if (osnap.exists()) setOrg({ id: osnap.id, ...(osnap.data() as any) });
    else setOrg(null);
  };

  const signIn = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (email: string, pass: string, orgName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = cred.user.uid;
    const orgRef = await addDoc(collection(db, "orgs"), {
      name: orgName || "Zyngra POS Org",
      ownerUid: uid,
      createdAt: serverTimestamp(),
      trialExpiresAt: Timestamp.fromDate(dayjs().add(3, "day").toDate()),
      settings: {
        permissions: {
          cashierCanEditSales: false,
          cashierCanDeleteSales: false,
          cashierCanApplyDiscount: false,
        },
        theme: "dark",
      },
      themeUnlocks: [],
      missions: {
        salesCount: 0,
        salesGrabCount: 0,
        qrisCount: 0,
        lastUpdated: serverTimestamp(),
      },
    });
    await setDoc(
      doc(db, "users", uid),
      {
        uid,
        email: email,
        orgId: orgRef.id,
        createdAt: serverTimestamp() as any,
      },
      { merge: true }
    );
  };

  const signOut = async () => {
    localStorage.removeItem("sessionRole");
    await fbSignOut(auth);
  };

  const refresh = async () => {
    if (auth.currentUser) await loadUser(auth.currentUser);
  };

  return (
    <C.Provider
      value={{ user, userDoc, org, loading, signIn, signUp, signOut, refresh }}
    >
      {children}
    </C.Provider>
  );
}
