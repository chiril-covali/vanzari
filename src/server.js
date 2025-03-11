const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const dataFile = path.join(__dirname, 'data', 'data.json');

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A client connected - Socket ID:', socket.id);
  console.log('Total connected clients:', io.engine.clientsCount);

  socket.on('disconnect', () => {
    console.log('Client disconnected - Socket ID:', socket.id);
    console.log('Remaining connected clients:', io.engine.clientsCount);
  });
});

// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Serve static files from the src folder
app.use(express.static(__dirname));

// GET endpoint to retrieve sales data
app.get('/api/sales', (req, res) => {
  fs.readFile(dataFile, 'utf8', (err, fileData) => {
    if (err) {
      console.error('Error reading data file:', err);
      return res.status(500).json({ error: 'Error reading data file' });
    }
    try {
      const jsonData = JSON.parse(fileData);
      return res.json(jsonData);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return res.status(500).json({ error: 'Error parsing data file' });
    }
  });
});

// POST endpoint to add a new sale
app.post('/api/sales', (req, res) => {
  fs.readFile(dataFile, 'utf8', (err, fileData) => {
    if (err) {
      console.error('Error reading data file:', err);
      return res.status(500).json({ error: 'Error reading data file' });
    }
    let jsonData;
    try {
      jsonData = JSON.parse(fileData);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return res.status(500).json({ error: 'Error parsing data file' });
    }

    // New sale received from the client
    const newSale = req.body;
    
    // Generate a unique ID
    newSale.id = Date.now().toString();
    
    // Add new entry to sales array
    jsonData.sales.push(newSale);

    // Write updated JSON back to the file
    fs.writeFile(dataFile, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error writing data file:', err);
        return res.status(500).json({ error: 'Error updating data file' });
      }
      // Emit the updated data to all connected clients
      io.emit('salesUpdated', jsonData);
      res.json(jsonData);
    });
  });
});

// PUT endpoint to update an existing sale
app.put('/api/sales/:id', (req, res) => {
  fs.readFile(dataFile, 'utf8', (err, fileData) => {
    if (err) {
      console.error('Error reading data file:', err);
      return res.status(500).json({ error: 'Error reading data file' });
    }
    let jsonData;
    try {
      jsonData = JSON.parse(fileData);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return res.status(500).json({ error: 'Error parsing data file' });
    }

    const id = req.params.id;
    const updatedSale = req.body;
    
    // Find the index of the entry with the given ID
    const index = jsonData.sales.findIndex(sale => (sale.id && sale.id === id) || (!sale.id && id === '0'));
    
    if (index !== -1) {
      // Update the entry
      jsonData.sales[index] = updatedSale;
      
      // Write updated JSON back to the file
      fs.writeFile(dataFile, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
        if (err) {
          console.error('Error writing data file:', err);
          return res.status(500).json({ error: 'Error updating data file' });
        }
        // Emit the updated data to all connected clients
      io.emit('salesUpdated', jsonData);
      res.json(jsonData);
      });
    } else {
      res.status(404).json({ error: 'Sale entry not found' });
    }
  });
});

// DELETE endpoint to remove a sale
app.delete('/api/sales/:id', (req, res) => {
  // Asigură-te că citim fișierul
  fs.readFile(dataFile, 'utf8', (err, fileData) => {
    if (err) {
      console.error('Error reading data file:', err);
      return res.status(500).json({ error: 'Error reading data file' });
    }
    
    let jsonData;
    try {
      jsonData = JSON.parse(fileData);
    } catch (parseError) {
      console.error('Error parsing JSON:', parseError);
      return res.status(500).json({ error: 'Error parsing data file' });
    }

    const id = req.params.id;
    console.log('Trying to delete entry with ID:', id);
    
    // Modifică logica de găsire a indexului
    const index = jsonData.sales.findIndex(sale => {
      return sale.id === id || (id === '0' && sale.id === 0) || (id === '0' && !sale.id);
    });
    
    console.log('Found at index:', index);
    
    if (index !== -1) {
      // Remove the entry
      jsonData.sales.splice(index, 1);
      
      // Write updated JSON back to the file
      fs.writeFile(dataFile, JSON.stringify(jsonData, null, 2), 'utf8', (err) => {
        if (err) {
          console.error('Error writing data file:', err);
          return res.status(500).json({ error: 'Error updating data file' });
        }
        // Emit the updated data to all connected clients
        io.emit('salesUpdated', jsonData);
        return res.json({ success: true, message: 'Entry deleted successfully' });
      });
    } else {
      return res.status(404).json({ error: 'Sale entry not found' });
    }
  });
});

// Start the server on port 8000 (or a port of your choice)
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});