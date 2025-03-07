document.addEventListener("DOMContentLoaded", function () {
    // Ensure proper date format YYYY-MM-DD
    let today = new Date();
    let formattedDate = today.getFullYear() + '-' + 
                       String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(today.getDate()).padStart(2, '0');
                       
    // Resetare zilnică
    if (localStorage.getItem("today") !== formattedDate) {
        localStorage.setItem("today", formattedDate);
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
        
        // Ensure proper date format YYYY-MM-DD
        let today = new Date();
        let formattedDate = today.getFullYear() + '-' + 
                            String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                            String(today.getDate()).padStart(2, '0');
        
        let entry = formattedDate + ',' + manager + ',' + amount + '\n';
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
    
    // Ensure proper date format YYYY-MM-DD
    let today = new Date();
    let formattedDate = today.getFullYear() + '-' + 
                       String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                       String(today.getDate()).padStart(2, '0');
    
    let dataCSV = localStorage.getItem("dataCSV") || "";
    let rows = dataCSV.trim().split('\n').filter(row => row !== "").map(row => {
        let parts = row.split(',');
        return { date: parts[0], manager: parts[1], amount: parseFloat(parts[2]) };
    });
    
    // Filtrăm doar intrările de astăzi pentru afișare
    let todayEntries = rows.filter(entry => entry.date === formattedDate);
    
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

function saveToCSV(data) {
    // Send the data directly as text
    fetch('./api/save_data.php', {
        method: 'POST',
        body: data,
        headers: {
            'Content-Type': 'text/plain'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok: ' + response.status);
        }
        return response.text();
    })
    .then(result => {
        console.log("Data saved successfully:", result);
    })
    .catch(error => {
        console.error("Error saving data:", error);
        alert("Eroare la salvarea datelor: " + error.message);
    });
}