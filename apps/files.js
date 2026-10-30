/* Lennox_OS Files — classic script, public shell/FS API only. */
(() => {
    'use strict';
    const os = window.LennoxOS;
    const fs = os.fs;
    const HOME = '/home/lennox';
    // Shared Trash convention: .Trash/<name>, with collision suffixes; .meta.json is
    // a JSON map trashName -> {origPath, deletedAt}. Dot names are hidden by default.
    const TRASH = HOME + '/.Trash';
    const META = TRASH + '/.meta.json';
    let clipboard = null; // Shared by all Files windows in this session.
    const parent = path => path.slice(0, path.lastIndexOf('/')) || '/';
    const join = (path, name) => (path === '/' ? '' : path) + '/' + name;
    const nameOf = path => path.split('/').pop();
    const below = (path, base) => path === base || path.startsWith(base + '/');
    const folderIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5h8l2 2h10v13H2z"/></svg>';
    function el(tag, cls, text) {
        const node = document.createElement(tag);
        if (cls) node.className = cls;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    function mkdirp(path) {
        let next = '';
        for (const part of path.split('/').filter(Boolean)) {
            next += '/' + part;
            if (fs.get(next)?.type === 'folder') continue;
            if (!fs.mkdir(next)) return false;
        }
        return true;
    }
    function metadata() {
        const raw = fs.read(META);
        if (raw === null) return fs.exists(META) ? null : Object.create(null);
        try {
            const value = JSON.parse(raw);
            return value && typeof value === 'object' && !Array.isArray(value) ? Object.assign(Object.create(null), value) : null;
        } catch (_) { return null; }
    }
    function unique(dir, name) {
        if (dir === TRASH && name === '.meta.json') name = '.meta (2).json';
        if (!fs.exists(join(dir, name))) return join(dir, name);
        const dot = name.lastIndexOf('.');
        const stem = dot > 0 ? name.slice(0, dot) : name;
        const ext = dot > 0 ? name.slice(dot) : '';
        for (let n = 2; n < 10000; n++) {
            const path = join(dir, stem + ' (' + n + ')' + ext);
            if (!fs.exists(path)) return path;
        }
        return null;
    }
    function topPaths(paths) {
        return [...new Set(paths)].filter(path => !paths.some(other => other !== path && below(path, other)));
    }
    function typeOf(node) {
        if (node.type === 'folder') return 'Folder';
        const ext = node.name.includes('.') ? node.name.split('.').pop().toLowerCase() : '';
        return ({txt:'Text document', md:'Markdown', png:'PNG image', jpg:'JPEG image', jpeg:'JPEG image', svg:'SVG image', json:'JSON', js:'JavaScript', html:'HTML', css:'Stylesheet', pdf:'PDF'})[ext] || (ext ? ext.toUpperCase() + ' file' : 'File');
    }
    function glyph(node) {
        if (node.type === 'folder') return '▰';
        if (/\.(png|jpe?g|gif|svg|webp)$/i.test(node.name)) return '▧';
        if (/\.(js|json|css|html)$/i.test(node.name)) return '{ }';
        if (/\.(mp3|wav|ogg)$/i.test(node.name)) return '♫';
        return /\.md$/i.test(node.name) ? 'M↓' : '≡';
    }
    const byteSize = node => node.type === 'folder' ? 0 : new TextEncoder().encode(node.content).length;
    const size = node => node.type === 'folder' ? '—' : (node.byteSize ?? byteSize(node)).toLocaleString() + ' B';
    function injectStyle() {
        if (document.getElementById('app-files-style')) return;
        const style = el('style');
        style.id = 'app-files-style';
        style.textContent = `
        .lx-files{height:100%;display:flex;flex-direction:column;overflow:hidden;color:var(--text-bright);background:var(--window-bg);font-size:12px;line-height:1.4;position:relative}
        .lx-files *{box-sizing:border-box}.lx-files button,.lx-files input{font:inherit;color:inherit;border:1px solid var(--window-border);background:var(--window-bg);border-radius:4px;padding:6px 9px;min-width:0}
        .lx-files button{cursor:pointer}.lx-files button:hover,.lx-files button[aria-pressed=true]{border-color:var(--accent);color:var(--accent)}.lx-files button:disabled{opacity:.4;cursor:default}
        .lx-files :focus-visible{outline:2px solid var(--accent);outline-offset:-2px}.lx-files-toolbar{display:flex;gap:5px;padding:9px;border-bottom:1px solid var(--window-border);flex-wrap:wrap}.lx-files-path{flex:1;min-width:120px!important}.lx-files-search{width:140px}
        .lx-files-main{display:flex;flex:1;min-height:0}.lx-files-side{width:140px;flex-shrink:0;padding:12px 8px;border-right:1px solid var(--window-border);display:flex;flex-direction:column;gap:6px}.lx-files-side small{color:var(--text-dim);padding:4px 8px;letter-spacing:2px}.lx-files-side button{text-align:left;border-color:transparent}.lx-files-side button.is-current{color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent)}
        .lx-files-pane{flex:1;min-width:0;display:flex;flex-direction:column}.lx-files-actions{padding:7px;display:flex;gap:5px;flex-wrap:wrap;border-bottom:1px solid var(--window-border)}.lx-files-actions button{font-size:11px}.lx-files-items{flex:1;min-height:0;overflow:auto;padding:12px;align-content:start}.lx-files-items.is-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:8px}
        .lx-files-item{min-width:0;cursor:default;border:1px solid transparent;border-radius:5px;padding:10px 6px;position:relative}.lx-files-item:hover{background:color-mix(in srgb,var(--text-bright) 5%,transparent)}.lx-files-item.is-selected{background:color-mix(in srgb,var(--accent) 15%,transparent);border-color:var(--accent)}.lx-files-item.is-cut{opacity:.45}.lx-files-item.is-drop{outline:2px dashed var(--accent)}
        .lx-files-icon{font-size:34px;line-height:1.2;color:var(--accent);display:block}.lx-files-name{display:block;overflow-wrap:anywhere}.lx-files-items.is-grid .lx-files-item{text-align:center}.lx-files-items.is-grid .lx-files-detail{display:none}.lx-files-items.is-list{padding:0;display:block}.lx-files-items.is-list .lx-files-item,.lx-files-head{display:grid;grid-template-columns:minmax(150px,2fr) 85px 145px minmax(95px,1fr);gap:8px;align-items:center;padding:7px 10px;border-radius:0}
        .lx-files-items.is-list .lx-files-icon{font-size:19px;display:inline-block;margin-right:9px;vertical-align:middle}.lx-files-items.is-list .lx-files-name{display:inline}.lx-files-item input{width:100%;padding:3px}.lx-files-head{overflow:auto;border-bottom:1px solid var(--window-border);flex-shrink:0}.lx-files-head button{text-align:left;border:0;padding:3px;font-size:11px}.lx-files-detail{color:var(--text-dim);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lx-files-empty{color:var(--text-dim);padding:25px;grid-column:1/-1}.lx-files-status{padding:7px 12px;border-top:1px solid var(--window-border);color:var(--text-dim);font-size:11px;flex-shrink:0}
        .lx-files-modal{position:absolute;inset:0;z-index:10;background:color-mix(in srgb,var(--window-bg) 85%,transparent);display:grid;place-items:center;padding:20px}.lx-files-dialog{width:min(400px,100%);padding:20px;border:1px solid var(--accent);background:var(--window-bg);border-radius:7px;box-shadow:0 8px 35px var(--window-bg)}.lx-files-dialog p{white-space:pre-wrap;overflow-wrap:anywhere}.lx-files-dialog footer{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}
        @media(max-width:600px){.lx-files-side{width:95px}.lx-files-search{width:100px}.lx-files-items.is-list .lx-files-item,.lx-files-head{grid-template-columns:minmax(125px,2fr) 70px 120px 95px;min-width:470px}.lx-files-pane{overflow:auto}}
        `;
        document.head.append(style);
    }
    os.registerApp({
        id:'files', title:'Files', icon:folderIcon, desktop:true, startMenu:true, multiInstance:true,
        defaultSize:{w:820,h:520}, minSize:{w:380,h:300},
        onOpen(ctx) {
            injectStyle();
            ctx.body.style.padding = '0'; ctx.body.style.overflow = 'hidden';
            const root = el('div','lx-files');
            const toolbar = el('div','lx-files-toolbar');
            function button(label, action, host = toolbar) {
                const node = el('button','',label); node.type='button'; node.addEventListener('click',action); host.append(node); return node;
            }
            let path = HOME, history = [], historyAt = -1, nodes = [], selected = new Set(), anchor = null, cursor = null;
            let view = os.settings.get('files.view','grid'), sortKey = 'name', ascending = true;
            let showHidden = os.settings.get('files.showHidden',false), closed = false, refreshPending = false, editing = null, dismiss = null;
            const back = button('←',()=>travel(-1)); back.title='Back (Alt+Left)'; back.setAttribute('aria-label','Back');
            const forward = button('→',()=>travel(1)); forward.setAttribute('aria-label','Forward');
            const up = button('↑',()=>navigate(parent(path))); up.setAttribute('aria-label','Up');
            const address = el('input','lx-files-path'); address.setAttribute('aria-label','Folder path'); toolbar.append(address);
            address.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();navigate(address.value);} });
            const search = el('input','lx-files-search'); search.placeholder='Filter files…'; search.setAttribute('aria-label','Search files'); search.type='search'; toolbar.append(search);
            search.addEventListener('input',()=>{selected.clear();render();});
            const main = el('div','lx-files-main'), sidebar = el('nav','lx-files-side'); sidebar.setAttribute('aria-label','Locations');
            sidebar.append(el('small','','PLACES'));
            const places = [];
            for (const [label,destination] of [['Home',HOME],['Desktop',HOME+'/Desktop'],['Documents',HOME+'/Documents'],['Pictures',HOME+'/Pictures'],['Trash',TRASH],['Filesystem','/']]) {
                const b=button(label,()=>destination===TRASH?os.openApp('trash'):navigate(destination),sidebar);
                places.push([b,destination]);
            }
            const pane = el('div','lx-files-pane'), actions = el('div','lx-files-actions');
            button('+ Folder',()=>create(true),actions); button('+ Text file',()=>create(false),actions);
            const viewButton=button('List view',()=>{view=view==='grid'?'list':'grid';os.settings.set('files.view',view);render();},actions);
            const hiddenButton=button('Hidden',()=>{showHidden=!showHidden;os.settings.set('files.showHidden',showHidden);render();},actions);
            const head=el('div','lx-files-head');
            for(const [key,label] of [['name','Name'],['size','Size'],['modified','Modified'],['type','Type']]) {
                const b=button(label,()=>{ascending=sortKey===key?!ascending:true;sortKey=key;render();},head);b.dataset.sort=key;
            }
            const items=el('div','lx-files-items');items.tabIndex=0;items.setAttribute('role','listbox');items.setAttribute('aria-label','Files');items.setAttribute('aria-multiselectable','true');
            const status=el('div','lx-files-status');status.setAttribute('role','status');
            pane.append(actions,head,items);main.append(sidebar,pane);root.append(toolbar,main,status);ctx.body.append(root);
            function fail(message) {os.notify({title:'Files',body:message});}
            function dialog(title,message,confirmLabel) {
                if(dismiss) dismiss(false);
                return new Promise(resolve=>{
                    const overlay=el('div','lx-files-modal'),box=el('div','lx-files-dialog');box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label',title);
                    box.append(el('strong','',title),el('p','',message));const foot=el('footer');
                    const previous=document.activeElement;
                    const finish=value=>{overlay.remove();dismiss=null;if(!closed&&previous?.isConnected)previous.focus();resolve(value);};dismiss=finish;
                    const cancel=button(confirmLabel?'Cancel':'Close',()=>finish(false),foot);
                    if(confirmLabel)button(confirmLabel,()=>finish(true),foot);
                    box.append(foot);overlay.append(box);root.append(overlay);
                    overlay.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();finish(false);}if(event.key==='Tab'){const buttons=[...foot.querySelectorAll('button')];event.preventDefault();buttons[(buttons.indexOf(document.activeElement)+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();}});
                    cancel.focus();
                });
            }
            function navigate(destination,record=true) {
                const node=fs.get(destination);
                if(node?.type!=='folder'){fail('Folder does not exist: '+destination);address.value=path;return;}
                path=node.path;selected.clear();anchor=null;cursor=null;search.value='';
                if(record){history=history.slice(0,historyAt+1);if(history[history.length-1]!==path)history.push(path);historyAt=history.length-1;}
                render();
            }
            function travel(delta){const next=historyAt+delta;if(next<0||next>=history.length)return;if(fs.get(history[next])?.type!=='folder'){fail('That history folder no longer exists.');return;}historyAt=next;navigate(history[next],false);}
            function render() {
                if(closed)return;
                if(editing){editing.cancel();editing=null;}
                if(fs.get(path)?.type!=='folder'){let next=parent(path);while(next!=='/'&&fs.get(next)?.type!=='folder')next=parent(next);path=next;}
                nodes=(fs.list(path)||[]).filter(n=>(showHidden||!n.name.startsWith('.'))&&n.name.toLowerCase().includes(search.value.toLowerCase())).map(n=>({...n,byteSize:byteSize(n)}));
                nodes.sort((a,b)=>{
                    if(a.type!==b.type)return a.type==='folder'?-1:1;
                    let comparison=sortKey==='size'?a.byteSize-b.byteSize:sortKey==='modified'?a.modified-b.modified:sortKey==='type'?typeOf(a).localeCompare(typeOf(b)):a.name.localeCompare(b.name,undefined,{numeric:true});
                    return (comparison||a.name.localeCompare(b.name))*(ascending?1:-1);
                });
                selected=new Set([...selected].filter(p=>nodes.some(n=>n.path===p)));
                address.value=path;ctx.setTitle((path==='/'?'/':nameOf(path))+' — Files');back.disabled=historyAt<=0;forward.disabled=historyAt>=history.length-1;up.disabled=path==='/';
                places.forEach(([b,p])=>b.classList.toggle('is-current',p===path));
                viewButton.textContent=view==='grid'?'List view':'Grid view';hiddenButton.setAttribute('aria-pressed',String(showHidden));
                head.hidden=view!=='list';head.style.display=view==='list'?'grid':'none';
                head.querySelectorAll('button').forEach(b=>b.textContent=({name:'Name',size:'Size',modified:'Modified',type:'Type'})[b.dataset.sort]+(sortKey===b.dataset.sort?(ascending?' ↑':' ↓'):''));
                items.className='lx-files-items '+(view==='list'?'is-list':'is-grid');items.replaceChildren();
                for(const node of nodes){
                    const row=el('div','lx-files-item');row.dataset.path=node.path;row.id=ctx.win.id+'-file-'+nodes.indexOf(node);row.setAttribute('role','option');row.draggable=true;
                    const first=el('span');first.append(el('span','lx-files-icon',glyph(node)),el('span','lx-files-name',node.name));
                    row.append(first,el('span','lx-files-detail',size(node)),el('span','lx-files-detail',new Date(node.modified).toLocaleString()),el('span','lx-files-detail',typeOf(node)));
                    row.title=node.name+'\n'+typeOf(node);row.addEventListener('click',event=>{if(event.target.closest('input'))return;choose(node.path,event);items.focus();});
                    row.addEventListener('dblclick',event=>{if(!event.target.closest('input'))open(node);});
                    row.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();if(!selected.has(node.path)){selected=new Set([node.path]);cursor=node.path;syncSelection();}menu(event,node);});
                    row.addEventListener('dragstart',event=>{if(!selected.has(node.path)){selected=new Set([node.path]);syncSelection();}event.dataTransfer.setData('application/x-lennox-files',JSON.stringify(topPaths([...selected])));event.dataTransfer.effectAllowed='move';});
                    if(node.type==='folder'){
                        row.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('application/x-lennox-files')){event.preventDefault();row.classList.add('is-drop');event.dataTransfer.dropEffect='move';}});
                        row.addEventListener('dragleave',()=>row.classList.remove('is-drop'));
                        row.addEventListener('drop',event=>{event.preventDefault();event.stopPropagation();row.classList.remove('is-drop');drop(event,node.path);});
                    }
                    items.append(row);
                }
                if(!nodes.length)items.append(el('div','lx-files-empty',search.value?'No matching items.':'This folder is empty.'));
                syncSelection();
            }
            function syncSelection(){
                for(const row of items.querySelectorAll('.lx-files-item')){const yes=selected.has(row.dataset.path);row.classList.toggle('is-selected',yes);row.setAttribute('aria-selected',String(yes));row.classList.toggle('is-cut',Boolean(clipboard?.cut&&clipboard.paths.includes(row.dataset.path)));}
                const active=[...items.children].find(row=>row.dataset.path===cursor);if(active)items.setAttribute('aria-activedescendant',active.id);else items.removeAttribute('aria-activedescendant');
                status.textContent=nodes.length+' item'+(nodes.length===1?'':'s')+' · '+selected.size+' selected'+(clipboard?.cut?' · Cut ready to move':'');
            }
            function choose(p,event={}){
                if(event.shiftKey&&anchor&&nodes.some(n=>n.path===anchor)){const a=nodes.findIndex(n=>n.path===anchor),b=nodes.findIndex(n=>n.path===p);if(!event.ctrlKey&&!event.metaKey)selected.clear();nodes.slice(Math.min(a,b),Math.max(a,b)+1).forEach(n=>selected.add(n.path));}
                else if(event.ctrlKey||event.metaKey){if(selected.has(p))selected.delete(p);else selected.add(p);anchor=p;}
                else{selected=new Set([p]);anchor=p;}cursor=p;syncSelection();
            }
            function open(node){if(node.type==='folder')navigate(node.path);else os.openFile(node.path);}
            function copy(cut){if(!selected.size)return;clipboard={cut,paths:topPaths([...selected])};syncSelection();}
            function clone(from,to){
                // Snapshot before creating anything; never walk a newly copied subtree.
                const queue=[{from,to}],plan=[];
                for(let i=0;i<queue.length;i++){
                    if(queue.length>5000)return false;
                    const step=queue[i],node=fs.get(step.from);if(!node)return false;plan.push({...step,node});
                    if(node.type==='folder')for(const child of fs.list(step.from)||[])queue.push({from:child.path,to:join(step.to,child.name)});
                }
                for(const step of plan){const ok=step.node.type==='folder'?fs.mkdir(step.to):fs.write(step.to,step.node.content);if(!ok){fs.remove(to);return false;}}
                return true;
            }
            function move(paths,destination){
                for(const source of topPaths(paths)){
                    if(!fs.exists(source)||source==='/'||source===META||source===TRASH||below(TRASH,source)){fail('That item cannot be moved.');continue;}
                    if(parent(source)===destination)continue;
                    if(below(destination,source)){fail('A folder cannot be moved into itself.');continue;}
                    if(destination===TRASH){trashPath(source);continue;}
                    const to=unique(destination,nameOf(source));if(!to||!fs.rename(source,to))fail('Could not move '+nameOf(source));
                    else if(parent(source)===TRASH){const map=metadata();if(map){delete map[nameOf(source)];fs.write(META,JSON.stringify(map));}}
                }
            }
            function paste(){
                if(!clipboard)return;const current=clipboard;
                if(current.cut){move(current.paths,path);current.paths=current.paths.filter(p=>fs.exists(p));if(!current.paths.length)clipboard=null;}
                else for(const source of current.paths){if(!fs.exists(source)||below(path,source)){fail('Cannot copy an item into itself or from a missing path.');continue;}const to=unique(path,nameOf(source));if(!to||!clone(source,to))fail('Copy failed; no partial copy was kept.');}
                render();
            }
            function drop(event,destination){try{const paths=JSON.parse(event.dataTransfer.getData('application/x-lennox-files'));if(Array.isArray(paths)&&paths.length<=5000&&paths.every(p=>typeof p==='string'&&p.startsWith('/')))move(paths,destination);}catch(_){fail('Invalid file drop.');}}
            function trashPath(source){
                if(!mkdirp(TRASH)){fail('Could not create Trash.');return;}
                const map=metadata();if(!map){fail('Trash metadata is invalid. Repair .meta.json before deleting.');return;}
                const to=unique(TRASH,nameOf(source));if(!to){fail('No available Trash filename.');return;}
                const key=nameOf(to);map[key]={origPath:source,deletedAt:Date.now()};
                if(!fs.write(META,JSON.stringify(map))){fail('Could not save Trash metadata.');return;}
                if(!fs.rename(source,to)){delete map[key];fs.write(META,JSON.stringify(map));fail('Could not move '+nameOf(source)+' to Trash.');}
            }
            async function remove(permanent=false){
                const paths=topPaths([...selected]);if(!paths.length)return;
                permanent=permanent||below(path,TRASH);
                if(permanent&&!(await dialog('Delete permanently?',paths.length+' selected item(s) will be permanently removed.','Delete permanently')))return;
                if(closed)return;
                for(const source of paths){
                    if(source==='/'||below(TRASH,source)||source===META){fail('This folder or metadata file is protected.');continue;}
                    if(permanent){
                        if(!fs.remove(source))fail('Could not delete '+nameOf(source));
                        else if(parent(source)===TRASH){const map=metadata();if(map){delete map[nameOf(source)];fs.write(META,JSON.stringify(map));}}
                        continue;
                    }
                    trashPath(source);
                }
                selected.clear();render();
            }
            function rename(p=[...selected][0]){
                if(!p||selected.size>1||p===META)return;
                const row=[...items.children].find(r=>r.dataset.path===p);if(!row)return;
                const label=row.querySelector('.lx-files-name'),input=el('input');input.value=nameOf(p);input.setAttribute('aria-label','Rename '+nameOf(p));label.replaceChildren(input);row.draggable=false;
                let done=false;const cancel=()=>{if(done)return;done=true;editing=null;render();};
                const save=()=>{
                    if(done)return;const name=input.value;
                    if(!name||name==='.'||name==='..'||/[\/\0]/.test(name)){fail('Use a nonempty filename without slashes.');input.focus();return;}
                    const to=join(parent(p),name);if(to===META){fail('That name is reserved for Trash metadata.');return;}if(to===p){cancel();return;}
                    if(!fs.rename(p,to)){fail('Rename failed. The name may already exist.');input.focus();return;}
                    if(parent(p)===TRASH){const map=metadata();if(map&&Object.hasOwn(map,nameOf(p))){map[name]=map[nameOf(p)];delete map[nameOf(p)];fs.write(META,JSON.stringify(map));}}
                    done=true;editing=null;selected=new Set([to]);cursor=to;render();items.focus();
                };
                editing={cancel};input.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Enter'){event.preventDefault();save();}if(event.key==='Escape'){event.preventDefault();cancel();items.focus();}});input.addEventListener('blur',cancel);
                input.focus();const dot=input.value.lastIndexOf('.');input.setSelectionRange(0,dot>0?dot:input.value.length);
            }
            function create(folder){const to=unique(path,folder?'New folder':'New file.txt');if(!to||!(folder?fs.mkdir(to):fs.write(to,''))){fail('Could not create item.');return;}selected=new Set([to]);cursor=to;render();rename(to);}
            function properties(node){dialog('Properties',node.name+'\nLocation: '+parent(node.path)+'\nType: '+typeOf(node)+'\nSize: '+size(node)+'\nModified: '+new Date(node.modified).toLocaleString());}
            function menu(event,node){os.contextMenu(event.clientX,event.clientY,[
                {label:'Open',disabled:!selected.size,action:()=>nodes.filter(n=>selected.has(n.path)).forEach(open)},
                {label:'Open with… Editor',disabled:!node||node.type==='folder',action:()=>os.openApp('editor',{path:node.path})},
                {label:'Open with… Image Viewer',disabled:!node||node.type==='folder',action:()=>os.openApp('imageviewer',{path:node.path})},
                {separator:true},{label:'New folder',action:()=>create(true)},{label:'New text file',action:()=>create(false)},
                {separator:true},{label:'Rename',disabled:selected.size!==1,action:()=>rename()},
                {label:'Copy',disabled:!selected.size,action:()=>copy(false)},{label:'Cut',disabled:!selected.size,action:()=>copy(true)},
                {label:'Paste',disabled:!clipboard,action:paste},{label:'Delete',disabled:!selected.size,action:()=>remove()},
                {separator:true},{label:'Properties',disabled:!node,action:()=>properties(node)}]);}
            items.addEventListener('click',event=>{if(!event.target.closest('.lx-files-item')){selected.clear();syncSelection();}});
            items.addEventListener('contextmenu',event=>{event.preventDefault();selected.clear();syncSelection();menu(event,null);});
            items.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('application/x-lennox-files'))event.preventDefault();});items.addEventListener('drop',event=>{event.preventDefault();drop(event,path);});
            root.addEventListener('keydown',event=>{
                if(event.target.matches('input,textarea')||dismiss)return;
                const control=event.ctrlKey||event.metaKey,key=event.key.toLowerCase();let handled=true;
                if(control&&key==='a'){selected=new Set(nodes.map(n=>n.path));syncSelection();}
                else if(control&&key==='c')copy(false);else if(control&&key==='x')copy(true);else if(control&&key==='v')paste();
                else if(event.key==='F2')rename();else if(event.key==='Delete')remove(event.shiftKey);
                else if(event.altKey&&event.key==='ArrowLeft')travel(-1);else if(event.altKey&&event.key==='ArrowRight')travel(1);else if(event.altKey&&event.key==='ArrowUp')navigate(parent(path));
                else if(control&&key==='l'){address.focus();address.select();}else if(control&&key==='f')search.focus();
                else if(event.key==='Enter'&&!event.target.closest('button')){nodes.filter(n=>selected.has(n.path)).forEach(open);}
                else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){
                    const columns=view==='list'?1:Math.max(1,getComputedStyle(items).gridTemplateColumns.split(' ').length);
                    const current=nodes.findIndex(n=>n.path===cursor),delta=event.key==='ArrowUp'?-columns:event.key==='ArrowDown'?columns:event.key==='ArrowLeft'?-1:1;
                    const index=event.key==='Home'?0:event.key==='End'?nodes.length-1:current<0?0:Math.max(0,Math.min(nodes.length-1,current+delta));
                    if(nodes[index]){choose(nodes[index].path,event);[...items.children].find(r=>r.dataset.path===cursor)?.scrollIntoView({block:'nearest'});}
                }else handled=false;
                if(handled){event.preventDefault();event.stopPropagation();}
            });
            const onFS=event=>{
                if(event.detail.operation==='rename'&&below(path,event.detail.from))path=event.detail.path+path.slice(event.detail.from.length);
                if(refreshPending)return;refreshPending=true;queueMicrotask(()=>{refreshPending=false;if(!closed&&!editing)render();});
            };
            fs.addEventListener('change',onFS);
            ctx.onClose(()=>{closed=true;fs.removeEventListener('change',onFS);if(dismiss)dismiss(false);});
            const initial=fs.get(ctx.args?.path||HOME);navigate(initial?.type==='folder'?initial.path:(fs.get(HOME)?.type==='folder'?HOME:'/'));
        }
    });
    os.registerFileHandler('folder','files');
})();
