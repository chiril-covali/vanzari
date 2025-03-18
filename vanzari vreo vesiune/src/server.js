import express from 'express';
import http from 'http';
import path from 'path';
import schedule from 'node-schedule';
import { exec } from 'child_process';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';

// Obține __dirname în contextul unui modul ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Creează aplicația Express și serverul HTTP
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servește fișierele statice din directorul src
app.use(express.static(__dirname));

// Ruta pentru pagina principală
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/triggerCelebration', (req, res) => {
  res.send('Celebration triggered');
});

// Funcție pentru rularea script-ului fetchBillList.js
function fetchData() {
  console.log('Fetching data at:', new Date().toISOString());
  
  // Execută script-ul, ținând cont că directorul de lucru este rădăcina proiectului
  exec('node src/fetchBillList.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error}`);
      return;
    }
    console.log(`Fetch completed: ${stdout}`);
    if (stderr) {
      console.error(`Error: ${stderr}`);
    }
    // Trimite notificare către clienți că datele au fost actualizate
    io.emit('dataUpdated', { timestamp: new Date().toISOString() });
  });
}

// Rulează fetchData la pornirea serverului
fetchData();

// Planifică fetchData la fiecare 10 minute între orele 9:00 și 21:00, luni-sâmbătă
const fetchJob = schedule.scheduleJob('*/30 9-21 * * 1-6', () => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Duminică, 1 = Luni, ..., 6 = Sâmbătă
  if (hour >= 9 && hour < 21 && day >= 1 && day <= 6) {
    fetchData();
  }
});

// Configurarea Socket.IO pentru actualizări în timp real
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.emit('welcome', { message: 'Connected to server' });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
  
  socket.on('requestDataRefresh', () => {
    fetchData();
  });
});

// Creează endpoint API pentru refresh manual
app.post('/api/refresh-data', (req, res) => {
  fetchData();
  res.status(200).json({ message: 'Data refresh initiated' });
});

// Pornirea serverului
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access the dashboard at http://localhost:${PORT}`);
});