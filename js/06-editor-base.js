/* Editor: estado, utilidades, carga de imágenes/PDF y lista de pantallas */
/* =====================  EDITOR  ===================== */
var $=function(s){return document.querySelector(s);};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});};
var uid=function(){return Math.random().toString(36).slice(2,9);};
var clamp=function(v,a,b){return Math.max(a,Math.min(b,v));};

/* Los estilos del resultado final también se cargan aquí para la vista previa del editor de pop-ups */
(function(){var st=document.createElement('style');st.textContent=EXPORT_CSS;document.head.appendChild(st);})();

function emptyProject(){return {title:'Mi interactivo',theme:{transition:'fade',accent:'#5b3a8e'},screens:[]};}
var P=emptyProject();
var cur=null, sel=null, placing=false, drawing=null, dirty=false;
var selEl=null, secOpen={vis:true,el:true,fx:true};

function scr(){return P.screens.find(function(s){return s.id===cur;})||null;}
function curP(){var s=scr();return s?s.hotspots.find(function(p){return p.id===sel;})||null:null;}
function setDirty(v){dirty=v;$('#saveState').textContent=(v&&P.screens.length)?'● Cambios sin guardar':'';}
function markDirty(){setDirty(true);scheduleAutosave();}
window.addEventListener('beforeunload',function(e){if(dirty&&P.screens.length){e.preventDefault();e.returnValue='';}});

var toastTimer=0;
function toast(msg){
    var t=$('#toast');t.textContent=msg;t.hidden=false;
    clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.hidden=true;},2800);
}
function dataMime(d){var i=d.indexOf(';');return i>5?d.slice(5,i):'image/png';}
function blobOf(data,mime){return URL.createObjectURL(new Blob([dataURLtoBytes(data)],{type:mime}));}
/* Las URL blob: solo existen en esta pestaña; nunca se guardan (se regeneran al abrir) */
function eachImageBlock(proj,fn){
    proj.screens.forEach(function(s){s.hotspots.forEach(function(p){
        if(p.popup)p.popup.blocks.forEach(function(b){if(b.type==='image')fn(b);});
    });});
}
function hydrateBlobs(proj){
    proj.screens.forEach(function(s){s.blob=blobOf(s.data,s.mime);});
    eachImageBlock(proj,function(b){b.blob=blobOf(b.data,b.mime);});
}
function revokeBlobs(proj){
    proj.screens.forEach(function(s){if(s.blob)URL.revokeObjectURL(s.blob);});
    eachImageBlock(proj,function(b){if(b.blob)URL.revokeObjectURL(b.blob);});
}

/* ----- Carga de archivos ----- */
function readDataURL(file){
    return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result);};r.onerror=rej;r.readAsDataURL(file);});
}
function imgSize(url){
    return new Promise(function(res){var i=new Image();i.onload=function(){res({w:i.naturalWidth||1000,h:i.naturalHeight||700});};i.onerror=function(){res({w:1000,h:700});};i.src=url;});
}
function loadImg(url){
    return new Promise(function(res,rej){var i=new Image();i.onload=function(){res(i);};i.onerror=function(){rej(new Error('No se pudo leer la imagen.'));};i.src=url;});
}
/* Imágenes de pop-ups: si son muy grandes se reducen a 1600 px para no inflar el ZIP ni el proyecto */
var POP_MAX=1600;
async function prepPopupImage(file){
    var data=await readDataURL(file), mime=file.type||dataMime(data), img=await loadImg(data);
    var w=img.naturalWidth||800, h=img.naturalHeight||600;
    if(/gif|svg/.test(mime)||Math.max(w,h)<=POP_MAX) return {mime:mime,data:data,w:w,h:h};
    var k=POP_MAX/Math.max(w,h), nw=Math.round(w*k), nh=Math.round(h*k);
    var cv=document.createElement('canvas');cv.width=nw;cv.height=nh;
    var ctx=cv.getContext('2d'), out=(mime==='image/png'||mime==='image/webp')?'image/png':'image/jpeg';
    if(out==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,nw,nh);}
    ctx.drawImage(img,0,0,nw,nh);
    return {mime:out,data:cv.toDataURL(out,0.86),w:nw,h:nh};
}
async function addScreenFromData(name,data){
    var mime=dataMime(data);
    var sz=await imgSize(data);
    var s={id:uid(),name:name,mime:mime,data:data,w:sz.w,h:sz.h,hotspots:[]};
    s.blob=blobOf(data,mime);
    P.screens.push(s);
    cur=s.id; sel=null; markDirty();
}
function busy(msg){ if(msg){$('#busyMsg').textContent=msg;$('#busy').hidden=false;} else $('#busy').hidden=true; }

function loadPdfJs(){
    if(window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    return new Promise(function(res,rej){
        var s=document.createElement('script');
        s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload=function(){
            window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            res(window.pdfjsLib);
        };
        s.onerror=function(){rej(new Error('Para leer PDF se necesita internet la primera vez. Alternativa: guarda el PDF como imagen PNG/JPG.'));};
        document.head.appendChild(s);
    });
}
function parseRange(str,n){
    str=(str||'').trim().toLowerCase();
    var out=[],i;
    if(!str||str==='todas'||str==='todo'){for(i=1;i<=n;i++)out.push(i);return out;}
    str.split(',').forEach(function(part){
        var m=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
        if(!m)return;
        var a=+m[1],b=m[2]?+m[2]:a;
        for(var k=Math.min(a,b);k<=Math.max(a,b);k++) if(k>=1&&k<=n&&out.indexOf(k)<0) out.push(k);
    });
    return out;
}
async function addPdf(file){
    busy('Leyendo PDF…');
    var lib=await loadPdfJs();
    var doc=await lib.getDocument({data:await file.arrayBuffer()}).promise;
    busy(null);
    var pages=[];
    for(var pg=1;pg<=doc.numPages;pg++)pages.push(pg);
    var base=file.name.replace(/\.[^.]+$/,'');
    for(var k=0;k<pages.length;k++){
        busy('Convirtiendo página '+pages[k]+' ('+(k+1)+' de '+pages.length+')…');
        var page=await doc.getPage(pages[k]);
        var v1=page.getViewport({scale:1});
        var scale=Math.min(3,1600/v1.width);
        var vp=page.getViewport({scale:scale});
        var cv=document.createElement('canvas');
        cv.width=Math.round(vp.width);cv.height=Math.round(vp.height);
        await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;
        await addScreenFromData(doc.numPages>1?base+' p'+pages[k]:base,cv.toDataURL('image/png'));
    }
    busy(null);
}
async function handleFiles(list){
    var files=Array.prototype.slice.call(list);
    try{
        for(var i=0;i<files.length;i++){
            var f=files[i];
            if(f.type==='application/pdf'||/\.pdf$/i.test(f.name)) await addPdf(f);
            else if(f.type.indexOf('image/')===0) await addScreenFromData(f.name.replace(/\.[^.]+$/,''),await readDataURL(f));
        }
    }catch(err){busy(null);alert(err.message||err);}
    busy(null);
    renderAll();
}

/* ----- Render: pantallas ----- */
function renderScreens(){
    $('#screenList').innerHTML=P.screens.map(function(s,i){
        return '<li class="'+(s.id===cur?'on':'')+'" data-id="'+s.id+'"><img src="'+s.blob+'" alt="">'+
            '<div><input class="nm" data-sname value="'+esc(s.name)+'" aria-label="Nombre de la pantalla"><small>'+(i===0?'Principal':'Pantalla '+(i+1))+' · '+s.hotspots.length+' zona(s)</small></div>'+
            '<div class="mv"><button data-mv="-1" title="Subir">↑</button><button data-mv="1" title="Bajar">↓</button><button data-rm class="danger" title="Quitar">✕</button></div></li>';
    }).join('')||'<li class="empty">Aún no hay imágenes</li>';
}
$('#screenList').addEventListener('click',function(e){
    var li=e.target.closest('li[data-id]'); if(!li)return;
    var id=li.dataset.id, i=P.screens.findIndex(function(s){return s.id===id;});
    if(e.target.closest('[data-rm]')){
        if(!confirm('¿Quitar esta pantalla y sus zonas?'))return;
        P.screens.splice(i,1);
        P.screens.forEach(function(s){s.hotspots.forEach(function(p){if(p.target===id)p.target='';});});
        if(cur===id){cur=P.screens.length?P.screens[Math.max(0,i-1)].id:null;sel=null;}
        markDirty();renderAll();return;
    }
    var mv=e.target.closest('[data-mv]');
    if(mv){
        var j=i+(+mv.dataset.mv);
        if(j>=0&&j<P.screens.length){var t=P.screens[i];P.screens[i]=P.screens[j];P.screens[j]=t;markDirty();renderScreens();renderProps();}
        return;
    }
    if(e.target.matches('input'))return;
    if(cur!==id){cur=id;sel=null;renderAll();}
});
$('#screenList').addEventListener('input',function(e){
    if(!e.target.matches('[data-sname]'))return;
    var id=e.target.closest('li').dataset.id;
    P.screens.find(function(s){return s.id===id;}).name=e.target.value;
    markDirty();
});
$('#screenList').addEventListener('change',function(){renderProps();});
