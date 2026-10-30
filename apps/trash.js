/* Lennox_OS Trash — classic script, public shell/FS API only. */
(() => {
    'use strict';
    const os=window.LennoxOS,fs=os.fs;
    // Shared convention: /home/lennox/.Trash/<name>; .meta.json stores a JSON
    // map trashName -> {origPath, deletedAt}. Only .meta.json is internal: trashed
    // dotfiles remain visible here, so every discarded item can be restored.
    const TRASH='/home/lennox/.Trash',META=TRASH+'/.meta.json';
    const parent=path=>path.slice(0,path.lastIndexOf('/'))||'/';
    const join=(path,name)=>(path==='/'?'':path)+'/'+name;
    function el(tag,cls,text){const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;}
    function mkdirp(path){let next='';for(const part of path.split('/').filter(Boolean)){next+='/'+part;if(fs.get(next)?.type==='folder')continue;if(!fs.mkdir(next))return false;}return true;}
    function readMeta(){const raw=fs.read(META);if(raw===null)return fs.exists(META)?null:Object.create(null);try{const map=JSON.parse(raw);return map&&typeof map==='object'&&!Array.isArray(map)?Object.assign(Object.create(null),map):null;}catch(_){return null;}}
    function validOriginal(path){
        return typeof path==='string'&&path.startsWith('/')&&path.length<=2048&&!path.includes('\0')&&path!=='/'&&
            !path.split('/').some(p=>p==='.'||p==='..')&&!path.includes('//')&&!path.endsWith('/')&&
            path!==TRASH&&!path.startsWith(TRASH+'/')&&!TRASH.startsWith(path+'/');
    }
    function injectStyle(){
        if(document.getElementById('app-trash-style'))return;
        const style=el('style');style.id='app-trash-style';style.textContent=`
        .lx-trash{height:100%;display:flex;flex-direction:column;position:relative;overflow:hidden;background:var(--window-bg);color:var(--text-bright);font-size:12px}.lx-trash *{box-sizing:border-box}.lx-trash button{font:inherit;color:inherit;background:var(--window-bg);border:1px solid var(--window-border);border-radius:4px;padding:7px 10px;cursor:pointer}.lx-trash button:hover{border-color:var(--accent);color:var(--accent)}.lx-trash button:disabled{opacity:.4;cursor:default}.lx-trash :focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
        .lx-trash-toolbar{padding:12px;display:flex;gap:7px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--window-border)}.lx-trash-toolbar strong{color:var(--accent);margin-right:auto;letter-spacing:2px}.lx-trash-list{flex:1;min-height:0;overflow:auto}.lx-trash table{width:100%;border-collapse:collapse;text-align:left}.lx-trash th{position:sticky;top:0;background:var(--window-bg);color:var(--text-dim);font-weight:normal;font-size:11px;white-space:nowrap}.lx-trash td,.lx-trash th{padding:10px;border-bottom:1px solid var(--window-border);overflow-wrap:anywhere}.lx-trash tr[data-path]{cursor:default}.lx-trash tr.is-selected{background:color-mix(in srgb,var(--accent) 15%,transparent)}.lx-trash input{accent-color:var(--accent)}.lx-trash-name{min-width:140px}.lx-trash-location{color:var(--text-dim);font-size:11px}.lx-trash-empty{padding:50px 20px;text-align:center;color:var(--text-dim)}.lx-trash-empty strong{display:block;color:var(--accent);font-size:32px;margin-bottom:10px}.lx-trash-status{padding:8px 12px;color:var(--text-dim);font-size:11px;border-top:1px solid var(--window-border)}
        .lx-trash-modal{position:absolute;inset:0;z-index:10;display:grid;place-items:center;padding:20px;background:color-mix(in srgb,var(--window-bg) 85%,transparent)}.lx-trash-dialog{border:1px solid var(--accent);background:var(--window-bg);border-radius:7px;width:min(400px,100%);padding:20px;box-shadow:0 8px 35px var(--window-bg)}.lx-trash-dialog p{white-space:pre-wrap;overflow-wrap:anywhere}.lx-trash-dialog footer{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
        `;document.head.append(style);
    }
    os.registerApp({
        id:'trash',title:'Trash',desktop:true,startMenu:true,multiInstance:false,
        icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l1 3h5v2H2V6h5zm-3 7h14l-1 12H6zm4 2v7h2v-7zm4 0v7h2v-7z"/></svg>',
        defaultSize:{w:740,h:460},minSize:{w:360,h:280},
        onOpen(ctx){
            injectStyle();ctx.body.style.padding='0';ctx.body.style.overflow='hidden';
            const root=el('div','lx-trash'),toolbar=el('div','lx-trash-toolbar'),list=el('div','lx-trash-list'),status=el('div','lx-trash-status');
            list.tabIndex=0;list.setAttribute('aria-label','Trash contents');status.setAttribute('role','status');
            let selected=new Set(),nodes=[],map=Object.create(null),closed=false,pending=false,dismiss=null,anchor=null;
            function button(label,action,host=toolbar){const b=el('button','',label);b.type='button';b.addEventListener('click',action);host.append(b);return b;}
            toolbar.append(el('strong','','TRASH'));
            const restoreButton=button('Restore',restore),deleteButton=button('Delete permanently',()=>remove(false)),emptyButton=button('Empty trash',()=>remove(true));
            root.append(toolbar,list,status);ctx.body.append(root);
            function fail(message){os.notify({title:'Trash',body:message});}
            function confirm(title,message,label){
                if(dismiss)dismiss(false);
                return new Promise(resolve=>{
                    const overlay=el('div','lx-trash-modal'),box=el('div','lx-trash-dialog'),foot=el('footer');
                    box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',title);box.append(el('strong','',title),el('p','',message));
                    const previous=document.activeElement;
                    const finish=value=>{overlay.remove();dismiss=null;if(!closed&&previous?.isConnected)previous.focus();resolve(value);};dismiss=finish;
                    const cancel=button('Cancel',()=>finish(false),foot);button(label,()=>finish(true),foot);box.append(foot);overlay.append(box);root.append(overlay);
                    overlay.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();finish(false);}if(event.key==='Tab'){event.preventDefault();const buttons=[...foot.children],i=buttons.indexOf(document.activeElement);buttons[(i+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}});cancel.focus();
                });
            }
            function sync(){
                for(const row of list.querySelectorAll('tr[data-path]')){const yes=selected.has(row.dataset.path);row.classList.toggle('is-selected',yes);row.setAttribute('aria-selected',String(yes));row.querySelector('input').checked=yes;}
                restoreButton.disabled=!selected.size||!map;deleteButton.disabled=!selected.size;emptyButton.disabled=!nodes.length;
                status.textContent=nodes.length+' item'+(nodes.length===1?'':'s')+' · '+selected.size+' selected'+(!map?' · Invalid .meta.json; restore unavailable.':'');
            }
            function render(){
                if(closed)return;
                nodes=(fs.list(TRASH)||[]).filter(n=>n.path!==META);map=readMeta();selected=new Set([...selected].filter(p=>nodes.some(n=>n.path===p)));
                ctx.setTitle('Trash ('+nodes.length+')');list.replaceChildren();
                if(!nodes.length){const empty=el('div','lx-trash-empty');empty.append(el('strong','','∅'),el('span','','Trash is empty.'));list.append(empty);sync();return;}
                const table=el('table');table.setAttribute('aria-label','Deleted items');const head=el('thead'),heading=el('tr');
                for(const title of ['Select','Name','Original location','Deleted'])heading.append(el('th','',title));head.append(heading);const body=el('tbody');
                for(const node of nodes){
                    const row=el('tr');row.dataset.path=node.path;row.setAttribute('aria-selected',String(selected.has(node.path)));
                    const checkCell=el('td'),check=el('input');check.type='checkbox';check.setAttribute('aria-label','Select '+node.name);checkCell.append(check);
                    const info=map?.[node.name],deleted=Number.isFinite(info?.deletedAt)?new Date(info.deletedAt).toLocaleString():'Unknown';
                    row.append(checkCell,el('td','lx-trash-name',(node.type==='folder'?'▰ ':'≡ ')+node.name),el('td','lx-trash-location',typeof info?.origPath==='string'?info.origPath:'Unknown — metadata unavailable'),el('td','',deleted));
                    row.addEventListener('click',event=>{
                        const isCheckbox=event.target===check;
                        if(event.shiftKey&&anchor&&nodes.some(n=>n.path===anchor)){if(!event.ctrlKey&&!event.metaKey)selected.clear();const a=nodes.findIndex(n=>n.path===anchor),b=nodes.findIndex(n=>n.path===node.path);nodes.slice(Math.min(a,b),Math.max(a,b)+1).forEach(n=>selected.add(n.path));}
                        else if(event.ctrlKey||event.metaKey||isCheckbox){if(selected.has(node.path))selected.delete(node.path);else selected.add(node.path);anchor=node.path;}
                        else{selected=new Set([node.path]);anchor=node.path;}sync();
                    });
                    row.addEventListener('dblclick',event=>{if(event.target!==check){selected=new Set([node.path]);restore();}});
                    row.addEventListener('contextmenu',event=>{event.preventDefault();if(!selected.has(node.path)){selected=new Set([node.path]);sync();}os.contextMenu(event.clientX,event.clientY,[{label:'Restore',disabled:!map,action:restore},{label:'Delete permanently',action:()=>remove(false)}]);});body.append(row);
                }
                table.append(head,body);list.append(table);sync();
            }
            function restore(){
                if(closed)return;
                const current=readMeta();if(!current){fail('Invalid Trash metadata; restore is unavailable.');return;}
                for(const path of [...selected]){
                    const node=fs.get(path);if(!node||parent(node.path)!==TRASH||path===META)continue;
                    const info=current[node.name],destination=info?.origPath;
                    if(!validOriginal(destination)){fail('Original location is missing or invalid for '+node.name);continue;}
                    if(fs.exists(destination)){fail('Restore skipped: '+destination+' already exists. Rename or move that item first.');continue;}
                    if(!mkdirp(parent(destination))||!fs.rename(path,destination)){fail('Could not restore '+node.name);continue;}
                    delete current[node.name];
                }
                if(!fs.write(META,JSON.stringify(current)))fail('Items restored, but Trash metadata could not be saved.');
                selected.clear();render();
            }
            async function remove(all){
                const paths=all?nodes.map(n=>n.path):[...selected];if(!paths.length)return;
                if(!(await confirm(all?'Empty trash?':'Delete permanently?',paths.length+' item(s) will be permanently removed. This cannot be undone.',all?'Empty trash':'Delete permanently'))||closed)return;
                const current=readMeta();
                for(const path of paths){if(parent(path)!==TRASH||path===META)continue;if(fs.remove(path)){if(current)delete current[path.split('/').pop()];}else if(fs.exists(path))fail('Could not delete '+path.split('/').pop());}
                if(current&&!fs.write(META,JSON.stringify(current)))fail('Could not update Trash metadata.');
                selected.clear();render();
            }
            root.addEventListener('keydown',event=>{
                if(dismiss)return;
                if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='a'){event.preventDefault();event.stopPropagation();selected=new Set(nodes.map(n=>n.path));sync();}
                else if(event.key==='Delete'){event.preventDefault();event.stopPropagation();remove(false);}
                else if(event.key==='Enter'&&!event.target.closest('button')){event.preventDefault();event.stopPropagation();restore();}
            });
            const onFS=()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;if(!closed)render();});};
            fs.addEventListener('change',onFS);ctx.onClose(()=>{closed=true;fs.removeEventListener('change',onFS);if(dismiss)dismiss(false);});
            if(!mkdirp(TRASH))fail('Could not create Trash folder.');
            render();
        }
    });
})();
