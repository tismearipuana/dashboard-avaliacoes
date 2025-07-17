// **LINK ATUALIZADO DA SUA PLANILHA DO GOOGLE SHEETS (PUBLICADA EM CSV)**
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQAz9Zj5zdAT5quPMUmWcp_5nqtptO54j2UIKsj5HLdrygI27XqkeB_MXjiyZLrOKkt2btLptyUtz2B/pub?output=csv';

let allData = []; // Armazena todos os dados da planilha
let headers = []; // Armazena os cabeçalhos das colunas
let currentChart = null; // Variável para armazenar a instância do gráfico (para destruí-lo antes de recriar)

// Referências aos elementos HTML dos filtros e da área de exibição
const schoolFilter = document.getElementById('school-filter');
const evaluationFilter = document.getElementById('evaluation-filter');
const yearFilter = document.getElementById('year-filter');
const turmaFilter = document.getElementById('turma-filter');
const applyFiltersButton = document.getElementById('apply-filters');
const dataTableContainer = document.getElementById('data-table-container');

// Referências para o filtro de Nível/Classificação
const levelFilterGroup = document.getElementById('level-filter-group'); 
const levelFilter = document.getElementById('level-filter'); 

// NOVAS REFERÊNCIAS PARA OS FILTROS DEMOGRÁFICOS
const nseFilterGroup = document.getElementById('nse-filter-group');
const nseFilter = document.getElementById('nse-filter');
const corRacaFilterGroup = document.getElementById('cor-raca-filter-group');
const corRacaFilter = document.getElementById('cor-raca-filter');
const inclusaoFilterGroup = document.getElementById('inclusao-filter-group');
const inclusaoFilter = document.getElementById('inclusao-filter');
const transporteFilterGroup = document.getElementById('transporte-filter-group');
const transporteFilter = document.getElementById('transporte-filter');

// NOVAS REFERÊNCIAS para a barra de rolagem superior
const topScrollContainer = document.getElementById('top-scroll-container');
const topScrollBar = document.getElementById('top-scroll-bar');

// Referência para o botão "Limpar Filtros"
const clearFiltersButton = document.getElementById('clear-filters');

// NOVA REFERÊNCIA para o indicador de carregamento
const loadingIndicator = document.getElementById('loading-indicator');


// Define o cabeçalho da coluna do nome do aluno (AJUSTE SE O NOME NA SUA PLANILHA FOR DIFERENTE DE 'ALUNO')
const studentNameHeader = 'ALUNO'; 

// FUNÇÕES AUXILIARES - DEVEM ESTAR SEMPRE NO TOPO, APÓS AS CONSTS E ANTES DE SEREM CHAMADAS POR OUTRAS FUNÇÕES

// Função auxiliar para converter uma string para o formato "Capitalize First Letter of Each Word"
function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => {
        if (['de', 'da', 'do', 'dos', 'das', 'e', 'em', 'com', 'para'].includes(word)) {
            return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
}

// Função auxiliar para mapear o nível de classificação para uma classe CSS de cor
function getLevelClassName(levelValue) {
    if (typeof levelValue !== 'string') return ''; 

    const lowerCaseLevel = levelValue.trim().toLowerCase(); 

    if (lowerCaseLevel.includes('pré leitor 1')) return 'level-pre-leitor-1';
    if (lowerCaseLevel.includes('pré leitor 2')) return 'level-pre-leitor-2';
    if (lowerCaseLevel.includes('pré leitor 3')) return 'level-pre-leitor-3';
    if (lowerCaseLevel.includes('pré leitor 4')) return 'level-pre-leitor-4';
    if (lowerCaseLevel.includes('pré leitor 5')) return 'level-pre-leitor-5';
    if (lowerCaseLevel.includes('pré leitor 6')) return 'level-pre-leitor-6';
    if (lowerCaseLevel.includes('iniciante')) return 'level-iniciante';
    if (lowerCaseLevel.includes('fluente')) return 'level-fluente';
    if (lowerCaseLevel.includes('sem dados') || lowerCaseLevel.includes('não se aplica') || lowerCaseLevel === '') return 'level-sem-dados'; 
    
    return ''; 
}

// FIM DAS FUNÇÕES AUXILIARES E DE GRÁFICO - COMEÇO DAS FUNÇÕES DE LÓGICA PRINCIPAL

// Função para buscar e carregar os dados da planilha usando PapaParse
async function loadGoogleSheetData() {
    loadingIndicator.style.display = 'block'; 
    try {
        Papa.parse(GOOGLE_SHEET_CSV_URL, {
            download: true, 
            header: true,   
            skipEmptyLines: true, 
            complete: function(results) {
                if (results.errors.length) {
                    console.error("Erros durante o parsing do CSV:", results.errors);
                    // Mensagem de erro formatada
                    dataTableContainer.innerHTML = `
                        <div class="info-message error-message">
                            <span class="icon">⚠️</span> Erro ao processar os dados da planilha. Por favor, verifique o link e o formato. Detalhes: ${results.errors[0] ? results.errors[0].message : 'Erro desconhecido'}
                        </div>
                    `;
                    loadingIndicator.style.display = 'none'; 
                    return;
                }
                headers = results.meta.fields; 
                allData = results.data.filter(row => row['ESCOLA'] && row['ANO'] && row['TURMA']);

                console.log("Cabeçalhos detectados (PapaParse):", headers);
                console.log("Dados carregados (PapaParse):", allData);

                populateFilters(); 
                // Mensagem inicial de "Nenhum dado carregado"
                dataTableContainer.innerHTML = `
                    <div class="info-message no-data-message">
                        <span class="icon">📭</span> Nenhum dado carregado. Por favor, selecione os filtros e clique em "Aplicar Filtros".
                    </div>
                `;
                loadingIndicator.style.display = 'none'; 
            }
        });
    } catch (error) {
        console.error('Falha ao carregar a planilha:', error);
        // Mensagem de erro de carregamento formatada
        dataTableContainer.innerHTML = `
            <div class="info-message error-message">
                <span class="icon">❌</span> Erro ao carregar os dados. Verifique o link da planilha e a conexão. Detalhes: ${error.message}
            </div>
        `;
        loadingIndicator.style.display = 'none'; 
    }
}

// Função para preencher os filtros de Escola, Ano, Turma e Avaliação
function populateFilters() {
    const schools = [...new Set(allData.map(row => row['ESCOLA']))].sort(); 
    const turmas = [...new Set(allData.map(row => row['TURMA']))].sort((a, b) => a.localeCompare(b));
    const years = [...new Set(allData.map(row => row['ANO']))].sort((a, b) => {
        const numA = parseInt(a.replace(/[^\d]/g, '')); 
        const numB = parseInt(b.replace(/[^\d]/g, ''));
        if (!isNaN(numA) && !isNaN(numB)) { return numA - numB; }
        return a.localeCompare(b); 
    });

    const evaluationHeaders = headers.filter(header =>
        header.includes('Avaliação') || header.includes('Somativa') || header.includes('Diagnóstica') || header.includes('Processual') || header.includes('Fluência')
    ).sort();

    schoolFilter.innerHTML = '<option value="">Todas as Escolas</option>';
    turmaFilter.innerHTML = '<option value="">Todas as Turmas</option>';
    yearFilter.innerHTML = '<option value="">Todos os Anos</option>';
    evaluationFilter.innerHTML = '<option value="">Todas as Avaliações</option>';
    levelFilter.innerHTML = '<option value="">Todos os Níveis</option>'; 

    schools.forEach(school => { if (school) { const option = document.createElement('option'); option.value = school; option.textContent = toTitleCase(school); schoolFilter.appendChild(option); } });
    turmas.forEach(turma => { if (turma) { const option = document.createElement('option'); option.value = turma; option.textContent = turma; turmaFilter.appendChild(option); } });
    years.forEach(year => { if (year) { const option = document.createElement('option'); option.value = year; option.textContent = year; yearFilter.appendChild(option); } });
    
    evaluationHeaders.forEach(evalHeader => { 
        if (evalHeader) { 
            const option = document.createElement('option'); 
            option.value = evalHeader; 
            option.textContent = toTitleCase(evalHeader); 
            evaluationFilter.appendChild(option); 
        } 
    });

    levelFilterGroup.style.display = 'none';
    nseFilterGroup.style.display = 'none';
    corRacaFilterGroup.style.display = 'none';
    inclusaoFilterGroup.style.display = 'none';
    transporteFilterGroup.style.display = 'none';
}

// Função para preencher o filtro de Nível/Classificação dinamicamente
function populateLevelFilter(evaluationColumnName) {
    levelFilter.innerHTML = '<option value="">Todos os Níveis</option>'; 

    if (evaluationColumnName && allData.length > 0) {
        const levels = [...new Set(allData.map(row => row[evaluationColumnName]))]
            .filter(level => level !== undefined && level !== null && level.trim() !== '') 
            .sort((a, b) => {
                const order = ['Pré Leitor 1', 'Pré Leitor 2', 'Pré Leitor 3', 'Pré Leitor 4', 'Pré Leitor 5', 'Pré Leitor 6', 'Iniciante', 'Fluente', 'Sem dados'];
                const indexA = order.indexOf(a); 
                const indexB = order.indexOf(b); 

                if (indexA === -1 && indexB === -1) return a.localeCompare(b); 
                if (indexA === -1) return 1; 
                if (indexB === -1) return -1; 

                return indexA - indexB; 
            });

        levels.forEach(level => {
            const option = document.createElement('option');
            option.value = level; 
            option.textContent = toTitleCase(level); 
            levelFilter.appendChild(option);
        });
        levelFilterGroup.style.display = 'block'; 
    } else {
        levelFilterGroup.style.display = 'none'; 
    }
}

// NOVA FUNÇÃO: Para mostrar/ocultar e popular os filtros demográficos
function toggleAndPopulateDemographicFilters(show) {
    const filtersToToggle = [
        { group: nseFilterGroup, select: nseFilter, header: 'NSE', defaultOption: 'Todos os NSE' },
        { group: corRacaFilterGroup, select: corRacaFilter, header: 'COR/RAÇA', defaultOption: 'Todas as Cores/Raças' },
        { group: inclusaoFilterGroup, select: inclusaoFilter, header: 'INCLUSÃO', defaultOption: 'Todas as Inclusões' },
        { group: transporteFilterGroup, select: transporteFilter, header: 'Transporte Escolar', defaultOption: 'Todos os Transportes' }
    ];

    filtersToToggle.forEach(filter => {
        if (show && headers.includes(filter.header)) { 
            filter.group.style.display = 'block';
            filter.select.innerHTML = `<option value="">${filter.defaultOption}</option>`; 

            const uniqueValues = [...new Set(allData.map(row => row[filter.header]))]
                .filter(value => value !== undefined && value !== null && value.trim() !== '')
                .sort((a, b) => a.localeCompare(b));

            uniqueValues.forEach(value => {
                const option = document.createElement('option');
                option.value = value; 
                option.textContent = toTitleCase(value); 
                filter.select.appendChild(option);
            });
        } else {
            filter.group.style.display = 'none'; 
            filter.select.innerHTML = `<option value="">${filter.defaultOption}</option>`; 
        }
    });
}


// Função para filtrar e exibir os dados com base em todas as seleções
function applyFilters() {
    loadingIndicator.style.display = 'block'; 

    const selectedSchool = schoolFilter.value;
    const selectedEvaluation = evaluationFilter.value;
    const selectedTurma = turmaFilter.value;
    const selectedYear = yearFilter.value;
    const selectedLevel = levelFilter.value; 
    const selectedNse = nseFilter.value;
    const selectedCorRaca = corRacaFilter.value;
    const selectedInclusao = inclusaoFilter.value;
    const selectedTransporte = transporteFilter.value;


    let filteredData = allData;

    const anyFilterSelected = selectedSchool || selectedEvaluation || selectedTurma || selectedYear ||
                              selectedLevel || selectedNse || selectedCorRaca || selectedInclusao || selectedTransporte;

    if (anyFilterSelected) { 
        if (selectedSchool) {
            filteredData = filteredData.filter(row => row['ESCOLA'] === selectedSchool); 
        }
        if (selectedTurma) {
            filteredData = filteredData.filter(row => row['TURMA'] === selectedTurma);
        }
        if (selectedYear) {
            filteredData = filteredData.filter(row => row['ANO'] === selectedYear);
        }
        if (selectedEvaluation && selectedLevel) { 
            filteredData = filteredData.filter(row => row[selectedEvaluation] === selectedLevel); 
        }
        if (selectedNse) {
            filteredData = filteredData.filter(row => row['NSE'] === selectedNse); 
        }
        if (selectedCorRaca) {
            filteredData = filteredData.filter(row => row['COR/RAÇA'] === selectedCorRaca); 
        }
        if (selectedInclusao) {
            filteredData = filteredData.filter(row => row['INCLUSÃO'] === selectedInclusao); 
        }
        if (selectedTransporte) {
            filteredData = filteredData.filter(row => row['Transporte Escolar'] === selectedTransporte); 
        }
    } else {
        filteredData = [];
    }

    setTimeout(() => {
        if (filteredData.length === 0) {
            // Mensagem "Nenhum dado encontrado" formatada
            dataTableContainer.innerHTML = `
                <div class="info-message no-data-message">
                    <span class="icon">🔍</span> Nenhum dado encontrado para os filtros selecionados.
                </div>
            `;
            if (currentChart) {
                currentChart.destroy(); 
                currentChart = null;
            }
            topScrollContainer.style.display = 'none'; 
        } else {
            displayData(filteredData, selectedEvaluation); 
            drawFluencia2021Chart(filteredData); 
        }
        loadingIndicator.style.display = 'none'; 
    }, 100); 
}

// Função para exibir os dados em uma tabela HTML
function displayData(dataToDisplay, selectedEvaluation = '') {
    let tableHTML = '<table><thead><tr>';

    let displayHeaders = [];

    if (selectedEvaluation) {
        const specificEvalHeaders = ['ESCOLA', studentNameHeader, 'ANO', 'TURMA', 'NSECOR/RAÇAINCLUSÃO', 'NSE', 'COR/RAÇA', 'INCLUSÃO', 'Transporte Escolar', selectedEvaluation];
        
        displayHeaders = specificEvalHeaders.filter(h => headers.includes(h)); 
    } else {
        const preferredOrderBase = ['ESCOLA', studentNameHeader, 'ANO', 'TURMA', 'NSECOR/RAÇAINCLUSÃO', 'NSE', 'COR/RAÇA', 'INCLUSÃO', 'Transporte Escolar'];
        
        const irrelevantHeaders = [
            'MÃEINEPCOD', 
            'CÓDIGO',      
            'INEP',        
            'Data de Nascimento',
            'Frequência',
        ];

        let otherHeaders = headers.filter(header =>
            !preferredOrderBase.includes(header) &&
            !irrelevantHeaders.includes(header) &&
            !(header.includes('Avaliação') || header.includes('Somativa') || header.includes('Diagnóstica') || header.includes('Processual') || header.includes('Fluência'))
        ).sort((a, b) => a.localeCompare(b)); 

        const evaluationHeadersSorted = headers.filter(header =>
            header.includes('Avaliação') || header.includes('Somativa') || header.includes('Diagnóstica') || header.includes('Processual') || header.includes('Fluência')
        ).sort((a, b) => {
            const yearMatchA = a.match(/\d{4}/);
            const yearA = yearMatchA ? parseInt(yearMatchA[0]) : 0;
            const yearMatchB = b.match(/\d{4}/);
            const yearB = yearMatchB ? parseInt(yearMatchB[0]) : 0;

            if (yearA !== yearB) { return yearA - yearB; }
            return a.localeCompare(b);
        });

        displayHeaders = [
            ...preferredOrderBase.filter(h => headers.includes(h)), 
            ...otherHeaders, 
            ...evaluationHeadersSorted 
        ];
    }

    displayHeaders = [...new Set(displayHeaders)]; 

    tableHTML += '<th>#</th>';
    displayHeaders.forEach(header => {
        tableHTML += `<th>${toTitleCase(header)}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';

    if (dataToDisplay.length === 0) {
        // Mensagem "Nenhum dado encontrado" formatada (usada também pelo applyFilters)
        dataTableContainer.innerHTML = `
            <div class="info-message no-data-message">
                <span class="icon">🔍</span> Nenhum dado encontrado para os filtros selecionados.
            </div>
        `;
        topScrollContainer.style.display = 'none'; 
    } else {
        topScrollContainer.style.display = 'block'; 
        dataToDisplay.forEach((row, index) => {
            tableHTML += '<tr>';
            tableHTML += `<td>${index + 1}</td>`;
            displayHeaders.forEach(header => {
                let cellValue = row[header] || ''; 
                let cellClass = '';

                if (cellValue === '') {
                    cellValue = 'Não se Aplica';
                }

                const allEvaluationHeaders = headers.filter(h => h.includes('Avaliação') || h.includes('Somativa') || h.includes('Diagnóstica') || h.includes('Processual') || h.includes('Fluência'));
                
                if (header === 'ANO' || header === 'TURMA') {
                    cellValue = cellValue; 
                } else if (!isNaN(cellValue) && cellValue !== '') {
                    cellValue = cellValue; 
                } else {
                    cellValue = toTitleCase(cellValue); 
                }

                if (allEvaluationHeaders.includes(header)) {
                    cellClass = getLevelClassName(cellValue);
                }
                
                tableHTML += `<td class="${cellClass}">${cellValue}</td>`; 
            });
            tableHTML += '</tr>';
        });
    }

    tableHTML += '</tbody></table>';
    dataTableContainer.innerHTML = tableHTML; 

    setupScrollSynchronization();
}

// Função para configurar a sincronização da rolagem
function setupScrollSynchronization() {
    const dataTable = dataTableContainer.querySelector('table'); 

    if (dataTable) {
        topScrollBar.style.width = dataTable.scrollWidth + 'px';

        topScrollContainer.onscroll = () => {
            dataTableContainer.scrollLeft = topScrollContainer.scrollLeft;
        };

        dataTableContainer.onscroll = () => {
            topScrollContainer.scrollLeft = dataTableContainer.scrollLeft;
        };
    } else {
        topScrollContainer.style.display = 'none';
    }
}

// Função para calcular a média da 'Avaliação de Fluência 2021' por 'ESCOLA'
function calculateAverageFluenciaBySchool(data) {
    const schoolData = {}; 

    data.forEach(row => {
        const school = row['ESCOLA'];
        const fluenciaScore = row['Avaliação de Fluência 2021']; 

        if (school && fluenciaScore) {
            let scoreValue;
            const preLeitorMatch = fluenciaScore.match(/Pré Leitor (\d+)/);
            if (preLeitorMatch) {
                scoreValue = parseInt(preLeitorMatch[1]); 
            } else if (fluenciaScore.toLowerCase().includes('iniciante')) {
                scoreValue = 7; 
            } else if (fluenciaScore.toLowerCase().includes('fluente')) {
                scoreValue = 8; 
            } else {
                scoreValue = 0; 
            }
            
            if (!schoolData[school]) {
                schoolData[school] = { total: 0, count: 0 };
            }
            schoolData[school].total += scoreValue;
            schoolData[school].count += 1;
        }
    });

    const labels = [];
    const averages = [];

    Object.keys(schoolData).sort().forEach(school => {
        const avg = schoolData[school].count > 0 ? (schoolData[school].total / schoolData[school].count).toFixed(1) : 0;
        labels.push(toTitleCase(school)); 
        averages.push(avg);
    });

    return { labels, averages };
}

// Função para desenhar o gráfico de barras
function drawFluencia2021Chart(data) {
    const chartData = calculateAverageFluenciaBySchool(data);
    const chartCanvas = document.getElementById('fluencia2021Chart');
    
    if (!chartData.labels.length || !chartCanvas) {
        if (currentChart) {
            currentChart.destroy();
            currentChart = null;
        }
        return;
    }

    const ctx = chartCanvas.getContext('2d');

    if (currentChart) {
        currentChart.destroy();
    }

    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Média de Avaliação de Fluência 2021', 
                data: chartData.averages,
                backgroundColor: 'rgba(54, 162, 235, 0.8)', 
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Média de Nível de Fluência'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Escola'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Média da Avaliação de Fluência 2021 por Escola' 
                }
            }
        }
    });
}


// NOVO: Função para limpar todos os filtros
function clearFilters() {
    // Reseta todos os filtros principais para a opção padrão (vazio)
    schoolFilter.value = '';
    evaluationFilter.value = '';
    yearFilter.value = '';
    turmaFilter.value = '';

    // Reseta e oculta os filtros dinâmicos
    levelFilter.value = '';
    levelFilterGroup.style.display = 'none';

    nseFilter.value = '';
    nseFilterGroup.style.display = 'none';

    corRacaFilter.value = '';
    corRacaFilterGroup.style.display = 'none';

    inclusaoFilter.value = '';
    inclusaoFilterGroup.style.display = 'none';

    transporteFilter.value = '';
    transporteFilterGroup.style.display = 'none';

    // Chama applyFilters para re-renderizar a dashboard no estado inicial (sem dados exibidos)
    applyFilters();
}


// Event Listeners
applyFiltersButton.addEventListener('click', applyFilters); 

// Adiciona um listener ao botão Limpar Filtros
clearFiltersButton.addEventListener('click', clearFilters); 

// Listener para o filtro de Avaliação (mostra/oculta e popula os filtros dinâmicos)
evaluationFilter.addEventListener('change', () => {
    const selectedEvaluation = evaluationFilter.value;
    populateLevelFilter(selectedEvaluation); 
    toggleAndPopulateDemographicFilters(selectedEvaluation !== ""); 
    applyFilters(); 
});

// Listeners para os novos filtros demográficos (chama applyFilters ao mudar)
levelFilter.addEventListener('change', applyFilters);
nseFilter.addEventListener('change', applyFilters);
corRacaFilter.addEventListener('change', applyFilters);
inclusaoFilter.addEventListener('change', applyFilters);
transporteFilter.addEventListener('change', applyFilters);


// Carrega a biblioteca Chart.js e depois os dados da planilha quando a página é carregada
document.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = loadGoogleSheetData; 
    document.head.appendChild(script);
});