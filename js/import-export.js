const ImportExport = (() => {
    let autoSaveHandle = null;
    let autoSaveInterval = null;

    function init() {
        document.getElementById('btn-export-json').addEventListener('click', downloadJSON);
        document.getElementById('btn-import-json').addEventListener('click', () => document.getElementById('file-json').click());
        document.getElementById('file-json').addEventListener('change', handleJSONUpload);
        document.getElementById('btn-paste-apply').addEventListener('click', applyPaste);
        document.getElementById('btn-csv-upload').addEventListener('click', () => document.getElementById('file-csv').click());
        document.getElementById('file-csv').addEventListener('change', handleCSVUpload);

        document.getElementById('btn-export-html').addEventListener('click', exportHTMLWithPNG);
        document.getElementById('btn-export-png').addEventListener('click', exportPNGOnly);

        const btnShare = document.getElementById('btn-share-url');
        if (btnShare) btnShare.addEventListener('click', shareViaURL);

        document.getElementById('btn-save-fs').addEventListener('click', async () => {
            try {
                const ok = await State.saveToFileSystem();
                if (ok) {
                    autoSaveHandle = State._lastFileHandle;
                    showToast(I18n.t('ie.fs_save_ok'), 'success');
                }
            } catch (e) { showToast(I18n.t('ie.fs_save_error', { msg: e.message }), 'error'); }
        });

        document.getElementById('btn-load-fs').addEventListener('click', async () => {
            try {
                const ok = await State.loadFromFileSystem();
                if (ok) {
                    autoSaveHandle = State._lastFileHandle;
                    showToast(I18n.t('ie.fs_load_ok'), 'success');
                }
            } catch (e) { showToast(I18n.t('ie.fs_load_error', { msg: e.message }), 'error'); }
        });

        // Auto-save toggle
        const autoSaveToggle = document.getElementById('cfg-autosave');
        const autoSaveIntervalInput = document.getElementById('cfg-autosave-interval');
        if (autoSaveToggle) {
            autoSaveToggle.addEventListener('change', () => {
                if (autoSaveToggle.checked) {
                    startAutoSave(parseInt(autoSaveIntervalInput?.value, 10) || 30);
                } else {
                    stopAutoSave();
                }
            });
        }
        if (autoSaveIntervalInput) {
            autoSaveIntervalInput.addEventListener('change', () => {
                if (autoSaveToggle?.checked) {
                    stopAutoSave();
                    startAutoSave(parseInt(autoSaveIntervalInput.value, 10) || 30);
                }
            });
        }
    }

    function startAutoSave(seconds) {
        stopAutoSave();
        autoSaveInterval = setInterval(async () => {
            if (!autoSaveHandle) {
                showToast(I18n.t('ie.autosave_save_first'), 'error');
                return;
            }
            try {
                const writable = await autoSaveHandle.createWritable();
                await writable.write(State.exportJSON());
                await writable.close();
                const time = new Date().toLocaleTimeString(I18n.getLocale());
                updateAutoSaveStatus(I18n.t('ie.autosave_saved_at', { time }));
            } catch (e) {
                updateAutoSaveStatus(I18n.t('ie.autosave_error'));
            }
        }, seconds * 1000);
        updateAutoSaveStatus(I18n.t('ie.autosave_on', { n: seconds }));
    }

    function stopAutoSave() {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
            autoSaveInterval = null;
        }
        updateAutoSaveStatus(I18n.t('ie.autosave_off'));
    }

    function updateAutoSaveStatus(text) {
        const el = document.getElementById('autosave-status');
        if (el) el.textContent = text;
    }

    function downloadJSON() {
        const json = State.exportJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const config = State.getConfig();
        a.href = url;
        a.download = `roadmap-${config.periodo.replace('/', '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(I18n.t('ie.json_exported'), 'success');
    }

    function handleJSONUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                State.importJSON(reader.result);
                showToast(I18n.t('ie.json_imported'), 'success');
            } catch (err) {
                showToast(I18n.t('ie.json_import_error', { msg: err.message }), 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    function applyPaste() {
        const text = document.getElementById('paste-area').value;
        if (!text.trim()) {
            showToast(I18n.t('ie.paste_empty'), 'error');
            return;
        }
        try {
            State.importConfigFromTSV(text);
            showToast(I18n.t('ie.paste_applied'), 'success');
            document.getElementById('paste-area').value = '';
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    function handleCSVUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const csvType = document.querySelector('input[name="csv-type"]:checked').value;
                if (csvType === 'config') {
                    State.importConfigFromCSV(reader.result);
                    showToast(I18n.t('ie.csv_config_imported'), 'success');
                } else {
                    State.importItemsFromCSV(reader.result);
                    showToast(I18n.t('ie.csv_items_imported'), 'success');
                }
            } catch (err) {
                showToast(I18n.t('ie.csv_import_error', { msg: err.message }), 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    // ─── Capture roadmap area as canvas ────────────────
    async function captureRoadmapCanvas() {
        // Temporarily expand the roadmap container so the full content is visible
        const wrapper = document.querySelector('.roadmap-wrapper');
        const roadmapContainer = document.getElementById('roadmap-container');
        const header = document.querySelector('.app-header');
        const legend = document.getElementById('roadmap-legend');

        // Create a temporary wrapper that includes header + legend + roadmap
        const tempWrapper = document.createElement('div');
        tempWrapper.style.cssText = 'position:absolute;left:-99999px;top:0;background:' +
            getComputedStyle(document.body).getPropertyValue('background-color') + ';';
        document.body.appendChild(tempWrapper);

        // Clone the header
        const headerClone = header.cloneNode(true);
        headerClone.style.cssText = 'padding:16px 24px 12px;display:flex;align-items:center;justify-content:space-between;' +
            'border-bottom:1px solid ' + getComputedStyle(document.documentElement).getPropertyValue('--border-color') + ';' +
            'background:' + getComputedStyle(header).backgroundColor + ';';
        tempWrapper.appendChild(headerClone);

        // Clone the roadmap container with full scroll content
        const roadmapClone = roadmapContainer.cloneNode(true);
        roadmapClone.style.cssText = 'overflow:visible;position:relative;background:' +
            getComputedStyle(roadmapContainer).backgroundColor + ';';
        // Remove the add button from clone
        const addBtn = roadmapClone.querySelector('.roadmap-add-btn');
        if (addBtn) addBtn.remove();
        tempWrapper.appendChild(roadmapClone);

        // Set the width to the full scrollable width
        const fullWidth = Math.max(roadmapContainer.scrollWidth, roadmapContainer.offsetWidth);
        tempWrapper.style.width = fullWidth + 'px';

        const canvas = await html2canvas(tempWrapper, {
            backgroundColor: getComputedStyle(document.body).backgroundColor,
            scale: 2,
            useCORS: true,
            logging: false,
            width: fullWidth,
        });

        tempWrapper.remove();
        return canvas;
    }

    function getExportFileName() {
        const config = State.getConfig();
        return `roadmap-${config.periodo.replace('/', '-')}`;
    }

    // ─── Export PNG only ────────────────
    async function exportPNGOnly() {
        try {
            showToast(I18n.t('ie.png_generating'), 'success');
            const canvas = await captureRoadmapCanvas();
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = getExportFileName() + '.png';
            a.click();
            URL.revokeObjectURL(url);
            showToast(I18n.t('ie.png_exported'), 'success');
        } catch (e) {
            showToast(I18n.t('ie.png_error', { msg: e.message }), 'error');
        }
    }

    // ─── Export HTML + PNG ────────────────
    async function exportHTMLWithPNG() {
        try {
            showToast(I18n.t('ie.html_generating'), 'success');
            const canvas = await captureRoadmapCanvas();
            const baseName = getExportFileName();
            const pngFileName = baseName + '.png';

            // Download PNG first
            const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
            const pngUrl = URL.createObjectURL(pngBlob);
            const pngLink = document.createElement('a');
            pngLink.href = pngUrl;
            pngLink.download = pngFileName;
            pngLink.click();
            URL.revokeObjectURL(pngUrl);

            // Build HTML that references the PNG with relative path (same folder)
            const config = State.getConfig();
            const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Roadmap ${escapeHtmlStr(config.periodo)} — ${escapeHtmlStr(config.squad)}</title>
    <style>
        body {
            margin: 0;
            padding: 24px;
            background: #0f172a;
            color: #f1f5f9;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        h1 { font-size: 22px; font-weight: 600; margin-bottom: 4px; letter-spacing: 0.5px; }
        .subtitle { font-size: 14px; color: #94a3b8; margin-bottom: 20px; }
        .roadmap-img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            box-shadow: 0 4px 24px rgba(0,0,0,0.5);
        }
        .footer { margin-top: 16px; font-size: 11px; color: #64748b; }
    </style>
</head>
<body>
    <h1>ROADMAP ${escapeHtmlStr(config.periodo)}</h1>
    <div class="subtitle">${escapeHtmlStr(config.squad)}</div>
    <img class="roadmap-img" src="./${escapeHtmlStr(pngFileName)}" alt="Roadmap ${escapeHtmlStr(config.periodo)}">
    <div class="footer">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
</body>
</html>`;

            // Download HTML
            const htmlBlob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const htmlUrl = URL.createObjectURL(htmlBlob);
            const htmlLink = document.createElement('a');
            htmlLink.href = htmlUrl;
            htmlLink.download = baseName + '.html';
            // Small delay to avoid browser blocking second download
            setTimeout(() => {
                htmlLink.click();
                URL.revokeObjectURL(htmlUrl);
            }, 500);

            showToast(I18n.t('ie.html_exported'), 'success');
        } catch (e) {
            showToast(I18n.t('ie.html_error', { msg: e.message }), 'error');
        }
    }

    function escapeHtmlStr(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    // ─── Share via URL hash ─────────────────────────────
    function encodeStateToHash(jsonString) {
        // base64url: standard base64 with +/= replaced by -_ and stripped padding.
        const b64 = btoa(unescape(encodeURIComponent(jsonString)));
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function decodeHashToJSON(hashValue) {
        let b64 = hashValue.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        return decodeURIComponent(escape(atob(b64)));
    }

    function shareViaURL() {
        const statusEl = document.getElementById('share-url-status');
        try {
            const encoded = encodeStateToHash(State.exportJSON());
            const url = `${location.origin}${location.pathname}#share=${encoded}`;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(() => {
                    showToast(I18n.t('ie.share_copied'), 'success');
                    if (statusEl) statusEl.textContent = I18n.t('ie.share_size', { n: url.length });
                }, () => {
                    if (statusEl) statusEl.textContent = url;
                    showToast(I18n.t('ie.share_copy_failed'), 'error');
                });
            } else {
                if (statusEl) statusEl.textContent = url;
                showToast(I18n.t('ie.share_copy_below'), 'success');
            }
        } catch (e) {
            showToast(I18n.t('ie.share_error', { msg: e.message }), 'error');
        }
    }

    function tryLoadFromHash() {
        const hash = location.hash || '';
        const match = hash.match(/^#share=(.+)$/);
        if (!match) return false;

        try {
            const json = decodeHashToJSON(match[1]);
            const proceed = confirm(I18n.t('ie.share_confirm_load'));
            if (proceed) {
                State.importJSON(json);
                showToast(I18n.t('ie.share_loaded'), 'success');
            }
        } catch (e) {
            showToast(I18n.t('ie.share_invalid', { msg: e.message }), 'error');
        }
        // Always strip the hash so reloads don't keep prompting.
        history.replaceState(null, '', location.pathname + location.search);
        return true;
    }

    return { init, tryLoadFromHash };
})();

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type || 'success'}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}
