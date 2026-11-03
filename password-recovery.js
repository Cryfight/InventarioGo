// Independiente del módulo de sincronización: siempre muestra una respuesta.
(() => {
 const button = document.getElementById('forgot-password');
 const emailInput = document.getElementById('gate-email');
 const status = document.getElementById('gate-status');
 if (!button || !emailInput || !status) return;
 const show = msg => {status.textContent=msg;status.hidden=false;};
 button.addEventListener('click', async () => {
  const email=emailInput.value.trim();
  if(!email){show('Primero escribe tu correo electrónico.');emailInput.focus();return;}
  if(!emailInput.checkValidity()){show('Introduce un correo electrónico válido.');return;}
  button.disabled=true;show('Conectando con Firebase para enviar el correo...');
  try {
   const {firebaseConfig}=await import('./firebase-config.js');
   if(!firebaseConfig?.apiKey || firebaseConfig.apiKey==='REEMPLAZAR') throw new Error('Falta configurar firebase-config.js con los datos de tu proyecto.');
   const [{initializeApp,getApps,getApp},{getAuth,sendPasswordResetEmail}]=await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js')
   ]);
   const app=getApps().length?getApp():initializeApp(firebaseConfig);
   await sendPasswordResetEmail(getAuth(app),email);
   show('Solicitud enviada. Si existe una cuenta con ese correo, revisa entrada y spam.');
  }catch(e){
   const messages={
    'auth/unauthorized-domain':'El dominio no está autorizado en Firebase Authentication.',
    'auth/invalid-email':'El correo no es válido.',
    'auth/too-many-requests':'Demasiados intentos. Espera y vuelve a probar.',
    'auth/network-request-failed':'No se pudo conectar con Firebase. Comprueba internet.',
    'auth/operation-not-allowed':'La recuperación por correo no está habilitada.'
   };
   show((messages[e.code]||e.message||'Error desconocido')+(e.code?' ('+e.code+')':''));
  }finally{button.disabled=false;}
 });
})();
