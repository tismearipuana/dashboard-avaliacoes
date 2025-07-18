// **LINK DA SUA PLANILHA DO GOOGLE SHEETS (PUBLICADA EM CSV)**
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQAz9Zj5zdAT5quPMUmWcp_5nqtptO54j2UIKsj5HLdrygI27XqkeB_MXjiyZLrOKkt2btLptyUtz2B/pub?output=csv';

let allData = [];
let filteredData = [];
let headers = [];
let currentChart = null;
let sortColumn = null;
let sortDirection = 'asc';
let currentPage = 1;
const rowsPerPage = 15;

// --- REFERÊNCIAS AOS ELEMENTOS HTML ---
const loadingIndicator = document.getElementById('loading-indicator');
const dataTableContainer = document.getElementById('data-table-container');
const schoolFilter = document.getElementById('school-filter');
const evaluationFilter = document.getElementById('evaluation-filter');
const yearFilter = document.getElementById('year-filter');
const turmaFilter = document.getElementById('turma-filter');
const levelFilterGroup = document.getElementById('level-filter-group'); 
const levelFilter = document.getElementById('level-filter'); 
const nseFilterGroup = document.getElementById('nse-filter-group');
const nseFilter = document.getElementById('nse-filter');
const corRacaFilterGroup = document.getElementById('cor-raca-filter-group');
const corRacaFilter = document.getElementById('cor-raca-filter');
const inclusaoFilterGroup = document.getElementById('inclusao-filter-group');
const inclusaoFilter = document.getElementById('inclusao-filter');
const transporteFilterGroup = document.getElementById('transporte-filter-group');
const transporteFilter = document.getElementById('transporte-filter');
const applyFiltersButton = document.getElementById('apply-filters');
const clearFiltersButton = document.getElementById('clear-filters');
const exportCsvButton = document.getElementById('export-csv');
const summarySection = document.getElementById('summary-section');
const totalCard = document.getElementById('total-card');
const distCard = document.getElementById('dist-card');
const chartCard = document.getElementById('chart-card');
const topScrollContainer = document.getElementById('top-scroll-container');
const topScrollBar = document.getElementById('top-scroll-bar');
const studentSearch = document.getElementById('student-search');
const themeToggle = document.getElementById('theme-toggle');
const paginationControls = document.getElementById('pagination-controls');

// --- CONFIGURAÇÕES ---
const studentNameHeader = 'ALUNO'; 

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
        'Avaliação Formativa Diagnóstica/LP/2023': performanceScores2, 'Avaliação Formativa Diagnóstica/Mat/2023': performanceScores2,
        'Avaliação Formativa Processual/LP/23': performanceScores2, 'Avaliação Formativa Processual/Mat/23': performanceScores2,
        'A. Somativa/LP/23': performanceScores2, 'A. Somativa/Mat/23': performanceScores2, 'Avaliação Formativa Diagnóstica/LP/2024': performanceScores2,
        'Avaliação Formativa Diagnóstica/Mat/2024': performanceScores2, 'Avaliação Formativa Processual/LP/2024': performanceScores2,
        'Avaliação Formativa Processual/Mat/2024': performanceScores2, 'Avaliação de Fluência 2024': mixedScoresLeitor,
        'Avaliação Somativa Língua Portuguesa 2024': performanceScores, 'Avaliação Somativa Matemática 2024': performanceScores,
        'Avaliação de Fluência de Saída/2024': mixedScoresNivel, 'Avaliação de Fluência de Entrada/2025': mixedScoresLeitor,
        'Diagnóstica Matemática 2025': threePointScores, 'Diagnóstica Língua Portuguesa 2025': threePointScores
    };
})();

const LEVEL_STYLES = {
    'Pré Leitor 1': { color: '#B00020', className: 'level-pre-leitor-1' }, 'Pré Leitor 2': { color: '#C62828', className: 'level-pre-leitor-2' },
    'Pré Leitor 3': { color: '#E53935', className: 'level-pre-leitor-3' }, 'Pré Leitor 4': { color: '#F9A825', className: 'level-pre-leitor-4' },
    'Pré Leitor 5': { color: '#FDD835', className: 'level-pre-leitor-5' }, 'Pré Leitor 6': { color: '#D4E157', className: 'level-pre-leitor-6' },
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

// --- FUNÇÕES AUXILIARES ---
function toTitleCase(str) { if (!str) return ''; return str.toLowerCase().split(' ').map(w => ['de','da','do','dos','das','e','a','o'].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' '); }
function getLevelClassName(levelValue) { if (!levelValue) return 'level-sem-dados'; const style = LEVEL_STYLES[levelValue.trim()]; return style ? `level-default ${style.className}` : 'level-sem-dados'; }
function debounce(func, delay) { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), delay); }; }

// --- LÓGICA PRINCIPAL ---
async function loadGoogleSheetData() {
    loadingIndicator.style.display = 'block';
    try {
        Papa.parse(GOOGLE_SHEET_CSV_URL, {
            download: true, header: true, skipEmptyLines: true,
            complete: function(results) {
                try {
                    if (results.errors.length) { dataTableContainer.innerHTML = `<div class="info-message error-message">⚠️ Erro ao processar os dados.</div>`; return; }
                    headers = results.meta.fields;
                    allData = results.data.filter(row => row['ESCOLA'] && row['ESCOLA'].trim() !== '');
                    populateFilters();
                    dataTableContainer.innerHTML = `<div class="info-message">📭 Selecione os filtros.</div>`;
                } catch (e) { console.error("Erro:", e); dataTableContainer.innerHTML = `<div class="info-message error-message">⚠️ Erro inesperado.</div>`;
                } finally { loadingIndicator.style.display = 'none'; }
            },
            error: function() { dataTableContainer.innerHTML = `<div class="info-message error-message">❌ Falha ao carregar a planilha.</div>`; loadingIndicator.style.display = 'none'; }
        });
    } catch (error) { console.error('Erro geral:', error); loadingIndicator.style.display = 'none'; }
}

function populateFilters() {
    const schools = [...new Set(allData.map(row => row['ESCOLA']))].sort();
    const turmas = [...new Set(allData.map(row => row['TURMA']))].filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const years = [...new Set(allData.map(row => row['ANO']))].filter(Boolean).sort();
    const evaluationNames = Object.keys(EVALUATION_SCORES).sort();
    const populateSelect = (selectEl, options, defaultText) => {
        selectEl.innerHTML = `<option value="">${defaultText}</option>`;
        options.forEach(opt => { if (opt) { const option = document.createElement('option'); option.value = opt; option.textContent = opt; selectEl.appendChild(option); } });
    };
    populateSelect(schoolFilter, schools, 'Todas as Escolas');
    populateSelect(turmaFilter, turmas, 'Todas as Turmas');
    populateSelect(yearFilter, years, 'Todos os Anos');
    populateSelect(evaluationFilter, evaluationNames, 'Todas as Avaliações');
}

function updateDynamicFilters(evaluationHeader) {
    const showDemographic = !!evaluationHeader;
    
    // ATUALIZADO: Lista de configuração para os filtros, permitindo customização do label
    const filtersToPopulate = [
        { group: levelFilterGroup, select: levelFilter, values: evaluationHeader ? [...new Set(allData.map(row => row[evaluationHeader]))].filter(Boolean).sort() : [] },
        { group: nseFilterGroup, select: nseFilter, header: 'NSE', default: 'Todos os NSE', labelName: 'NSE:' },
        { group: corRacaFilterGroup, select: corRacaFilter, header: 'COR/RAÇA', default: 'Todas as Cores/Raças', labelName: 'Cor/Raça:' },
        { group: inclusaoFilterGroup, select: inclusaoFilter, header: 'INCLUSÃO', default: 'Todas as Inclusões', labelName: 'Inclusão:' },
        { group: transporteFilterGroup, select: transporteFilter, header: 'Transporte Escolar', default: 'Todos os Transportes', labelName: 'Transporte Escolar:' }
    ];

    filtersToPopulate.forEach(f => {
        const container = f.group;
        const labelElement = container.querySelector('label');

        // Atualiza o texto do rótulo se um 'labelName' for fornecido
        if (f.labelName && labelElement) {
            labelElement.textContent = f.labelName;
        }

        if (f.values) { // Lógica para o filtro de Nível
            f.select.innerHTML = '<option value="">Todos os Níveis</option>';
            f.values.forEach(val => { const option = document.createElement('option'); option.value = val; option.textContent = toTitleCase(val); f.select.appendChild(option); });
            container.style.display = f.values.length > 0 ? 'block' : 'none';
        } else { // Lógica para filtros demográficos
            if (showDemographic && headers.includes(f.header)) {
                const values = [...new Set(allData.map(row => row[f.header]))].filter(Boolean).sort();
                f.select.innerHTML = `<option value="">${f.default}</option>`;
                values.forEach(val => { const option = document.createElement('option'); option.value = val; option.textContent = toTitleCase(val); f.select.appendChild(option); });
                container.style.display = 'block';
            } else { container.style.display = 'none'; }
        }
    });
}

function applyFilters() {
    loadingIndicator.style.display = 'block';
    sortColumn = null; sortDirection = 'asc'; currentPage = 1;

    const selected = {
        school: schoolFilter.value,
        evaluation: evaluationFilter.value,
        turma: turmaFilter.value, year: yearFilter.value, level: levelFilter.value,
        nse: nseFilter.value, corRaca: corRacaFilter.value, inclusao: inclusaoFilter.value,
        transporte: transporteFilter.value, searchQuery: studentSearch.value.toLowerCase().trim()
    };
    
    filteredData = allData.filter(row => {
        const schoolMatch = !selected.school || row['ESCOLA'] === selected.school;
        const turmaMatch = !selected.turma || row['TURMA'] === selected.turma;
        const yearMatch = !selected.year || row['ANO'] === selected.year;
        const searchMatch = !selected.searchQuery || (row[studentNameHeader] && row[studentNameHeader].toLowerCase().includes(selected.searchQuery));
        const evaluationMatch = !selected.evaluation || (row[selected.evaluation] && row[selected.evaluation].trim() !== '');
        const nseMatch = !selected.nse || (row['NSE'] && row['NSE'].toLowerCase() === selected.nse.toLowerCase());
        const corRacaMatch = !selected.corRaca || (row['COR/RAÇA'] && row['COR/RAÇA'].toLowerCase() === selected.corRaca.toLowerCase());
        const inclusaoMatch = !selected.inclusao || (row['INCLUSÃO'] && row['INCLUSÃO'].toLowerCase() === selected.inclusao.toLowerCase());
        const transporteMatch = !selected.transporte || (row['Transporte Escolar'] && row['Transporte Escolar'].toLowerCase() === selected.transporte.toLowerCase());
        const levelMatch = !selected.level || (row[selected.evaluation] && row[selected.evaluation].toLowerCase() === selected.level.toLowerCase());
        
        return schoolMatch && turmaMatch && yearMatch && searchMatch && evaluationMatch && nseMatch && corRacaMatch && inclusaoMatch && transporteMatch && levelMatch;
    });

    setTimeout(() => {
        displayData(filteredData, selected.evaluation);
        displaySummaryStatistics(filteredData, selected.evaluation);
        drawChart(filteredData, selected.evaluation);
        loadingIndicator.style.display = 'none';
    }, 100);
}

function sortData(column) {
    currentPage = 1; 
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    const scoreRules = EVALUATION_SCORES[column];
    filteredData.sort((a, b) => {
        const valueA = a[column] || ''; const valueB = b[column] || '';
        let comparison = 0;
        if (scoreRules) {
            comparison = (scoreRules[valueA] ?? -1) - (scoreRules[valueB] ?? -1);
        } else {
            comparison = valueA.localeCompare(valueB);
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });
    displayData(filteredData, evaluationFilter.value);
}

function displayData(dataToDisplay, columnHeader) {
    paginationControls.innerHTML = '';
    if (dataToDisplay.length === 0) {
        dataTableContainer.innerHTML = `<div class="info-message">🔍 Nenhum dado encontrado.</div>`;
        summarySection.style.display = 'none';
        return;
    }
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedData = dataToDisplay.slice(startIndex, endIndex);
    let orderedHeaders = ['ESCOLA', studentNameHeader];
    if (columnHeader) orderedHeaders.push(columnHeader);
    const remainingBase = ['ANO', 'TURMA'];
    const demographicHeaders = ['NSE', 'COR/RAÇA', 'INCLUSÃO', 'Transporte Escolar'];
    orderedHeaders.push(...remainingBase, ...demographicHeaders);
    if (!columnHeader) {
        orderedHeaders.push(...Object.keys(EVALUATION_SCORES));
    }
    const displayHeaders = [...new Set(orderedHeaders)].filter(h => headers.includes(h));
    let tableHTML = '<table><thead><tr><th>#</th>';
    displayHeaders.forEach(h => {
        let sortClass = 'sortable';
        if (h === sortColumn) { sortClass += sortDirection === 'asc' ? ' sorted-asc' : ' sorted-desc'; }
        tableHTML += `<th class="${sortClass}" onclick="sortData('${h}')">${toTitleCase(h)}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    paginatedData.forEach((row, index) => {
        const levelValue = columnHeader ? row[columnHeader] : '';
        const rowClass = getLevelClassName(levelValue);
        tableHTML += `<tr class="${rowClass}"><td>${startIndex + index + 1}</td>`;
        displayHeaders.forEach(header => {
            const cellValue = row[header] || ''; 
            tableHTML += `<td>${toTitleCase(cellValue)}</td>`;
        });
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';
    dataTableContainer.innerHTML = tableHTML;
    setupScrollSynchronization();
    renderPaginationControls(dataToDisplay.length);
}

function displaySummaryStatistics(data, columnHeader) {
    if (!columnHeader || data.length === 0) {
        summarySection.style.display = 'none'; return;
    }
    summarySection.style.display = 'flex';
    const totalEvaluated = data.length;
    const levelCounts = data.reduce((acc, row) => {
        const level = row[columnHeader];
        if (level && level.trim() !== '') { acc[level] = (acc[level] || 0) + 1; }
        return acc;
    }, {});
    totalCard.innerHTML = `<span class="value">${totalEvaluated}</span><span class="label">Total de Alunos Avaliados</span>`;
    const scoreRules = EVALUATION_SCORES[columnHeader];
    const sortedLevels = Object.keys(levelCounts).sort((a, b) => scoreRules ? (scoreRules[a] ?? 99) - (scoreRules[b] ?? 99) : a.localeCompare(b));
    let listItems = '';
    sortedLevels.forEach(level => {
        const count = levelCounts[level];
        const percentage = ((count / totalEvaluated) * 100).toFixed(1);
        listItems += `<li><strong>${toTitleCase(level)}:</strong> ${count} (${percentage}%)</li>`;
    });
    distCard.innerHTML = `<span class="label">Distribuição</span><ul class="level-distribution-list">${listItems}</ul>`;
}

function drawChart(data, columnHeader) {
    if (currentChart) currentChart.destroy();
    if (data.length === 0 || !columnHeader) {
        chartCard.style.display = 'none'; return;
    }
    const levelCounts = data.reduce((acc, row) => {
        const level = row[columnHeader];
        if (level && level.trim() !== '') { acc[level] = (acc[level] || 0) + 1; }
        return acc;
    }, {});
    const scoreRules = EVALUATION_SCORES[columnHeader];
    const labels = Object.keys(levelCounts).sort((a, b) => scoreRules ? (scoreRules[a] ?? 99) - (scoreRules[b] ?? 99) : a.localeCompare(b));
    if (labels.length === 0) {
        chartCard.style.display = 'none'; return;
    }
    chartCard.style.display = 'flex';
    const backgroundColors = labels.map(label => LEVEL_STYLES[label]?.color || '#CCCCCC');
    const chartData = labels.map(label => levelCounts[label]);
    const ctx = document.getElementById('fluenciaChart').getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.map(toTitleCase),
            datasets: [{
                label: 'Número de Alunos', data: chartData,
                backgroundColor: backgroundColors,
                borderColor: 'rgba(255, 255, 255, 0.7)', borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: `Distribuição por Nível` },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.chart.getDatasetMeta(0).total;
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: ${context.raw} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function clearFilters() {
    schoolFilter.value = '';
    evaluationFilter.value = '';
    yearFilter.value = '';
    turmaFilter.value = '';
    studentSearch.value = '';
    updateDynamicFilters('');
    levelFilter.value = '';
    nseFilter.value = '';
    corRacaFilter.value = '';
    inclusaoFilter.value = '';
    transporteFilter.value = '';
    filteredData = [];
    dataTableContainer.innerHTML = `<div class="info-message">📭 Selecione os filtros.</div>`;
    summarySection.style.display = 'none';
    paginationControls.innerHTML = '';
}

function exportDataToCSV() {
    if (filteredData.length === 0) { alert('Não há dados filtrados para exportar.'); return; }
    const csv = Papa.unparse(filteredData, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'dados_filtrados_avaliacoes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function setupScrollSynchronization() {
    const dataTable = dataTableContainer.querySelector('table');
    if (dataTable) {
        topScrollContainer.style.display = 'block';
        topScrollBar.style.width = dataTable.scrollWidth + 'px';
        topScrollContainer.onscroll = () => { dataTableContainer.scrollLeft = topScrollContainer.scrollLeft; };
        dataTableContainer.onscroll = () => { topScrollContainer.scrollLeft = dataTableContainer.scrollLeft; };
    } else {
        topScrollContainer.style.display = 'none';
    }
}

function changePage(page) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    currentPage = page;
    displayData(filteredData, evaluationFilter.value);
}

function renderPaginationControls(totalRows) {
    paginationControls.innerHTML = '';
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    if (totalPages <= 1) return;
    let buttonsHTML = `<button class="page-btn" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&laquo; Anterior</button>`;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    if (currentPage <= 3) { endPage = Math.min(5, totalPages); }
    if (currentPage > totalPages - 3) { startPage = Math.max(1, totalPages - 4); }
    if (startPage > 1) {
        buttonsHTML += `<button class="page-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) { buttonsHTML += `<span class="page-ellipsis">...</span>`; }
    }
    for (let i = startPage; i <= endPage; i++) {
        buttonsHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) { buttonsHTML += `<span class="page-ellipsis">...</span>`; }
        buttonsHTML += `<button class="page-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    buttonsHTML += `<button class="page-btn" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>Próximo &raquo;</button>`;
    paginationControls.innerHTML = buttonsHTML;
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    }
    themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light');
    });
    loadGoogleSheetData();
});

applyFiltersButton.addEventListener('click', applyFilters);
clearFiltersButton.addEventListener('click', clearFilters);
exportCsvButton.addEventListener('click', exportDataToCSV);

const debouncedApplyFilters = debounce(applyFilters, 300);
evaluationFilter.addEventListener('change', () => {
    updateDynamicFilters(evaluationFilter.value);
    debouncedApplyFilters();
});
studentSearch.addEventListener('input', debouncedApplyFilters);