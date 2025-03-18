document.addEventListener('DOMContentLoaded', async function() {
    // Set speaker disabled by default
    let speakerEnabled = false;
    window.speakerEnabled = speakerEnabled; // global flag

    const toggleSpeakerBtn = document.getElementById('toggleSpeaker');
    if (toggleSpeakerBtn) {
        toggleSpeakerBtn.addEventListener('click', () => {
            speakerEnabled = !speakerEnabled;
            window.speakerEnabled = speakerEnabled;
            if (speakerEnabled) {
                toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            } else {
                toggleSpeakerBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            }
        });
    }

    // Initialize Socket.IO connection
    const socket = io();
    
    // Toggle pentru afișarea detaliilor
    const toggleBtn = document.getElementById('toggleDetailsBtn');
    const detailsContainer = document.getElementById('detailsContainer');
    
    if (toggleBtn && detailsContainer) {
        const icon = toggleBtn.querySelector('i');
        
        toggleBtn.addEventListener('click', () => {
            const isHidden = detailsContainer.style.display === 'none';
            detailsContainer.style.display = isHidden ? 'block' : 'none';
            icon.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
        });
    }

    // Socket listeners for real-time updates
    socket.on('welcome', (data) => {
        console.log('Connected to server:', data.message);
    });
    
    socket.on('dataUpdated', (data) => {
        console.log('Data updated at:', data.timestamp);
        
        // Reîncarcă graficele cu datele noi
        if (typeof window.initCharts === 'function') {
            window.initCharts().then(({ salesByManager, salesByTeam }) => {
                // Actualizează și tabelele/cardurile dacă este necesar
                populateManagerTable(salesByManager);
                createManagerCards(salesByManager);
            });
        }
        
        // Actualizează timestamp-ul afișat
        updateTimestamp(data.timestamp);
    });
    
    // Format amount helper
    function formatAmount(amount) {
        return new Intl.NumberFormat('ro-RO', {
            style: 'currency',
            currency: 'MDL',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }
    
    // Function to update the timestamp display
    function updateTimestamp(timestamp) {
        const dataLoadedElement = document.getElementById('dataLoaded');
        if (dataLoadedElement) {
            const date = new Date(timestamp);
            const options = { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit'
            };
            dataLoadedElement.textContent = `Ultima actualizare: ${date.toLocaleDateString('ro-RO', options)}`;
        }
    }
    
    // Display initial timestamp of when data was fetched
    const dataLoadedElement = document.getElementById('dataLoaded');
    if (dataLoadedElement) {
        fetch('/src/data/data.json')
            .then(response => response.json())
            .then(data => {
                updateTimestamp(data.timestamp);
            })
            .catch(error => console.error('Error loading timestamp:', error));
    }
    
    // Add refresh button functionality
    const refreshButton = document.getElementById('refreshData');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            // Trimite cerere de actualizare a datelor către server
            socket.emit('requestDataRefresh');
            
            // Afișează un mesaj că actualizarea este în curs
            alert('Actualizarea datelor a început. Va dura câteva secunde.');
        });
    }
    
    // Populează tabelul cu date per manager
    async function populateManagerTable(salesByManager) {
        const tableBody = document.getElementById('dailyTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        // Sortează managerii după suma de azi (descrescător)
        const sortedManagers = Object.keys(salesByManager).sort((a, b) => {
            return salesByManager[b].todayTotal - salesByManager[a].todayTotal;
        });
        
        let todayOrdersCount = 0;
        let todayTotal = 0;
        
        // Crează rândurile pentru fiecare manager
        sortedManagers.forEach(manager => {
            const managerData = salesByManager[manager];
            
            // Afișează doar managerii cu ordine pentru azi
            if (managerData.todayCount === 0) return;
            
            todayOrdersCount += managerData.todayCount;
            todayTotal += managerData.todayTotal;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${manager}</td>
                <td>${formatAmount(managerData.todayTotal)}</td>
                <td>${managerData.todayCount}</td>
            `;
            tableBody.appendChild(row);
        });
        
        // Actualizează totalul general
        const totalRevenueElement = document.getElementById('totalRevenue');
        if (totalRevenueElement) {
            totalRevenueElement.textContent = formatAmount(todayTotal);
        }
        
        // Adaugă rândul de sumar
        const summaryRow = document.getElementById('tableSummary');
        if (summaryRow) {
            summaryRow.innerHTML = `
                <tr>
                    <td><strong>Total</strong></td>
                    <td><strong>${formatAmount(todayTotal)}</strong></td>
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
    
    // Inițializează graficele și tabele când pagina se încarcă
    if (typeof window.initCharts === 'function') {
        window.initCharts().then(({ salesByManager, salesByTeam }) => {
            populateManagerTable(salesByManager);
            createManagerCards(salesByManager);
        });
    } else {
        console.error('initCharts function not found. Make sure chart.js is loaded properly.');
    }
});