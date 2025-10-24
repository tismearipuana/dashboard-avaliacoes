// **CONFIGURAÇÃO E CONSTANTES**
const CONFIG = {
    GOOGLE_SHEET_CSV_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRksD0qVfRpagTtC5dIlImsoVh4Gcb_aiqtJGXeL2d3X6f44oCrR9odhiKwyQAK-fifiUsroVLhU87m/pub?output=csv',
    ROWS_PER_PAGE: 15,
    DEBOUNCE_DELAY: 300,
    CACHE_SIZE: 50,
    STUDENT_NAME_HEADER: 'ALUNO'
};

// Registra o plugin de datalabels do Chart.js
Chart.register(ChartDataLabels);

// **CLASSES UTILITÁRIAS**

class FilterCache {
    constructor(maxSize = CONFIG.CACHE_SIZE) { this.cache = new Map(); this.maxSize = maxSize; }
    get(key) { if (this.cache.has(key)) { const value = this.cache.get(key); this.cache.delete(key); this.cache.set(key, value); return value; } return null; }
    set(key, value) { if (this.cache.size >= this.maxSize) { const firstKey = this.cache.keys().next().value; this.cache.delete(firstKey); } this.cache.set(key, value); }
    clear() { this.cache.clear(); }
}

class LoadingManager {
    constructor() { this.loadingElement = document.getElementById('loading-indicator'); this.messageElement = document.getElementById('loading-message'); this.progressElement = document.querySelector('.progress-fill'); }
    show(message = 'Carregando dados...', progress = 0) { if (this.messageElement) this.messageElement.textContent = message; if (this.progressElement) this.progressElement.style.width = `${progress}%`; if (this.loadingElement) this.loadingElement.style.display = 'flex'; }
    updateProgress(progress, message) { if (this.progressElement) this.progressElement.style.width = `${progress}%`; if (message && this.messageElement) this.messageElement.textContent = message; }
    hide() { if (this.loadingElement) this.loadingElement.style.display = 'none'; }
}

class NotificationManager {
    constructor() { this.container = document.getElementById('notification-container'); if (!this.container) { this.container = document.createElement('div'); this.container.id = 'notification-container'; this.container.setAttribute('aria-live', 'polite'); this.container.setAttribute('aria-atomic', 'true'); document.body.appendChild(this.container); } }
    show(message, type = 'info', duration = 5000) { const notification = document.createElement('div'); notification.className = `notification ${type}`; notification.innerHTML = `<div class="notification-content"><span class="notification-message">${this.sanitizeHTML(message)}</span><button class="notification-close" aria-label="Fechar notificação">&times;</button></div>`; const closeBtn = notification.querySelector('.notification-close'); closeBtn.addEventListener('click', () => this.remove(notification)); this.container.appendChild(notification); if (duration > 0) setTimeout(() => this.remove(notification), duration); return notification; }
    remove(notification) { if (notification && notification.parentNode) { notification.style.animation = 'slideOut 0.3s ease-in forwards'; setTimeout(() => { if (notification.parentNode) notification.parentNode.removeChild(notification); }, 300); } }
    sanitizeHTML(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
}

class KeyboardNavigation {
    constructor() { this.init(); }
    init() { document.addEventListener('keydown', this.handleKeydown.bind(this)); }
    handleKeydown(event) { switch(event.key) { case 'Enter': case ' ': if (event.target.classList.contains('sortable')) { event.preventDefault(); event.target.click(); } break; case 'Escape': this.closeModals(); break; } }
    closeModals() { const modals = document.querySelectorAll('.modal'); modals.forEach(modal => { if (modal.style.display !== 'none') { modal.style.display = 'none'; modal.setAttribute('aria-hidden', 'true'); } }); }
}

// **VARIÁVEIS GLOBAIS**
let allData = [];
let filteredData = [];
let headers = [];
let currentChart = null;
let schoolPerformanceChart = null;
let sortColumn = null;
let sortDirection = 'asc';
let currentPage = 1;

// **INSTÂNCIAS DOS GERENCIADORES**
const filterCache = new FilterCache();
const loadingManager = new LoadingManager();
const notificationManager = new NotificationManager();
const keyboardNav = new KeyboardNavigation();

// **REFERÊNCIAS AOS ELEMENTOS HTML**
const elements = {
    dataTableContainer: document.getElementById('data-table-container'),
    schoolFilter: document.getElementById('school-filter'),
    evaluationFilter: document.getElementById('evaluation-filter'),
    yearFilter: document.getElementById('year-filter'),
    turmaFilter: document.getElementById('turma-filter'),
    levelFilterGroup: document.getElementById('level-filter-group'),
    levelFilter: document.getElementById('level-filter'),
    nseFilterGroup: document.getElementById('nse-filter-group'),
    nseFilter: document.getElementById('nse-filter'),
    corRacaFilterGroup: document.getElementById('cor-raca-filter-group'),
    corRacaFilter: document.getElementById('cor-raca-filter'),
    inclusaoFilterGroup: document.getElementById('inclusao-filter-group'),
    inclusaoFilter: document.getElementById('inclusao-filter'),
    transporteFilterGroup: document.getElementById('transporte-filter-group'),
    transporteFilter: document.getElementById('transporte-filter'),
    applyFiltersButton: document.getElementById('apply-filters'),
    clearFiltersButton: document.getElementById('clear-filters'),
    exportCsvButton: document.getElementById('export-csv'),
    summarySection: document.getElementById('summary-section'),
    totalCardContent: document.getElementById('total-card-content'),
    distCardContent: document.getElementById('dist-card-content'),
    chartCardTitle: document.getElementById('chart-card-title'),
    schoolPerformanceSection: document.getElementById('school-performance-section'),
    schoolChartHeading: document.getElementById('school-chart-heading'),
    topScrollContainer: document.getElementById('top-scroll-container'),
    topScrollBar: document.getElementById('top-scroll-bar'),
    studentSearch: document.getElementById('student-search'),
    themeToggle: document.getElementById('theme-toggle'),
    paginationControls: document.getElementById('pagination-controls')
};

// **CONFIGURAÇÕES DE AVALIAÇÃO**
const EVALUATION_SCORES = (() => {
    const fluencyScores = { 'Pré Leitor 1': 1, 'Pré Leitor 2': 2, 'Pré Leitor 3': 3, 'Pré Leitor 4': 4, 'Pré Leitor 5': 5, 'Pré Leitor 6': 6, 'Iniciante': 7, 'Fluente': 8, '_default': 0 };
    const performanceScores = { 'Abaixo do Básico': 1, 'Básico': 2, 'Proficiente': 3, 'Avançado': 4, '_default': 0 };
    const performanceScores2 = { 'Muito Baixo': 1, 'Baixo': 2, 'Médio': 3, 'Alto': 4, '_default': 0 };
    const mixedScoresNivel = { 'Nível 1': 1, 'Nível 2': 2, 'Nível 3': 3, 'Nível 4': 4, 'Iniciante': 5, 'Fluente': 6, '_default': 0 };
    const mixedScoresLeitor = { 'Leitor 1': 1, 'Leitor 2': 2, 'Leitor 3': 3, 'Leitor 4': 4, 'Iniciante': 5, 'Fluente': 6, '_default': 0 };
    const threePointScores = { 'Defasado': 1, 'Intermediário': 2, 'Adequado': 3, '_default': 0 };
    
    return {
        'Avaliação de Fluência 2021': fluencyScores, 'A. Somativa/LP/21': performanceScores, 'A. Somativa/Mat/21': performanceScores,
        'Avaliação de Fluência de Entrada 2022': fluencyScores, 'Avaliação de Fluência intermediária 2022': fluencyScores, 'Avaliação de Fluência de Saída 2022': fluencyScores,
        'Avaliação Formativa Processual/LP/2022': performanceScores2, 'Avaliação Formativa Processual/mat/2022': performanceScores2,
        'A. Somativa/LP/22': performanceScores, 'A. Somativa/Mat/22': performanceScores, 'Avaliação de fLuência de Entrada/2023': mixedScoresNivel,
        'Avaliação de Fluência Formativa/2023': mixedScoresNivel, 'Avaliação de Fluência de Saída/2023': mixedScoresNivel,
        'Avaliação Formativa Diagnóstica/LP/2023': performanceScores2, 'Avaliação Formativa Diagnóstrica/Mat/2023': performanceScores2,
        'Avaliação Formativa Processual/LP/23': performanceScores2, 'Avaliação Formativa Processual/Mat/23': performanceScores2,
        'A. Somativa/LP/23': performanceScores2, 'A. Somativa/Mat/23': performanceScores2, 'Avaliação Formativa Diagnóstica/LP/2024': performanceScores2,
        'Avaliação Formativa Diagnóstica/Mat/2024': performanceScores2, 'Avaliação Formativa Processual/LP/2024': performanceScores2,
        'Avaliação Formativa Processual/Mat/2024': performanceScores2, 'Avaliação de Fluência 2024': mixedScoresLeitor,
        'Avaliação Somativa Língua Portuguesa 2024': performanceScores, 'Avaliação Somativa Matemática 2024': performanceScores,
        'Avaliação de Fluência de Saída/2024': mixedScoresNivel, 'Avaliação de Fluência de Entrada/2025': mixedScoresLeitor,
        'Diagnóstica Matemática 2025': threePointScores, 'Diagnóstica Língua Portuguesa 2025': threePointScores,
        'Avaliação SAEB Língua Portuguesa 2025': performanceScores,
        'Avaliação SAEB Matemática 2025': performanceScores
    };
})();

const LEVEL_STYLES = {
    'Pré Leitor 1': { color: '#B00020', className: 'level-pre-leitor-1' }, 'Pré Leitor 2': { color: '#C62828', className: 'level-pre-leitor-2' },
    'Pré Leitor 3': { color: '#E53935', className: 'level-pre-leitor-3' }, 'Pré Leitor 4': { color: '#F57C00', className: 'level-pre-leitor-4' },
    'Pré Leitor 5': { color: '#E65100', className: 'level-pre-leitor-5' }, 'Pré Leitor 6': { color: '#689F38', className: 'level-pre-leitor-6' },
    'Abaixo do Básico': { color: '#B00020', className: 'level-abaixo-do-basico' }, 'Básico': { color: '#F4C542', className: 'level-basico' },
    'Proficiente': { color: '#43A047', className: 'level-proficiente' }, 'Avançado': { color: '#2E7D32', className: 'level-avancado' },
    'Muito Baixo': { color: '#C62828', className: 'level-muito-baixo' }, 'Baixo': { color: '#EF6C00', className: 'level-baixo' },
    'Médio': { color: '#FBC02D', className: 'level-medio' }, 'Alto': { color: '#2E7D32', className: 'level-alto' },
    'Nível 1': { color: '#B71C1C', className: 'level-nivel-1' }, 'Nível 2': { color: '#F57C00', className: 'level-nivel-2' },
    'Nível 3': { color: '#FBC02D', className: 'level-nivel-3' }, 'Nível 4': { color: '#2E7D32', className: 'level-nivel-4' },
    'Leitor 1': { color: '#C62828', className: 'level-leitor-1' }, 'Leitor 2': { color: '#EF6C00', className: 'level-leitor-2' },
    'Leitor 3': { color: '#FDD835', className: 'level-leitor-3' }, 'Leitor 4': { color: '#43A047', className: 'level-leitor-4' },
    'Defasado': { color: '#D32F2F', className: 'level-defasado' }, 'Intermediário': { color: '#FFB300', className: 'level-intermediario' },
    'Adequado': { color: '#388E3C', className: 'level-adequado' },
    'Iniciante': { color: '#29B6F6', className: 'level-iniciante-blue-2' }, 'Fluente': { color: '#1E88E5', className: 'level-fluente-blue-2' }
};

// **FUNÇÕES UTILITÁRIAS**
function sanitizeHTML(str) { if (!str) return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
function toTitleCase(str) { if (!str || typeof str !== 'string') return ''; return str.toLowerCase().split(' ').map(word => ['de','da','do','dos','das','e','a','o'].includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }
function getLevelClassName(levelValue) { if (!levelValue) return 'level-sem-dados'; const style = LEVEL_STYLES[levelValue.trim()]; return style ? `level-default ${style.className}` : 'level-sem-dados'; }
function debounce(func, delay) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func.apply(this, args); }; clearTimeout(timeout); timeout = setTimeout(later, delay); }; }
function generateCacheKey(filters) { return JSON.stringify(filters); }

// --- FUNÇÃO DE VALIDAÇÃO ATUALIZADA ---
function validateStudentData(data) {
    const requiredFields = ['ESCOLA', CONFIG.STUDENT_NAME_HEADER, 'ETAPA DE ENSINO', 'TURMA'];
    return data.filter(row =>
        requiredFields.every(field =>
            row[field] &&
            typeof row[field] === 'string' &&
            row[field].trim().length > 0
        )
    );
}

function getContrastColor(hexColor) {
    if (!hexColor) return '#000000';
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
}


// **FUNÇÃO PRINCIPAL DE CARREGAMENTO**
async function loadGoogleSheetData() {
    try {
        loadingManager.show('Conectando com o Banco de Dados...', 10);
        const response = await fetch(CONFIG.GOOGLE_SHEET_CSV_URL);
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        loadingManager.updateProgress(30, 'Baixando dados...');
        const csvText = await response.text();
        loadingManager.updateProgress(50, 'Processando dados...');
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                try {
                    if (results.errors.length > 0) console.warn('Avisos durante o parsing:', results.errors);
                    loadingManager.updateProgress(70, 'Validando dados...');
                    headers = results.meta.fields || [];
                    const rawData = results.data || [];
                    allData = validateStudentData(rawData);
                    if (allData.length === 0) throw new Error('Nenhum dado válido encontrado na planilha');
                    loadingManager.updateProgress(90, 'Configurando interface...');
                    populateFilters();
                    elements.dataTableContainer.innerHTML = `<div class="info-message"><span class="icon" aria-hidden="true">📋</span> Dados carregados com sucesso! Selecione os filtros para visualizar.</div>`;
                    notificationManager.show(`${allData.length} registros carregados com sucesso!`, 'success');
                    loadingManager.updateProgress(100, 'Concluído!');
                } catch (error) {
                    console.error('Erro no processamento:', error);
                    elements.dataTableContainer.innerHTML = `<div class="info-message error-message"><span class="icon" aria-hidden="true">⚠️</span> Erro ao processar os dados: ${sanitizeHTML(error.message)}</div>`;
                    notificationManager.show('Erro ao processar dados da planilha', 'error');
                } finally {
                    setTimeout(() => loadingManager.hide(), 500);
                }
            },
            error: function(error) {
                console.error('Erro no Papa Parse:', error);
                elements.dataTableContainer.innerHTML = `<div class="info-message error-message"><span class="icon" aria-hidden="true">❌</span> Falha ao processar a planilha</div>`;
                notificationManager.show('Falha ao processar a planilha', 'error');
                loadingManager.hide();
            }
        });
    } catch (error) {
        console.error('Erro geral no carregamento:', error);
        elements.dataTableContainer.innerHTML = `<div class="info-message error-message"><span class="icon" aria-hidden="true">🌐</span> Erro de conexão: ${sanitizeHTML(error.message)}</div>`;
        notificationManager.show('Erro de conexão com a planilha', 'error');
        loadingManager.hide();
    }
}

// **FUNÇÕES DE FILTROS**
function populateFilters() {
    try {
        const schools = [...new Set(allData.map(row => row['ESCOLA']))].filter(Boolean).sort();
        const turmas = [...new Set(allData.map(row => row['TURMA']))].filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        const years = [...new Set(allData.map(row => row['ETAPA DE ENSINO']))].filter(Boolean).sort(); // ATUALIZADO
        const evaluationNames = Object.keys(EVALUATION_SCORES).sort();
        populateSelect(elements.schoolFilter, schools, 'Todas as Escolas');
        populateSelect(elements.turmaFilter, turmas, 'Todas as Turmas');
        populateSelect(elements.yearFilter, years, 'Todas as Etapas');
        populateSelect(elements.evaluationFilter, evaluationNames, 'Todas as Avaliações');
    } catch (error) {
        console.error('Erro ao popular filtros:', error);
        notificationManager.show('Erro ao configurar filtros', 'error');
    }
}

function populateSelect(selectElement, options, defaultText) {
    if (!selectElement) return;
    selectElement.innerHTML = `<option value="">${defaultText}</option>`;
    options.forEach(option => { if (option) { const optionElement = document.createElement('option'); optionElement.value = option; optionElement.textContent = option; selectElement.appendChild(optionElement); } });
}

function updateDynamicFilters(evaluationHeader) {
    const showDemographic = !!evaluationHeader;
    const filtersConfig = [
        { group: elements.levelFilterGroup, select: elements.levelFilter, values: evaluationHeader ? [...new Set(allData.map(row => row[evaluationHeader]))].filter(Boolean).sort() : [], defaultText: 'Todos os Níveis' },
        { group: elements.nseFilterGroup, select: elements.nseFilter, header: 'BENEFICIÁRIO SOCIAL?', defaultText: 'Todos' }, // ATUALIZADO
        { group: elements.corRacaFilterGroup, select: elements.corRacaFilter, header: 'COR/RAÇA', defaultText: 'Todas as Cores/Raças' },
        { group: elements.inclusaoFilterGroup, select: elements.inclusaoFilter, header: 'ALUNO PCD?', defaultText: 'Todos' }, // ATUALIZADO
        { group: elements.transporteFilterGroup, select: elements.transporteFilter, header: 'UTILIZA TRANSPORTE ESCOLAR', defaultText: 'Todos' } // ATUALIZADO
    ];
    filtersConfig.forEach(config => {
        if (!config.group || !config.select) return;
        if (config.values) {
            populateSelect(config.select, config.values, config.defaultText);
            config.group.style.display = config.values.length > 0 ? 'block' : 'none';
        } else if (showDemographic && config.header && headers.includes(config.header)) {
            const values = [...new Set(allData.map(row => row[config.header]))].filter(Boolean).sort();
            populateSelect(config.select, values, config.defaultText);
            config.group.style.display = 'block';
        } else {
            config.group.style.display = 'none';
        }
    });
}

// **FUNÇÃO PRINCIPAL DE APLICAÇÃO DE FILTROS**
function applyFilters() {
    try {
        loadingManager.show('Aplicando filtros...', 20);
        sortColumn = null; sortDirection = 'asc'; currentPage = 1;
        const filters = {
            school: elements.schoolFilter?.value || '', evaluation: elements.evaluationFilter?.value || '',
            turma: elements.turmaFilter?.value || '', year: elements.yearFilter?.value || '',
            level: elements.levelFilter?.value || '', nse: elements.nseFilter?.value || '',
            corRaca: elements.corRacaFilter?.value || '', inclusao: elements.inclusaoFilter?.value || '',
            transporte: elements.transporteFilter?.value || '', searchQuery: elements.studentSearch?.value.toLowerCase().trim() || ''
        };
        const cacheKey = generateCacheKey(filters);
        let cachedResult = filterCache.get(cacheKey);
        if (cachedResult) {
            filteredData = cachedResult; loadingManager.updateProgress(80, 'Carregando do cache...');
        } else {
            loadingManager.updateProgress(40, 'Filtrando dados...');
            filteredData = allData.filter(row => 
                (!filters.school || row['ESCOLA'] === filters.school) &&
                (!filters.turma || row['TURMA'] === filters.turma) &&
                (!filters.year || row['ETAPA DE ENSINO'] === filters.year) && // ATUALIZADO
                (!filters.searchQuery || (row[CONFIG.STUDENT_NAME_HEADER] && row[CONFIG.STUDENT_NAME_HEADER].toLowerCase().includes(filters.searchQuery))) &&
                (!filters.evaluation || (row[filters.evaluation] && row[filters.evaluation].trim() !== '')) &&
                (!filters.nse || (row['BENEFICIÁRIO SOCIAL?'] && row['BENEFICIÁRIO SOCIAL?'].toLowerCase() === filters.nse.toLowerCase())) && // ATUALIZADO
                (!filters.corRaca || (row['COR/RAÇA'] && row['COR/RAÇA'].toLowerCase() === filters.corRaca.toLowerCase())) &&
                (!filters.inclusao || (row['ALUNO PCD?'] && row['ALUNO PCD?'].toLowerCase() === filters.inclusao.toLowerCase())) && // ATUALIZADO
                (!filters.transporte || (row['UTILIZA TRANSPORTE ESCOLAR'] && row['UTILIZA TRANSPORTE ESCOLAR'].toLowerCase() === filters.transporte.toLowerCase())) && // ATUALIZADO
                (!filters.level || (row[filters.evaluation] && row[filters.evaluation].toLowerCase() === filters.level.toLowerCase()))
            );
            filterCache.set(cacheKey, filteredData);
        }
        loadingManager.updateProgress(60, 'Renderizando resultados...');
        setTimeout(() => {
            displayData(filteredData, filters.evaluation);
            displaySummaryStatistics(filteredData, filters.evaluation);
            drawChart(filteredData, filters.evaluation);
            drawSchoolPerformanceChart(filteredData, filters.evaluation); 
            loadingManager.updateProgress(100, 'Concluído!');
            setTimeout(() => loadingManager.hide(), 300);
            notificationManager.show(`${filteredData.length} registros encontrados`, 'info', 3000);
        }, 100);
    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        notificationManager.show('Erro ao aplicar filtros', 'error');
        loadingManager.hide();
    }
}

// **FUNÇÃO DE ORDENAÇÃO**
function sortData(column) {
    try {
        currentPage = 1;
        if (sortColumn === column) { sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'; } else { sortColumn = column; sortDirection = 'asc'; }
        const scoreRules = EVALUATION_SCORES[column];
        filteredData.sort((a, b) => {
            const valueA = a[column] || ''; const valueB = b[column] || '';
            let comparison = 0;
            if (scoreRules) { const scoreA = scoreRules[valueA] ?? scoreRules['_default'] ?? -1; const scoreB = scoreRules[valueB] ?? scoreRules['_default'] ?? -1; comparison = scoreA - scoreB; } else { comparison = valueA.localeCompare(valueB, 'pt-BR', { numeric: true }); }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
        displayData(filteredData, elements.evaluationFilter?.value || '');
    } catch (error) { console.error('Erro na ordenação:', error); notificationManager.show('Erro ao ordenar dados', 'error'); }
}

// **FUNÇÃO DE EXIBIÇÃO DE DADOS**
function displayData(dataToDisplay, columnHeader) {
    try {
        elements.paginationControls.innerHTML = '';
        if (dataToDisplay.length === 0) { elements.dataTableContainer.innerHTML = `<div class="info-message"><span class="icon" aria-hidden="true">🔍</span> Nenhum dado encontrado com os filtros aplicados.</div>`; elements.summarySection.style.display = 'none'; return; }
        const startIndex = (currentPage - 1) * CONFIG.ROWS_PER_PAGE;
        const endIndex = startIndex + CONFIG.ROWS_PER_PAGE;
        const paginatedData = dataToDisplay.slice(startIndex, endIndex);
        let orderedHeaders = ['ESCOLA', CONFIG.STUDENT_NAME_HEADER];
        if (columnHeader) orderedHeaders.push(columnHeader);
        const remainingBase = ['ETAPA DE ENSINO', 'TURMA']; // ATUALIZADO
        const demographicHeaders = ['BENEFICIÁRIO SOCIAL?', 'COR/RAÇA', 'ALUNO PCD?', 'UTILIZA TRANSPORTE ESCOLAR']; // ATUALIZADO
        orderedHeaders.push(...remainingBase, ...demographicHeaders);
        if (!columnHeader) orderedHeaders.push(...Object.keys(EVALUATION_SCORES));
        const displayHeaders = [...new Set(orderedHeaders)].filter(h => headers.includes(h));
        let tableHTML = `<table role="table" aria-label="Dados de avaliações dos alunos"><thead><tr role="row"><th role="columnheader">#</th>`;
        displayHeaders.forEach(header => {
            let sortClass = 'sortable'; let ariaSort = 'none';
            if (header === sortColumn) { sortClass += sortDirection === 'asc' ? ' sorted-asc' : ' sorted-desc'; ariaSort = sortDirection === 'asc' ? 'ascending' : 'descending'; }
            tableHTML += `<th role="columnheader" class="${sortClass}" onclick="sortData('${header}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();sortData('${header}');}" tabindex="0" aria-sort="${ariaSort}">${sanitizeHTML(toTitleCase(header))}</th>`;
        });
        tableHTML += '</tr></thead><tbody role="rowgroup">';
        paginatedData.forEach((row, index) => {
            const fullDataIndex = startIndex + index; const levelValue = columnHeader ? row[columnHeader] : ''; const rowClass = getLevelClassName(levelValue);
            tableHTML += `<tr class="${rowClass}" role="row"><td>${fullDataIndex + 1}</td>`;
            displayHeaders.forEach(header => {
                const cellValue = row[header] || '';
                if (header === CONFIG.STUDENT_NAME_HEADER) { tableHTML += `<td><a href="#" class="student-link" onclick="openStudentDetail(${fullDataIndex}); return false;" onkeydown="if(event.key==='Enter'){event.preventDefault();openStudentDetail(${fullDataIndex});}" aria-label="Ver detalhes de ${sanitizeHTML(cellValue)}">${sanitizeHTML(toTitleCase(cellValue))}</a></td>`; } else { tableHTML += `<td>${sanitizeHTML(toTitleCase(cellValue))}</td>`; }
            });
            tableHTML += '</tr>';
        });
        tableHTML += '</tbody></table>';
        elements.dataTableContainer.innerHTML = tableHTML;
        setupScrollSynchronization();
        renderPaginationControls(dataToDisplay.length);
    } catch (error) { console.error('Erro ao exibir dados:', error); elements.dataTableContainer.innerHTML = `<div class="info-message error-message"><span class="icon" aria-hidden="true">⚠️</span> Erro ao exibir os dados</div>`; notificationManager.show('Erro ao exibir dados', 'error'); }
}

// **FUNÇÃO DE ESTATÍSTICAS**
function displaySummaryStatistics(data, columnHeader) {
    try {
        if (!columnHeader || data.length === 0) { elements.summarySection.style.display = 'none'; return; }
        elements.summarySection.style.display = 'block';
        const totalEvaluated = data.length;
        const levelCounts = data.reduce((acc, row) => { const level = row[columnHeader]; if (level && level.trim() !== '') { acc[level] = (acc[level] || 0) + 1; } return acc; }, {});
        
        elements.totalCardContent.innerHTML = `<span class="value">${totalEvaluated.toLocaleString('pt-BR')}</span>`;
        
        const scoreRules = EVALUATION_SCORES[columnHeader];
        const sortedLevels = Object.keys(levelCounts).sort((a, b) => scoreRules ? (scoreRules[a] ?? 99) - (scoreRules[b] ?? 99) : a.localeCompare(b, 'pt-BR'));
        let listItems = '<ul class="level-distribution-list">';
        sortedLevels.forEach(level => { const count = levelCounts[level]; const percentage = ((count / totalEvaluated) * 100).toFixed(1); listItems += `<li><strong>${sanitizeHTML(toTitleCase(level))}:</strong> ${count.toLocaleString('pt-BR')} (${percentage}%)</li>`; });
        listItems += '</ul>';
        elements.distCardContent.innerHTML = listItems;

    } catch (error) { console.error('Erro ao exibir estatísticas:', error); notificationManager.show('Erro ao calcular estatísticas', 'error'); }
}

// **FUNÇÕES DE GRÁFICOS**
function drawChart(data, columnHeader) {
    try {
        if (currentChart) { currentChart.destroy(); currentChart = null; }
        if (data.length === 0 || !columnHeader) { return; }
        
        elements.chartCardTitle.textContent = `Distribuição - ${toTitleCase(columnHeader)}`;

        const levelCounts = data.reduce((acc, row) => { const level = row[columnHeader]; if (level && level.trim() !== '') acc[level] = (acc[level] || 0) + 1; return acc; }, {});
        const scoreRules = EVALUATION_SCORES[columnHeader];
        const labels = Object.keys(levelCounts).sort((a, b) => scoreRules ? (scoreRules[a] ?? 99) - (scoreRules[b] ?? 99) : a.localeCompare(b, 'pt-BR'));
        if (labels.length === 0) { return; }

        const backgroundColors = labels.map(label => LEVEL_STYLES[label]?.color || '#CCCCCC');
        const chartData = labels.map(label => levelCounts[label]);
        const ctx = document.getElementById('fluenciaChart'); if (!ctx) return;

        currentChart = new Chart(ctx, {
            type: 'pie', data: { labels: labels.map(label => toTitleCase(label)), datasets: [{ label: 'Número de Alunos', data: chartData, backgroundColor: backgroundColors, borderColor: 'rgba(255, 255, 255, 0.8)', borderWidth: 2 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } },
                    title: { display: false },
                    tooltip: { callbacks: { label: function(context) { const total = context.chart.getDatasetMeta(0).total; const percentage = ((context.raw / total) * 100).toFixed(1); return `${context.label}: ${context.raw.toLocaleString("pt-BR")} (${percentage}%)`; } } },
                    datalabels: { 
                        display: true, 
                        formatter: (value, context) => { const total = context.dataset.data.reduce((a, b) => a + b, 0); const percentage = ((value / total) * 100); if (percentage < 3) return ''; return percentage.toFixed(1) + '%'; },
                        color: (context) => getContrastColor(context.dataset.backgroundColor[context.dataIndex]),
                        font: { weight: 'bold', size: 12 }
                    }
                }
            }
        });
    } catch (error) { console.error('Erro ao desenhar gráfico de pizza:', error); notificationManager.show('Erro ao gerar gráfico de pizza', 'error'); }
}

function drawSchoolPerformanceChart(data, evaluationName) {
    try {
        if (schoolPerformanceChart) { schoolPerformanceChart.destroy(); schoolPerformanceChart = null; }
        const section = elements.schoolPerformanceSection;
        if (!evaluationName || data.length === 0) { section.style.display = 'none'; return; }

        const scoreRules = EVALUATION_SCORES[evaluationName];
        if (!scoreRules) { section.style.display = 'none'; return; }
        
        elements.schoolChartHeading.textContent = `Desempenho Comparativo por Escola - ${toTitleCase(evaluationName)}`;

        const schoolLevelCounts = data.reduce((acc, row) => {
            const school = row['ESCOLA']; const level = row[evaluationName];
            if (school && level && scoreRules[level] !== undefined) {
                if (!acc[school]) acc[school] = { total: 0 };
                acc[school][level] = (acc[school][level] || 0) + 1;
                acc[school].total++;
            }
            return acc;
        }, {});

        const schools = Object.keys(schoolLevelCounts);
        if (schools.length === 0) { section.style.display = 'none'; return; }

        const allLevels = Object.keys(scoreRules).filter(key => key !== '_default');
        allLevels.sort((a, b) => scoreRules[a] - scoreRules[b]);

        const datasets = allLevels.map(level => ({
            label: toTitleCase(level),
            data: schools.map(school => { const count = schoolLevelCounts[school][level] || 0; const total = schoolLevelCounts[school].total; return total > 0 ? (count / total) * 100 : 0; }),
            backgroundColor: LEVEL_STYLES[level]?.color || '#CCCCCC',
            rawCounts: schools.map(school => schoolLevelCounts[school][level] || 0)
        }));
        
        section.style.display = 'block';
        const ctx = document.getElementById('schoolPerformanceChart'); if (!ctx) return;

        schoolPerformanceChart = new Chart(ctx, {
            type: 'bar', data: { labels: schools, datasets: datasets },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                scales: { x: { stacked: true, max: 100, ticks: { callback: value => `${value}%` } }, y: { stacked: true } },
                plugins: {
                    title: { display: false },
                    tooltip: { callbacks: { label: function(context) { const dataset = context.dataset; const label = dataset.label || ''; const percentage = context.raw.toFixed(1); const rawCount = dataset.rawCounts[context.dataIndex]; return `${label}: ${rawCount} aluno(s) (${percentage}%)`; } } },
                    datalabels: { display: context => context.dataset.data[context.dataIndex] > 5, formatter: (value) => `${value.toFixed(0)}%`, color: (context) => getContrastColor(context.dataset.backgroundColor), font: { weight: 'bold' } }
                }
            }
        });
    } catch (error) { console.error('Erro ao desenhar gráfico de escolas:', error); notificationManager.show('Erro ao gerar gráfico de escolas', 'error'); }
}


// **FUNÇÕES DE UTILIDADE**
function clearFilters() {
    try {
        Object.values(elements).forEach(element => { if (element && (element.tagName === 'SELECT' || element.tagName === 'INPUT')) element.value = ''; });
        updateDynamicFilters('');
        filteredData = []; filterCache.clear();
        elements.dataTableContainer.innerHTML = `<div class="info-message"><span class="icon" aria-hidden="true">📋</span> Filtros limpos. Selecione os filtros para visualizar os dados.</div>`;
        elements.summarySection.style.display = 'none';
        elements.paginationControls.innerHTML = '';
        if (currentChart) { currentChart.destroy(); currentChart = null; }
        if (schoolPerformanceChart) { schoolPerformanceChart.destroy(); schoolPerformanceChart = null; }
        elements.schoolPerformanceSection.style.display = 'none';
        notificationManager.show('Filtros limpos com sucesso', 'info', 2000);
    } catch (error) { console.error('Erro ao limpar filtros:', error); notificationManager.show('Erro ao limpar filtros', 'error'); }
}

// **FUNÇÃO DE EXPORTAÇÃO**
function exportDataToCSV() {
    try {
        if (filteredData.length === 0) { notificationManager.show('Não há dados filtrados para exportar', 'warning'); return; }
        loadingManager.show('Preparando exportação...', 50);
        setTimeout(() => {
            const csv = Papa.unparse(filteredData, { header: true, delimiter: ';' });
            const BOM = '\uFEFF'; const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a'); const url = URL.createObjectURL(blob);
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            link.setAttribute('href', url); link.setAttribute('download', `dados_avaliacoes_${timestamp}.csv`);
            link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
            URL.revokeObjectURL(url);
            loadingManager.hide();
            notificationManager.show(`${filteredData.length} registros exportados com sucesso!`, 'success');
        }, 500);
    } catch (error) { console.error('Erro na exportação:', error); notificationManager.show('Erro ao exportar dados', 'error'); loadingManager.hide(); }
}

// **FUNÇÕES DE PAGINAÇÃO**
function changePage(page) {
    const totalPages = Math.ceil(filteredData.length / CONFIG.ROWS_PER_PAGE);
    if (page < 1) page = 1; if (page > totalPages) page = totalPages;
    currentPage = page;
    displayData(filteredData, elements.evaluationFilter?.value || '');
    elements.dataTableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderPaginationControls(totalRows) {
    if (!elements.paginationControls) return;
    elements.paginationControls.innerHTML = '';
    const totalPages = Math.ceil(totalRows / CONFIG.ROWS_PER_PAGE);
    if (totalPages <= 1) return;
    let buttonsHTML = `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} aria-label="Página anterior">&laquo; Anterior</button>`;
    let startPage = Math.max(1, currentPage - 2); let endPage = Math.min(totalPages, currentPage + 2);
    if (currentPage <= 3) endPage = Math.min(5, totalPages);
    if (currentPage > totalPages - 3) startPage = Math.max(1, totalPages - 4);
    if (startPage > 1) { buttonsHTML += `<button class="page-btn" onclick="changePage(1)" aria-label="Página 1">1</button>`; if (startPage > 2) buttonsHTML += `<span class="page-ellipsis">...</span>`; }
    for (let i = startPage; i <= endPage; i++) { buttonsHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})" aria-label="Página ${i}" ${i === currentPage ? 'aria-current="page"' : ''}>${i}</button>`; }
    if (endPage < totalPages) { if (endPage < totalPages - 1) buttonsHTML += `<span class="page-ellipsis">...</span>`; buttonsHTML += `<button class="page-btn" onclick="changePage(${totalPages})" aria-label="Página ${totalPages}">${totalPages}</button>`; }
    buttonsHTML += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} aria-label="Próxima página">Próximo &raquo;</button>`;
    elements.paginationControls.innerHTML = buttonsHTML;
}

// **FUNÇÃO DE SCROLL SINCRONIZADO**
function setupScrollSynchronization() {
    const dataTable = elements.dataTableContainer.querySelector('table');
    if (dataTable && elements.topScrollContainer && elements.topScrollBar) {
        elements.topScrollContainer.style.display = 'block';
        elements.topScrollBar.style.width = dataTable.scrollWidth + 'px';
        elements.topScrollContainer.onscroll = () => { elements.dataTableContainer.scrollLeft = elements.topScrollContainer.scrollLeft; };
        elements.dataTableContainer.onscroll = () => { elements.topScrollContainer.scrollLeft = elements.dataTableContainer.scrollLeft; };
    } else if (elements.topScrollContainer) {
        elements.topScrollContainer.style.display = 'none';
    }
}

// **FUNÇÃO DE DETALHES DO ALUNO**
function openStudentDetail(rowIndex) {
    try {
        if (rowIndex < 0 || rowIndex >= filteredData.length) { notificationManager.show('Aluno não encontrado', 'error'); return; }
        const studentData = filteredData[rowIndex];
        if (!studentData) { notificationManager.show('Dados do aluno não disponíveis', 'error'); return; }
        if (typeof(Storage) !== "undefined") { localStorage.setItem('selectedStudentData', JSON.stringify(studentData)); window.open('student_detail.html', '_blank'); } else { notificationManager.show('Navegador não suporta armazenamento local', 'error'); }
    } catch (error) { console.error('Erro ao abrir detalhes do aluno:', error); notificationManager.show('Erro ao abrir detalhes do aluno', 'error'); }
}

// **EVENT LISTENERS**
document.addEventListener('DOMContentLoaded', () => {
    try {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') { document.documentElement.setAttribute('data-theme', 'dark'); if (elements.themeToggle) elements.themeToggle.checked = true; }
        if (elements.themeToggle) { elements.themeToggle.addEventListener('change', () => { const isDark = elements.themeToggle.checked; document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light'); localStorage.setItem('theme', isDark ? 'dark' : 'light'); }); }
        loadGoogleSheetData();
    } catch (error) { console.error('Erro na inicialização:', error); notificationManager.show('Erro na inicialização da aplicação', 'error'); }
});

if (elements.applyFiltersButton) elements.applyFiltersButton.addEventListener('click', applyFilters);
if (elements.clearFiltersButton) elements.clearFiltersButton.addEventListener('click', clearFilters);
if (elements.exportCsvButton) elements.exportCsvButton.addEventListener('click', exportDataToCSV);
const debouncedApplyFilters = debounce(applyFilters, CONFIG.DEBOUNCE_DELAY);
if (elements.evaluationFilter) { elements.evaluationFilter.addEventListener('change', () => { updateDynamicFilters(elements.evaluationFilter.value); if (elements.evaluationFilter.value) debouncedApplyFilters(); }); }
if (elements.studentSearch) elements.studentSearch.addEventListener('input', debouncedApplyFilters);

// Tratamento de erros globais
window.addEventListener('error', (event) => { console.error('Erro JavaScript não tratado:', event.error); notificationManager.show('Ocorreu um erro inesperado', 'error'); });
window.addEventListener('unhandledrejection', (event) => { console.error('Promise rejeitada não tratada:', event.reason); notificationManager.show('Erro de conexão ou processamento', 'error'); });

// Expor funções necessárias globalmente
window.openStudentDetail = openStudentDetail;
window.sortData = sortData;
window.changePage = changePage;
