document.addEventListener('DOMContentLoaded', function() {
    // Initialize Socket.IO connection
    const socket = io();
    
    // Keep track of the current chart instance
    let currentChart = null;

    // Listen for real-time updates
    socket.on('salesUpdated', (data) => {
        console.log('Received real-time update');
        // Process and display the updated data
        loadAndDisplayData();
    });

    // Funcție pentru formatarea sumelor în lei MDL
    function formatAmount(amount) {
        return new Intl.NumberFormat('ro-MD', { style: 'currency', currency: 'MDL' }).format(amount)
            .replace(/\s+MDL$/, ' MDL'); // Formatare corectă pentru MDL
    }

    // Funcție pentru încărcarea și afișarea datelor
    async function loadAndDisplayData() {
        try {
            // Încarcă datele din API
            const response = await fetch('/api/sales');
            const data = await response.json();
            
            if (!data.sales || data.sales.length === 0) {
                document.getElementById('totalRevenue').textContent = 'Nu există date';
                return;
            }
            
            // Procesează datele pentru diagrame și tabele
            const todayDate = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD pentru azi
            const salesByManager = {}; // Grupare după manager
            let totalSum = 0;
            let todaySum = 0;

            data.sales.forEach(sale => {
                const amount = parseFloat(sale.amount);
                totalSum += amount;
                
                // Adaugă la gruparea după manager
                if (!salesByManager[sale.manager_name]) {
                    salesByManager[sale.manager_name] = {
                        total: 0,
                        todayTotal: 0,
                        count: 0,
                        todayCount: 0
                    };
                }
                salesByManager[sale.manager_name].total += amount;
                salesByManager[sale.manager_name].count++;
                
                // Verifică dacă vânzarea este de azi
                if (sale.date === todayDate) {
                    todaySum += amount;
                    salesByManager[sale.manager_name].todayTotal += amount;
                    salesByManager[sale.manager_name].todayCount++;
                }
            });
            
            // Afișează total general
            document.getElementById('totalRevenue').textContent = formatAmount(todaySum);
            
            // Crează diagrama cu managerii
            createManagerChart(salesByManager);
            
            // Populează tabelul cu datele per manager
            populateManagerTable(salesByManager, todaySum);
            
            // Crează cardurile cu date per manager
            createManagerCards(salesByManager);
            
        } catch (error) {
            console.error('Eroare la încărcarea datelor:', error);
            document.getElementById('totalRevenue').textContent = 'Eroare la încărcarea datelor';
        }
    }
    
    // Crează diagrama cu Chart.js pentru manageri
    function createManagerChart(salesByManager) {
        const ctx = document.getElementById('revenueChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (currentChart) {
            currentChart.destroy();
        }
        
        // Sortează managerii după suma totală
        const sortedManagers = Object.keys(salesByManager).sort((a, b) => {
            return salesByManager[b].todayTotal - salesByManager[a].todayTotal;
        });
        
        // Pregătește datele pentru grafic
        const datasets = [
            {
                label: 'Suma totală (MDL)',
                data: sortedManagers.map(manager => salesByManager[manager].todayTotal),
                backgroundColor: 'rgba(66, 103, 178, 0.7)',
                borderColor: 'rgba(66, 103, 178, 1)',
                borderWidth: 1,
                yAxisID: 'y'
            },
            {
                label: 'Număr de ordine',
                data: sortedManagers.map(manager => salesByManager[manager].todayCount),
                type: 'line',
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                pointRadius: 5,
                pointHoverRadius: 7,
                yAxisID: 'y1'
            }
        ];
        
        // Crează diagrama și salvează referința
        currentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedManagers,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Suma (MDL)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value + ' MDL';
                            }
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Număr de ordine'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const datasetLabel = context.dataset.label || '';
                                const value = context.parsed.y;
                                if (context.datasetIndex === 0) {
                                    return datasetLabel + ': ' + formatAmount(value);
                                }
                                return datasetLabel + ': ' + value;
                            }
                        }
                    },
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }
    
    // Initial load
    loadAndDisplayData();

    // Populează tabelul cu date per manager
    function populateManagerTable(salesByManager, todaySum) {
        const tableBody = document.getElementById('dailyTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        // Sortează managerii după suma de azi (descrescător)
        const sortedManagers = Object.keys(salesByManager).sort((a, b) => {
            return salesByManager[b].todayTotal - salesByManager[a].todayTotal;
        });
        
        let todayOrdersCount = 0;
        
        // Crează rândurile pentru fiecare manager
        sortedManagers.forEach(manager => {
            const managerData = salesByManager[manager];
            
            // Afișează doar managerii cu ordine pentru azi
            if (managerData.todayCount === 0) return;
            
            todayOrdersCount += managerData.todayCount;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${manager}</td>
                <td>${formatAmount(managerData.todayTotal)}</td>
                <td>${managerData.todayCount}</td>
            `;
            tableBody.appendChild(row);
        });
        
        // Adaugă rândul de sumar
        const summaryRow = document.getElementById('tableSummary');
        if (summaryRow) {
            summaryRow.innerHTML = `
                <tr>
                    <td><strong>Total</strong></td>
                    <td><strong>${formatAmount(todaySum)}</strong></td>
                    <td><strong>${todayOrdersCount}</strong></td>
                </tr>
            `;
        }
    }

    // Crează carduri pentru fiecare manager
    function createManagerCards(salesByManager) {
        const container = document.getElementById('dailyTotals');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Sortează managerii după suma de azi (descrescător)
        const sortedManagers = Object.keys(salesByManager).sort((a, b) => {
            return salesByManager[b].todayTotal - salesByManager[a].todayTotal;
        });
        
        // Crează un card pentru fiecare manager
        sortedManagers.forEach(manager => {
            const managerData = salesByManager[manager];
            
            // Afișează doar managerii cu ordine pentru azi
            if (managerData.todayCount === 0) return;
            
            const card = document.createElement('div');
            card.className = 'manager-card';
            card.innerHTML = `
                <h3>${manager}</h3>
                <p>Suma totală: ${formatAmount(managerData.todayTotal)}</p>
                <p>Număr de ordine: ${managerData.todayCount}</p>
            `;
            container.appendChild(card);
        });
    }

    // Toggle pentru afișarea detaliilor
    const toggleBtn = document.getElementById('toggleDetailsBtn');
    const detailsContainer = document.getElementById('detailsContainer');
    const icon = toggleBtn?.querySelector('i');

    toggleBtn?.addEventListener('click', () => {
        const isHidden = detailsContainer.style.display === 'none';
        detailsContainer.style.display = isHidden ? 'block' : 'none';
        icon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    });
});