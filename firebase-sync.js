import {firebaseConfig} from './firebase-config.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,runTransaction,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const $=s=>document.querySelector(s), status=$('#cloud-status');
const say=s=>{status.textContent=s};
const ready=Object.values(firebaseConfig).every(v=>v && v!=='REEMPLAZAR');
if(!ready){say('Completa firebase-config.js. Los conteos locales siguen disponibles.');}
else {
 try {
 const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
 let user=null,enabled=false,revision=null,busy=false,pending=false,timer=null;
 const marker=uid=>'inventariogo-sync-v7-'+uid;
 const ref=()=>doc(db,'usuarios',user.uid,'inventarios','actual');
 function buttons(){ $('#enable-sync').hidden=enabled;$('#disable-sync').hidden=!enabled; }
 function pause(message){enabled=false;if(user)localStorage.removeItem(marker(user.uid));buttons();if(message)say(message);}
 function queue(){if(!enabled||!user)return;pending=true;say(navigator.onLine?'Cambio local guardado; sincronización pendiente...':'Sin internet: cambios guardados en este dispositivo, pendientes de sincronizar.');clearTimeout(timer);timer=setTimeout(sync,900);}
 window.addEventListener('inventariogo:changed',queue);
 window.addEventListener('online',()=>{if(enabled){pending=true;sync()}});
 async function sync(){if(!enabled||!user||busy||!navigator.onLine||!pending)return;
 busy=true;pending=false;const uid=user.uid;const backup=JSON.stringify(window.inventarioGoBackup());
 try{
  const next=await runTransaction(db,async tx=>{
   const snap=await tx.get(ref());const data=snap.exists()?snap.data():null;
   const remote=Number(data?.revision||0);
   if(remote!==revision)throw new Error('CONFLICTO: otro dispositivo modificó la copia en Firebase. Se pausó la sincronización. Exporta JSON antes de recuperar datos.');
   const nextRevision=remote+1;
   tx.set(ref(),{formatVersion:1,backup,revision:nextRevision,updatedAt:serverTimestamp()});
   return nextRevision;
  });
  if(uid!==user?.uid)return;
  revision=next;say('Sincronizado con Firebase. Revisión '+revision+'.');
 }catch(err){pending=true;if(String(err.message).includes('CONFLICTO'))pause(err.message);else say('Sin sincronizar: '+(err.code||err.message)+'. Los cambios siguen en este dispositivo.');}
 finally{busy=false;if(enabled&&pending&&navigator.onLine&&uid===user?.uid){clearTimeout(timer);timer=setTimeout(sync,4000)}}
 }
 onAuthStateChanged(auth,u=>{
  user=u;enabled=false;revision=null;pending=false;clearTimeout(timer);buttons();
  $('#login-panel').hidden=!!u;$('#cloud-actions').hidden=!u;$('#session-label').textContent=u?'Sesión: '+u.email:'Sin sesión';
  say(u?'Sesión iniciada. Recupera la copia de Firebase antes de activar la sincronización.':'Inicia sesión para usar Firebase.');
 });
 $('#login-form').addEventListener('submit',async e=>{e.preventDefault();const b=$('#login-button');b.disabled=true;say('Iniciando sesión...');try{await signInWithEmailAndPassword(auth,$('#email').value,$('#password').value);$('#password').value='';}catch(err){say('No se pudo iniciar sesión: '+err.code)}finally{b.disabled=false}});
 $('#logout').onclick=async()=>{pause();await signOut(auth)};
 $('#download-cloud').onclick=async()=>{if(!user)return;pause();try{say('Buscando copia...');const snap=await getDoc(ref());if(!snap.exists()){say('No hay copia en Firebase.');return;}const data=snap.data();if(!confirm('¿REEMPLAZAR los datos de ESTE dispositivo por la copia de Firebase? Exporta antes un JSON local.')){say('Recuperación cancelada.');return;}window.inventarioGoRestore(JSON.parse(data.backup));revision=Number(data.revision||0);say('Copia recuperada. Ya puedes activar la sincronización.');}catch(err){say('Error al recuperar: '+(err.code||err.message))}};
 $('#enable-sync').onclick=async()=>{if(!user)return;try{
  const snap=await getDoc(ref());if(!snap.exists()){say('Primero guarda una copia manual desde el dispositivo correcto.');return;}
  const data=snap.data();const local=window.inventarioGoBackup();
  // Comparamos contenido, no fecha de exportación.
  const remote=JSON.parse(data.backup);
  if(JSON.stringify(local.state)!==JSON.stringify(remote.state)||JSON.stringify(local.config)!==JSON.stringify(remote.config)||JSON.stringify(local.barcodes||{})!==JSON.stringify(remote.barcodes||{})){
   say('El inventario local difiere del de Firebase. Exporta un JSON y recupera la copia de Firebase antes de activar la sincronización.');return;
  }
  revision=Number(data.revision||0);enabled=true;buttons();say('Sincronización automática activada. Revisión '+revision+'.');
 }catch(err){say('No se pudo activar: '+(err.code||err.message))}};
 $('#disable-sync').onclick=()=>pause('Sincronización pausada. Los conteos se guardan localmente.');
 $('#upload-cloud').onclick=async()=>{if(!user)return;pause();if(!confirm('¿REEMPLAZAR la copia de Firebase por el inventario de ESTE dispositivo? Esto puede borrar cambios de otro dispositivo. Antes exporta un respaldo JSON.'))return;
  try{say('Guardando copia manual...');const snap=await getDoc(ref());const rev=Number(snap.data()?.revision||0)+1;await setDoc(ref(),{formatVersion:1,backup:JSON.stringify(window.inventarioGoBackup()),revision:rev,updatedAt:serverTimestamp()});revision=rev;say('Copia manual guardada. Para sincronización automática, actívala nuevamente.');}catch(err){say('No se pudo guardar: '+(err.code||err.message))}
 };
 }catch(err){say('Error de Firebase: '+err.message)}
}
