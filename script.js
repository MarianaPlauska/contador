document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const CARD_LIMIT = 500;
    const STORAGE_KEY = 'creditCardExpenses';
    const THEME_KEY = 'preferredTheme';
    const LIMIT_WARNING_THRESHOLD = 0.75; // 75% do limite
    
    // DOM Elements
    const expenseForm = document.getElementById('expense-form');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('date');
    const categoryInput = document.getElementById('category');
    const expensesList = document.getElementById('expenses-list');
    const usedBar = document.getElementById('used-bar');
    const usedValue = document.getElementById('used-value');
    const availableValue = document.getElementById('available-value');
    const chartTabs = document.querySelectorAll('.chart-tab');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.querySelector('.theme-icon');
    const limitAlert = document.getElementById('limit-alert');
    const alertMessage = document.getElementById('alert-message');
    const closeAlert = document.getElementById('close-alert');
    
    // Cores para as categorias nos gráficos
    const categoryColors = {
        almoco_baratinho: '#4CAF50', // Verde
        almoco: '#2196F3',           // Azul
        lanche: '#FFC107',           // Amarelo
        fast_food: '#FF5722',        // Laranja avermelhado
        lanche_sobremesa: '#E91E63', // Rosa
        aproveitar_vida: '#9C27B0'   // Roxo
    };
    
    // Nomes das categorias para exibição
    const categoryNames = {
        almoco_baratinho: 'Almoço baratinho',
        almoco: 'Almoço',
        lanche: 'Lanche',
        fast_food: 'Fast-food',
        lanche_sobremesa: 'Lanche com sobremesa',
        aproveitar_vida: 'Aproveitar a vida'
    };
    
    // Variável para armazenar a instância do gráfico
    let expensesChart = null;
    let activeChartType = 'daily';
    
    // Inicializar tema
    initTheme();
    
    dateInput.valueAsDate = new Date();
    
    let expenses = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    
    renderExpenses();
    updateLimitBar();
    renderChart(activeChartType);
    checkLimitWarning();
    
    // Event Listeners
    expenseForm.addEventListener('submit', addExpense);
    themeToggle.addEventListener('click', toggleTheme);
    closeAlert.addEventListener('click', dismissAlert);
    
    // Event listeners para as abas de gráficos
    chartTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove a classe active de todas as abas
            chartTabs.forEach(t => t.classList.remove('active'));
            // Adiciona a classe active à aba clicada
            this.classList.add('active');
            
            // Atualiza o tipo de gráfico ativo
            activeChartType = this.getAttribute('data-chart');
            
            // Renderiza o gráfico correspondente
            renderChart(activeChartType);
        });
    });
    
    function addExpense(e) {
        e.preventDefault();
        
        const description = descriptionInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const date = dateInput.value;
        const category = categoryInput.value;
        
        if (!description || isNaN(amount) || amount <= 0 || !date || !category) {
            alert('Por favor, preencha todos os campos corretamente.');
            return;
        }
        
        const totalSpent = calculateTotalSpent();
        if (totalSpent + amount > CARD_LIMIT) {
            alert(`Este gasto excederá seu limite de R$${CARD_LIMIT.toFixed(2)}. Valor disponível: R$${(CARD_LIMIT - totalSpent).toFixed(2)}`);
            return;
        }
        
        const newExpense = {
            id: Date.now(), 
            description,
            amount,
            date,
            category
        };
        
        expenses.unshift(newExpense); 
        saveExpenses();
        renderExpenses();
        updateLimitBar();
        renderChart(activeChartType);
        checkLimitWarning();
        
        expenseForm.reset();
        dateInput.valueAsDate = new Date(); // reseta o dia
    }
    
    function deleteExpense(id) {
        expenses = expenses.filter(expense => expense.id !== id);
        saveExpenses();
        renderExpenses();
        updateLimitBar();
        renderChart(activeChartType);
        checkLimitWarning();
    }
    
    function renderExpenses() {
        expensesList.innerHTML = '';
        
        if (expenses.length === 0) {
            expensesList.innerHTML = '<div class="expense-item" style="text-align: center; grid-column: 1 / -1;">Nenhum gasto registrado.</div>';
            return;
        }
        
        expenses.forEach(expense => {
            const expenseItem = document.createElement('div');
            expenseItem.className = 'expense-item';
            
            const formattedDate = formatDate(expense.date);
            
            // Adiciona um indicador de categoria com cor
            const categoryDot = expense.category ? 
                `<span class="category-dot" style="background-color: ${categoryColors[expense.category] || '#C9CBCF'}"></span>` : '';
            
            expenseItem.innerHTML = `
                <span>${formattedDate}</span>
                <span>${categoryDot} ${expense.description}</span>
                <span>R$${expense.amount.toFixed(2)}</span>
                <span>
                    <button class="delete-btn" data-id="${expense.id}">×</button>
                </span>
            `;
            
            expensesList.appendChild(expenseItem);
        });
        
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                deleteExpense(id);
            });
        });
    }
    
    function updateLimitBar() {
        const totalSpent = calculateTotalSpent();
        const available = CARD_LIMIT - totalSpent;
        const percentageUsed = (totalSpent / CARD_LIMIT) * 100;
        
        usedBar.style.width = `${percentageUsed}%`;
        usedValue.textContent = `R$${totalSpent.toFixed(2)}`;
        availableValue.textContent = `R$${available.toFixed(2)}`;
        
        if (percentageUsed >= 90) {
            usedBar.style.backgroundColor = '#c0392b'; // vermelho escuro
        } else if (percentageUsed >= 75) {
            usedBar.style.backgroundColor = '#e74c3c'; // vermelho
        } else if (percentageUsed >= 50) {
            usedBar.style.backgroundColor = '#f39c12'; // laranja
        } else {
            usedBar.style.backgroundColor = '#2ecc71'; // verde
        }
    }
    
    function renderChart(chartType) {
        // Verifica se há dados para exibir
        if (expenses.length === 0) {
            const ctx = document.getElementById('expensesChart');
            ctx.height = 100;
            const context = ctx.getContext('2d');
            context.clearRect(0, 0, ctx.width, ctx.height);
            context.font = '16px Arial';
            context.textAlign = 'center';
            context.fillText('Nenhum dado para exibir', ctx.width/2, 50);
            return;
        }
        
        // Destrói o gráfico anterior se existir
        if (expensesChart) {
            expensesChart.destroy();
        }
        
        const ctx = document.getElementById('expensesChart').getContext('2d');
        
        // Configurações de cores baseadas no tema
        const isDark = document.documentElement.classList.contains('dark-theme');
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDark ? '#e0e0e0' : '#666';
        
        // Configurações globais do Chart.js
        Chart.defaults.color = textColor;
        
        if (chartType === 'daily') {
            renderDailyChart(ctx, gridColor);
        } else if (chartType === 'category') {
            renderCategoryChart(ctx);
        }
    }
    
    function renderDailyChart(ctx, gridColor) {
        // Agrupa gastos por dia
        const dailyData = {};
        
        // Ordena as despesas por data
        const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Pega até os últimos 7 dias com gastos
        const uniqueDates = [...new Set(sortedExpenses.map(expense => expense.date))];
        const last7Dates = uniqueDates.slice(-7);
        
        // Se não houver datas, não renderize o gráfico
        if (last7Dates.length === 0) return;
        
        // Inicializa os dados para os últimos 7 dias
        last7Dates.forEach(date => {
            dailyData[date] = 0;
        });
        
        // Soma os gastos para cada dia
        sortedExpenses.forEach(expense => {
            if (last7Dates.includes(expense.date)) {
                dailyData[expense.date] += expense.amount;
            }
        });
        
        // Formata as datas para exibição
        const labels = Object.keys(dailyData).map(date => formatDate(date));
        const data = Object.values(dailyData);
        
        // Log para debug
        console.log("Dados do gráfico diário:", { labels, data });
        
        expensesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Gastos por Dia (R$)',
                    data: data,
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            callback: function(value) {
                                return 'R$' + value;
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: gridColor
                        }
                    }
                }
            }
        });
    }
    
    function renderCategoryChart(ctx) {
        // Agrupa gastos por categoria
        const categoryData = {
            almoco_baratinho: 0,
            almoco: 0,
            lanche: 0,
            fast_food: 0,
            lanche_sobremesa: 0,
            aproveitar_vida: 0
        };
        
        // Soma os gastos para cada categoria
        expenses.forEach(expense => {
            if (expense.category && categoryData[expense.category] !== undefined) {
                categoryData[expense.category] += expense.amount;
            } else {
                // Para compatibilidade com dados antigos
                categoryData.lanche += expense.amount;
            }
        });
        
        // Filtra apenas categorias com valores
        const categories = [];
        const values = [];
        const colors = [];
        
        Object.keys(categoryData).forEach(category => {
            if (categoryData[category] > 0) {
                categories.push(categoryNames[category]);
                values.push(categoryData[category]);
                colors.push(categoryColors[category]);
            }
        });
        
        // Log para debug
        console.log("Dados do gráfico de categorias:", { categories, values });
        
        // Se não houver categorias com valores, não renderize o gráfico
        if (categories.length === 0) return;
        
        expensesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw;
                                const total = context.chart.getDatasetMeta(0).total;
                                const percentage = Math.round((value / total) * 100);
                                return `R$${value.toFixed(2)} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    function calculateTotalSpent() {
        return expenses.reduce((total, expense) => total + expense.amount, 0);
    }
    
    function saveExpenses() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
    }
    
    function formatDate(dateString) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }
    
    // Funções para o tema claro/escuro
    function initTheme() {
        const savedTheme = localStorage.getItem(THEME_KEY);
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark-theme');
            themeIcon.textContent = '☀️';
        } else {
            themeIcon.textContent = '🌙';
        }
    }
    
    function toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark-theme');
        
        if (isDark) {
            localStorage.setItem(THEME_KEY, 'dark');
            themeIcon.textContent = '☀️';
        } else {
            localStorage.setItem(THEME_KEY, 'light');
            themeIcon.textContent = '🌙';
        }
        
        // Atualiza os gráficos para refletir o novo tema
        renderChart(activeChartType);
    }
    
    // Funções para o alerta de limite
    function checkLimitWarning() {
        const totalSpent = calculateTotalSpent();
        const percentageUsed = totalSpent / CARD_LIMIT;
        
        if (percentageUsed >= LIMIT_WARNING_THRESHOLD) {
            const available = CARD_LIMIT - totalSpent;
            showLimitWarning(available);
        } else {
            dismissAlert();
        }
    }
    
    function showLimitWarning(available) {
        alertMessage.textContent = `Atenção! Você já usou ${Math.round((1 - available/CARD_LIMIT) * 100)}% do seu limite. Disponível: R$${available.toFixed(2)}`;
        limitAlert.classList.remove('hidden');
    }
    
    function dismissAlert() {
        limitAlert.classList.add('hidden');
    }
}); 