// Helper function pentru a desena dreptunghiuri cu colțuri rotunjite
function roundRect(ctx, x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    ctx.fill();
  }
  
  // Helper pentru formatarea sumei în MDL
  function formatAmount(amount) {
    return new Intl.NumberFormat('ro-RO', { 
      style: 'currency', 
      currency: 'MDL', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(amount);
  }
  
  // Variabilă globală pentru instanța chart-ului
  window.currentChart = null;
  
  // Funcție pentru a încărca și procesa datele din data.json și managers.json
  async function loadSalesData() {
    const salesResponse = await fetch('/data/data.json');
    const managersResponse = await fetch('/data/managers.json');
    const salesData = await salesResponse.json();
    const managersData = await managersResponse.json();
  
    // Grupează vânzările pe manager cu proprietățile todayTotal și todayCount
    const salesByManager = {};
    salesData.bills.forEach(bill => {
      if (!bill.manager || !bill.manager.responsible_user_id) return;
      const managerId = bill.manager.responsible_user_id.toString();
      const managerInfo = managersData.manager_mapping[managerId];
      if (!managerInfo) return;
      const managerName = managerInfo.name;
      if (!salesByManager[managerName]) {
        salesByManager[managerName] = { todayTotal: 0, todayCount: 0 };
      }
      salesByManager[managerName].todayTotal += Number(bill.total_price);
      salesByManager[managerName].todayCount++;
    });
    return salesByManager;
  }
  
  // Creează chart-ul cu etichete personalizate
  window.initCharts = async function() {
    const salesByManager = await loadSalesData();
    const managerNames = Object.keys(salesByManager);
    // Sortează managerii descrescător după suma totală
    const sortedManagers = managerNames.sort((a, b) => salesByManager[b].todayTotal - salesByManager[a].todayTotal);
    // Obține valorile folosind ordinea sortată
    const managerSums = sortedManagers.map(name => salesByManager[name].todayTotal);
    
    // Obține contextul canvas-ului și setează dimensiuni
    const canvas = document.getElementById('revenueChart');
    canvas.width = window.innerWidth - 100;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    
    // Dacă există deja un chart, îl distrugem
    if (window.currentChart) {
      window.currentChart.destroy();
    }
    
    // Creează chart-ul folosind Chart.js
    window.currentChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sortedManagers,
        datasets: [{
          label: 'Suma totală (MDL)',
          data: managerSums,
          backgroundColor: 'rgba(66, 103, 178, 0.6)',
          borderColor: 'rgba(66, 103, 178, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: false, // folosim dimensiuni fixe
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value + ' MDL';
              }
            }
          }
        }
      },
      plugins: [{
        id: 'customLabels',
        // După desenarea chart-ului, se adaugă etichetele personalizate pe fiecare coloană
        afterDraw: (chart) => {
          const ctx = chart.ctx;
          const meta = chart.getDatasetMeta(0);
          for (let i = 0; i < meta.data.length; i++) {
            const element = meta.data[i];
            const value = chart.data.datasets[0].data[i];
            const manager = sortedManagers[i];
            const count = salesByManager[manager].todayCount;
            if (!value) continue;
            const position = element.getCenterPoint();
            const amountText = formatAmount(value);
            const countText = `(${count})`;
            
            ctx.font = 'bold 14px Arial';
            const amountWidth = ctx.measureText(amountText).width;
            const countWidth = ctx.measureText(countText).width;
            const maxWidth = Math.max(amountWidth, countWidth);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            roundRect(ctx, position.x - maxWidth/2 - 5, position.y - 10, maxWidth + 10, 20, 4);
            roundRect(ctx, position.x - maxWidth/2 - 5, position.y + 10, maxWidth + 10, 20, 4);
            
            ctx.fillStyle = '#1A237E';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(amountText, position.x, position.y);
            ctx.fillText(countText, position.x, position.y + 20);
          }
        }
      }]
    });
    
    // Returnăm datele procesate pentru main.js (dacă este nevoie)
    return { salesByManager, salesByTeam: {} };
  };
  
  // Inițializează chart-ul când documentul este pregătit
  document.addEventListener('DOMContentLoaded', window.initCharts);