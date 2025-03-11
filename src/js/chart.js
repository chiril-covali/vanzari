// Chart-related functionality extracted from main.js

// Helper function to draw rounded rectangles
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

// Crează diagrama cu Chart.js pentru manageri
function createManagerChart(salesByManager, formatAmount) {
    const canvas = document.getElementById('revenueChart');
    const ctx = canvas.getContext('2d');
    
    // Set a fixed height to make bars taller
    canvas.style.height = '600px'; // adjust as needed
    
    // Destroy existing chart if it exists
    if (window.currentChart) {
        window.currentChart.destroy();
    }
    
    // Sortează managerii după suma totală de azi
    const sortedManagers = Object.keys(salesByManager).sort((a, b) => {
        return salesByManager[b].todayTotal - salesByManager[a].todayTotal;
    });
    
    // Set a minimum width to the canvas based on the number of managers (e.g. 100px per manager)
    const minChartWidth = sortedManagers.length * 100;
    canvas.style.minWidth = `${minChartWidth}px`;
    
    // Creează diagrama
    window.currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedManagers,
            datasets: [
                {
                    label: '',
                    data: sortedManagers.map(manager => salesByManager[manager].todayTotal),
                    backgroundColor: 'rgba(66, 103, 178, 0.6)', // Semi-transparent blue
                    borderColor: 'rgba(66, 103, 178, 1)',       // Solid blue border
                    borderWidth: 2,
                    borderRadius: 8,
                    borderSkipped: false,
                    barPercentage: 0.8,
                    categoryPercentage: 0.9
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    bottom: 50 // Extra space for x-axis labels
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Performanța managerilor',
                    font: {
                        size: 24,
                        weight: 'bold'
                    },
                    color: '#000',
                    padding: {
                        bottom: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const manager = sortedManagers[context.dataIndex];
                            const count = salesByManager[manager].todayCount;
                            return `${formatAmount(context.parsed.y)} (${count} ordine)`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    position: 'left',
                    title: { display: false },
                    ticks: {
                        callback: function(value) {
                            return value + ' MDL';
                        },
                        font: { size: 14, color: '#000' }
                    },
                    grid: {
                        drawBorder: false,
                        lineWidth: 0.5
                    }
                },
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45,
                        padding: 15, // Increase padding to move labels lower
                        font: { size: 14, color: '#000' }
                    },
                    grid: {
                        display: false,
                        offset: true
                    }
                }
            }
        },
        plugins: [{
            id: 'customLabels',
            afterDraw: (chart) => {
                const ctx = chart.ctx;
                const meta = chart.getDatasetMeta(0);
                
                for (let i = 0; i < meta.data.length; i++) {
                    const element = meta.data[i];
                    const dataset = chart.data.datasets[0];
                    const value = dataset.data[i];
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
    
    return window.currentChart;
}

// Export the chart creation function
window.createManagerChart = createManagerChart;