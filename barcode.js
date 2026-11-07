(()=>{'use strict';
const api=window.inventarioGoBarcode,$=s=>document.querySelector(s);
let reader=null,controls=null,current='',lastCode='',lastAt=0,continuous=true,torch=false,starting=false;
const status=t=>$('#scan-status').textContent=t;
const clean=t=>String(t||'').trim();
const valid=t=>/^\d{8,14}$/.test(t);
const video=$('#scan-video');
function stop(){try{controls?.stop();}catch{}controls=null;reader=null;torch=false;video.hidden=true;$('#scan-start').hidden=false;$('#scan-stop').hidden=true;$('#scan-torch').hidden=true;$('#scan-torch').textContent='🔦 Encender linterna';}
function fillSizes(){const name=$('#barcode-product').value,select=$('#barcode-size');select.replaceChildren();for(const size of api.choices(name)){const option=document.createElement('option');option.value=size;option.textContent=size;select.append(option);}}
function show(code,fromCamera=false){current=code;$('#barcode-input').value=code;const match=api.lookup(code);$('#barcode-link').hidden=!!match;$('#barcode-found').hidden=!match;if(match){$('#barcode-found-label').textContent=match.name+' · '+match.size;status('Encontrado: '+match.name+' · '+match.size+'. No se modificaron cantidades.');if(fromCamera)stop();api.focus(match.name,match.size);}else{status('Código nuevo '+code+'. Selecciona el producto y su tamaño para vincularlo.');fillSizes();}
if(fromCamera&&navigator.vibrate)navigator.vibrate(80);
if(fromCamera&&!continuous)stop();}
function find(){const code=clean($('#barcode-input').value);if(!valid(code)){status('Introduce un código numérico de 8 a 14 dígitos.');return;}show(code);}
const select=$('#barcode-product');function fillProducts(){const prior=select.value;select.replaceChildren();for(const name of api.names){const o=document.createElement('option');o.value=name;o.textContent=name;select.append(o);}if(api.names.includes(prior))select.value=prior;fillSizes();}window.addEventListener('inventariogo:products',fillProducts);select.onchange=fillSizes;fillProducts();
$('#barcode-find').onclick=find;$('#barcode-input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();find();}});
$('#barcode-save').onclick=()=>{const name=select.value,size=$('#barcode-size').value;if(!current||!name||!size)return;api.link(current,name,size);show(current);status('Código vinculado. Puedes continuar escaneando.');};
$('#barcode-unlink').onclick=()=>{if(!current||!confirm('¿Desvincular este código? No se borrarán conteos.'))return;api.unlink(current);show(current);};
$('#scan-continuous').checked=true;$('#scan-continuous').onchange=e=>{continuous=e.target.checked;};
$('#scan-stop').onclick=()=>{stop();status('Cámara detenida.');};
$('#scan-torch').onclick=async()=>{const track=video.srcObject?.getVideoTracks?.()[0];if(!track){status('No hay cámara activa.');return;}try{const capabilities=track.getCapabilities?.();if(!capabilities?.torch){status('La linterna no está disponible en esta cámara o navegador.');return;}await track.applyConstraints({advanced:[{torch:!torch}]});torch=!torch;$('#scan-torch').textContent=torch?'🔦 Apagar linterna':'🔦 Encender linterna';}catch(e){status('Este iPhone/navegador no permite controlar la linterna desde la web.');}};
window.inventarioGoStartNextScan=()=>{stop();$('#scan-status').textContent='Listo para escanear el siguiente producto.';$('#barcode-panel').scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#scan-start').click(),300);};
$('#scan-start').onclick=async()=>{if(starting||controls)return;if(!window.isSecureContext){status('La cámara requiere HTTPS. Abre InventarioGo desde GitHub Pages.');return;}if(!navigator.mediaDevices?.getUserMedia){status('El navegador no permite acceder a la cámara. Revisa los permisos de Safari.');return;}if(!window.ZXing?.BrowserMultiFormatReader){status('No se cargó el lector ZXing. Comprueba la conexión a internet y vuelve a abrir la aplicación.');return;}
starting=true;status('Abriendo cámara trasera...');try{reader=new ZXing.BrowserMultiFormatReader();video.hidden=false;controls=await reader.decodeFromConstraints({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}},video,(result,error)=>{if(!result)return;const code=clean(result.getText());if(!valid(code))return;const now=Date.now();if(code===lastCode&&now-lastAt<3500)return;lastCode=code;lastAt=now;show(code,true);});$('#scan-start').hidden=true;$('#scan-stop').hidden=false;$('#scan-torch').hidden=false;status('Apunta al código de barras. Cuando se reconozca, registra las cantidades y pulsa Escanear siguiente.');}catch(e){stop();status('No se pudo iniciar la cámara ('+(e.name||'error')+'). Revisa permisos y conexión.');}finally{starting=false;}};
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',stop);
})();
