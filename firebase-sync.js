import {firebaseConfig} from './firebase-config.js';
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const $=s=>document.querySelector(s);
const status=$('#cloud-status');
const setStatus=t=>{status.textContent=t};
const isReady=Object.values(firebaseConfig).every(v=>v && v!=='REEMPLAZAR');
if(!isReady){setStatus('Falta completar firebase-config.js. El inventario local sigue funcionando.');}
else {
 try{
 const app=initializeApp(firebaseConfig);const auth=getAuth(app);const db=getFirestore(app);let current=null;
 onAuthStateChanged(auth,user=>{current=user;$('#login-panel').hidden=!!user;$('#cloud-actions').hidden=!user;$('#session-label').textContent=user?`Sesión: ${user.email}`:'Sin sesión';setStatus(user?'Sesión iniciada. Los conteos siguen guardándose localmente hasta que hagas una copia en la nube.':'Inicia sesión para acceder a tu copia en la nube.');});
 $('#login-form').addEventListener('submit',async e=>{e.preventDefault();const btn=$('#login-button');btn.disabled=true;setStatus('Iniciando sesión...');try{await signInWithEmailAndPassword(auth,$('#email').value,$('#password').value);$('#password').value='';}catch(err){setStatus('No se pudo iniciar sesión: '+err.code);}finally{btn.disabled=false;}});
 $('#logout').onclick=async()=>{try{await signOut(auth)}catch(e){setStatus(e.message)}};
 const ref=()=>doc(db,'usuarios',current.uid,'inventarios','actual');
 $('#upload-cloud').onclick=async()=>{if(!current)return;const local=window.inventarioGoBackup();if(!confirm('¿Guardar una COPIA del inventario de ESTE dispositivo en Firebase? Esto REEMPLAZARÁ la copia anterior de la nube.'))return;try{setStatus('Guardando copia en la nube...');await setDoc(ref(),{formatVersion:1,backup:JSON.stringify(local),updatedAt:serverTimestamp()});setStatus('Copia guardada en Firebase correctamente.');}catch(e){setStatus('No se pudo guardar: '+e.code+' '+e.message)}};
 $('#download-cloud').onclick=async()=>{if(!current)return;try{setStatus('Buscando copia en Firebase...');const snap=await getDoc(ref());if(!snap.exists()){setStatus('Todavía no hay copia guardada en Firebase.');return;}const data=snap.data();const backup=JSON.parse(data.backup);const date=data.updatedAt?.toDate?.()?.toLocaleString('es-CR')||'fecha no disponible';if(!confirm(`Hay una copia en Firebase (${date}). ¿REEMPLAZAR los conteos y tamaños de ESTE dispositivo con esa copia? Exporta un respaldo JSON local antes de continuar.`)){setStatus('Recuperación cancelada.');return;}window.inventarioGoRestore(backup);setStatus('Copia recuperada correctamente.');}catch(e){setStatus('No se pudo recuperar: '+e.code+' '+e.message)}};
 }catch(e){setStatus('Error de configuración de Firebase: '+e.message)}
}
