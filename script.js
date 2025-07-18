// **LINK DA SUA PLANILHA DO GOOGLE SHEETS (PUBLICADA EM CSV)**
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQAz9Zj5zdAT5quPMUmWcp_5nqtptO54j2UIKsj5HLdrygI27XqkeB_MXjiyZLrOKkt2btLptyUtz2B/pub?output=csv';

let allData = [];
let filteredData = [];
let headers = [];
let currentChart = null;
let sortColumn = null;
let sortDirection = 'asc';

// Referências aos elementos HTML
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

// Configuração
const studentNameHeader = 'ALUNO'; 

// DICIONÁRIOS DE CONFIGURAÇÃO
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
        'Avaliação Somativa Lingua Portuguesa 2024': performanceScores, 'Avaliação Somativa Matemática 2024': performanceScores,
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
function toTitleCase(str) {
    if (!str || typeof str !== 'string') return '';
    return str.toLowerCase().split(' ').map(word => {
        if (['de', 'da', 'do', 'dos', 'das', 'e', 'a', 'o'].includes(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

function getLevelClassName(levelValue) {
    if (!levelValue) return 'level-sem-dados';
    const style = LEVEL_STYLES[levelValue.trim()];
    return style ? `level-default ${style.className}` : 'level-sem-dados';
}

// --- LÓGICA PRINCIPAL ---
async function loadGoogleSheetData() {
    loadingIndicator.style.display = 'block';
    try {
        Papa.parse(GOOGLE_SHEET_CSV_URL, {
            download: true, header: true, skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length) {
                    dataTableContainer.innerHTML = `<div class="info-message error-message">⚠️ Erro ao processar os dados.</div>`;
                    return;
                }
                headers = results.meta.fields;
                allData = results.data.filter(row => row['ESCOLA'] && row['ESCOLA'].trim() !== '');
                populateFilters();
                dataTableContainer.innerHTML = `<div class="info-message">📭 Selecione os filtros e clique em "Aplicar Filtros".</div>`;
                loadingIndicator.style.display = 'none';
            },
            error: function() {
                 dataTableContainer.innerHTML = `<div class="info-message error-message">❌ Erro ao carregar os dados.</div>`;
                 loadingIndicator.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Erro geral:', error);
        loadingIndicator.style.display = 'none';
    }
}

function populateFilters() {
    const schools = [...new Set(allData.map(row => row['ESCOLA']))].sort();
    const turmas = [...new Set(allData.map(row => row['TURMA']))].filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const years = [...new Set(allData.map(row => row['ANO']))].filter(Boolean).sort();
    const evaluationNames = Object.keys(EVALUATION_SCORES).sort();
    const populateSelect = (selectEl, options, defaultText) => {
        selectEl.innerHTML = `<option value="">${defaultText}</option>`;
        options.forEach(opt => {
            if (opt) {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                selectEl.appendChild(option);
            }
        });
    };
    populateSelect(schoolFilter, schools, 'Todas as Escolas');
    populateSelect(turmaFilter, turmas, 'Todas as Turmas');
    populateSelect(yearFilter, years, 'Todos os Anos');
    populateSelect(evaluationFilter, evaluationNames, 'Todas as Avaliações');
}

function updateDynamicFilters(evaluationHeader) {
    const showDemographic = evaluationHeader !== "";
    const filtersToPopulate = [
        { group: levelFilterGroup, select: levelFilter, values: evaluationHeader ? [...new Set(allData.map(row => row[evaluationHeader]))].filter(Boolean).sort() : [] },
        { group: nseFilterGroup, select: nseFilter, header: 'NSE', default: 'Todos os NSE' },
        { group: corRacaFilterGroup, select: corRacaFilter, header: 'COR/RAÇA', default: 'Todas as Cores/Raças' },
        { group: inclusaoFilterGroup, select: inclusaoFilter, header: 'INCLUSÃO', default: 'Todas as Inclusões' },
        { group: transporteFilterGroup, select: transporteFilter, header: 'Transporte Escolar', default: 'Todos os Transportes' }
    ];
    filtersToPopulate.forEach(f => {
        if (f.values) {
            f.select.innerHTML = '<option value="">Todos os Níveis</option>';
            f.values.forEach(val => {
                const option = document.createElement('option');
                option.value = val;
                option.textContent = toTitleCase(val);
                f.select.appendChild(option);
            });
            f.group.style.display = f.values.length > 0 ? 'block' : 'none';
        } else {
            if (showDemographic && headers.includes(f.header)) {
                const values = [...new Set(allData.map(row => row[f.header]))].filter(Boolean).sort();
                f.select.innerHTML = `<option value="">${f.default}</option>`;
                values.forEach(val => {
                    const option = document.createElement('option');
                    option.value = val;
                    option.textContent = toTitleCase(val);
                    f.select.appendChild(option);
                });
                f.group.style.display = 'block';
            } else {
                f.group.style.display = 'none';
            }
        }
    });
}

function applyFilters() {
    loadingIndicator.style.display = 'block';
    sortColumn = null;
    sortDirection = 'asc';
    const selected = {
        school: schoolFilter.value,
        evaluation: evaluationFilter.value,
        turma: turmaFilter.value,
        year: yearFilter.value,
        level: levelFilter.value,
        nse: nseFilter.value,
        corRaca: corRacaFilter.value,
        inclusao: inclusaoFilter.value,
        transporte: transporteFilter.value
    };
    let baseFilteredData = allData.filter(row => {
         const schoolMatch = !selected.school || row['ESCOLA'] === selected.school;
         const turmaMatch = !selected.turma || row['TURMA'] === selected.turma;
         const yearMatch = !selected.year || row['ANO'] === selected.year;
         return schoolMatch && turmaMatch && yearMatch;
    });
    filteredData = baseFilteredData;
    if (selected.evaluation) {
        filteredData = baseFilteredData.filter(row => row[selected.evaluation] && row[selected.evaluation].trim() !== '');
    }
    if (selected.level || selected.nse || selected.corRaca || selected.inclusao || selected.transporte) {
        filteredData = filteredData.filter(row => {
            const levelMatch = !selected.level || (row[selected.evaluation] && row[selected.evaluation].toLowerCase() === selected.level.toLowerCase());
            const nseMatch = !selected.nse || (row['NSE'] && row['NSE'].toLowerCase() === selected.nse.toLowerCase());
            const corRacaMatch = !selected.corRaca || (row['COR/RAÇA'] && row['COR/RAÇA'].toLowerCase() === selected.corRaca.toLowerCase());
            const inclusaoMatch = !selected.inclusao || (row['INCLUSÃO'] && row['INCLUSÃO'].toLowerCase() === selected.inclusao.toLowerCase());
            const transporteMatch = !selected.transporte || (row['Transporte Escolar'] && row['Transporte Escolar'].toLowerCase() === selected.transporte.toLowerCase());
            return levelMatch && nseMatch && corRacaMatch && inclusaoMatch && transporteMatch;
        });
    }
    setTimeout(() => {
        const dataToShow = selected.evaluation ? filteredData : baseFilteredData;
        displayData(dataToShow, selected.evaluation);
        displaySummaryStatistics(filteredData, selected.evaluation);
        drawChart(filteredData, selected.evaluation);
        loadingIndicator.style.display = 'none';
    }, 100);
}

function sortData(column) {
    const dataToSort = evaluationFilter.value ? filteredData : allData;
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    const scoreRules = EVALUATION_SCORES[column];
    dataToSort.sort((a, b) => {
        const valueA = a[column] || '';
        const valueB = b[column] || '';
        let comparison = 0;
        if (scoreRules) {
            const scoreA = scoreRules[valueA] ?? -1;
            const scoreB = scoreRules[valueB] ?? -1;
            comparison = scoreA - scoreB;
        } else {
            comparison = valueA.localeCompare(valueB);
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });
    displayData(dataToSort, evaluationFilter.value);
}

function displayData(dataToDisplay, columnHeader) {
    if (dataToDisplay.length === 0) {
        dataTableContainer.innerHTML = `<div class="info-message">🔍 Nenhum dado encontrado.</div>`;
        summarySection.style.display = 'none';
        return;
    }
    let orderedHeaders = ['ESCOLA', studentNameHeader];
    if (columnHeader) {
        orderedHeaders.push(columnHeader);
    }
    const remainingBase = ['ANO', 'TURMA'].filter(h => h !== columnHeader);
    const demographicHeaders = ['NSE', 'COR/RAÇA', 'INCLUSÃO', 'Transporte Escolar'];
    orderedHeaders.push(...remainingBase, ...demographicHeaders);
    if (!columnHeader) {
        const allEvaluationHeaders = Object.keys(EVALUATION_SCORES);
        orderedHeaders.push(...allEvaluationHeaders);
    }
    const displayHeaders = [...new Set(orderedHeaders)].filter(h => headers.includes(h));
    let tableHTML = '<table><thead><tr><th>#</th>';
    displayHeaders.forEach(h => {
        let sortClass = 'sortable';
        if (h === sortColumn) {
            sortClass += sortDirection === 'asc' ? ' sorted-asc' : ' sorted-desc';
        }
        tableHTML += `<th class="${sortClass}" onclick="sortData('${h}')">${toTitleCase(h)}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    dataToDisplay.forEach((row, index) => {
        const levelValue = columnHeader ? row[columnHeader] : '';
        const rowClass = getLevelClassName(levelValue);
        tableHTML += `<tr class="${rowClass}"><td>${index + 1}</td>`;
        displayHeaders.forEach(header => {
            const cellValue = row[header] || ''; 
            tableHTML += `<td>${toTitleCase(cellValue)}</td>`;
        });
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';
    dataTableContainer.innerHTML = tableHTML;
    setupScrollSynchronization();
}

function displaySummaryStatistics(data, columnHeader) {
    if (!columnHeader || data.length === 0) {
        summarySection.style.display = 'none';
        return;
    }
    summarySection.style.display = 'flex';
    const totalEvaluated = data.length;
    const levelCounts = data.reduce((acc, row) => {
        const level = row[columnHeader];
        acc[level] = (acc[level] || 0) + 1;
        return acc;
    }, {});
    totalCard.innerHTML = `<span class="value">${totalEvaluated}</span><span class="label">Total de Alunos Avaliados</span>`;
    if (totalEvaluated > 0) {
        const scoreRules = EVALUATION_SCORES[columnHeader];
        // ORDENAÇÃO CORRIGIDA AQUI
        const sortedLevels = Object.keys(levelCounts).sort((a, b) => {
            if (scoreRules) {
                const scoreA = scoreRules[a] ?? 99;
                const scoreB = scoreRules[b] ?? 99;
                return scoreA - scoreB;
            }
            return a.localeCompare(b);
        });
        let listItems = '';
        sortedLevels.forEach(level => {
            const count = levelCounts[level];
            const percentage = ((count / totalEvaluated) * 100).toFixed(1);
            listItems += `<li><strong>${toTitleCase(level)}:</strong> ${count} (${percentage}%)</li>`;
        });
        distCard.innerHTML = `<span class="label">Distribuição</span><ul class="level-distribution-list">${listItems}</ul>`;
    } else {
        distCard.innerHTML = `<span class="label">Distribuição</span><ul class="level-distribution-list"><li>Nenhum aluno avaliado.</li></ul>`;
    }
}

function drawChart(data, columnHeader) {
    if (currentChart) currentChart.destroy();
    if (data.length === 0 || !columnHeader) {
        chartCard.style.display = 'none';
        return;
    }
    const levelCounts = data.reduce((acc, row) => {
        const level = row[columnHeader];
        if (level && level.trim() !== '') { acc[level] = (acc[level] || 0) + 1; }
        return acc;
    }, {});
    const scoreRules = EVALUATION_SCORES[columnHeader];
    // ORDENAÇÃO CORRIGIDA AQUI TAMBÉM PARA O GRÁFICO
    const labels = Object.keys(levelCounts).sort((a, b) => {
        if (scoreRules) {
            const scoreA = scoreRules[a] ?? 99;
            const scoreB = scoreRules[b] ?? 99;
            return scoreA - scoreB;
        }
        return a.localeCompare(b);
    });
    if (labels.length === 0) {
        chartCard.style.display = 'none';
        return;
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
    updateDynamicFilters('');
    levelFilter.value = '';
    nseFilter.value = '';
    corRacaFilter.value = '';
    inclusaoFilter.value = '';
    transporteFilter.value = '';
    filteredData = [];
    dataTableContainer.innerHTML = `<div class="info-message">📭 Selecione os filtros e clique em "Aplicar Filtros".</div>`;
    summarySection.style.display = 'none';
}

function exportDataToCSV() {
    const dataToExport = filteredData.length > 0 ? filteredData : allData;
    if (dataToExport.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    const csv = Papa.unparse(dataToExport, { header: true });
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

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', loadGoogleSheetData);
applyFiltersButton.addEventListener('click', applyFilters);
clearFiltersButton.addEventListener('click', clearFilters);
exportCsvButton.addEventListener('click', exportDataToCSV);
evaluationFilter.addEventListener('change', () => {
    updateDynamicFilters(evaluationFilter.value);
    applyFilters(); 
});