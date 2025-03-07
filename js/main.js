document.addEventListener("DOMContentLoaded", function () {
    // Stabilim data actuală
    let todayDate = new Date().toISOString().split("T")[0];
    if (localStorage.getItem("today") !== todayDate) {
        localStorage.setItem("today", todayDate);
        // Nu ștergem dataCSV zilnic, pentru a păstra istoricul
    }

    // Încercăm să încărcăm din data.csv
    fetch('./data/data.csv')
        .then(response => response.text())
        .then(csvContent => {
            processData(csvContent);
        })
        .catch(err => {
            console.error("Nu s-a putut încărca data.csv, folosim localStorage:", err);
            // Fallback la localStorage
            let dataCSV = localStorage.getItem("dataCSV");
            if (dataCSV) {
                processData(dataCSV);
            } else {
                processData("");
            }
        });

    // Adăugăm event listener pentru butonul de toggle
    document.getElementById("toggleDetailsBtn").addEventListener("click", function() {
        const detailsContainer = document.getElementById("detailsContainer");
        const btn = this;
        
        if (detailsContainer.style.display === "none") {
            detailsContainer.style.display = "block";
            btn.innerHTML = '<i class="fas fa-chevron-up"></i> Ascunde date sumative';
            btn.classList.add("active");
        } else {
            detailsContainer.style.display = "none";
            btn.innerHTML = '<i class="fas fa-chevron-down"></i> Afișare date sumative';
            btn.classList.remove("active");
        }
    });
});

function processData(csvContent) {
    let rows = [];
    if (csvContent) {
        rows = csvContent.trim().split("\n").filter(row => row !== "").map(row => {
            let parts = row.split(",");
            return { date: parts[0], manager: parts[1], amount: parseFloat(parts[2]) };
        });
    }

    // Filtrăm pentru ziua curentă
    let today = new Date().toISOString().split('T')[0];
    let todayRows = rows.filter(r => r.date === today);

    // Agregăm totalul și totalul per manager al încasărilor
    let totalRevenue = 0;
    let totalsByManager = {};
    let countByManager = {}; // Adăugăm contor pentru încasări per manager
    
    todayRows.forEach(r => {
        totalRevenue += r.amount;
        
        // Incrementăm suma per manager
        totalsByManager[r.manager] = (totalsByManager[r.manager] || 0) + r.amount;
        
        // Incrementăm contorul per manager
        countByManager[r.manager] = (countByManager[r.manager] || 0) + 1;
    });
    
    // Afișăm suma totală într-o casetă frumoasă
    document.getElementById("totalRevenue").textContent = totalRevenue + " lei";

    // Populăm tabelul
    const tableBody = document.getElementById("dailyTableBody");
    tableBody.innerHTML = "";
    
    // Populăm și cartonașele
    let dailyTotalsElem = document.getElementById("dailyTotals");
    dailyTotalsElem.innerHTML = "";
    
    Object.keys(totalsByManager).forEach(manager => {
        // Adăugăm rând în tabel
        const row = document.createElement("tr");
        
        const nameCell = document.createElement("td");
        nameCell.textContent = manager;
        row.appendChild(nameCell);
        
        const amountCell = document.createElement("td");
        amountCell.textContent = totalsByManager[manager] + " lei";
        row.appendChild(amountCell);
        
        const countCell = document.createElement("td");
        countCell.textContent = countByManager[manager] + " " + 
            (countByManager[manager] === 1 ? "ordin" : "ordine");
        row.appendChild(countCell);
        
        tableBody.appendChild(row);
        
        // Creăm și cartonașul pentru manager
        const card = document.createElement("div");
        card.className = "manager-card";
        
        card.innerHTML = `
            <div class="manager-name">${manager}</div>
            <div class="manager-stats">
                <div class="stat">
                    <div class="stat-value">${totalsByManager[manager]} lei</div>
                    <div class="stat-label">Valoare totală</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${countByManager[manager]}</div>
                    <div class="stat-label">${countByManager[manager] === 1 ? "Ordin" : "Ordine"}</div>
                </div>
            </div>
        `;
        
        dailyTotalsElem.appendChild(card);
    });
    
    // Adăugăm rândul de total în tabel
    const tfooter = document.getElementById("tableSummary");
    tfooter.innerHTML = "";
    
    if (Object.keys(totalsByManager).length > 0) {
        const totalRow = document.createElement("tr");
        
        const totalLabelCell = document.createElement("td");
        totalLabelCell.textContent = "TOTAL";
        totalRow.appendChild(totalLabelCell);
        
        const totalAmountCell = document.createElement("td");
        totalAmountCell.textContent = totalRevenue + " lei";
        totalRow.appendChild(totalAmountCell);
        
        const totalCountCell = document.createElement("td");
        const totalCount = Object.values(countByManager).reduce((sum, count) => sum + count, 0);
        totalCountCell.textContent = totalCount + " " + (totalCount === 1 ? "ordin" : "ordine");
        totalRow.appendChild(totalCountCell);
        
        tfooter.appendChild(totalRow);
    }
    
    // Verificare dacă există date
    if (Object.keys(totalsByManager).length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center">Nu există ordine de plată înregistrate pentru astăzi.</td></tr>`;
        dailyTotalsElem.innerHTML = "<p>Nu există ordine de plată înregistrate pentru astăzi.</p>";
        document.getElementById("totalRevenue").textContent = "0 lei";
    }

    // Creăm etichete pentru bara de grafic care să conțină doar numărul de ordine
    let labels = Object.keys(totalsByManager);
    let labelWithCount = labels.map(manager => `${manager} (${countByManager[manager]})`);

    // Inițializăm diagrama cu Chart.js
    let ctx = document.getElementById("revenueChart").getContext("2d");
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labelWithCount,
            datasets: [{
                label: 'Suma ordine de plată (lei)',
                data: Object.values(totalsByManager),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
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
                            return 'Suma: ' + context.parsed.y + ' lei';
                        },
                        afterLabel: function(context) {
                            let manager = labels[context.dataIndex];
                            return 'Număr ordine: ' + countByManager[manager];
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Suma (lei)'
                    }
                },
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}