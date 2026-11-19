/* Guardar/abrir proyectos y autoguardado (IndexedDB) */
/* =====================  GUARDAR / ABRIR PROYECTOS  ===================== */
var PROJECT_FORMAT='itv-project', PROJECT_VERSION=1, fileHandle=null;
var FILE_TYPES=[{description:'Proyecto del Generador de interactivos',accept:{'application/json':['.json']}}];

function serializeProject(){
    return JSON.stringify({
        format:PROJECT_FORMAT, version:PROJECT_VERSION,
        app:'Generador de interactivos · ESTur IPN', savedAt:new Date().toISOString(),
        project:P
    },function(k,v){return k==='blob'?undefined:v;});
}

/* Valida y limpia un proyecto leído de archivo: nada de lo que venga del JSON se usa sin revisar */
function normBlock(b){
    if(!b||typeof b!=='object')return null;
    var id=String(b.id||uid());
    if(b.type==='image'){
        if(typeof b.data!=='string'||b.data.indexOf('data:image/')!==0)return null;
        return {id:id,type:'image',mime:String(b.mime||dataMime(b.data)),data:b.data,w:+b.w||0,h:+b.h||0,
            width:['full','md','sm'].indexOf(b.width)>=0?b.width:'full',alt:String(b.alt||''),caption:String(b.caption||'')};
    }
    if(['heading','text','note'].indexOf(b.type)>=0)return {id:id,type:b.type,text:String(b.text||'')};
    return null;
}
function normPopup(o){
    o=(o&&typeof o==='object')?o:{};
    return {title:String(o.title||''),size:['sm','md','lg','xl'].indexOf(o.size)>=0?o.size:'md',
        blocks:(Array.isArray(o.blocks)?o.blocks:[]).map(normBlock).filter(Boolean)};
}
function normEl(e){
    if(!e||typeof e!=='object'||['ell','rect','line','text'].indexOf(e.t)<0)return null;
    var n=function(v,d){v=+v;return isFinite(v)?v:d;}, c=function(v,d){return /^#[0-9a-f]{6}$/i.test(v)?v:d;};
    return {id:String(e.id||uid()),t:e.t,x:clamp(n(e.x,10),0,100),y:clamp(n(e.y,10),0,100),w:clamp(n(e.w,10),0.5,100),h:clamp(n(e.h,10),0.5,100),x2:clamp(n(e.x2,20),0,100),y2:clamp(n(e.y2,10),0,100),fill:c(e.fill,'#9fc3e6'),str:c(e.str,'#3b6ea5'),sw:clamp(n(e.sw,2),0,12),op:clamp(n(e.op,.35),0,1),txt:String(e.txt==null?'':e.txt),fs:clamp(n(e.fs,2.2),.8,12),col:c(e.col,'#1f3d6e'),b:!!e.b,al:['left','center','right'].indexOf(e.al)>=0?e.al:'left'};
}
function normHotspot(p){
    if(!p||typeof p!=='object')return null;
    var num=function(v,d){v=+v;return isFinite(v)?v:d;};
    var q={id:String(p.id||uid()),
        shape:SHAPES.some(function(s){return s[0]===p.shape;})?p.shape:'rect',
        n:clamp(Math.round(num(p.n,6)),3,40),rot:num(p.rot,0),
        x:clamp(num(p.x,50),0,100),y:clamp(num(p.y,50),0,100),w:clamp(num(p.w,10),0.1,100),h:clamp(num(p.h,10),0.1,100),
        action:['goto','link','popup','close','float'].indexOf(p.action)>=0?p.action:'goto',
        target:String(p.target||''),url:String(p.url||'')};
    if(q.shape==='custom'){
        if(Array.isArray(p.pts)&&p.pts.length>=3){
            q.pts=p.pts.map(function(a){return [clamp(num(a&&a[0],0),0,100),clamp(num(a&&a[1],0),0,100)];});
            updateBBox(q);
        }else q.shape='rect';
    }
    if(p.popup||q.action==='popup'||q.action==='float')q.popup=normPopup(p.popup);
    if(p.vis){
        var vo=(p.vs&&typeof p.vs==='object')?p.vs:{}, d0=defVs(), cc=function(v,d){return /^#[0-9a-f]{6}$/i.test(v)?v:d;};
        q.vis=true;
        q.vs={fill:cc(vo.fill,d0.fill),op:clamp(num(vo.op,d0.op),0,1),str:cc(vo.str,d0.str),sw:clamp(num(vo.sw,d0.sw),0,20),txt:String(vo.txt==null?d0.txt:vo.txt),col:cc(vo.col,d0.col),fs:clamp(num(vo.fs,d0.fs),3,40),b:vo.b==null?d0.b:!!vo.b,rad:clamp(num(vo.rad,d0.rad),0,50),sh:vo.sh==null?d0.sh:!!vo.sh};
    }
    if(['tr','tl','tt','tb','ring','glow'].indexOf(p.hv)>=0){q.hv=p.hv;q.hc=/^#[0-9a-f]{6}$/i.test(p.hc)?p.hc:'#7fa9d6';}
    if(Array.isArray(p.els))q.els=p.els.map(normEl).filter(Boolean);
    if(q.action==='float'||p.fl){var fo=(p.fl&&typeof p.fl==='object')?p.fl:{};var fw=clamp(num(fo.w,34),10,100);q.fl={w:fw,x:clamp(num(fo.x,5),0,100-fw),y:clamp(num(fo.y,5),0,100)};}
    return q;
}
function normalizeProject(raw){
    if(!raw||typeof raw!=='object')throw new Error('El archivo no contiene un proyecto.');
    var src=raw.format===PROJECT_FORMAT?raw.project:raw;
    if(raw.format===PROJECT_FORMAT&&+raw.version>PROJECT_VERSION)
        throw new Error('Este proyecto se creó con una versión más nueva del generador. Actualiza tu editor.html.');
    if(!src||!Array.isArray(src.screens))throw new Error('El archivo no es un proyecto del Generador de interactivos.');
    var th=src.theme||{};
    var out={title:String(src.title||'Mi interactivo'),
        theme:{transition:['none','fade','slide','zoom'].indexOf(th.transition)>=0?th.transition:'fade',
            accent:/^#[0-9a-f]{6}$/i.test(th.accent||'')?th.accent:'#5b3a8e'},
        screens:[]};
    var seen={};
    src.screens.forEach(function(s){
        if(!s||typeof s.data!=='string'||s.data.indexOf('data:image/')!==0)return;
        var id=String(s.id||uid()); if(seen[id])id=uid(); seen[id]=1;
        out.screens.push({id:id,name:String(s.name||'Pantalla'),mime:String(s.mime||dataMime(s.data)),data:s.data,
            w:+s.w||1000,h:+s.h||700,hotspots:(Array.isArray(s.hotspots)?s.hotspots:[]).map(normHotspot).filter(Boolean)});
    });
    if(!out.screens.length&&src.screens.length)throw new Error('El proyecto no contiene imágenes válidas.');
    out.screens.forEach(function(s){s.hotspots.forEach(function(p){if(p.target&&!seen[p.target])p.target='';});});
    return out;
}
function applyProject(np){
    revokeBlobs(P);hydrateBlobs(np);
    P=np;cur=P.screens.length?P.screens[0].id:null;sel=null;placing=false;drawing=null;
    if(popEdOpen()){$('#popEd').hidden=true;peP=null;}
    renderAll();
}

async function saveProject(asNew){
    if(!P.screens.length){toast('Aún no hay nada que guardar: sube al menos una imagen.');return;}
    var json=serializeProject(), name=slug(P.title)+'.itv.json';
    if(window.showSaveFilePicker){
        try{
            if(!fileHandle||asNew)fileHandle=await window.showSaveFilePicker({suggestedName:name,types:FILE_TYPES});
            var w=await fileHandle.createWritable();await w.write(json);await w.close();
            setDirty(false);toast('Proyecto guardado en «'+fileHandle.name+'»');return;
        }catch(err){
            if(err&&err.name==='AbortError')return;
            fileHandle=null; /* sin permiso o no disponible: se descarga como respaldo */
        }
    }
    download(new Blob([json],{type:'application/json'}),name);
    setDirty(false);toast('Proyecto descargado: '+name);
}
async function loadProjectFile(file,handle){
    if(dirty&&P.screens.length&&!confirm('El proyecto actual tiene cambios sin guardar.\n¿Abrir «'+file.name+'» de todos modos?'))return;
    busy('Abriendo proyecto…');
    try{
        var raw;
        try{raw=JSON.parse(await file.text());}
        catch(e){throw new Error('El archivo está dañado o no es un proyecto (.json) del generador.');}
        var np=normalizeProject(raw);
        applyProject(np);
        fileHandle=handle||null;setDirty(false);
        toast('Proyecto abierto: '+np.screens.length+' pantalla(s)');
    }catch(err){alert('No se pudo abrir el proyecto.\n\n'+(err.message||err));}
    finally{busy(null);}
}
async function openProject(){
    if(window.showOpenFilePicker){
        try{
            var hs=await window.showOpenFilePicker({types:FILE_TYPES,multiple:false});
            await loadProjectFile(await hs[0].getFile(),hs[0]);return;
        }catch(err){if(err&&err.name==='AbortError')return;}
    }
    $('#fileProj').click();
}
function newProject(){
    if(dirty&&P.screens.length&&!confirm('El proyecto actual tiene cambios sin guardar.\n¿Empezar uno nuevo de todos modos?'))return;
    applyProject(emptyProject());fileHandle=null;setDirty(false);idbDel('autosave');
}
$('#fileProj').onchange=function(e){var f=e.target.files[0];e.target.value='';if(f)loadProjectFile(f,null);};

/* ----- Autoguardado de respaldo en este navegador (IndexedDB, admite proyectos grandes) ----- */
var dbP=null, autoTimer=0, autosaveOn=true;
function idb(){
    if(!dbP)dbP=new Promise(function(res,rej){
        if(!window.indexedDB)return rej(new Error('sin IndexedDB'));
        var r=indexedDB.open('itv-editor',1);
        r.onupgradeneeded=function(){r.result.createObjectStore('kv');};
        r.onsuccess=function(){res(r.result);};r.onerror=function(){rej(r.error);};
    });
    return dbP;
}
function idbReq(mode,fn){
    return idb().then(function(db){return new Promise(function(res,rej){
        var tx=db.transaction('kv',mode), rq=fn(tx.objectStore('kv'));
        tx.oncomplete=function(){res(rq&&rq.result);};tx.onerror=tx.onabort=function(){rej(tx.error);};
    });});
}
function idbGet(k){return idbReq('readonly',function(s){return s.get(k);}).catch(function(){return null;});}
function idbPut(k,v){return idbReq('readwrite',function(s){return s.put(v,k);}).catch(function(){});}
function idbDel(k){return idbReq('readwrite',function(s){return s.delete(k);}).catch(function(){});}
function scheduleAutosave(){
    if(!autosaveOn)return;
    clearTimeout(autoTimer);
    autoTimer=setTimeout(function(){
        if(P.screens.length)idbPut('autosave',{at:Date.now(),title:P.title,json:serializeProject()});
    },1500);
}
function checkRecovery(){
    idbGet('autosave').then(function(rec){
        if(!rec||!rec.json)return;
        autosaveOn=false; /* no sobrescribir el respaldo hasta que el usuario decida */
        $('#recoverWhen').textContent='«'+(rec.title||'sin título')+'», '+new Date(rec.at).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'});
        $('#recover').hidden=false;
        $('#btnRecover').onclick=function(){
            if(P.screens.length&&!confirm('Esto reemplazará lo que tienes abierto ahora. ¿Continuar?'))return;
            try{applyProject(normalizeProject(JSON.parse(rec.json)));fileHandle=null;autosaveOn=true;setDirty(true);toast('Sesión recuperada. Recuerda guardar el proyecto.');}
            catch(err){alert('No se pudo recuperar el respaldo.\n\n'+(err.message||err));autosaveOn=true;}
            $('#recover').hidden=true;
        };
        $('#btnDiscard').onclick=function(){idbDel('autosave');autosaveOn=true;$('#recover').hidden=true;if(P.screens.length)scheduleAutosave();};
    });
}
