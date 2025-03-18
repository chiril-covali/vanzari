class AudioManager {
    constructor() {
      this.audio = new Audio('audio/celebration-sound.mp3');
      this.initialized = false;
    }
  
    async initializeAudio() {
      if (!this.initialized) {
        try {
          // Play silent to unlock audio on user interaction
          this.audio.volume = 0;
          await this.audio.play();
          this.audio.pause();
          this.audio.volume = 1;
          this.audio.currentTime = 0;
          this.initialized = true;
        } catch (error) {
          console.error('Failed to initialize audio:', error);
        }
      }
    }
  
    async playSound() {
      if (!this.initialized) {
        await this.initializeAudio();
      }
      try {
        this.audio.currentTime = 0;
        await this.audio.play();
      } catch (error) {
        console.error('Error playing sound:', error);
      }
    }
  }
  
  class CelebrationManager {
    constructor() {
      this.audioManager = new AudioManager();
      // Stochează valorile totale per manager din fetch-ul anterior
      // Cheia va fi numele managerului, iar valoarea totalul anterior
      this.previousTotals = {};
    }
  
    async showCelebration(manager, amount, totalToday) {
      // Calculează diferența față de ultima valoare stocată (dacă există)
      const previousTotal = this.previousTotals[manager] || 0;
      const diff = totalToday - previousTotal;
      let diffText = '';
      if (diff > 0) {
        diffText = `+${new Intl.NumberFormat('ro-RO', {
          style: 'currency',
          currency: 'MDL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(diff)}`;
      } else if (diff < 0) {
        diffText = `${new Intl.NumberFormat('ro-RO', {
          style: 'currency',
          currency: 'MDL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(diff)}`;
      } else {
        diffText = 'Fără modificări';
      }
  
      // Actualizează stocarea pentru managerul respectiv
      this.previousTotals[manager] = totalToday;
      
      // Creează sau obține elementul de sărbătoare din DOM
      let celebrationBox = document.getElementById('celebrationBox');
      if (!celebrationBox) {
        celebrationBox = document.createElement('div');
        celebrationBox.id = 'celebrationBox';
        celebrationBox.style.position = 'fixed';
        celebrationBox.style.top = '50%';
        celebrationBox.style.left = '50%';
        celebrationBox.style.transform = 'translate(-50%, -50%)';
        celebrationBox.style.backgroundColor = 'rgba(255,255,255,0.9)';
        celebrationBox.style.padding = '30px';
        celebrationBox.style.boxShadow = '0 0 15px rgba(0,0,0,0.3)';
        celebrationBox.style.borderRadius = '10px';
        celebrationBox.style.textAlign = 'center';
        celebrationBox.style.zIndex = 1000;
        document.body.appendChild(celebrationBox);
      }
      
      // Actualizează conținutul box-ului
      celebrationBox.innerHTML = `
        <h2 style="margin-bottom: 10px; color: #1A237E;">Felicitări!</h2>
        <p style="margin: 5px 0;">Ordin nou de la <strong>${manager}</strong></p>
        <p style="margin: 5px 0;">În valoare de: <strong>${amount} MDL</strong></p>
        <p style="margin: 5px 0;">Total azi: <strong>${totalToday} MDL</strong></p>
        <p style="margin: 5px 0;">Diferență față de ultima fetch: <strong>${diffText}</strong></p>
      `;
      celebrationBox.style.display = 'block';
  
      // Redă sunetul
      await this.audioManager.playSound();
  
      // Adaugă o animație de sărbătoare
      celebrationBox.animate([
        { transform: 'scale(0.5)', opacity: 0 },
        { transform: 'scale(1)', opacity: 1 }
      ], { duration: 500, easing: 'ease-out' });
      
      // Ascunde box-ul după 3 secunde
      setTimeout(() => {
        celebrationBox.style.display = 'none';
      }, 3000);
    }
  }
  
  window.CelebrationManager = CelebrationManager;
  
  // Codul de socket trebuie să fie plasat pe client, după ce socket.io este încărcat
  const socket = io();
  socket.on('newDataFetched', data => {
    const { managerId, amount } = data;
    // Poți folosi mapping-ul pentru a obține și numele managerului dacă este necesar
    const celebration = new CelebrationManager();
    // Inlocuiește '---' cu totalul zilei dacă ai aceste date disponibile
    celebration.showCelebration(managerId, amount, '---');
  });