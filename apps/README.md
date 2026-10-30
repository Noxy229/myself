# Lennox_OS application API

Apps are independent **classic scripts**. No bundler, imports, framework, CDN, or server is required. Add `<script src="apps/my-app.js"></script>` to `index.html` **after** `os/shell.js`. Register synchronously when the script executes. Do not edit the shell to add an app. Use an IIFE to avoid global name collisions. App IDs, unlike window IDs, remain stable across page reloads.

The only public global is `window.LennoxOS`. The API is ready as soon as `os/shell.js` finishes; no ready event is needed. Apps can register before the user boots the desktop. Application scripts and inline SVG icons are trusted code. Render filesystem contents and user input with `textContent`/`value`, never unescaped `innerHTML`.

## Minimal app

```js
(() => {
    'use strict';
    const os = window.LennoxOS;
    os.registerApp({
        id: 'notes',
        title: 'Notes',
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2h14v20H5z"/></svg>',
        desktop: true,
        startMenu: true,
        multiInstance: false,
        defaultSize: { w: 600, h: 420 },
        minSize: { w: 300, h: 220 },
        onOpen(ctx) {
            const editor = document.createElement('textarea');
            editor.setAttribute('aria-label', 'Document');
            editor.style.cssText = 'width:100%;height:100%;resize:none;background:#080b10;color:inherit;border:1px solid var(--window-border);padding:12px;';
            ctx.body.style.padding = '0';
            ctx.body.append(editor);
            let path = null;
            function load(args) {
                path = args?.path || null;
                editor.value = path ? (os.fs.read(path) ?? '') : '';
                ctx.setTitle(path ? path.split('/').pop() + ' — Notes' : 'Notes');
            }
            load(ctx.args);
            ctx.onArgs(load);
            // Save only on explicit editing; this simple example has no dirty prompt.
            editor.addEventListener('change', () => {
                if (path && !os.fs.write(path, editor.value)) {
                    os.notify({ title: 'Save failed', body: 'The parent folder no longer exists, or the text is too large.' });
                }
            });
            const onFS = event => {
                if (event.detail.operation === 'remove' && path && !os.fs.exists(path)) {
                    ctx.setTitle('Deleted document — Notes');
                }
            };
            os.fs.addEventListener('change', onFS);
            ctx.onClose(() => os.fs.removeEventListener('change', onFS));
        }
    });
    os.registerFileHandler('txt', 'notes');
    os.registerFileHandler('md', 'notes');
})();
```

Use `ctx.body` for all application DOM. The shell owns window chrome, geometry, stacking, controls, taskbar, and desktop icons. Do not reparent/remove `ctx.win`, edit its positioning, or attach shell behavior to it. `ctx.close()` is the supported teardown path. App-specific styles should be scoped to a unique class inside `ctx.body`; app CSS can be a separate local stylesheet linked in `index.html`.

## Registry and windows

### `registerApp(spec) → normalizedSpec`

Registers an app and immediately refreshes desktop/Start entries. Throws on a missing/invalid ID, title, or `onOpen`, or a duplicate ID.

| Field | Contract / default |
| --- | --- |
| `id` | Required string matching `/^[a-z][a-z0-9_-]*$/`; unique. |
| `title` | Required string; initial window/taskbar title and permanent launcher label. |
| `icon` | Trusted inline SVG string; generic file SVG if omitted. Use `viewBox`, `currentColor`, `aria-hidden="true"`. |
| `desktop` | Shown on desktop only when exactly `true`; default `false`. |
| `startMenu` | Shown in Start unless exactly `false`; default `true`. |
| `multiInstance` | New window per launch only when exactly `true`; default `false`. |
| `defaultSize` | Outer window `{w,h}` in pixels; default `{w:500,h:350}`. |
| `minSize` | Outer minimum `{w,h}`; default `{w:260,h:180}`. |
| `onOpen(ctx)` | Required synchronous initialization callback, called once per new instance. |

Each size dimension must be a finite number; invalid dimensions use defaults. Widths are at least 100 and heights at least 80. The viewport caps all sizes, even below `minSize` when necessary. Narrow screens (`max-width:768px`) always show maximized windows, with resize/snap disabled. On wider screens the prior normal rectangle returns. Last normal geometry is persisted **per app**, not per instance. Concurrent instances cascade; open windows themselves are not restored across reload.

`onOpen` should not be `async`. Start asynchronous work inside it, catch rejections locally, and cancel or ignore results after `ctx.onClose`. An initialization exception is logged, the failed window is closed, and a notification is shown. Lifecycle callback errors are logged without interrupting the shell.

### `openApp(id, args?) → HTMLElement | null`

Returns the window `<section>` handle, or `null` if the app is unknown or initialization failed/closed the window. A single-instance app's existing window is restored/focused; its `ctx.args` is updated and its `onArgs` subscribers receive the new value (including `undefined`). `onOpen` is **not** repeated. Multi-instance apps receive a separate context for every call. Args are arbitrary in-memory values, not cloned or persisted. Apps should not assume they are always present.

### Context

| Member | Contract |
| --- | --- |
| `ctx.win` | Window HTMLElement; pass this to `closeWindow`. Unique `id`, `data-app`, and `data-state` (`normal`, `left`, `right`, `maximized`). |
| `ctx.body` | Focusable `.window-content` HTMLElement. Default padding 20px, scrolling, selectable text, flex-fills the window. |
| `ctx.args` | Initial arguments; replaced before each `onArgs` call. |
| `ctx.setTitle(str)` | Changes window title, accessible dialog label, taskbar label/tooltip. Launcher labels remain unchanged. |
| `ctx.close() → boolean` | Same as `closeWindow(ctx.win)`. |
| `ctx.onClose(fn) → unsubscribe` | Synchronous, once, after logical removal and before closing animation/DOM removal. Clean up timers, global listeners, object URLs, observers, and asynchronous work here. No arguments. |
| `ctx.onFocus(fn) → unsubscribe` | Called when this window becomes the top visible window, including initial focus after `onOpen`. No arguments. Minimized windows do not receive focus. |
| `ctx.onResize(fn) → unsubscribe` | `fn({width,height})` via ResizeObserver on the body. Includes initial observation and subsequent rendered size changes; not called while minimized. Dimensions are `clientWidth/clientHeight` (include body padding). |
| `ctx.onArgs(fn) → unsubscribe` | `fn(args)` for later single-instance launches only; read `ctx.args` yourself during `onOpen`. |

Every hook subscription requires a function, otherwise throws. Its returned unsubscribe function removes it. Closing an already closed window does nothing and returns `false`.

### `closeWindow(win) → boolean`

Accepts only a live window element returned by `openApp` or `ctx.win`. Returns `true` on logical closure, `false` otherwise. Minimized windows can also be closed. The DOM remains briefly during animation; do not use `isConnected` as the app's liveness flag. Start power actions close every app through the same lifecycle.

Window focus follows pointer/keyboard focus. Taskbar buttons focus background windows, minimize the active window, or restore minimized windows. Title-bar double-click maximizes/restores. Dragging a snapped/maximized title bar restores normal dimensions. All eight borders/corners resize. Left/right/top edge drags snap with preview. Minimize moves toward the taskbar button; all animations respect reduced motion.

## Menus, notifications, assistant

- `contextMenu(x, y, items) → HTMLElement`: opens the reusable menu at viewport/client coordinates, clamped above the taskbar. Call `event.preventDefault()` in your `contextmenu` listener. Items are `{label: string, action: function, disabled?: boolean}` or `{separator:true}`. Plain-text labels; disabled actions cannot fire. Selecting an item closes the menu before invoking the action. Arrow keys/Home/End move among enabled items. Escape dismisses it and restores opener focus. A click elsewhere dismisses it. Only one shell menu/panel is open at once.
- `notify({title?, body?, icon?}) → number`: plain-text title/body, optional trusted inline SVG icon. Defaults: title `Lennox_OS`, empty body/icon. Toasts dismiss after six seconds or with their close button; up to three visible toasts. Center retains the most recent 100 notices until Clear all/reload. Returns a session-local notification ID, not a DOM node. Notices are not persisted.
- `say(text, audioSrc?) → undefined`: stops the previous assistant utterance, types text into the speech bubble, announces the full line once, optionally plays the local audio URL. Audio failure falls back to text. Reduced motion shows text immediately. Volume/mute settings apply. Clicking the speaking assistant stops speech. The boot intro and Projects voice line use this same API.

Escape dismisses menus first, otherwise closes the top visible window (or silences the assistant if none). Alt+W closes and Alt+M minimizes the focused/top visible window. Meta toggles Start where the browser permits. Typing while Start is open targets its search field. Do not override these shell shortcuts in an app. The original Konami and seven-poke routes to `nexus.html` remain active.

## Settings and wallpapers

- `settings.get(key, fallback?) → value`: retrieves a JSON clone, or `fallback` for an absent key.
- `settings.set(key, value) → boolean`: saves a JSON-serializable value, applies recognized shell settings, and synchronously emits change events. Returns `false` for invalid keys/values; otherwise `true` even if durable browser storage is unavailable. Avoid `undefined`, functions, cyclic objects, and non-JSON values. Keys `__proto__`, `constructor`, `prototype` are rejected. Namespace app keys (e.g. `notes.fontSize`).
- `settings.addEventListener('change', fn)` / `removeEventListener`: standard EventTarget arguments, including `{signal}`/`{once}` options. `event.detail = {key,value}`. Unsubscribe in `ctx.onClose`.
- Built-ins: `accent` (`#RRGGBB`, default `#ff2a2a`), `volume` (finite number 0–1, default 1), `muted` (boolean, default false), `wallpaper` (built-in ID, default `grid`). Setting invalid built-in values returns `false`.
- Volume controls HTML audio/video and assistant audio; app-created Web Audio graphs are the app's responsibility. The tray mute button toggles `muted`; volume is preserved.
- `wallpapers`: frozen array of frozen `{id,title,image,size,color}` definitions. IDs: `grid`, `ember`, `circuit`, `void`.
- `setWallpaper(id) → boolean`: same as `settings.set('wallpaper', id)`, including event/persistence.
- Theme CSS variables: `--accent`, `--window-border`, `--text-glow`, `--text-bright`, `--text-dim`, `--window-bg`, `--desktop-bg`, `--wallpaper-image`, `--wallpaper-size`. Derive app UI colors from these rather than hardcoding a separate theme.

The desktop context menu enables Change wallpaper only if an app with ID `settings` is registered; it launches `openApp('settings', {section:'wallpaper'})`. Open Terminal is enabled only for ID `terminal`. Neither app ships in phase 1. Desktop folders use a `folder` file handler, or app ID `files` as fallback.

## Virtual filesystem

`LennoxOS.fs` stores a small text-only filesystem in browser localStorage. No access to host files or real disk paths. Paths must be absolute strings, at most 2048 characters, without NUL. Repeated/trailing slashes and `.`/`..` are normalized; traversal stops at `/`. Names are case-sensitive, extensions are case-insensitive for handlers. Paths with spaces are valid. Failed reads return `null` (empty files return `''`); failed mutations return `false`, rather than throwing. Operations are synchronous.

Node snapshots: folders `{path,name,type:'folder',modified}`, files `{path,name,type:'file',content,modified}`. `modified` is epoch milliseconds. Returned nodes/list entries are copies; changing them does not change storage. Root's name is `/`.

| Method | Result / behavior |
| --- | --- |
| `get(path)` | Node snapshot or `null`. |
| `exists(path)` | Boolean. |
| `list(path)` | Immediate child node snapshots, folders first then name order; `[]` for empty directory, `null` for missing/nonfolder path. |
| `read(path)` | Text content, or `null` for missing/nonfile path. |
| `write(path, text)` | Creates/overwrites a file. Parent folder must exist; cannot overwrite folder/root. String only, maximum 1,000,000 UTF-16 code units per file. Returns boolean. |
| `mkdir(path)` | Creates one folder; parent must exist and destination must not exist. Does not recursively create parents. Returns boolean. |
| `remove(path)` | Recursively removes a file/folder and descendants. Root cannot be removed. Returns boolean. |
| `rename(from, to)` | Moves/renames an entire subtree. Source must exist, destination must not exist, destination parent must be a folder. Rejects root, same-path moves, and moves into own descendants. Returns boolean. |
| `addEventListener('change', fn)` | Emitted synchronously after successful mutation. Standard EventTarget options. |
| `removeEventListener('change', fn)` | Unsubscribe; necessary for app lifecycle cleanup. |

FS change `event.detail` is `{operation,path}` for `write`, `mkdir`, `remove`; `{operation:'rename',path:destination,from:source}` for rename. One event per operation, not one per descendant. Mutations update desktop file icons immediately. The event describes the normalized path. A failed mutation emits nothing.

Initial seed on an empty/invalid filesystem:

```text
/
├── home/lennox/
│   ├── Desktop/
│   ├── Documents/
│   │   ├── about.txt       (full Profile text)
│   │   └── projects.md     (all three Projects)
│   └── Pictures/
└── system/readme.txt
```

Seed is not reinserted on every reload: deliberately removed files/folders stay removed. Immediate children of `/home/lennox/Desktop` appear as desktop icons alongside app launchers; nested children do not. Icon positions and normal app geometry persist independently of filesystem entries. Renaming a desktop file gives it a new icon-position key.

- `registerFileHandler(ext, appId) → boolean`: register/replace one extension mapping for this session. Leading dot optional; trimmed/lowercased. No existence check at registration, so scripts may load in either order. Empty/nonstring arguments return false. Use `'*'` as the fallback **file** handler and `'folder'` for folders. Last registration for an extension wins. Re-register handlers on every page load.
- `openFile(path) → HTMLElement | null`: resolves the node, finds a handler, then calls `openApp(handlerId, {path:normalizedPath})`. For folders, uses the `'folder'` handler or registered app `'files'`. Missing path returns null silently; missing/unregistered handler shows a notification and returns null. There is no implicit text viewer in the phase 1 shell.

## Shell events and persistence boundaries

`LennoxOS.addEventListener(type, fn, options?)` / `removeEventListener` forward to the shell's EventTarget. Events are CustomEvents:

- `appregistered`: `detail = {id}`.
- `settingschange`: same detail as `settings`'s `change`.
- `fschange`: same detail as `fs`'s `change`.

LocalStorage keys are `lennox-os.v1.settings`, `.geometry`, `.icons`, `.fs`. They are shell-owned implementation details; use the API, not direct writes. No cross-tab synchronization. If localStorage is denied, full, or unavailable under file://, the session continues in memory; the APIs report logical success, not durable-write confirmation. Refresh then loses unsaved session changes. Registry, handlers, open instances, arguments, and notifications are never persisted. No network requests beyond local scripts/styles/audio are required.
