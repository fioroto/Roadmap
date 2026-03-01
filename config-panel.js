const ConfigPanel = (() => {
    let debounceTimer = null;

    function init() {
        const fields = ['periodo', 'squad', 'dataInicio', 'dataFim', 'diasSprint', 'sprintStartNumber'];
        fields.forEach(field => {
            const el = document.getElementById('cfg-' + field);
            if (!el) return;
            el.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(applyConfig, 200);
            });
        });

        // Background color picker
        const colorPicker = document.getElementById('cfg-bgColor');
        const colorText = document.getElementById('cfg-bgColorText');
        if (colorPicker && colorText) {
            colorPicker.addEventListener('input', () => {
                colorText.value = colorPicker.value;
                applyBgColor(colorPicker.value);
            });
            colorText.addEventListener('input', () => {
                if (/^#[0-9a-fA-F]{6}$/.test(colorText.value)) {
                    colorPicker.value = colorText.value;
                    applyBgColor(colorText.value);
                }
            });
        }

        const applyBtn = document.getElementById('btn-apply-config');
        if (applyBtn) applyBtn.addEventListener('click', applyConfig);

        populateForm();
        State.on('config:changed', populateForm);
    }

    function applyBgColor(color) {
        State.setConfig({ bgColor: color });
    }

    function populateForm() {
        const cfg = State.getConfig();
        setVal('cfg-periodo', cfg.periodo);
        setVal('cfg-squad', cfg.squad);
        setVal('cfg-dataInicio', cfg.dataInicio);
        setVal('cfg-dataFim', cfg.dataFim);
        setVal('cfg-diasSprint', cfg.diasSprint);
        setVal('cfg-sprintStartNumber', cfg.sprintStartNumber);

        const bgColor = cfg.bgColor || '#0f172a';
        const colorPicker = document.getElementById('cfg-bgColor');
        const colorText = document.getElementById('cfg-bgColorText');
        if (colorPicker && colorPicker.value !== bgColor) colorPicker.value = bgColor;
        if (colorText && colorText.value !== bgColor) colorText.value = bgColor;
    }

    function setVal(id, val) {
        const el = document.getElementById(id);
        if (el && el.value !== String(val)) el.value = val;
    }

    function applyConfig() {
        State.setConfig({
            periodo: getVal('cfg-periodo'),
            squad: getVal('cfg-squad'),
            dataInicio: getVal('cfg-dataInicio'),
            dataFim: getVal('cfg-dataFim'),
            diasSprint: parseInt(getVal('cfg-diasSprint'), 10) || 14,
            sprintStartNumber: parseInt(getVal('cfg-sprintStartNumber'), 10) || 1,
            bgColor: getVal('cfg-bgColor') || '#0f172a'
        });
    }

    function getVal(id) {
        const el = document.getElementById(id);
        return el ? el.value : '';
    }

    return { init };
})();
