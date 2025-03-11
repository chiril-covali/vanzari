class AudioManager {
    constructor() {
        // Create audio element with explicit path
        this.audio = new Audio('/sounds/cashier.mp3');
        this.initialized = false;
        this.setupAudio();
    }

    setupAudio() {
        // Pre-load the audio
        this.audio.load();
        
        // Setup initialization on any user interaction
        ['click', 'touchstart', 'keydown'].forEach(eventType => {
            document.addEventListener(eventType, () => this.initializeAudio(), { once: true });
        });
    }

    async initializeAudio() {
        if (!this.initialized) {
            try {
                // Try to play silently to unlock audio
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
            // Create a new audio instance for each play
            const soundInstance = new Audio(this.audio.src);
            soundInstance.volume = 0.5; // Set volume to 50%
            await soundInstance.play();
        } catch (error) {
            console.error('Failed to play sound:', error);
        }
    }
}

class CelebrationManager {
    constructor() {
        this.congratsMessages = [
            "🎉 Felicitări ${manager}! Ai adăugat ${amount}!",
            "🏆 Bravo ${manager}! Ai adăugat un ordin nou - ${amount}!",
            "⭐️ Fantastic ${manager}! Un ordin nou de ${amount}!",
            "🌟 Super ${manager}! Încă ${amount} adăugați!",
            "💫 Excelent ${manager}! ${amount} - ordin nou!",
            "🎊 Uraaaa! ${manager} a introdus un ordin de ${amount}!",
            "👏 Felicitări ${manager} pentru ordinul de ${amount}!",
            "🔥 Incredibil! ${manager} a adăugat ${amount}!",
            "🙌 Super tare! ${manager} are un ordin de ${amount}!",
            "🌈 Minunat! ${manager} a adăugat ${amount}!",
            "🚀 Avans rapid! ${manager} a introdus un ordin de ${amount}!",
            "💥 Wow! ${manager} face valuri cu un ordin de ${amount}!",
            "🎇 Sclipitor! ${manager} a adăugat ${amount}!",
            "🔔 Anunț de succes! ${manager} a introdus ${amount}!",
            "🥳 Celebrație! ${manager} a adăugat ${amount}!"
        ];
        this.audioManager = new AudioManager();
        // Set your GIPHY API key here
        this.giphyApiKey = 'SskbOAMVhkcmPnhYMHRsFfkrL58cyQK6';
    }

    async fetchCelebrationGif() {
        try {
            const tag = 'congratulations';
            const response = await fetch(`https://api.giphy.com/v1/gifs/random?api_key=${this.giphyApiKey}&tag=${tag}&rating=g`);
            const data = await response.json();
            if (data.data && data.data.images && data.data.images.fixed_height && data.data.images.fixed_height.url) {
                return data.data.images.fixed_height.url;
            }
        } catch (error) {
            console.error('Error fetching GIF:', error);
        }
        return null;
    }

    async showCelebration(manager, amount) {
        let celebrationContainer = document.getElementById('celebrationContainer');
        if (!celebrationContainer) {
            celebrationContainer = document.createElement('div');
            celebrationContainer.id = 'celebrationContainer';
            celebrationContainer.className = 'celebration-notification';
            document.body.appendChild(celebrationContainer);
        }

        const message = this.getRandomMessage(manager, amount);
        // Fetch a random celebration GIF from GIPHY
        const gifUrl = await this.fetchCelebrationGif();

        // Compose the inner HTML: message and gif image (if available)
        celebrationContainer.innerHTML = `
            <div class="celebration-message">${message}</div>
            ${gifUrl ? `<img src="${gifUrl}" alt="Felicitări" class="celebration-gif">` : ''}
        `;
        celebrationContainer.classList.add('show');

        // Always try to play sound
        this.audioManager.playSound();

        // Add click handler to container to enable audio if not initialized
        celebrationContainer.style.cursor = 'pointer';
        celebrationContainer.onclick = () => {
            if (!this.audioManager.initialized) {
                this.audioManager.initialized = true;
                this.audioManager.playSound();
            }
        };

        setTimeout(() => {
            celebrationContainer.classList.remove('show');
        }, 6000);
    }

    getRandomMessage(manager, amount) {
        const formattedAmount = new Intl.NumberFormat('ro-MD', {
            style: 'currency',
            currency: 'MDL'
        }).format(amount).replace(/\s+MDL$/, ' MDL');

        const message = this.congratsMessages[Math.floor(Math.random() * this.congratsMessages.length)];
        return message
            .replace('${manager}', manager)
            .replace('${amount}', formattedAmount);
    }
}