import { initializeApp } from 'firebase/app';
import { arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, onSnapshot, query, setDoc, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { save, get } from './utils/indexDB';




const firebaseConfig = {
  apiKey: import.meta.env.VITE_APIKEY,
  authDomain: import.meta.env.VITE_AUTHDOMAIN,
  projectId: import.meta.env.VITE_PROJECTID,
  storageBucket: import.meta.env.VITE_STORAGEBUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGINGSENDERID,
  appId: import.meta.env.VITE_APPID,
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const storage = getStorage(app);







//------------------------------------------------------------FUNCTIONS EXPORT





//------------------------------------------------------------IMAGEM

export async function resizeToThumbnail(file, size = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {

      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Cálculo para crop central (1:1)
      const minEdge = Math.min(img.width, img.height);
      const sx = (img.width - minEdge) / 2;
      const sy = (img.height - minEdge) / 2;

      ctx.drawImage(img, sx, sy, minEdge, minEdge, 0, 0, size, size);

      canvas.toBlob((blob) => {
        if (blob) {
          const thumbnailFile = new File([blob], file.name, { type: blob.type });
          resolve(thumbnailFile);
        } else {
          reject(new Error('Erro ao criar thumbnail'));
        }
      }, 'image/jpeg', 0.95);
    };

    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}



export function uploadImage(merchantId, file, path, onProgress = () => { }) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Arquivo inválido'));

    const storageRef = ref(storage, `${merchantId}/${Date.now()}-${path}`);

    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(Math.round(pct));
      },
      (error) => reject(error),
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
}






//------------------------------------------------------------CRUD DOCS

export const addDocument = async (merchantId, collectionName, document) => {

  const documentRef = doc(collection(db, `merchant/${merchantId}/${collectionName}`));

  await setDoc(documentRef, document);

  return documentRef.id;
}

export const addDocumentId = async (merchantId, collectionName, document, docId) => {
  if (!merchantId || !collectionName || !docId || typeof document !== 'object') {
    throw new Error('Parâmetros inválidos para adicionar documento.');
  }

  const path = `merchant/${merchantId}/${collectionName}`;
  const documentRef = doc(db, path, docId);

  await setDoc(documentRef, {
    ...document,
  });

  return docId;
};

export const updateDocument = async (merchantId, collectionName, documentId, updatedData) => {

  const documentRef = doc(collection(db, `merchant/${merchantId}/${collectionName}`), documentId);

  await updateDoc(documentRef, updatedData);

  return documentRef.id;
};


export const updateDocumentsBatch = async (merchantId, collectionName, documentsIds, updatedData) => {
  const batch = writeBatch(db);

  documentsIds.forEach(documentId =>
    batch.set(doc(collection(db, `merchant/${merchantId}/${collectionName}`), documentId), updatedData, { merge: true })
  );

  await batch.commit();

  return documentsIds.map(u => u);
};


export const deleteDocument = async (merchantId, collectionName, documentId) => {

  const documentRef = doc(db, `merchant/${merchantId}/${collectionName}`, documentId);

  await deleteDoc(documentRef);

  return documentRef.id;
};

export const deleteByParams = async (merchantId, collectionName, fieldA, valueA, fieldB, valueB) => {
  const q = query(
    collection(db, `merchant/${merchantId}/${collectionName}`),
    where(fieldA, '==', valueA),
    where(fieldB, '==', valueB)
  );

  const snapshot = await getDocs(q);

  for (const docSnap of snapshot.docs) {
    await deleteDoc(docSnap.ref);
  }

  return snapshot.size;
};

export const getDocumentById = async (merchantId, collectionName, documentId) => {

  const documentRef = doc(db, `merchant/${merchantId}/${collectionName}`, documentId);

  const document = await getDoc(documentRef);

  if (document.exists()) {
    return {
      [`${collectionName}Id`]: document.id,
      ...document.data(),
    }
  } else {
    return null;
  }
}


export const getDocumentByParams = async (merchantId, collectionName, params = {}) => {
  const collectionRef = collection(db, `merchant/${merchantId}/${collectionName}`);

  let q = collectionRef;

  for (const [field, value] of Object.entries(params)) {
    q = query(q, where(field, '==', value));
  }

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docSnap = snapshot.docs[0];
    return {
      [`${collectionName}Id`]: docSnap.id,
      ...docSnap.data(),
    };
  } else {
    return null;
  }
};



export const fetchCollection = (merchantId, collectionName, filters, callback, errorCallback) => {

  let qry = query(collection(db, `merchant/${merchantId}/${collectionName}`));

  if (filters) {
    Object.keys(filters).forEach((key) => {
      const value = filters[key];

      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          qry = query(qry, where(key, 'in', value));
        } else {
          qry = query(qry, where(key, '==', value));
        }
      }
    })
  }

  const unsubscribe = onSnapshot(
    qry,
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        [`${collectionName}Id`]: doc.id,
        ...doc.data(),
      }));

      callback(data);
    },
    (error) => {
      errorCallback(error);
    }
  );

  return unsubscribe;
};























//------------------------------------------------------------BUSCA e UPDATE DOCS MERCHANT


export const listenAdmConfigDoc = (onChange, onError) => {
  const documentRef = doc(db, 'adm', 'config');

  return onSnapshot(
    documentRef,
    snapshot => {
      if (snapshot.exists()) {
        onChange(snapshot.data());
      } else {
        onChange(null);
      }
    },
    error => {
      if (onError) onError(error);
    }
  );
};


export const getAdmConfigDoc = async () => {

  const documentRef = doc(db, `adm`, `config`);

  const document = await getDoc(documentRef);

  if (document.exists()) {
    return {
      ...document.data(),
    }
  } else {
    return null;
  }
}


export const updateAdmConfigDoc = async (payload) => {
  const documentRef = doc(db, 'adm', 'config');

  await updateDoc(documentRef, {
    ...payload
  });
};


export const fetchMerchants = (filters, callback, errorCallback) => {

  let qry = query(collection(db, `merchant`));

  if (filters) {
    Object.keys(filters).forEach((key) => {
      const value = filters[key];

      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          qry = query(qry, where(key, 'in', value));
        } else {
          qry = query(qry, where(key, '==', value));
        }
      }
    })
  }

  const unsubscribe = onSnapshot(
    qry,
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        merchantId: doc.id,
        ...doc.data(),
      }));

      callback(data);
    },
    (error) => {
      errorCallback(error);
    }
  );

  return unsubscribe;
};



export const addPayment = async (document) => {
  if (!document.merchantId) {
    throw new Error('merchantId é obrigatório.');
  }

  const batch = writeBatch(db);

  const paymentRef = doc(collection(db, 'payment'));

  const merchantPaymentRef = doc(collection(db, `merchant/${document.merchantId}/payment`), paymentRef.id);

  batch.set(paymentRef, { ...document, createdAt: Timestamp.now() });

  batch.set(merchantPaymentRef, {
    date: document.date,
    description: document.description,
    value: document.value,
    createdAt: Timestamp.now(),
  });

  const merchantRef = doc(db, 'merchant', document.merchantId);

  batch.set(merchantRef, { lastPayment: document.date }, { merge: true });

  await batch.commit();

  return paymentRef.id;
};



export const updatePayment = async (paymentId, document) => {
  if (!document.merchantId || !paymentId) {
    throw new Error('merchantId e paymentId são obrigatórios.');
  }

  const batch = writeBatch(db);

  const paymentRef = doc(db, 'payment', paymentId);
  const merchantPaymentRef = doc(db, `merchant/${document.merchantId}/payment`, paymentId);

  const dataToUpdate = {
    date: document.date,
    description: document.description,
    value: document.value,
    updatedAt: Timestamp.now(),
  };

  const merchantRef = doc(db, 'merchant', document.merchantId);

  batch.set(merchantRef, { lastPayment: document.date }, { merge: true });

  batch.update(paymentRef, dataToUpdate);

  batch.update(merchantPaymentRef, dataToUpdate);

  await batch.commit();

  return paymentId;
};

/* 
export const fetchPayments = (filters, callback, errorCallback) => {

  let qry = query(collection(db, `payment`));

  if (filters) {
    Object.keys(filters).forEach((key) => {
      const value = filters[key];

      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          qry = query(qry, where(key, 'in', value));
        } else {
          qry = query(qry, where(key, '==', value));
        }
      }
    })
  }

  const unsubscribe = onSnapshot(
    qry,
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        paymentId: doc.id,
        ...doc.data(),
      }));

      callback(data);
    },
    (error) => {
      errorCallback(error);
    }
  );

  return unsubscribe;
};
 */


export const fetchPayments = (filters, callback, errorCallback) => {

  let qry = query(collection(db, `event`));

  const orFilters = [];

  if (filters) {
    Object.keys(filters).forEach((key) => {
      const value = filters[key];

      if (value === undefined || value === null) return;

      //caso filtro OR no mesmo campo
      if (key.includes(',')) {
        const fields = key.split(',').map(v => v.trim());
        orFilters.push({ fields, value });
        return;
      }

      if (Array.isArray(value)) {
        qry = query(qry, where(key, 'in', value));
      } else {
        qry = query(qry, where(key, '==', value));
      }
    });
  }

  if (!orFilters.length) {
    return onSnapshot(
      qry,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          paymentId: doc.id,
          ...doc.data(),
        }));
        callback(data);
      },
      (error) => errorCallback(error)
    );
  }

  //caso OR gera mais de um listener para ser desativado depois
  const unsubscribers = [];
  let collected = [];

  //rever se tratar como PAYMENT OU EVENT (paymentId - eventId)
  const mergeAndSend = (newDocs) => {
    collected = [...collected, ...newDocs];
    const uniq = [
      ...new Map(collected.map(doc => [doc.paymentId, doc])).values()
    ];
    callback(uniq);
  };

  orFilters.forEach(({ fields, value }) => {
    fields.forEach((field) => {
      const q = query(qry, where(field, '==', value));
      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const docs = snapshot.docs.map((doc) => ({
            paymentId: doc.id,
            ...doc.data(),
          }));
          mergeAndSend(docs);
        },
        (error) => errorCallback(error)
      );
      unsubscribers.push(unsub);
    });
  });

  return () => unsubscribers.forEach(u => u());
};



export const fetchMerchantById = async (merchantId, callback, errorCallback) => {
  try {
    const docRef = doc(db, 'merchant', merchantId);

    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      callback({
        merchantId: docSnap.id,
        ...docSnap.data(),
      });
    } else {
      callback(null);
    }
  } catch (error) {
    errorCallback(error);
  }
};



export const listenMerchantById = (merchantId, onChange, onError) => {

  if (!merchantId) {
    onError(new Error('merchantId não encontrado.'));
    return () => { };
  }

  const docRef = doc(db, 'merchant', merchantId);

  const unsubscribe = onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onChange({ merchantId: docSnap.id, ...docSnap.data() });
      } else {
        onChange(null);
      }
    },
    (error) => onError(error)
  );

  return unsubscribe;
};



export const updateMerchant = async (documentId, updatedData) => {

  const documentRef = doc(collection(db, `merchant`), documentId);

  await updateDoc(documentRef, updatedData);

  return documentRef.id;
};



export const fetchDocumentById = async (merchantId, collectionName, documentId, callback, errorCallback) => {
  try {

    const docRef = doc(db, 'merchant', merchantId, collectionName, documentId);

    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      callback({
        [`${collectionName}Id`]: docSnap.id,
        ...docSnap.data(),
      });
    } else {
      callback(null);
    }
  } catch (error) {
    errorCallback(error);
  }
};








//------------------------------------------------------------USERS

//REVER
export const useMntUser = () => {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {

        setClaims(null);
        setUser(null);
        setLoading(false);

      } else {

        try {
          const token = await firebaseUser.getIdTokenResult(true);
          setUser(firebaseUser);
          setClaims(token.claims);
          setLoading(false);
        } catch (error) {
          console.error('Erro ao obter token:', error);
        } finally {
          setLoading(false);
        }
      }

    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    claims,
    loading
  };
};



//REVER
export const useAdmUser = () => {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {

        setClaims(null);
        setUser(null);
        setLoading(false);

      } else {

        try {
          const token = await firebaseUser.getIdTokenResult(true);
          setUser(firebaseUser);
          setClaims(token.claims);
          setLoading(false);
        } catch (error) {
          console.error('Erro ao obter token:', error);
        } finally {
          setLoading(false);
        }
      }

    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    claims,
    loading
  };
};






//REVER
export const useAuthUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          const anon = await signInAnonymously(auth);
          setUser(anon.user);
        } else {
          setUser(firebaseUser);
        }
      } catch (error) {
        console.error('Erro ao autenticar anonimamente:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    isAnonymous: user?.isAnonymous ?? false,
  };
};




//REVER
export const useWtrUser = (merchantId, token) => {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userListenStatus, setUserListenStatus] = useState(null);


  useEffect(() => {
    const auth = getAuth();

    let unsubUsr = undefined;

    const unsubscribe =
      onAuthStateChanged(auth, async (firebaseUser) => {

        try {

          if (!firebaseUser) {
            //

            if (merchantId && token) {

              //CENARIO ONDE TA AUTENTICANDO PELA PRIMEIRA VEZ

              const anonUser = await signInAnonymously(auth);

              //REVER
              unsubUsr = fetchCollection(merchantId, 'user', { 'token': token },
                async (docs) => {

                  const doc = docs?.[0];

                  if (doc) {
                    const usrData = doc;
                    const xxx = {
                      id: anonUser.user.uid,
                      merchantId: merchantId,
                      token: token,
                      accessLevel: 1,
                      type: usrData?.type || 'nd'
                    }

                    await save(xxx);
                    console.log('save indb auth');

                    /* await updateDocument(merchantId, 'user', doc.userId, {
                      devices: arrayUnion(anonUser.user.uid),
                    }); */


                    setUser(anonUser.user);

                    setClaims(xxx);

                    setUserListenStatus({ ...doc });
                  }
                },
                () => setUserListenStatus(null)
              );


            }

          } else {

            //sera removido esse cenario
            if (merchantId && token) {

              //CENARIO ONDE JA TEM USER NO AUTH... 
              //REMOVER POIS TEORICAMENTE ESSE CENARIO NAO SERA REAL

              const anonUser = await signInAnonymously(auth);

              unsubUsr = fetchCollection(merchantId, 'user', { 'token': token },
                async (docs) => {
                  const doc = docs?.[0];

                  if (doc) {
                    const xxx = {
                      id: anonUser.user.uid,
                      merchantId,
                      token,
                      accessLevel: 1,
                      type: doc?.type || 'nd'
                    };

                    await save(xxx);
                    console.log('save indb auth');

                    /* await updateDocument(merchantId, 'user', doc.userId, {
                      devices: arrayUnion(anonUser.user.uid),
                    }); */

                    setUser(anonUser.user);
                    setClaims(xxx);
                    setUserListenStatus({ ...doc });
                  }
                },
                () => setUserListenStatus(null)
              );




            } else {

              //CENARIO ONDE JA AUTENTICOU E TA SO ACESSANDO NORMALMENTE

              setUser(firebaseUser);

              const userKds = await get(firebaseUser.uid);

              setClaims(userKds);

              //REVER
              unsubUsr = fetchCollection(userKds.merchantId, 'user', { 'token': userKds.token },
                async (docs) => {
                  const doc = docs?.[0];
                  if (doc) {
                    setUserListenStatus({ ...doc });
                  }
                },
                () => setUserListenStatus(null)
              );

            }

          }


          //
        } catch (error) {
          console.error('Erro no hook useKdsUser:', error);
        } finally {
          setLoading(false);
        }

      });




    return () => {
      unsubscribe();
      unsubUsr?.();
    }
  }, [merchantId, token]);




  return {
    user,
    claims,
    loading,
    isAnonymous: user?.isAnonymous ?? false,
    userListenStatus
  };
};





//REVER
export const useKdsUser = (merchantId, token) => {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userListenStatus, setUserListenStatus] = useState(null);


  useEffect(() => {
    const auth = getAuth();

    let unsubUsr = undefined;

    const unsubscribe =
      onAuthStateChanged(auth, async (firebaseUser) => {

        try {

          if (!firebaseUser) {
            //

            if (merchantId && token) {

              //CENARIO ONDE TA AUTENTICANDO PELA PRIMEIRA VEZ

              const anonUser = await signInAnonymously(auth);

              //REVER
              unsubUsr = fetchCollection(merchantId, 'user', { 'token': token },
                async (docs) => {

                  const doc = docs?.[0];

                  if (doc) {
                    const usrData = doc;
                    const xxx = {
                      id: anonUser.user.uid,
                      merchantId: merchantId,
                      token: token,
                      accessLevel: 1,
                      type: usrData?.type || 'nd'
                    }

                    await save(xxx);
                    console.log('save indb auth');

                    /*  await updateDocument(merchantId, 'user', doc.userId, {
                       devices: arrayUnion(anonUser.user.uid),
                     }); */


                    setUser(anonUser.user);

                    setClaims(xxx);

                    setUserListenStatus({ ...doc });
                  }
                },
                () => setUserListenStatus(null)
              );


            }

          } else {

            //sera removido esse cenario
            if (merchantId && token) {

              //CENARIO ONDE JA TEM USER NO AUTH... 
              //REMOVER POIS TEORICAMENTE ESSE CENARIO NAO SERA REAL

              const anonUser = await signInAnonymously(auth);

              unsubUsr = fetchCollection(merchantId, 'user', { 'token': token },
                async (docs) => {
                  const doc = docs?.[0];

                  if (doc) {
                    const xxx = {
                      id: anonUser.user.uid,
                      merchantId,
                      token,
                      accessLevel: 1,
                      type: doc?.type || 'nd'
                    };

                    await save(xxx);
                    console.log('save indb auth');

                    /* await updateDocument(merchantId, 'user', doc.userId, {
                      devices: arrayUnion(anonUser.user.uid),
                    }); */

                    setUser(anonUser.user);
                    setClaims(xxx);
                    setUserListenStatus({ ...doc });
                  }
                },
                () => setUserListenStatus(null)
              );




            } else {

              //CENARIO ONDE JA AUTENTICOU E TA SO ACESSANDO NORMALMENTE

              setUser(firebaseUser);

              const userKds = await get(firebaseUser.uid);

              setClaims(userKds);

              //REVER
              unsubUsr = fetchCollection(userKds.merchantId, 'user', { 'token': userKds.token },
                async (docs) => {
                  const doc = docs?.[0];
                  if (doc) {
                    setUserListenStatus({ ...doc });
                  }
                },
                () => setUserListenStatus(null)
              );

            }

          }


          //
        } catch (error) {
          console.error('Erro no hook useKdsUser:', error);
        } finally {
          setLoading(false);
        }

      });




    return () => {
      unsubscribe();
      unsubUsr?.();
    }
  }, [merchantId, token]);




  return {
    user,
    claims,
    loading,
    isAnonymous: user?.isAnonymous ?? false,
    userListenStatus
  };
};








//------------------------------------------------------------LOGIN

export const logout = async () => {

  try {
    const auth = getAuth();

    await signOut(auth);

  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    throw error;
  }
};



export const login = async (email, password) => {

  try {
    const auth = getAuth();

    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    return userCredential.user;
  } catch (error) {
    console.error('Erro no login:', error);
    throw error;
  }
};









//------------------------------------------------------------SHARED

/* export const SYS_ORDER_STATUS = [
  { id: 'CAR', name: 'CART', label_wtr: 'Carrinho', label_mnu: 'Carrinho', label_kds: 'Carrinho', label: 'Carrinho', active: true, sequence: 0, color: 'primary' },
  { id: 'PLC', name: 'PLACED', label_wtr: 'Novo', label_mnu: 'Enviado', label_kds: 'Novo', label: 'Novo Pedido', active: true, sequence: 1, color: 'primary' },
  { id: 'CFM', name: 'CONFIRMED', label_wtr: 'Confirmar', label_mnu: 'Confirmado', label_kds: 'Confirmado', label: 'Pedido Confirmado', active: false, sequence: 2, color: 'success' },
  { id: 'SPS', name: 'SEPARATION_STARTED', label_wtr: 'Preparando', label_mnu: 'Preparando', label_kds: 'Preparando', label: 'Preparação Iniciada', active: false, sequence: 3, color: 'action' },
  { id: 'SPE', name: 'SEPARATION_ENDED', label_wtr: 'Finalizado', label_mnu: 'Finalizado', label_kds: 'Finalizado', label: 'Preparação Finalizada', active: false, sequence: 4, color: 'action' },
  { id: 'RTP', name: 'READY_TO_PICKUP', label_wtr: 'Pronto', label_mnu: 'Pronto', label_kds: 'Pronto', label: 'Pronto para Retirada', active: true, sequence: 5, color: 'secondary' },
  { id: 'DIS', name: 'DISPATCHED', label_wtr: 'Retirado', label_mnu: 'Garçom retirou', label_kds: 'Entregando', label: 'Saiu para Entrega', active: true, sequence: 6, color: 'info' },
  { id: 'CON', name: 'CONCLUDED', label_wtr: 'Concluir', label_mnu: 'Concluido', label_kds: 'Concluido', label: 'Pedido Concluido', active: true, sequence: 7, color: 'primary' },
  { id: 'CAN', name: 'CANCELLED', label_wtr: 'Cancelar', label_mnu: 'Cancelar', label_kds: 'Cancelar', label: 'Pedido Cancelado', active: true, sequence: 8, color: 'error' },
] */






export const SYS_ORDER_STATUS = [
  { id: 'CAR', name: 'CART', label_wtr: 'Carrinho', label_mnu: 'Carrinho', label_kds: 'Carrinho', label: 'Carrinho', active: true, sequence: 0, color: 'primary' },
  { id: 'PLC', name: 'PLACED', label_wtr: 'Pedido', label_mnu: 'Pedido', label_kds: 'Pedido', label: 'Pedido', active: true, sequence: 1, color: 'primary' },
  //{ id: 'CFM', name: 'CONFIRMED', label_wtr: 'Confirmar', label_mnu: 'Confirmado', label_kds: 'Confirmado', label: 'Pedido Confirmado', active: false, sequence: 2, color: 'success' },
  { id: 'SPS', name: 'SEPARATION_STARTED', label_wtr: 'Preparando', label_mnu: 'Preparando', label_kds: 'Preparando', label: 'Preparação Iniciada', active: false, sequence: 3, color: 'action' },
  //{ id: 'SPE', name: 'SEPARATION_ENDED', label_wtr: 'Finalizado', label_mnu: 'Finalizado', label_kds: 'Finalizado', label: 'Preparação Finalizada', active: false, sequence: 4, color: 'action' },
  { id: 'RTP', name: 'READY_TO_PICKUP', label_wtr: 'Pronto', label_mnu: 'Pronto', label_kds: 'Pronto', label: 'Pronto para Retirada', active: false, sequence: 5, color: 'secondary' },
  { id: 'DIS', name: 'DISPATCHED', label_wtr: 'Entregue', label_mnu: 'Entregue', label_kds: 'Entregue', label: 'Entregue', active: true, sequence: 6, color: 'info' },
  { id: 'CON', name: 'CONCLUDED', label_wtr: 'Pago', label_mnu: 'Pago', label_kds: 'Pago', label: 'Pedido Pago', active: true, sequence: 7, color: 'success' },
  { id: 'CAN', name: 'CANCELLED', label_wtr: 'Cancelar', label_mnu: 'Cancelar', label_kds: 'Cancelar', label: 'Cancelado', active: true, sequence: 8, color: 'error' },
]



//------------------------------------------------------------DADOS FAKE PARA EXCLUIR


const lista_itens_fake = [
  {
    key: 'aaa111',
    name: 'Big tasty',
    category: {
      key: 'lanches_especiais',
      name: 'Lanches Especiais'
    },
    price: {
      value: 11,
      originalValue: 12.5
    },
    image: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/d2fccef3-7bf6-4f04-b2a5-0ce70a3afc97/202408141858_nztleze9nl.jpeg',
    serving: 'Serve 2 pessoas',
    description: 'Lanche completo com salada',
    optionGroups: [],
    options: []
  },
  {
    key: 'bbb222',
    name: 'Big Mac',
    category: {
      key: 'lanches_classicos',
      name: 'Lanches Clássicos'
    },
    price: {
      value: 19.9,
      originalValue: 22.5
    },
    image: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/d2fccef3-7bf6-4f04-b2a5-0ce70a3afc97/202408141858_nztleze9nl.jpeg',
    serving: '',
    description: 'O clássico Big Mac com molho especial e dois hambúrgueres',
    optionGroups: [
      {
        id: '1e5e5eb5-84c7-4eca-b0c1-921860434f70',
        name: 'Acompanhamentos',
      }
    ],
    options: [
      {
        status: 'AVAILABLE',
        price: {
          value: 7.5,
          originalValue: 7
        },
        key: 'ooo-111',
        name: 'Batata Frita',
        description: '200 g',
        image: 'https://static.ifood-static.com.br/image/upload/t_medium/pratos/d2fccef3-7bf6-4f04-b2a5-0ce70a3afc97/202408141859_9b98struubh.jpeg',
      },
    ]
  },
];




const categorias_fake = [
  ...new Map(
    lista_itens_fake.map(item => item.category)
      .map(category => [category.key, category])
  ).values()
];















