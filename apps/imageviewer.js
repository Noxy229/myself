(() => {
    'use strict';
    const os = window.LennoxOS;
    const style = document.createElement('style'); style.id = 'app-imageviewer-style';
    style.textContent = `.lx-images{height:100%;display:flex;flex-direction:column;color:var(--text-bright);background:var(--window-bg);font:12px monospace}.lx-images .toolbar{display:flex;gap:5px;padding:7px;flex-wrap:wrap;border-bottom:1px solid var(--window-border)}.lx-images button{font:inherit;background:var(--window-bg);color:inherit;border:1px solid var(--window-border);padding:6px 9px}.lx-images button:hover{border-color:var(--accent)}.lx-images .viewport{flex:1;min-height:0;overflow:hidden;position:relative;touch-action:none;cursor:grab;background:repeating-conic-gradient(var(--window-bg) 0% 25%,var(--window-border) 0% 50%) 0/24px 24px}.lx-images img{position:absolute;left:50%;top:50%;max-width:none;max-height:none;transform-origin:center;user-select:none;pointer-events:none}.lx-images .message{position:absolute;inset:0;display:grid;place-items:center;padding:20px;text-align:center;pointer-events:none}.lx-images .status{padding:7px;overflow-wrap:anywhere;border-top:1px solid var(--window-border);color:var(--text-dim)}.lx-images [hidden]{display:none!important}`;
    document.head.append(style);
    os.registerApp({ id:'imageviewer',title:'Images',startMenu:true,defaultSize:{w:740,h:540},minSize:{w:320,h:250},icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h20v18H2zm2 16h16l-5-8-4 5-3-3zm3-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/></svg>',
        onOpen(ctx) {
            ctx.body.style.cssText='padding:0;overflow:hidden';
            const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
            const root=make('div','lx-images'),bar=make('div','toolbar'),view=make('div','viewport'),img=make('img'),message=make('div','message','Open an image from Files or Paint.'),status=make('div','status','No image');
            img.alt='';img.draggable=false;img.hidden=true;view.append(img,message);root.append(bar,view,status);ctx.body.append(root);
            let path=null,url=null,zoom=1,rotation=0,x=0,y=0,fitMode=true,ready=false,closed=false,drag=null;
            function draw(){img.style.transform=`translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${zoom})`;status.textContent=path ? `${path.split('/').pop()} · ${ready?img.naturalWidth+' × '+img.naturalHeight+' · '+Math.round(zoom*100)+'%':'Loading…'}`:'No image';}
            function fit(){if(!ready)return;const swap=rotation%180!==0,w=swap?img.naturalHeight:img.naturalWidth,h=swap?img.naturalWidth:img.naturalHeight;zoom=Math.max(.01,Math.min((view.clientWidth-24)/w,(view.clientHeight-24)/h,1));x=y=0;fitMode=true;draw();}
            function scale(factor){if(!ready)return;zoom=Math.max(.01,Math.min(32,zoom*factor));fitMode=false;draw();}
            function release(){if(url)URL.revokeObjectURL(url);url=null;}
            function load(args){if(closed)return;const next=args?.path;if(typeof next!=='string')return;const content=os.fs.read(next);ready=false;img.hidden=true;message.hidden=false;release();path=next;rotation=x=y=0;ctx.setTitle(next.split('/').pop()+' — Images');
                if(content===null){message.textContent='Image file no longer exists.';status.textContent=next;return;}
                let source;
                if(/\.svg$/i.test(next)&&!content.startsWith('data:')){url=URL.createObjectURL(new Blob([content],{type:'image/svg+xml'}));source=url;}
                else if(/^data:image\/(?:png|jpeg|jpg|gif|svg\+xml|webp|bmp)(?:;[^,]*)?,/i.test(content)){source=content;}
                else {message.textContent='This file does not contain a supported image data URL.';status.textContent=next;return;}
                message.textContent='Loading image…';img.onload=()=>{if(closed)return;ready=true;img.hidden=false;message.hidden=true;fit();};img.onerror=()=>{if(closed)return;ready=false;img.hidden=true;message.hidden=false;message.textContent='Image could not be decoded.';status.textContent=next+' · Decode failed';};img.src=source;draw();
            }
            function adjacent(delta){if(!path)return;const folder=path.slice(0,path.lastIndexOf('/'))||'/',files=(os.fs.list(folder)||[]).filter(n=>n.type==='file'&&/\.(png|jpe?g|gif|svg)$/i.test(n.name));if(!files.length)return;const i=files.findIndex(n=>n.path===path);load({path:files[(i+delta+files.length)%files.length].path});}
            function button(text,fn){const b=make('button',null,text);b.type='button';b.onclick=fn;bar.append(b);return b;}
            button('← Previous',()=>adjacent(-1));button('Next →',()=>adjacent(1));button('−',()=>scale(1/1.25)).setAttribute('aria-label','Zoom out');button('+',()=>scale(1.25)).setAttribute('aria-label','Zoom in');button('Fit',fit);button('100%',()=>{zoom=1;x=y=0;fitMode=false;draw();});button('Rotate',()=>{rotation=(rotation+90)%360;if(fitMode)fit();else draw();});button('Edit in Paint',()=>{if(path&&ready)os.openApp('paint',{path});});
            view.addEventListener('wheel',e=>{e.preventDefault();scale(e.deltaY<0?1.15:1/1.15);},{passive:false});
            view.addEventListener('pointerdown',e=>{if(!ready||e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,ox:x,oy:y};view.setPointerCapture(e.pointerId);view.style.cursor='grabbing';});
            view.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;x=drag.ox+e.clientX-drag.x;y=drag.oy+e.clientY-drag.y;fitMode=false;draw();});
            const stop=e=>{if(drag?.id!==e.pointerId)return;drag=null;view.style.cursor='grab';};view.addEventListener('pointerup',stop);view.addEventListener('pointercancel',stop);view.addEventListener('lostpointercapture',stop);
            ctx.onResize(()=>{if(fitMode)fit();});ctx.onArgs(load);ctx.onClose(()=>{closed=true;img.onload=img.onerror=null;img.removeAttribute('src');release();});load(ctx.args);
        }
    });
    for(const ext of ['png','jpg','jpeg','gif','svg'])os.registerFileHandler(ext,'imageviewer');
})();
