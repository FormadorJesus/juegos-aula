/**
 * Gladiadores/data/equipo.js
 * Diccionarios de armas, cascos, armaduras y paletas de color 16-bit
 * para el motor Pixel Art del Coliseo Matemático.
 */
(function (root) {
    'use strict';

    const SPRITE_W = 56;
    const SPRITE_H = 64;

    const WEAPON_STATS = {
        sword: { label: 'Gladius', minDmg: 22, maxDmg: 26, icon: '⚔️' },
        mace:  { label: 'Maza Púas', minDmg: 26, maxDmg: 30, icon: '🔨' },
        spear: { label: 'Lanza Hasta', minDmg: 23, maxDmg: 27, icon: '🔱' }
    };

    const HELMET_LABELS = {
        none: 'Cinta',
        murmillo: 'Murmillo',
        thraex: 'Tracio',
        centurion: 'Centurión'
    };

    const ARMOR_LABELS = {
        bare: 'Torso Desnudo',
        hamata: 'Lorica Hamata',
        bronze: 'Coraza Bronce',
        segmentata: 'Lorica Segmentata'
    };

    // Paletas de 4 tonos por material (estética arcade 16-bit / GBA)
    // Todos los colores sólidos en formato #rrggbb para compatibilidad directa con GIF89a
    const PAL = {
        OUT:   '#140c08', // Contorno oscuro cálido

        // Piel atlética
        SK0:   '#ffe4c4', // Luz especular
        SK1:   '#f2b680', // Tono base
        SK2:   '#c9814b', // Sombra media
        SK3:   '#8f4f24', // Sombra profunda

        // Bronce / Oro romano
        BR0:   '#fffbeb', // Brillo especular
        BR1:   '#f5b727', // Dorado brillante
        BR2:   '#b86f14', // Bronce medio
        BR3:   '#6b3808', // Bronce oscuro

        // Acero / Hierro templado
        ST0:   '#ffffff', // Filo / brillo máximo
        ST1:   '#d8e2ee', // Acero claro
        ST2:   '#78869b', // Acero medio
        ST3:   '#3b4657', // Acero oscuro

        // Cuero / Madera
        LT0:   '#b57238', // Cuero claro
        LT1:   '#784218', // Cuero medio
        LT2:   '#42200a', // Cuero oscuro

        // Cabello oscuro heroico
        HR0:   '#593e2b',
        HR1:   '#291a11',
        HR2:   '#120a06',

        // Ojos / Blancos
        WHT:   '#ffffff',
        EYE:   '#1a110d',

        // Efectos de aura, impacto, estelas y laurel
        AU0:   '#ffffff',
        AU1:   '#fef08a',
        AU2:   '#f59e0b',
        AU3:   '#ea580c',
        AU4:   '#b91c1c',

        // Brillo frío de acero / gotas de sudor
        SW0:   '#e0f2fe',
        SW1:   '#38bdf8',

        // Polvo de arena de combate
        DUST0: '#f7e4bc',
        DUST1: '#d9ae77',
        DUST2: '#a8743e',

        // Laurel romano (victoria)
        LR0:   '#fef08a',
        LR1:   '#4ade80',
        LR2:   '#15803d',

        // Fuego de antorchas / braseros del Coliseo
        FL0:   '#ffffff',
        FL1:   '#fef08a',
        FL2:   '#fb923c',
        FL3:   '#dc2626',
        FL4:   '#7f1d1d',

        // Sombra en suelo (semitransparente; se omite al exportar GIF transparente)
        SHD:   'rgba(22, 12, 4, 0.42)'
    };

    function getTeamPalette(playerNum) {
        if (playerNum === 1) {
            return {
                TM0: '#ff8a8a', // Luz carmesí
                TM1: '#dc2626', // Rojo romano
                TM2: '#991b1b', // Carmesí medio
                TM3: '#520d0d'  // Carmesí profundo
            };
        }
        return {
            TM0: '#7dd3fc', // Luz cobalto
            TM1: '#2563eb', // Azul imperial
            TM2: '#1d4ed8', // Cobalto medio
            TM3: '#172554'  // Cobalto profundo
        };
    }

    root.GladiatorData = {
        SPRITE_W,
        SPRITE_H,
        WEAPON_STATS,
        HELMET_LABELS,
        ARMOR_LABELS,
        PAL,
        getTeamPalette
    };
})(typeof window !== 'undefined' ? window : globalThis);
