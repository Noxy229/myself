(() => {
    'use strict';
    LennoxOS.registerApp({
        id: 'profile',
        title: 'Profile.exe',
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/></svg>',
        desktop: true,
        startMenu: true,
        multiInstance: false,
        defaultSize: { w: 520, h: 370 },
        minSize: { w: 300, h: 230 },
        onOpen(ctx) {
            ctx.body.innerHTML = `
                <h2>LENNOX NORDMANN</h2>
                <p class="tagline">SYSTEMS ARCHITECT // AI_INFRASTRUCTURE</p>
                <p>Role: Fachinformatiker (Systemintegration)<br>Stack: Proxmox, Docker, Linux, AI Agents.</p>
                <p>I build high-end infrastructure, homelabs, and intelligent systems. Bridging the gap between raw compute power and architectural design.</p>`;
        }
    });
})();
