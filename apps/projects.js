(() => {
    'use strict';
    LennoxOS.registerApp({
        id: 'projects',
        title: 'Projects',
        icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20,6H12L10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6Z"/></svg>',
        desktop: true,
        startMenu: true,
        multiInstance: false,
        defaultSize: { w: 560, h: 400 },
        minSize: { w: 300, h: 230 },
        onOpen(ctx) {
            ctx.setTitle('/root/projects/');
            ctx.body.innerHTML = `
                <h2>DECRYPTED ARCHIVES</h2>
                <ul class="project-list">
                    <li class="project-item"><strong>// ASTRA</strong><br>Self-hosted AI chat client featuring a Gemini-style UI. Next.js 15, Tailwind, SQLite, Multi-Provider.</li>
                    <li class="project-item"><strong>// BERICHTSHEFT</strong><br>IHK-compliant automated logging for apprentices in Niedersachsen.</li>
                    <li class="project-item"><strong>// SCROLLCRAFT</strong><br>Claude Code skill for premium scroll-driven websites on a real design floor.</li>
                </ul>`;
            LennoxOS.say('Accessing project directory. Lennox specializes in self-hosted infrastructure and AI agents. Notable deployments include Astra, a local AI client, and an automated IHK logging system.', 'audio/projects.ogg');
        }
    });
})();
