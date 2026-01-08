// Efecto de Partículas con Ondas
class WaveEffect {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('Canvas no encontrado:', canvasId);
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.lastMouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        this.gridSpacing = 80;
        this.waveStrength = 25;
        this.damping = 0.92;
        this.time = 0;
        
        console.log('WaveEffect inicializado');
        this.init();
        this.bindEvents();
        this.animate();
    }
    
    init() {
        this.resizeCanvas();
        this.createParticles();
    }
    
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        console.log('Canvas redimensionado:', this.canvas.width, 'x', this.canvas.height);
    }
    
    createParticles() {
        this.particles = [];
        for (let x = 0; x < this.canvas.width; x += this.gridSpacing) {
            for (let y = 0; y < this.canvas.height; y += this.gridSpacing) {
                this.particles.push({
                    baseX: x,
                    baseY: y,
                    x: x,
                    y: y,
                    vx: 0,
                    vy: 0,
                    size: 5,
                    opacity: 0.4,
                    wave: 0
                });
            }
        }
        console.log('Partículas creadas:', this.particles.length);
    }
    
    bindEvents() {
        document.addEventListener('mousemove', (e) => {
            this.lastMouse.x = this.mouse.x;
            this.lastMouse.y = this.mouse.y;
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
            this.createParticles();
        });
    }
    
    updateParticles() {
        const mouseInfluence = 150;
        
        this.particles.forEach((particle, index) => {
            // Distancia del mouse
            const dx = this.mouse.x - particle.baseX;
            const dy = this.mouse.y - particle.baseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Efecto de onda solo basado en proximidad al mouse
            if (distance < mouseInfluence) {
                const influence = 1 - (distance / mouseInfluence);
                const angle = Math.atan2(dy, dx);
                
                particle.wave = influence * this.waveStrength;
                particle.vx += Math.cos(angle) * influence * 3;
                particle.vy += Math.sin(angle) * influence * 3;
            } else {
                particle.wave = 0;
            }
            
            // Actualizar posición con velocidad
            particle.x += particle.vx;
            particle.y += particle.vy;
            
            // Aplicar amortiguamiento fuerte para retorno rápido
            particle.vx *= 0.85;
            particle.vy *= 0.85;
            
            // Retorno suave a la posición base
            const returnForce = 0.08;
            particle.x += (particle.baseX - particle.x) * returnForce;
            particle.y += (particle.baseY - particle.y) * returnForce;
            
            // Opacidad constante cuando está inactivo, aumenta con mouse
            const waveIntensity = Math.abs(particle.wave) / this.waveStrength;
            particle.opacity = 0.35 + waveIntensity * 0.3;
        });
    }
    
    drawParticles() {
        // Limpiar completamente el canvas cada frame
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Dibujar solo líneas muy sutiles para proximidad al mouse
        for (let i = 0; i < this.particles.length; i++) {
            const p1 = this.particles[i];
            // Solo dibujar líneas si el punto está afectado por el mouse
            if (Math.abs(p1.wave) > 0.1) {
                for (let j = i + 1; j < this.particles.length; j++) {
                    const p2 = this.particles[j];
                    if (Math.abs(p2.wave) > 0.1) {
                        const dx = p1.x - p2.x;
                        const dy = p1.y - p2.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < this.gridSpacing * 2.5) {
                            const lineOpacity = (1 - distance / (this.gridSpacing * 2.5)) * 0.12;
                            this.ctx.strokeStyle = `rgba(255, 255, 255, ${lineOpacity})`;
                            this.ctx.lineWidth = 0.8;
                            this.ctx.beginPath();
                            this.ctx.moveTo(p1.x, p1.y);
                            this.ctx.lineTo(p2.x, p2.y);
                            this.ctx.stroke();
                        }
                    }
                }
            }
        }
        
        // Dibujar partículas simples y elegantes
        this.particles.forEach(particle => {
            const particleOpacity = Math.min(Math.max(particle.opacity, 0.25), 0.8);
            
            // Punto simple y elegante sin sombra
            this.ctx.fillStyle = `rgba(255, 255, 255, ${particleOpacity})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    animate() {
        this.updateParticles();
        this.drawParticles();
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize wave effect when DOM is loaded or immediately if already loaded
function inicializarEfectoOndas() {
    const canvas = document.getElementById('waveCanvas');
    if (canvas) {
        new WaveEffect('waveCanvas');
    } else {
        // Si el canvas no existe aún, esperar un poco
        setTimeout(inicializarEfectoOndas, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializarEfectoOndas);
} else {
    // DOM ya está cargado
    inicializarEfectoOndas();
}
