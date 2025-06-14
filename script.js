document.addEventListener('DOMContentLoaded', function() {
    // Constants
    const CARD_LIMIT = 500;
    const STORAGE_KEY = 'creditCardExpenses';
    
    // DOM Elements
    const expenseForm = document.getElementById('expense-form');
    const descriptionInput = document.getElementById('description');
    const amountInput = document.getElementById('amount');
    const dateInput = document.getElementById('date');
    const expensesList = document.getElementById('expenses-list');
    const usedBar = document.getElementById('used-bar');
    const usedValue = document.getElementById('used-value');
    const availableValue = document.getElementById('available-value');
    
    
    dateInput.valueAsDate = new Date();
    
    
    let expenses = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    
    
    renderExpenses();
    updateLimitBar();
    
    
    expenseForm.addEventListener('submit', addExpense);
    
    function addExpense(e) {
        e.preventDefault();
        
        const description = descriptionInput.value.trim();
        const amount = parseFloat(amountInput.value);
        const date = dateInput.value;
        
        if (!description || isNaN(amount) || amount <= 0 || !date) {
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
            date
        };
        
        expenses.unshift(newExpense); 
        saveExpenses();
        renderExpenses();
        updateLimitBar();
        
        
        expenseForm.reset();
        dateInput.valueAsDate = new Date(); // reseta o dia
    }
    
    function deleteExpense(id) {
        expenses = expenses.filter(expense => expense.id !== id);
        saveExpenses();
        renderExpenses();
        updateLimitBar();
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
            
            expenseItem.innerHTML = `
                <span>${formattedDate}</span>
                <span>${expense.description}</span>
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
}); 