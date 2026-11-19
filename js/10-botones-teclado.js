/* Botones de cabecera, arrastrar archivos, validación y atajos de teclado */
/* ----- Botones de cabecera ----- */
$('#btnAddImg').onclick=function(){$('#fileImg').click();};
$('#fileImg').onchange=function(e){handleFiles(e.target.files);e.target.value='';};
$('#btnPlace').onclick=function(){
    if(!scr()){alert('Sube primero una imagen.');return;}
    drawing=null;placing=!placing;renderStage();renderStatus();this.blur();
};
$('#shapeSel').onchange=function(){
    if(!scr()){alert('Sube primero una imagen.');this.blur();return;}
    drawing=null;placing=true;renderStage();renderStatus();this.blur();
};
$('#btnDraw').onclick=function(){if(drawing)cancelDraw();else startDraw();this.blur();};
$('#btnFinish').onclick=function(){finishDraw();this.blur();};
$('#btnCancel').onclick=function(){cancelDraw();this.blur();};

$('#btnNew').onclick=function(){newProject();this.blur();};
$('#btnOpen').onclick=function(){openProject();this.blur();};
$('#btnSave').onclick=function(e){saveProject(e.shiftKey);this.blur();};

window.addEventListener('dragover',function(e){e.preventDefault();});
window.addEventListener('drop',function(e){
    e.preventDefault();
    var fl=e.dataTransfer&&e.dataTransfer.files; if(!fl||!fl.length)return;
    if(popEdOpen()){addPopupImages(fl);return;}          /* imágenes soltadas en el editor de pop-up */
    var proj=Array.prototype.find.call(fl,function(f){return /\.json$/i.test(f.name)||f.type==='application/json';});
    if(proj){loadProjectFile(proj,null);return;}          /* archivo de proyecto */
    handleFiles(fl);
});

function download(blob,name){
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
    document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},4000);
}
function validate(){
    if(!P.screens.length){alert('Sube al menos una imagen.');return false;}
    var issues=[];
    P.screens.forEach(function(s){s.hotspots.forEach(function(p,i){
        if(p.action==='goto'&&!p.target)issues.push(s.name+' · zona '+(i+1)+': no tiene pantalla de destino');
        if(p.action==='link'&&!p.url)issues.push(s.name+' · zona '+(i+1)+': no tiene URL');
        if((p.action==='popup'&&!popHasContent(p.popup))||(p.action==='float'&&!popHasContent(p.popup)&&!(p.els&&p.els.length)))issues.push(s.name+' · zona '+(i+1)+': el '+(p.action==='float'?'elemento flotante':'pop-up')+' está vacío');
    });});
    if(issues.length)return confirm('Se encontraron avisos:\n\n• '+issues.slice(0,10).join('\n• ')+'\n\n¿Exportar de todos modos?');
    return true;
}
$('#btnExport').onclick=function(){
    if(!validate())return;
    download(makeZip(buildFiles(P)),slug(P.title)+'.zip');
    /* Exportar no equivale a guardar: el ZIP no se puede volver a editar, por eso no se limpia el aviso de cambios */
    if(dirty)toast('ZIP exportado. Para seguir editando después, usa también «Guardar proyecto».');
};
$('#btnPreview').onclick=function(){
    if(!P.screens.length){alert('Sube al menos una imagen.');return;}
    $('#pvFrame').srcdoc=buildPreviewHTML(P);$('#preview').hidden=false;
};
$('#pvClose').onclick=function(){$('#preview').hidden=true;$('#pvFrame').srcdoc='';};
$('#pvMobile').onclick=function(){$('#pvFrame').classList.add('mobile');};
$('#pvDesktop').onclick=function(){$('#pvFrame').classList.remove('mobile');};

/* ----- Teclado ----- */
window.addEventListener('keydown',function(e){
    var typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if((e.ctrlKey||e.metaKey)&&!e.altKey){
        var k=e.key.toLowerCase();
        if(k==='s'){e.preventDefault();saveProject(e.shiftKey);return;}
        if(k==='o'){e.preventDefault();openProject();return;}
    }
    if(popEdOpen()){ if(e.key==='Escape'){e.preventDefault();closePopEd();} return; }
    if(e.key==='Escape'){
        if(!$('#preview').hidden){$('#pvClose').click();return;}
        if(chain){cancelChain();return;}
        if(drawing){cancelDraw();return;}
        if(placing){placing=false;renderStage();renderStatus();}
        return;
    }
    if(drawing&&!typing){
        if(e.key==='Enter'){finishDraw();e.preventDefault();}
        else if(e.key==='Backspace'||e.key==='Delete'){drawing.pts.pop();renderHotspots();renderStatus();e.preventDefault();}
        return;
    }
    if(!typing){
        if(e.key==='Control'){ctrlTap=true;}
        else if(e.ctrlKey||e.metaKey){
            ctrlTap=false;
            var kk=String(e.key).toLowerCase();
            if(kk==='c'){if(doCopy())e.preventDefault();return;}
            if(kk==='v'){if(doPaste())e.preventDefault();return;}
        }else if(e.key==='Shift'&&!e.repeat){
            var ln0=selLine(); if(ln0){lineStraighten(ln0.el);markDirty();renderHotspots();}
        }
    }
    var p=curP(); if(!p||typing)return;
    if((e.key==='Delete'||e.key==='Backspace')&&selEl&&p.els&&p.els.some(function(x){return x.id===selEl;})){delEl(p);e.preventDefault();return;}
    if(e.key==='Delete'||e.key==='Backspace'){
        var s=scr();s.hotspots=s.hotspots.filter(function(x){return x.id!==p.id;});sel=null;markDirty();
        renderScreens();renderHotspots();renderChips();renderProps();e.preventDefault();return;
    }
    var step=e.shiftKey?1:0.2, mv={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[e.key];
    if(mv){moveBy(p,mv[0],mv[1]);markDirty();renderHotspots();syncNumFields();e.preventDefault();}
});
