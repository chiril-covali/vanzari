document.addEventListener("DOMContentLoaded", function () {
    let today = new Date().toISOString().split('T')[0];
    // Resetare zilnică
    if (localStorage.getItem("today") !== today) {
        localStorage.setItem("today", today);
        localStorage.removeItem("dataCSV");
    }

    // Încarcă lista de manageri din CSV
    fetch('./data/managers.csv')
        .then(response => response.text())
        .then(text => {
            let managers = text.trim().split('\n');
            let managerSelect = document.getElementById("managerSelect");
            managerSelect.innerHTML = ""; // Curățăm opțiunile existente
            
            managers.forEach(m => {
                let option = document.createElement("option");
                option.value = m;
                option.textContent = m;
                managerSelect.appendChild(option);
            });
        })
        .catch(err => {
            console.error("Nu s-a putut încărca managers.csv:", err);
            // Add fallback for testing
            const fallbackManagers = ["Manager 1", "Manager 2", "Manager 3"];
            let managerSelect = document.getElementById("managerSelect");
            managerSelect.innerHTML = ""; // Curățăm opțiunile existente
            
            fallbackManagers.forEach(m => {
                let option = document.createElement("option");
                option.value = m;
                option.textContent = m;
                managerSelect.appendChild(option);
            });
        });

    // Încărcăm datele existente
    fetch('./data/data.csv')
        .then(response => response.text())
        .then(text => {
            localStorage.setItem("dataCSV", text);
            loadEntries();
        })
        .catch(err => {
            console.error("Nu s-a putut încărca data.csv:", err);
            loadEntries();
        });

    document.getElementById("revenueForm").addEventListener("submit", function (e) {
        e.preventDefault();
        let manager = document.getElementById("managerSelect").value;
        let amount = parseFloat(document.getElementById("amountInput").value);
        if (isNaN(amount)) return;
        let entry = today + ',' + manager + ',' + amount + '\n';
        let dataCSV = localStorage.getItem("dataCSV") || "";
        dataCSV += entry;
        localStorage.setItem("dataCSV", dataCSV);
        
        // Salvăm și în data.csv prin API
        saveToCSV(dataCSV);
        
        document.getElementById("amountInput").value = "";
        loadEntries();
    });
    
    loadEntries();
});

function loadEntries() {
    let entriesList = document.getElementById("entriesList");
    entriesList.innerHTML = "";
    let today = new Date().toISOString().split('T')[0];
    let dataCSV = localStorage.getItem("dataCSV") || "";
    let rows = dataCSV.trim().split('\n').filter(row => row !== "").map(row => {
        let parts = row.split(',');
        return { date: parts[0], manager: parts[1], amount: parseFloat(parts[2]) };
    });
    
    // Filtrăm doar intrările de astăzi pentru afișare
    let todayEntries = rows.filter(entry => entry.date === today);
    
    todayEntries.forEach((entry, index) => {
        let li = document.createElement("li");
        li.textContent = entry.manager + " - " + entry.amount + " lei";

        let btnEdit = document.createElement("button");
        btnEdit.textContent = "Editează";
        btnEdit.onclick = function () { editEntry(findOriginalIndex(rows, entry)); };
        li.appendChild(btnEdit);

        let btnDelete = document.createElement("button");
        btnDelete.textContent = "Șterge";
        btnDelete.className = "delete-button";
        btnDelete.onclick = function () { deleteEntry(findOriginalIndex(rows, entry)); };
        li.appendChild(btnDelete);

        entriesList.appendChild(li);
    });
    
    if (todayEntries.length === 0) {
        entriesList.innerHTML = "<li>Nu există ordine de plată pentru astăzi</li>";
    }

    // Update the graph
    updateGraph(rows);
}

function findOriginalIndex(allRows, entry) {
    // Găsește indexul original în toate datele pentru a putea edita/șterge corect
    return allRows.findIndex(row => 
        row.date === entry.date && 
        row.manager === entry.manager && 
        row.amount === entry.amount);
}

function deleteEntry(index) {
    // Verifică parola
    let password = prompt("Introduceți parola pentru ștergere:");
    if (password !== "chiril") {
        alert("Parola incorectă! Nu puteți șterge acest ordin de plată.");
        return;
    }
    
    let dataCSV = localStorage.getItem("dataCSV") || "";
    let rows = dataCSV.trim().split('\n');
    rows.splice(index, 1);
    let newData = rows.length ? rows.join('\n') + '\n' : '';
    localStorage.setItem("dataCSV", newData);
    
    // Salvăm și în data.csv
    saveToCSV(newData);
    
    loadEntries();
}

function editEntry(index) {
    let newAmount = prompt("Introdu noua sumă:");
    if (newAmount === null) return;
    newAmount = parseFloat(newAmount);
    if (isNaN(newAmount)) {
        alert("Suma introdusă este invalidă!");
        return;
    }
    let dataCSV = localStorage.getItem("dataCSV") || "";
    let rows = dataCSV.trim().split('\n');
    let parts = rows[index].split(',');
    parts[2] = newAmount;
    rows[index] = parts.join(',');
    let newData = rows.join('\n') + (rows.length ? '\n' : '');
    localStorage.setItem("dataCSV", newData);
    
    // Salvăm și în data.csv
    saveToCSV(newData);
    
    loadEntries();
}

// Funcție pentru a salva în data.csv printr-o cerere POST către server
function saveToCSV(data) {
    fetch('save_data.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'data=' + encodeURIComponent(data)
    })
    .then(response => response.text())
    .then(result => {
        console.log("Datele au fost salvate cu succes:", result);
    })
    .catch(error => {
        console.error("Eroare la salvarea datelor:", error);
        alert("Eroare la salvarea datelor: " + error.message);
    });
}

// Function to update the graph
function updateGraph(rows) {
    let today = new Date().toISOString().split('T')[0];
    let todayRows = rows.filter(r => r.date === today);

    let totalsByManager = {};
    todayRows.forEach(r => {
        totalsByManager[r.manager] = (totalsByManager[r.manager] || 0) + r.amount;
    });

    let labels = Object.keys(totalsByManager);
    let data = Object.values(totalsByManager);

    let ctx = document.getElementById("revenueChart").getContext("2d");
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Suma ordine de plată (lei)',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
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
                        text: 'Suma (lei)'
                    }
                }
            }
        }
    });
}
