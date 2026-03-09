document.addEventListener('DOMContentLoaded', () => {
    State.load();

    Renderer.init(document.getElementById('roadmap-container'));
    Tooltip.init();
    ConfigPanel.init();
    ItemEditor.init();
    ImportExport.init();

    State.on('state:changed', () => Renderer.render());
    State.on('config:changed', () => Renderer.render());
    State.on('item:select', (id) => Renderer.setSelectedItem(id));

    // Helper to get a muted/secondary variant from a contrast color
    function getMutedColor(contrastColor) {
        // If main text is light (dark bg), return a lighter muted gray
        // If main text is dark (light bg), return a darker muted gray
        return contrastColor === '#1e293b' ? '#64748b' : '#94a3b8';
    }

    // Apply background color from config
    State.on('config:changed', (cfg) => {
        if (cfg.bgColor) {
            document.documentElement.style.setProperty('--bg-primary', cfg.bgColor);
        }
        if (cfg.headerColor) {
            document.querySelector('.app-header').style.background = cfg.headerColor;
            const headerContrast = State.getContrastColor(cfg.headerColor);
            document.documentElement.style.setProperty('--header-text', headerContrast);
            document.documentElement.style.setProperty('--header-text-secondary', getMutedColor(headerContrast));
        }
        if (cfg.monthBandColor) {
            document.documentElement.style.setProperty('--month-band-bg', cfg.monthBandColor);
            const monthContrast = State.getContrastColor(cfg.monthBandColor);
            document.documentElement.style.setProperty('--month-band-text', monthContrast);
        }
        if (cfg.sprintBandColor) {
            document.documentElement.style.setProperty('--sprint-band-bg', cfg.sprintBandColor);
            const sprintContrast = State.getContrastColor(cfg.sprintBandColor);
            document.documentElement.style.setProperty('--sprint-band-text', sprintContrast);
            document.documentElement.style.setProperty('--sprint-band-text-muted', getMutedColor(sprintContrast));
        }
    });

    // Panel tab switching
    document.querySelectorAll('.panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.panel-section').forEach(s => s.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.target);
            if (target) target.classList.add('active');
        });
    });

    // Panel toggle
    const toggleBtn = document.getElementById('btn-toggle-panel');
    const sidePanel = document.getElementById('side-panel');
    if (toggleBtn && sidePanel) {
        toggleBtn.addEventListener('click', () => {
            sidePanel.classList.toggle('collapsed');
            toggleBtn.classList.toggle('collapsed');
            toggleBtn.textContent = sidePanel.classList.contains('collapsed') ? '▶' : '◀';
            // Re-render roadmap after panel transition completes (200ms)
            setTimeout(() => Renderer.render(), 210);
        });
    }

    // Apply initial colors
    const initialBg = State.getConfig().bgColor;
    if (initialBg) {
        document.documentElement.style.setProperty('--bg-primary', initialBg);
    }
    const initialHeaderColor = State.getConfig().headerColor;
    if (initialHeaderColor) {
        document.querySelector('.app-header').style.background = initialHeaderColor;
        const hContrast = State.getContrastColor(initialHeaderColor);
        document.documentElement.style.setProperty('--header-text', hContrast);
        document.documentElement.style.setProperty('--header-text-secondary', getMutedColor(hContrast));
    }
    const initialMonthBandColor = State.getConfig().monthBandColor;
    if (initialMonthBandColor) {
        document.documentElement.style.setProperty('--month-band-bg', initialMonthBandColor);
        const mContrast = State.getContrastColor(initialMonthBandColor);
        document.documentElement.style.setProperty('--month-band-text', mContrast);
    }
    const initialSprintBandColor = State.getConfig().sprintBandColor;
    if (initialSprintBandColor) {
        document.documentElement.style.setProperty('--sprint-band-bg', initialSprintBandColor);
        const sContrast = State.getContrastColor(initialSprintBandColor);
        document.documentElement.style.setProperty('--sprint-band-text', sContrast);
        document.documentElement.style.setProperty('--sprint-band-text-muted', getMutedColor(sContrast));
    }

    Renderer.render();
});
