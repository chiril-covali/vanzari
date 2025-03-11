document.addEventListener('DOMContentLoaded', function () {
  let editingId = null;
  const passwordForDelete = "admin123"; // Parola pentru ștergere
  const socket = io(); // Initialize Socket.IO connection

  // Add the formatAmount function at the top of your file
  function formatAmount(amount) {
    return new Intl.NumberFormat('ro-MD', {
      style: 'currency',
      currency: 'MDL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
    .replace(/\s+MDL$/, ' MDL'); // Formatare corectă pentru MDL
  }

  // Listen for real-time updates
  socket.on('salesUpdated', (data) => {
    console.log('Received real-time update in revenue page');
    loadSales(); // Reload the sales data when updates are received
  });

  // Fetch manager list from JSON file to populate the dropdown
  fetch('data/managers.json')
    .then(response => response.json())
    .then(managers => {
      const managerSelect = document.getElementById('managerSelect');
      managers.forEach(manager => {
        const option = document.createElement('option');
        option.value = manager;
        option.textContent = manager;
        managerSelect.appendChild(option);
      });
      
      // Set the last selected manager if available
      const lastSelectedManager = localStorage.getItem('lastSelectedManager');
      if (lastSelectedManager) {
        managerSelect.value = lastSelectedManager;
      }
      console.log("Managers loaded:", managers);
    })
    .catch(error => console.error("Error loading managers:", error));

  // Function to load and display current sales data
  function loadSales() {
    fetch('/api/sales')
      .then(response => response.json())
      .then(data => {
        // Filtrează ordinele de plată doar pentru ziua de azi
        const today = new Date().toISOString().split("T")[0];
        const todaySales = data.sales.filter(sale => sale.date === today);
        
        // Adaugă un ID pentru fiecare entry pentru a facilita editarea/ștergerea
        todaySales.forEach((sale, index) => {
          if (!sale.id) sale.id = index;
        });
        
        displaySalesData(todaySales);
      })
      .catch(error => console.error("Error loading sales data:", error));
  }

  // Display the sales entries in the UI
  function displaySalesData(sales) {
    const entriesList = document.getElementById('entriesList');
    entriesList.innerHTML = '';
    
    if (sales.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = "Nu există ordine de plată pentru astăzi.";
      entriesList.appendChild(emptyMessage);
      return;
    }
    
    sales.forEach((entry, index) => {
      const li = document.createElement('li');
      li.className = 'sales-entry';
      li.dataset.id = entry.id || index;
      
      // Entry info
      const entryInfo = document.createElement('div');
      entryInfo.className = 'entry-info';
      entryInfo.textContent = `${entry.date} - ${entry.manager_name} - ${entry.amount} MDL`;
      li.appendChild(entryInfo);
      
      // Action buttons
      const actions = document.createElement('div');
      actions.className = 'entry-actions';
      
      // Edit button
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.textContent = 'Editează';
      editBtn.onclick = () => editEntry(entry, index);
      actions.appendChild(editBtn);
      
      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Șterge';
      deleteBtn.style.backgroundColor = '#ff4d4d';
      deleteBtn.onclick = () => confirmDelete(entry, index);
      actions.appendChild(deleteBtn);
      
      li.appendChild(actions);
      entriesList.appendChild(li);
    });
  }

  // Function to edit an entry
  function editEntry(entry, index) {
    editingId = entry.id || index;
    
    // Populate form with current values
    document.getElementById('managerSelect').value = entry.manager_name;
    document.getElementById('amountInput').value = entry.amount;
    
    // Change the submit button text
    const submitButton = document.querySelector('#revenueForm button[type="submit"]');
    submitButton.textContent = 'Actualizează';
    
    // Add a cancel button if it doesn't exist
    if (!document.getElementById('cancelEdit')) {
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'cancelEdit';
      cancelBtn.textContent = 'Anulează';
      cancelBtn.type = 'button';
      cancelBtn.onclick = cancelEditing;
      submitButton.parentNode.insertBefore(cancelBtn, submitButton.nextSibling);
    }
  }

  // Function to cancel editing
  function cancelEditing() {
    editingId = null;
    document.getElementById('revenueForm').reset();
    const submitButton = document.querySelector('#revenueForm button[type="submit"]');
    submitButton.textContent = 'Adaugă';
    
    const cancelBtn = document.getElementById('cancelEdit');
    if (cancelBtn) cancelBtn.remove();

    // Restore the last selected manager after canceling
    const lastSelectedManager = localStorage.getItem('lastSelectedManager');
    if (lastSelectedManager) {
      document.getElementById('managerSelect').value = lastSelectedManager;
    }
  }

  // Function to confirm delete with password
  function confirmDelete(entry, index) {
    const password = prompt("Introduceți parola pentru a șterge această intrare:");
    
    if (password === passwordForDelete) {
      deleteEntry(entry, index);
    } else if (password !== null) {
      alert("Parolă incorectă!");
    }
  }

  // Function to delete an entry
  function deleteEntry(entry, index) {
    fetch(`/api/sales/${entry.id || index}`, {
      method: 'DELETE'
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("Entry deleted successfully");
        loadSales();
      })
      .catch(error => {
        console.error("Error deleting entry:", error);
        alert("A apărut o eroare la ștergerea intrării. Vă rugăm să încercați din nou.");
      });
  }

  // Initial load of sales data
  loadSales();

  // Function to show notification
  function showNotification(manager, amount, totalToday) {
    const notification = document.getElementById('notification');
    const notifManager = document.getElementById('notificationManager');
    const notifAmount = document.getElementById('notificationAmount');
    const notifTotal = document.getElementById('notificationTotal');
    
    notifManager.textContent = `Ordin nou de la ${manager}`;
    notifAmount.textContent = `În valoare de: ${formatAmount(amount)}`;
    notifTotal.textContent = `Total azi: ${formatAmount(totalToday)}`;
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
  }

  // Handle form submission (for both add and edit)
  const revenueForm = document.getElementById('revenueForm');
  revenueForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const managerSelect = document.getElementById('managerSelect');
    const amountInput = document.getElementById('amountInput');
    const manager = managerSelect.value;
    const amount = parseFloat(amountInput.value);
    const today = new Date().toISOString().split("T")[0];

    const saleData = {
      date: today,
      manager_name: manager,
      amount: amount
    };

    // Save the selected manager to localStorage
    localStorage.setItem('lastSelectedManager', manager);

    // If editing, send PUT request, otherwise POST for new entry
    if (editingId !== null) {
      saleData.id = editingId;
      
      fetch(`/api/sales/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saleData)
      })
        .then(response => response.json())
        .then(data => {
          console.log("Entry updated:", data);
          cancelEditing();
          loadSales();
        })
        .catch(error => console.error("Error updating entry:", error));
    } else {
      // POST the new sale to our API
      fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saleData)
      })
        .then(response => response.json())
        .then(data => {
            // Calculate total for today for this manager
            fetch('/api/sales')
              .then(response => response.json())
              .then(salesData => {
                  const today = new Date().toISOString().split("T")[0];
                  const managerTodayTotal = salesData.sales
                        .filter(sale => sale.date === today && sale.manager_name === manager)
                        .reduce((sum, sale) => sum + parseFloat(sale.amount), 0);
                  
                  // Show notification with details
                  showNotification(manager, amount, managerTodayTotal);

                  // Reset form but keep manager selected
                  amountInput.value = '';
                  loadSales();
              });
        })
        .catch(error => console.error("Error updating sales data:", error));
    }

    revenueForm.reset();
    
    // Restore the last selected manager after form reset
    managerSelect.value = manager;
  });

  // Also save manager selection when it changes
  document.getElementById('managerSelect').addEventListener('change', function(e) {
    localStorage.setItem('lastSelectedManager', e.target.value);
  });

});