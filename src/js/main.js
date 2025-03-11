document.addEventListener('DOMContentLoaded', () => {
    // Set speaker disabled by default
    let speakerEnabled = false;
    window.speakerEnabled = speakerEnabled; // global flag

    const toggleSpeakerBtn = document.getElementById('toggleSpeaker');
    toggleSpeakerBtn.addEventListener('click', () => {
        speakerEnabled = !speakerEnabled;
        window.speakerEnabled = speakerEnabled;
        if (speakerEnabled) {
            toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        } else {
            toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        }
    });

    // Initialize audio manager
    const audioManager = new AudioManager();
    
    // Initialize Socket.IO connection
    const socket = io();
    
    // Keep track of the current chart instance
    window.currentChart = null;

    // Listen for real-time updates
    socket.on('salesUpdated', (data) => {
        console.log('Received real-time update');
        
        // Get the newest sale (last in the array)
        const latestSale = data.sales[data.sales.length - 1];
        
        // Show celebration for new sale
        if (latestSale) {
            const celebrationManager = new CelebrationManager();
            celebrationManager.showCelebration(latestSale.manager_name, latestSale.amount);
        }
        
        // Update the display
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
            
            // After processing all sales, determine the current leader
            const sortedManagers = Object.keys(salesByManager).sort((a, b) => {
                return salesByManager[b].todayTotal - salesByManager[a].todayTotal;
            });

            // Afișează total general
            document.getElementById('totalRevenue').textContent = formatAmount(todaySum);
            
            // Crează diagrama cu managerii (folosind funcția din chart.js)
            window.createManagerChart(salesByManager, formatAmount);
            
            // Populează tabelul cu datele per manager
            populateManagerTable(salesByManager, todaySum);
            
            // Crează cardurile cu date per manager
            createManagerCards(salesByManager);
            
        } catch (error) {
            console.error('Eroare la încărcarea datelor:', error);
            document.getElementById('totalRevenue').textContent = 'Eroare la încărcarea datelor';
        }
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