// **CONFIGURAÇÃO E CONSTANTES**
const CONFIG = {
    STUDENT_NAME_HEADER: 'ALUNO',
    DEBOUNCE_DELAY: 300
};

// **CLASSES UTILITÁRIAS**

// Gerenciador de Notificações
class NotificationManager {
    constructor() {
        this.container = document.getElementById('notification-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'notification-container';
            this.container.setAttribute('aria-live', 'polite');
            this.container.setAttribute('aria-atomic', 'true');
            document.body.appendChild(this.container);
        }
    }
    
    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${this.sanitizeHTML(message)}</span>
                <button class="notification-close" aria-label="Fechar notificação">&times;</button>
            </div>
        `;
        
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => this.remove(notification));
        
        this.container.appendChild(notification);
        
        if (duration > 0) {
            setTimeout(() => this.remove(notification), duration);
        }
        
        return notification;
    }
    
    remove(notification) {
        if (notification && notification.parentNode) {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }
    
    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
}

// **VARIÁVEIS GLOBAIS**
let studentData = null;
let historyData = [];
let filteredHistory = [];
let notificationManager = null;

// **REFERÊNCIAS AOS ELEMENTOS HTML**
const elements = {
    studentName: document.getElementById('student-name'),
    studentSchool: document.getElementById('student-school'),
    studentYear: document.getElementById('student-year'),
    studentTurma: document.getElementById('student-turma'),
    yearFilter: document.getElementById('year-filter'),
    evaluationTypeFilter: document.getElementById('evaluation-type-filter'),
    evaluationSearch: document.getElementById('evaluation-search'),
    sortSelect: document.getElementById('sort-select'),
    exportButton: document.getElementById('export-student-data'),
    summaryStats: document.getElementById('summary-stats'),
    totalEvaluations: document.getElementById('total-evaluations'),
    latestYear: document.getElementById('latest-year'),
    improvementTrend: document.getElementById('improvement-trend'),
    historyTableContainer: document.getElementById('history-table-container'),
    noDataMessage: document.getElementById('no-data-message'),
    errorMessage: document.getElementById('error-message'),
    errorDetails: document.getElementById('error-details')
};

// **CONFIGURAÇÕES DE AVALIAÇÃO**
const LEVEL_STYLES = {
    'Pré Leitor 1': { className: 'level-pre-leitor-1' }, 'Pré Leitor 2': { className: 'level-pre-leitor-2' },
    'Pré Leitor 3': { className: 'level-pre-leitor-3' }, 'Pré Leitor 4': { className: 'level-pre-leitor-4' },
    'Pré Leitor 5': { className: 'level-pre-leitor-5' }, 'Pré Leitor 6': { className: 'level-pre-leitor-6' },
    'Abaixo do Básico': { className: 'level-abaixo-do-basico' }, 'Básico': { className: 'level-basico' },
    'Proficiente': { className: 'level-proficiente' }, 'Avançado': { className: 'level-avancado' },
    'Muito Baixo': { className: 'level-muito-baixo' }, 'Baixo': { className: 'level-baixo' },
    'Médio': { className: 'level-medio' }, 'Alto': { className: 'level-alto' },
    'Nível 1': { className: 'level-nivel-1' }, 'Nível 2': { className: 'level-nivel-2' },
    'Nível 3': { className: 'level-nivel-3' }, 'Nível 4': { className: 'level-nivel-4' },
    'Leitor 1': { className: 'level-leitor-1' }, 'Leitor 2': { className: 'level-leitor-2' },
    'Leitor 3': { className: 'level-leitor-3' }, 'Leitor 4': { className: 'level-leitor-4' },
    'Defasado': { className: 'level-defasado' }, 'Intermediário': { className: 'level-intermediario' },
    'Adequado': { className: 'level-adequado' },
    'Iniciante': { className: 'level-iniciante-blue-2' }, 'Fluente': { className: 'level-fluente-blue-2' }
};

const EVALUATION_SCORES = {
    'Pré Leitor 1': 1, 'Pré Leitor 2': 2, 'Pré Leitor 3': 3, 'Pré Leitor 4': 4, 'Pré Leitor 5': 5, 'Pré Leitor 6': 6,
    'Abaixo do Básico': 1, 'Básico': 2, 'Proficiente': 3, 'Avançado': 4,
    'Muito Baixo': 1, 'Baixo': 2, 'Médio': 3, 'Alto': 4,
    'Nível 1': 1, 'Nível 2': 2, 'Nível 3': 3, 'Nível 4': 4,
    'Leitor 1': 1, 'Leitor 2': 2, 'Leitor 3': 3, 'Leitor 4': 4,
    'Defasado': 1, 'Intermediário': 2, 'Adequado': 3,
    'Iniciante': 1, 'Fluente': 2
};

// **FUNÇÕES UTILITÁRIAS**

function sanitizeHTML(str) { if (!str) return ''; const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
function toTitleCase(str) { if (!str || typeof str !== 'string') return ''; return str.toLowerCase().split(' ').map(word => ['de','da','do','dos','das','e','a','o'].includes(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)).join(' '); }
function getLevelClassName(levelValue, styleConfig) { if (!levelValue) return 'level-sem-dados'; const style = styleConfig[levelValue.trim()]; return style ? `level-default ${style.className}` : 'level-sem-dados'; }
function debounce(func, delay) { let timeout; return function executedFunction(...args) { const later = () => { clearTimeout(timeout); func.apply(this, args); }; clearTimeout(timeout); timeout = setTimeout(later, delay); }; }
function validateStudentData(data) { if (!data || typeof data !== 'object') return false; const requiredFields = ['ESCOLA', CONFIG.STUDENT_NAME_HEADER]; return requiredFields.every(field => data[field] && typeof data[field] === 'string' && data[field].trim().length > 0); }

// **FUNÇÕES PRINCIPAIS**

function loadStudentData() {
    try {
        if (typeof(Storage) === "undefined") throw new Error('Navegador não suporta armazenamento local');
        const studentDataString = localStorage.getItem('selectedStudentData');
        if (!studentDataString) throw new Error('Dados do aluno não encontrados');
        const parsedData = JSON.parse(studentDataString);
        if (!validateStudentData(parsedData)) throw new Error('Dados do aluno inválidos');
        studentData = parsedData;
        return true;
    } catch (error) {
        console.error('Erro ao carregar dados do aluno:', error);
        showError('Erro ao carregar dados do aluno', error.message);
        return false;
    }
}

function getStudentHistory(data) {
    const history = [];
    try {
        for (const header in data) {
            const value = data[header];
            if (isEvaluationColumn(header) && value && value.trim() !== '') {
                const year = extractYearFromEvaluation(header);
                const evaluationType = classifyEvaluationType(header);
                history.push({ year: year, evaluationName: header, level: value, type: evaluationType, score: EVALUATION_SCORES[value] || 0 });
            }
        }
        history.sort((a, b) => { const yearComparison = a.year.localeCompare(b.year); if (yearComparison !== 0) return yearComparison; return a.evaluationName.localeCompare(b.evaluationName); });
        return history;
    } catch (error) {
        console.error('Erro ao processar histórico:', error);
        notificationManager.show('Erro ao processar histórico de avaliações', 'error');
        return [];
    }
}

function isEvaluationColumn(header) { const evaluationKeywords = ['Avaliação', 'Somativa', 'Diagnóstica', 'Formativa', 'Fluência']; return evaluationKeywords.some(keyword => header.includes(keyword)); }
function extractYearFromEvaluation(header) { const yearMatch = header.match(/\d{4}|(?<=\/)\d{2}$/); if (yearMatch) { const year = yearMatch[0]; return year.length === 2 ? `20${year}` : year; } return 'N/A'; }
function classifyEvaluationType(header) { const lowerHeader = header.toLowerCase(); if (lowerHeader.includes('fluência') || lowerHeader.includes('fluencia')) return 'fluencia'; if (lowerHeader.includes('formativa')) return 'formativa'; if (lowerHeader.includes('somativa')) return 'somativa'; if (lowerHeader.includes('diagnóstica') || lowerHeader.includes('diagnostica')) return 'diagnostica'; return 'outras'; }

function updateStudentInfo() {
    try {
        if (elements.studentName) elements.studentName.textContent = toTitleCase(studentData[CONFIG.STUDENT_NAME_HEADER] || 'Nome não disponível');
        if (elements.studentSchool) elements.studentSchool.textContent = toTitleCase(studentData['ESCOLA'] || 'Não informado');
        if (elements.studentYear) elements.studentYear.textContent = studentData['ETAPA DE ENSINO'] || 'Não informado'; // ATUALIZADO
        if (elements.studentTurma) elements.studentTurma.textContent = studentData['TURMA'] || 'Não informado';
        document.title = `Histórico de ${toTitleCase(studentData[CONFIG.STUDENT_NAME_HEADER] || 'Aluno')} - Dashboard de Avaliações`;
    } catch (error) {
        console.error('Erro ao atualizar informações do aluno:', error);
        notificationManager.show('Erro ao exibir informações do aluno', 'error');
    }
}

function populateFilters() {
    try {
        const years = [...new Set(historyData.map(item => item.year))].filter(year => year !== 'N/A').sort();
        populateSelect(elements.yearFilter, years, 'Todos os Anos');
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

function applyFilters() {
    try {
        const yearFilter = elements.yearFilter?.value || '';
        const typeFilter = elements.evaluationTypeFilter?.value || '';
        const searchQuery = elements.evaluationSearch?.value.toLowerCase().trim() || '';
        filteredHistory = historyData.filter(item => (!yearFilter || item.year === yearFilter) && (!typeFilter || item.type === typeFilter) && (!searchQuery || item.evaluationName.toLowerCase().includes(searchQuery)));
        applySorting();
        renderHistoryTable();
        updateSummaryStats();
    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        notificationManager.show('Erro ao aplicar filtros', 'error');
    }
}

function applySorting() {
    try {
        const sortValue = elements.sortSelect?.value || 'year-asc';
        const [field, direction] = sortValue.split('-');
        filteredHistory.sort((a, b) => { let comparison = 0; if (field === 'year') { comparison = a.year.localeCompare(b.year); } else if (field === 'evaluation') { comparison = a.evaluationName.localeCompare(b.evaluationName); } return direction === 'desc' ? -comparison : comparison; });
    } catch (error) {
        console.error('Erro na ordenação:', error);
        notificationManager.show('Erro ao ordenar dados', 'error');
    }
}

function renderHistoryTable() {
    try {
        if (!elements.historyTableContainer) return;
        if (filteredHistory.length === 0) {
            elements.historyTableContainer.innerHTML = `<div class="info-message"><span class="icon" aria-hidden="true">🔍</span><div class="message-content"><h4>Nenhuma avaliação encontrada</h4><p>Não há avaliações que correspondam aos filtros aplicados.</p></div></div>`;
            return;
        }
        let tableHTML = `<table class="history-table" role="table" aria-label="Histórico de avaliações do aluno"><thead><tr role="row"><th role="columnheader">Ano da Avaliação</th><th role="columnheader">Avaliação</th><th role="columnheader">Resultado</th><th role="columnheader">Tipo</th></tr></thead><tbody role="rowgroup">`;
        filteredHistory.forEach((item) => { const levelClass = getLevelClassName(item.level, LEVEL_STYLES); const typeLabel = getTypeLabel(item.type); tableHTML += `<tr role="row"><td>${sanitizeHTML(item.year)}</td><td>${sanitizeHTML(toTitleCase(item.evaluationName))}</td><td class="${levelClass}">${sanitizeHTML(toTitleCase(item.level))}</td><td>${sanitizeHTML(typeLabel)}</td></tr>`; });
        tableHTML += '</tbody></table>';
        elements.historyTableContainer.innerHTML = tableHTML;
        elements.historyTableContainer.setAttribute('aria-live', 'polite');
    } catch (error) {
        console.error('Erro ao renderizar tabela:', error);
        elements.historyTableContainer.innerHTML = `<div class="error-message"><span class="icon" aria-hidden="true">⚠️</span><div class="message-content"><h4>Erro ao exibir dados</h4><p>Ocorreu um erro ao renderizar a tabela de histórico.</p></div></div>`;
    }
}

function getTypeLabel(type) { const typeLabels = { 'fluencia': 'Fluência', 'formativa': 'Formativa', 'somativa': 'Somativa', 'diagnostica': 'Diagnóstica', 'outras': 'Outras' }; return typeLabels[type] || 'Não classificado'; }

function updateSummaryStats() {
    try {
        if (!elements.summaryStats) return;
        if (filteredHistory.length === 0) { elements.summaryStats.style.display = 'none'; return; }
        elements.summaryStats.style.display = 'block';
        if (elements.totalEvaluations) elements.totalEvaluations.textContent = filteredHistory.length.toString();
        if (elements.latestYear) { const years = filteredHistory.map(item => item.year).filter(year => year !== 'N/A'); const latestYear = years.length > 0 ? Math.max(...years.map(y => parseInt(y))) : 'N/A'; elements.latestYear.textContent = latestYear.toString(); }
        if (elements.improvementTrend) elements.improvementTrend.textContent = calculateImprovementTrend();
    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
        notificationManager.show('Erro ao calcular estatísticas', 'error');
    }
}

function calculateImprovementTrend() {
    try {
        if (filteredHistory.length < 2) return 'Insuficiente';
        const yearlyAverages = {};
        filteredHistory.forEach(item => { if (item.year !== 'N/A' && item.score > 0) { if (!yearlyAverages[item.year]) yearlyAverages[item.year] = { total: 0, count: 0 }; yearlyAverages[item.year].total += item.score; yearlyAverages[item.year].count += 1; } });
        const years = Object.keys(yearlyAverages).sort();
        if (years.length < 2) return 'Insuficiente';
        const averages = years.map(year => yearlyAverages[year].total / yearlyAverages[year].count);
        const firstAvg = averages[0]; const lastAvg = averages[averages.length - 1];
        if (lastAvg > firstAvg) return 'Melhorando ↗️';
        if (lastAvg < firstAvg) return 'Declinando ↘️';
        return 'Estável ➡️';
    } catch (error) {
        console.error('Erro ao calcular tendência:', error);
        return 'Erro no cálculo';
    }
}

function exportStudentData() {
    try {
        if (!studentData || filteredHistory.length === 0) { notificationManager.show('Não há dados para exportar', 'warning'); return; }
        const exportData = filteredHistory.map(item => ({
            'Aluno': studentData[CONFIG.STUDENT_NAME_HEADER],
            'Escola': studentData['ESCOLA'],
            'Etapa de Ensino': studentData['ETAPA DE ENSINO'], // ATUALIZADO
            'Turma': studentData['TURMA'],
            'Ano da Avaliação': item.year,
            'Nome da Avaliação': item.evaluationName,
            'Resultado': item.level,
            'Tipo': getTypeLabel(item.type),
            'Score': item.score
        }));
        const headers = Object.keys(exportData[0]);
        const csvContent = [headers.join(';'), ...exportData.map(row => headers.map(header => `"${row[header]}"`).join(';'))].join('\n');
        const BOM = '\uFEFF'; const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const studentName = studentData[CONFIG.STUDENT_NAME_HEADER].replace(/[^a-zA-Z0-9]/g, '_');
        link.setAttribute('href', url); link.setAttribute('download', `historico_${studentName}_${timestamp}.csv`);
        link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
        notificationManager.show(`Histórico de ${toTitleCase(studentData[CONFIG.STUDENT_NAME_HEADER])} exportado com sucesso!`, 'success');
    } catch (error) {
        console.error('Erro na exportação:', error);
        notificationManager.show('Erro ao exportar dados', 'error');
    }
}

function showError(title, message) { if (elements.errorMessage && elements.errorDetails) { elements.errorDetails.textContent = message; elements.errorMessage.style.display = 'block'; } if (elements.noDataMessage) elements.noDataMessage.style.display = 'none'; if (elements.historyTableContainer) elements.historyTableContainer.style.display = 'none'; }
function showNoData() { if (elements.noDataMessage) elements.noDataMessage.style.display = 'block'; if (elements.errorMessage) elements.errorMessage.style.display = 'none'; if (elements.historyTableContainer) elements.historyTableContainer.innerHTML = ''; }

document.addEventListener('DOMContentLoaded', () => {
    try {
        notificationManager = new NotificationManager();
        if (!loadStudentData()) return;
        updateStudentInfo();
        historyData = getStudentHistory(studentData);
        if (historyData.length === 0) { showNoData(); return; }
        populateFilters();
        filteredHistory = [...historyData];
        applySorting();
        renderHistoryTable();
        updateSummaryStats();
        setupEventListeners();
        notificationManager.show('Histórico carregado com sucesso!', 'success', 3000);
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showError('Erro de inicialização', error.message);
    }
});

function setupEventListeners() {
    try {
        const debouncedApplyFilters = debounce(applyFilters, CONFIG.DEBOUNCE_DELAY);
        if (elements.yearFilter) elements.yearFilter.addEventListener('change', applyFilters);
        if (elements.evaluationTypeFilter) elements.evaluationTypeFilter.addEventListener('change', applyFilters);
        if (elements.evaluationSearch) elements.evaluationSearch.addEventListener('input', debouncedApplyFilters);
        if (elements.sortSelect) elements.sortSelect.addEventListener('change', applyFilters);
        if (elements.exportButton) elements.exportButton.addEventListener('click', exportStudentData);
        document.addEventListener('keydown', (event) => { if (event.key === 'Escape') { const notifications = document.querySelectorAll('.notification'); notifications.forEach(notification => notificationManager.remove(notification)); } });
    } catch (error) {
        console.error('Erro ao configurar event listeners:', error);
        notificationManager.show('Erro na configuração de eventos', 'error');
    }
}

window.addEventListener('error', (event) => { console.error('Erro JavaScript não tratado:', event.error); if (notificationManager) notificationManager.show('Ocorreu um erro inesperado', 'error'); });
window.addEventListener('unhandledrejection', (event) => { console.error('Promise rejeitada não tratada:', event.reason); if (notificationManager) notificationManager.show('Erro de processamento', 'error'); });