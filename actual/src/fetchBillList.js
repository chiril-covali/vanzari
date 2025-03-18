import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Get today's date and tomorrow's date
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);

// Convert to Unix timestamp (milliseconds)
const todayTimestamp = today.getTime();
const tomorrowTimestamp = tomorrow.getTime();

const url = 'https://alfaamo.ru/billservice/server/mteach/bill_list_info.php?token=Cp3lvJkVyjJeIFRmcPYpLzFA';

const requestBody = {
  user_bill_id: "",
  contact: "",
  total_from: null,
  total_to: null,
  payment_status: "waiting",  
  payment_method: "-1",       
  branch: "-1",
  type: "-1",
  creation_date_from: todayTimestamp,
  creation_date_to: tomorrowTimestamp,
  payment_date_from: null,
  payment_date_to: null
};

async function fetchAndSaveData() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json, text/javascript, */*; q=0.01',
        'accept-language': 'ro,en-US;q=0.9,en;q=0.8',
        'content-type': 'application/json',
        'sec-ch-ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"macOS"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        'cookie': 'ajs_anonymous_id=%227fcef937-5d7e-4d07-b210-ee5131780dac%22; id=186; hash=%242y%2410%24qd.MJ.QSdaLnFvvCYbRbjuxvZKq5KkgLUGe1x8vY3qV33NhJWNEmu',
        'Referer': 'https://alfaamo.ru/billservice/payment_register/mteach/',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Procesează datele pentru a fi mai ușor de folosit
    const processedData = {
      timestamp: new Date().toISOString(),
      bills: data.user_bills.map(bill => {
        // Găsește contactul după nume
        const contactEntry = Object.entries(data.contacts).find(([_, contact]) => 
          contact.name === bill.customer
        );
        
        const contactData = contactEntry ? contactEntry[1] : null;
        
        return {
          customer: bill.customer,
          creation_date: bill.creation_date,
          total_price: bill.total_price,
          manager: contactData ? {
            responsible_user_id: contactData.responsible_user_id
          } : {}
        };
      })
    };

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'src', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Save processed data to data.json
    const filePath = path.join(dataDir, 'data.json');
    fs.writeFileSync(filePath, JSON.stringify(processedData, null, 2), 'utf8');
    console.log('Processed data saved successfully to:', filePath);

    // Save complete response for reference
    const billListPath = path.join(dataDir, 'bill_list_info.json');
    fs.writeFileSync(billListPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Raw bill list saved to:', billListPath);

    // Trigger celebration on client by sending a GET request to the server
    // (Asume că cel puțin o factură există; în caz contrar, nu se declanșează celebrarea.)
    if (processedData.bills && processedData.bills.length > 0) {
      const latestBill = processedData.bills[processedData.bills.length - 1];
      // Extrage informații relevante pentru celebratie
      const managerId = latestBill.manager.responsible_user_id;
      const amount = latestBill.total_price;
      // În acest exemplu folosim node-fetch (deja importat) pentru a trimite cererea
      fetch(`http://localhost:3000/triggerCelebration?managerId=${managerId}&amount=${amount}`)
        .then(response => response.text())
        .then(text => console.log("Celebration triggered:", text))
        .catch(err => console.error("Error triggering celebration:", err));
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

// Execute the function
fetchAndSaveData();