const I18n = (() => {
    const STORAGE_KEY = 'roadmap-planner-locale';
    const DEFAULT_LOCALE = 'pt-BR';

    const dict = {
        'pt-BR': {
            'app.title': 'Roadmap Planner',

            // Header
            'header.add_item': 'Adicionar item ao roadmap',
            'header.toggle_panel': 'Abrir ou fechar painel lateral',

            // Tabs
            'tabs.config': 'Config',
            'tabs.items': 'Itens',
            'tabs.import_export': 'Import/Export',

            // Theme toggle
            'theme.section': 'Aparência da interface',
            'theme.label': 'Tema da UI',
            'theme.auto': 'Auto',
            'theme.light': 'Claro',
            'theme.dark': 'Escuro',
            'theme.aria': 'Tema da interface',

            // Language selector
            'lang.label': 'Idioma',

            // Config panel — roadmap settings
            'config.roadmap_title': 'Configuração do Roadmap',
            'config.periodo': 'Período',
            'config.squad': 'Squad',
            'config.dataInicio': 'Data Início',
            'config.dataFim': 'Data Fim',
            'config.diasSprint': 'Dias/Sprint',
            'config.sprintStartNumber': 'Sprint Inicial Nº',
            'config.bgColor': 'Cor de Fundo do Roadmap',
            'config.headerColor': 'Cor do Header',
            'config.monthBandColor': 'Cor da Faixa de Meses',
            'config.sprintBandColor': 'Cor da Faixa de Sprints',
            'config.apply': 'Aplicar Configuração',

            // Type management
            'types.item_types': 'Tipos de Item',
            'types.status_types': 'Tipos de Status',
            'types.team_members': 'Membros do Time',
            'types.milestones': 'Milestones',
            'types.add_item_type': '+ Tipo de Item',
            'types.add_status_type': '+ Tipo de Status',
            'types.add_member': '+ Membro',
            'types.add_milestone': '+ Milestone',
            'types.label_placeholder': 'Rótulo',
            'types.icon_placeholder': 'ícone',
            'types.name_placeholder': 'Nome',
            'types.sprint_placeholder': 'Sprint',
            'types.new_type': 'Novo Tipo',
            'types.new_status': 'Novo Status',
            'types.new_member': 'Novo Membro',
            'types.new_milestone': 'Marco',

            // Items section
            'items.section_title': 'Itens do Roadmap',
            'items.add_new': '+ Novo Item',
            'items.select_to_edit': 'Selecione um item para editar',
            'items.empty': 'Nenhum item cadastrado. Clique em + para adicionar.',
            'items.empty_filtered': 'Nenhum item encontrado para este filtro.',
            'items.new_item': 'Novo Item',

            // Filters
            'filter.label': 'Filtros',
            'filter.all_types': 'Todos os tipos',
            'filter.all_statuses': 'Todos os status',
            'filter.no_status': 'Sem status',
            'filter.all_members': 'Todos responsáveis',
            'filter.no_member': 'Sem responsável',
            'filter.clear': 'Limpar',

            // Item editor
            'editor.title': 'Editar Item',
            'editor.field_title': 'Título',
            'editor.field_type': 'Tipo',
            'editor.field_status': 'Status',
            'editor.field_responsavel': 'Responsável',
            'editor.no_responsavel': 'Sem responsável',
            'editor.intruder': 'Intruder',
            'editor.observacao': 'Observação',
            'editor.segments': 'Segmentos',
            'editor.segment': 'Segmento',
            'editor.delay': 'Delay',
            'editor.sprint_start': 'Sprint Início',
            'editor.sprint_end': 'Sprint Fim',
            'editor.sprint_begin_label': 'início',
            'editor.sprint_mid_label': 'meio',
            'editor.sprint_end_label': 'fim',
            'editor.add_delay': '+ Delay',
            'editor.add_segment': '+ Segmento',
            'editor.save': 'Salvar',
            'editor.action_edit': 'Editar',
            'editor.action_delete': 'Excluir',
            'editor.confirm_delete_one': 'Excluir este item?',
            'editor.confirm_delete_selected': 'Excluir o item selecionado?',
            'editor.saved': 'Item salvo com sucesso',

            // Import/Export
            'ie.share_title': 'Compartilhar via link',
            'ie.share_desc': 'Gera uma URL com o roadmap completo embutido no hash (sem servidor). Cole no navegador para abrir.',
            'ie.share_copy': 'Copiar link',
            'ie.share_copied': 'Link copiado para a área de transferência',
            'ie.share_size': 'Tamanho: {n} caracteres',
            'ie.share_copy_failed': 'Não foi possível copiar; o link aparece abaixo do botão',
            'ie.share_copy_below': 'Copie o link abaixo do botão',
            'ie.share_invalid': 'Link compartilhado inválido: {msg}',
            'ie.share_loaded': 'Roadmap carregado do link compartilhado',
            'ie.share_confirm_load': 'Esta página tem um roadmap compartilhado no link. Carregar e substituir o roadmap atual?',
            'ie.share_error': 'Erro ao gerar link: {msg}',
            'ie.html_title': 'Exportar HTML + Imagem',
            'ie.html_desc': 'Exporte o roadmap como HTML com imagem PNG na mesma pasta. A imagem é referenciada com caminho relativo.',
            'ie.html_btn': 'Exportar HTML + PNG',
            'ie.png_btn': 'Exportar só PNG',
            'ie.json_title': 'JSON',
            'ie.json_desc': 'Exporte ou importe o roadmap completo em formato JSON.',
            'ie.json_export': 'Exportar JSON',
            'ie.json_import': 'Importar JSON',
            'ie.fs_title': 'Salvar / Abrir Arquivo',
            'ie.fs_desc': 'Use a API do navegador para salvar/abrir arquivos diretamente.',
            'ie.fs_save': 'Salvar no Disco',
            'ie.fs_load': 'Abrir do Disco',
            'ie.autosave_label': 'Auto-save automático',
            'ie.autosave_interval': 'Intervalo (segundos)',
            'ie.autosave_status_label': 'Status:',
            'ie.autosave_off': 'Desativado',
            'ie.autosave_on': 'Ativo — a cada {n}s',
            'ie.autosave_saved_at': 'Salvo às {time}',
            'ie.autosave_error': 'Erro ao salvar',
            'ie.autosave_save_first': 'Auto-save: salve manualmente primeiro para definir o arquivo',
            'ie.paste_title': 'Importar via Colar (Excel/Sheets)',
            'ie.paste_desc': 'Cole dados copiados de uma planilha. Aceita formato chave→valor ou cabeçalho+valores (TSV).',
            'ie.paste_placeholder': 'Cole os dados aqui...',
            'ie.paste_apply': 'Aplicar Dados Colados',
            'ie.paste_empty': 'Cole os dados antes de aplicar',
            'ie.paste_applied': 'Configuração aplicada com sucesso',
            'ie.csv_title': 'Carregar CSV',
            'ie.csv_desc': 'Importe um arquivo CSV com dados de configuração ou itens.',
            'ie.csv_config': 'Configuração',
            'ie.csv_items': 'Itens',
            'ie.csv_select': 'Selecionar CSV',
            'ie.json_exported': 'JSON exportado com sucesso',
            'ie.json_imported': 'JSON importado com sucesso',
            'ie.csv_config_imported': 'Configuração CSV importada com sucesso',
            'ie.csv_items_imported': 'Itens CSV importados com sucesso',
            'ie.json_import_error': 'Erro ao importar JSON: {msg}',
            'ie.csv_import_error': 'Erro ao importar CSV: {msg}',
            'ie.fs_save_ok': 'Arquivo salvo com sucesso',
            'ie.fs_load_ok': 'Arquivo carregado com sucesso',
            'ie.fs_save_error': 'Erro ao salvar: {msg}',
            'ie.fs_load_error': 'Erro ao carregar: {msg}',
            'ie.png_generating': 'Gerando imagem PNG...',
            'ie.png_exported': 'PNG exportado com sucesso',
            'ie.png_error': 'Erro ao exportar PNG: {msg}',
            'ie.html_generating': 'Gerando HTML + PNG...',
            'ie.html_exported': 'HTML + PNG exportados com sucesso! Salve ambos na mesma pasta.',
            'ie.html_error': 'Erro ao exportar HTML: {msg}',
            'ie.error_paste_format': 'Formato não reconhecido. Use duas colunas (chave→valor) ou cabeçalho+valores.',
            'ie.error_csv_header': 'CSV precisa de cabeçalho + pelo menos uma linha',
            'ie.error_no_data': 'Nenhum dado encontrado',

            // State / save
            'state.save_failed': 'Falha ao salvar no navegador: {msg}',

            // Roadmap
            'roadmap.empty_msg': 'Configure as datas para gerar o roadmap.',
            'roadmap.legend_intruder': 'Intruder',
            'roadmap.legend_delay': 'Delay',
            'roadmap.label_prefix': 'ROADMAP',
            'roadmap.resize_start': 'Redimensionar início',
            'roadmap.resize_end': 'Redimensionar fim',

            'tooltip.delays': 'Delays'
        },
        'en-US': {
            'app.title': 'Roadmap Planner',

            'header.add_item': 'Add item to roadmap',
            'header.toggle_panel': 'Open or close side panel',

            'tabs.config': 'Config',
            'tabs.items': 'Items',
            'tabs.import_export': 'Import/Export',

            'theme.section': 'UI appearance',
            'theme.label': 'UI theme',
            'theme.auto': 'Auto',
            'theme.light': 'Light',
            'theme.dark': 'Dark',
            'theme.aria': 'Interface theme',

            'lang.label': 'Language',

            'config.roadmap_title': 'Roadmap configuration',
            'config.periodo': 'Period',
            'config.squad': 'Squad',
            'config.dataInicio': 'Start date',
            'config.dataFim': 'End date',
            'config.diasSprint': 'Days/Sprint',
            'config.sprintStartNumber': 'Initial sprint #',
            'config.bgColor': 'Roadmap background color',
            'config.headerColor': 'Header color',
            'config.monthBandColor': 'Month band color',
            'config.sprintBandColor': 'Sprint band color',
            'config.apply': 'Apply configuration',

            'types.item_types': 'Item types',
            'types.status_types': 'Status types',
            'types.team_members': 'Team members',
            'types.milestones': 'Milestones',
            'types.add_item_type': '+ Item type',
            'types.add_status_type': '+ Status type',
            'types.add_member': '+ Member',
            'types.add_milestone': '+ Milestone',
            'types.label_placeholder': 'Label',
            'types.icon_placeholder': 'icon',
            'types.name_placeholder': 'Name',
            'types.sprint_placeholder': 'Sprint',
            'types.new_type': 'New type',
            'types.new_status': 'New status',
            'types.new_member': 'New member',
            'types.new_milestone': 'Milestone',

            'items.section_title': 'Roadmap items',
            'items.add_new': '+ New item',
            'items.select_to_edit': 'Select an item to edit',
            'items.empty': 'No items yet. Click + to add one.',
            'items.empty_filtered': 'No items match this filter.',
            'items.new_item': 'New item',

            'filter.label': 'Filters',
            'filter.all_types': 'All types',
            'filter.all_statuses': 'All statuses',
            'filter.no_status': 'No status',
            'filter.all_members': 'All assignees',
            'filter.no_member': 'Unassigned',
            'filter.clear': 'Clear',

            'editor.title': 'Edit item',
            'editor.field_title': 'Title',
            'editor.field_type': 'Type',
            'editor.field_status': 'Status',
            'editor.field_responsavel': 'Assignee',
            'editor.no_responsavel': 'Unassigned',
            'editor.intruder': 'Intruder',
            'editor.observacao': 'Notes',
            'editor.segments': 'Segments',
            'editor.segment': 'Segment',
            'editor.delay': 'Delay',
            'editor.sprint_start': 'Sprint start',
            'editor.sprint_end': 'Sprint end',
            'editor.sprint_begin_label': 'begin',
            'editor.sprint_mid_label': 'mid',
            'editor.sprint_end_label': 'end',
            'editor.add_delay': '+ Delay',
            'editor.add_segment': '+ Segment',
            'editor.save': 'Save',
            'editor.action_edit': 'Edit',
            'editor.action_delete': 'Delete',
            'editor.confirm_delete_one': 'Delete this item?',
            'editor.confirm_delete_selected': 'Delete the selected item?',
            'editor.saved': 'Item saved',

            'ie.share_title': 'Share via link',
            'ie.share_desc': 'Generates a URL with the full roadmap embedded in the hash (no server). Paste it into a browser to open.',
            'ie.share_copy': 'Copy link',
            'ie.share_copied': 'Link copied to clipboard',
            'ie.share_size': 'Size: {n} characters',
            'ie.share_copy_failed': 'Could not copy; link shown below the button',
            'ie.share_copy_below': 'Copy the link shown below the button',
            'ie.share_invalid': 'Invalid shared link: {msg}',
            'ie.share_loaded': 'Roadmap loaded from shared link',
            'ie.share_confirm_load': 'This page has a shared roadmap in the link. Load it and replace the current roadmap?',
            'ie.share_error': 'Error generating link: {msg}',
            'ie.html_title': 'Export HTML + image',
            'ie.html_desc': 'Export the roadmap as HTML with a PNG image in the same folder. The image is referenced with a relative path.',
            'ie.html_btn': 'Export HTML + PNG',
            'ie.png_btn': 'Export PNG only',
            'ie.json_title': 'JSON',
            'ie.json_desc': 'Export or import the full roadmap as JSON.',
            'ie.json_export': 'Export JSON',
            'ie.json_import': 'Import JSON',
            'ie.fs_title': 'Save / open file',
            'ie.fs_desc': 'Use the browser File System API to save/open files directly.',
            'ie.fs_save': 'Save to disk',
            'ie.fs_load': 'Open from disk',
            'ie.autosave_label': 'Automatic auto-save',
            'ie.autosave_interval': 'Interval (seconds)',
            'ie.autosave_status_label': 'Status:',
            'ie.autosave_off': 'Off',
            'ie.autosave_on': 'On — every {n}s',
            'ie.autosave_saved_at': 'Saved at {time}',
            'ie.autosave_error': 'Error saving',
            'ie.autosave_save_first': 'Auto-save: save manually first to set the target file',
            'ie.paste_title': 'Import via paste (Excel/Sheets)',
            'ie.paste_desc': 'Paste data copied from a spreadsheet. Accepts key→value format or header+values (TSV).',
            'ie.paste_placeholder': 'Paste data here...',
            'ie.paste_apply': 'Apply pasted data',
            'ie.paste_empty': 'Paste data before applying',
            'ie.paste_applied': 'Configuration applied',
            'ie.csv_title': 'Load CSV',
            'ie.csv_desc': 'Import a CSV file with config or items data.',
            'ie.csv_config': 'Config',
            'ie.csv_items': 'Items',
            'ie.csv_select': 'Select CSV',
            'ie.json_exported': 'JSON exported',
            'ie.json_imported': 'JSON imported',
            'ie.csv_config_imported': 'Config CSV imported',
            'ie.csv_items_imported': 'Items CSV imported',
            'ie.json_import_error': 'Error importing JSON: {msg}',
            'ie.csv_import_error': 'Error importing CSV: {msg}',
            'ie.fs_save_ok': 'File saved',
            'ie.fs_load_ok': 'File loaded',
            'ie.fs_save_error': 'Error saving: {msg}',
            'ie.fs_load_error': 'Error loading: {msg}',
            'ie.png_generating': 'Generating PNG...',
            'ie.png_exported': 'PNG exported',
            'ie.png_error': 'Error exporting PNG: {msg}',
            'ie.html_generating': 'Generating HTML + PNG...',
            'ie.html_exported': 'HTML + PNG exported! Save both in the same folder.',
            'ie.html_error': 'Error exporting HTML: {msg}',
            'ie.error_paste_format': 'Format not recognized. Use two columns (key→value) or header+values.',
            'ie.error_csv_header': 'CSV needs header + at least one row',
            'ie.error_no_data': 'No data found',

            'state.save_failed': 'Could not save in browser: {msg}',

            'roadmap.empty_msg': 'Configure dates to generate the roadmap.',
            'roadmap.legend_intruder': 'Intruder',
            'roadmap.legend_delay': 'Delay',
            'roadmap.label_prefix': 'ROADMAP',
            'roadmap.resize_start': 'Resize start',
            'roadmap.resize_end': 'Resize end',

            'tooltip.delays': 'Delays'
        }
    };

    let currentLocale = (() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved && dict[saved]) return saved;
        } catch (e) { /* ignore */ }
        const nav = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : DEFAULT_LOCALE;
        if (dict[nav]) return nav;
        const short = nav.split('-')[0];
        const match = Object.keys(dict).find(k => k.startsWith(short + '-'));
        return match || DEFAULT_LOCALE;
    })();

    function t(key, params) {
        const table = dict[currentLocale] || dict[DEFAULT_LOCALE];
        let str = table[key];
        if (str == null) str = (dict[DEFAULT_LOCALE][key] != null ? dict[DEFAULT_LOCALE][key] : key);
        if (params) {
            Object.keys(params).forEach(p => {
                str = str.replace(new RegExp('\\{' + p + '\\}', 'g'), params[p]);
            });
        }
        return str;
    }

    function getLocale() { return currentLocale; }
    function getLocales() { return Object.keys(dict); }

    function setLocale(locale) {
        if (!dict[locale]) return;
        currentLocale = locale;
        try { localStorage.setItem(STORAGE_KEY, locale); } catch (e) { /* ignore */ }
        document.documentElement.setAttribute('lang', locale);
        applyToDOM();
        listeners.forEach(fn => fn(locale));
    }

    const listeners = [];
    function onChange(fn) { listeners.push(fn); }

    // Walks the DOM applying translations to elements with data-i18n attributes.
    // Supports: data-i18n (textContent), data-i18n-placeholder, data-i18n-aria-label,
    // data-i18n-title.
    function applyToDOM(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-i18n]').forEach(el => {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
        });
        scope.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
            el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
        });
        scope.querySelectorAll('[data-i18n-title]').forEach(el => {
            el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
        });
    }

    return { t, getLocale, getLocales, setLocale, onChange, applyToDOM };
})();
