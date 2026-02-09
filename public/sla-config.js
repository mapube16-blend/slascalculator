/**
 * Configuración de SLAs
 * Maneja la configuración de tiempos de respuesta y resolución por tipo de caso y prioridad
 */

const SLAConfig = {
    // Configuración por defecto
    DEFAULT_CONFIG: {
        caseTypes: {
            'critical': {
                name: 'Crítico',
                priorities: {
                    'urgent': { name: 'Urgente', firstResponse: 30, resolution: 240 },
                    'high': { name: 'Alta', firstResponse: 60, resolution: 480 },
                    'medium': { name: 'Media', firstResponse: 120, resolution: 960 },
                    'low': { name: 'Baja', firstResponse: 240, resolution: 1440 }
                }
            },
            'high': {
                name: 'Alto',
                priorities: {
                    'urgent': { name: 'Urgente', firstResponse: 60, resolution: 480 },
                    'high': { name: 'Alta', firstResponse: 120, resolution: 960 },
                    'medium': { name: 'Media', firstResponse: 240, resolution: 1440 },
                    'low': { name: 'Baja', firstResponse: 480, resolution: 2880 }
                }
            },
            'medium': {
                name: 'Medio',
                priorities: {
                    'urgent': { name: 'Urgente', firstResponse: 120, resolution: 960 },
                    'high': { name: 'Alta', firstResponse: 240, resolution: 1440 },
                    'medium': { name: 'Media', firstResponse: 480, resolution: 2880 },
                    'low': { name: 'Baja', firstResponse: 960, resolution: 5760 }
                }
            },
            'low': {
                name: 'Bajo',
                priorities: {
                    'urgent': { name: 'Urgente', firstResponse: 240, resolution: 1440 },
                    'high': { name: 'Alta', firstResponse: 480, resolution: 2880 },
                    'medium': { name: 'Media', firstResponse: 960, resolution: 5760 },
                    'low': { name: 'Baja', firstResponse: 1440, resolution: 7200 }
                }
            }
        }
    },

    /**
     * Cargar configuración del localStorage o usar defaults
     */
    loadConfig() {
        const stored = localStorage.getItem('slaConfig');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error('Error al cargar configuración guardada:', e);
            }
        }
        return JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));
    },

    /**
     * Guardar configuración en localStorage
     */
    saveConfig(config) {
        localStorage.setItem('slaConfig', JSON.stringify(config));
    },

    /**
     * Restaurar configuración por defecto
     */
    restoreDefaults() {
        this.saveConfig(JSON.parse(JSON.stringify(this.DEFAULT_CONFIG)));
    },

    /**
     * Obtener SLA para un caso específico
     */
    getSLA(caseType, priority) {
        const config = this.loadConfig();
        if (config.caseTypes[caseType] && config.caseTypes[caseType].priorities[priority]) {
            return config.caseTypes[caseType].priorities[priority];
        }
        return null;
    }
};

/**
 * Interfaz de usuario para la configuración de SLAs
 */
const SLAConfigUI = {
    config: null,

    /**
     * Inicializar la interfaz
     */
    init() {
        this.config = SLAConfig.loadConfig();
        this.render();
        this.attachEventListeners();
    },

    /**
     * Renderizar la interfaz de configuración
     */
    render() {
        const container = document.getElementById('slaConfigContent');
        if (!container) return;

        let html = '<div class="sla-config-grid">';

        // Iterar sobre tipos de casos
        for (const [caseKey, caseData] of Object.entries(this.config.caseTypes)) {
            html += `
                <div class="sla-case-group">
                    <h3>${caseData.name}</h3>
                    <div class="sla-priority-grid">
            `;

            // Iterar sobre prioridades
            for (const [priorityKey, priorityData] of Object.entries(caseData.priorities)) {
                const inputIdFr = `sla_${caseKey}_${priorityKey}_fr`;
                const inputIdRes = `sla_${caseKey}_${priorityKey}_res`;

                html += `
                    <div class="sla-priority-card">
                        <h4>${priorityData.name}</h4>
                        <div class="sla-input-group">
                            <label for="${inputIdFr}">1ª Respuesta (min):</label>
                            <input 
                                type="number" 
                                id="${inputIdFr}" 
                                class="sla-input" 
                                value="${priorityData.firstResponse}" 
                                min="1" 
                                step="1"
                                data-case="${caseKey}"
                                data-priority="${priorityKey}"
                                data-type="firstResponse"
                            >
                        </div>
                        <div class="sla-input-group">
                            <label for="${inputIdRes}">Resolución (min):</label>
                            <input 
                                type="number" 
                                id="${inputIdRes}" 
                                class="sla-input" 
                                value="${priorityData.resolution}" 
                                min="1" 
                                step="1"
                                data-case="${caseKey}"
                                data-priority="${priorityKey}"
                                data-type="resolution"
                            >
                        </div>
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    },

    /**
     * Adjuntar event listeners
     */
    attachEventListeners() {
        // Event listener para cambios en inputs
        document.querySelectorAll('.sla-input').forEach(input => {
            input.addEventListener('change', () => {
                this.updateConfig();
            });
        });

        // Botón guardar
        const btnSave = document.getElementById('btnSaveSLAConfig');
        if (btnSave) {
            btnSave.addEventListener('click', () => this.saveSLAConfig());
        }

        // Botón restaurar
        const btnRestore = document.getElementById('btnRestoreSLAConfig');
        if (btnRestore) {
            btnRestore.addEventListener('click', () => this.restoreDefaults());
        }

        // Cambio de pestaña
        const slaConfigTab = document.querySelector('[data-tab="sla-config"]');
        if (slaConfigTab) {
            slaConfigTab.addEventListener('click', () => {
                this.config = SLAConfig.loadConfig();
                this.render();
                this.attachEventListeners();
            });
        }
    },

    /**
     * Actualizar configuración en memoria desde inputs
     */
    updateConfig() {
        document.querySelectorAll('.sla-input').forEach(input => {
            const caseKey = input.dataset.case;
            const priorityKey = input.dataset.priority;
            const type = input.dataset.type;
            const value = parseInt(input.value);

            if (this.config.caseTypes[caseKey] && this.config.caseTypes[caseKey].priorities[priorityKey]) {
                if (type === 'firstResponse') {
                    this.config.caseTypes[caseKey].priorities[priorityKey].firstResponse = value;
                } else if (type === 'resolution') {
                    this.config.caseTypes[caseKey].priorities[priorityKey].resolution = value;
                }
            }
        });
    },

    /**
     * Guardar configuración
     */
    saveSLAConfig() {
        this.updateConfig();
        SLAConfig.saveConfig(this.config);
        this.showMessage('✓ Configuración guardada exitosamente', 'success');
    },

    /**
     * Restaurar valores por defecto
     */
    restoreDefaults() {
        if (confirm('¿Estás seguro de que deseas restaurar la configuración por defecto?')) {
            SLAConfig.restoreDefaults();
            this.config = SLAConfig.loadConfig();
            this.render();
            this.attachEventListeners();
            this.showMessage('✓ Configuración restaurada a valores por defecto', 'success');
        }
    },

    /**
     * Mostrar mensaje
     */
    showMessage(message, type) {
        const messageEl = document.getElementById('slaConfigMessage');
        const messageText = document.getElementById('slaConfigMessageText');
        
        if (messageEl && messageText) {
            messageText.textContent = message;
            messageEl.className = type === 'success' ? 'success-message' : 'error-message';
            messageEl.style.display = 'block';

            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 3000);
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    SLAConfigUI.init();
});
