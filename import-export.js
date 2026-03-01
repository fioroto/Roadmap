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

        document.getElementById('btn-save-fs').addEventListener('click', async () => {
            try {
                const ok = await State.saveToFileSystem();
                if (ok) {
                    autoSaveHandle = State._lastFileHandle;
                    showToast('Arquivo salvo com sucesso', 'success');
                }
            } catch (e) { showToast('Erro ao salvar: ' + e.message, 'error'); }
        });

        document.getElementById('btn-load-fs').addEventListener('click', async () => {
            try {
                const ok = await State.loadFromFileSystem();
                if (ok) {
                    autoSaveHandle = State._lastFileHandle;
                    showToast('Arquivo carregado com sucesso', 'success');
                }
            } catch (e) { showToast('Erro ao carregar: ' + e.message, 'error'); }
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
                showToast('Auto-save: salve manualmente primeiro para definir o arquivo', 'error');
                return;
            }
            try {
                const writable = await autoSaveHandle.createWritable();
                await writable.write(State.exportJSON());
                await writable.close();
                updateAutoSaveStatus('Salvo às ' + new Date().toLocaleTimeString('pt-BR'));
            } catch (e) {
                updateAutoSaveStatus('Erro ao salvar');
            }
        }, seconds * 1000);
        updateAutoSaveStatus('Ativo — a cada ' + seconds + 's');
    }

    function stopAutoSave() {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
            autoSaveInterval = null;
        }
        updateAutoSaveStatus('Desativado');
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
        showToast('JSON exportado com sucesso', 'success');
    }

    function handleJSONUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                State.importJSON(reader.result);
                showToast('JSON importado com sucesso', 'success');
            } catch (err) {
                showToast('Erro ao importar JSON: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    function applyPaste() {
        const text = document.getElementById('paste-area').value;
        if (!text.trim()) {
            showToast('Cole os dados antes de aplicar', 'error');
            return;
        }
        try {
            State.importConfigFromTSV(text);
            showToast('Configuração aplicada com sucesso', 'success');
            document.getElementById('paste-area').value = '';
        } catch (err) {
            showToast('Erro: ' + err.message, 'error');
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
                    showToast('Configuração CSV importada com sucesso', 'success');
                } else {
                    State.importItemsFromCSV(reader.result);
                    showToast('Itens CSV importados com sucesso', 'success');
                }
            } catch (err) {
                showToast('Erro ao importar CSV: ' + err.message, 'error');
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    return { init };
})();

function showToast(message, type) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type || 'success'}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}
