// Comprehensive Lineage 2 Locations Registry
// Based on Interlude/Classic locations

export interface Location {
    id: string;
    name: string;
    territory: string;
    type: 'town' | 'village' | 'castle' | 'fortress' | 'dungeon' | 'hunting_zone' | 'special';
    level?: string;
    coords?: { x: number; y: number };
}

export const LOCATIONS: Location[] = [
    // ============ TALKING ISLAND ============
    { id: 'talking-island-village', name: 'Talking Island Village', territory: 'Talking Island', type: 'village', coords: { x: -84108, y: 244604 } },
    { id: 'talking-island', name: 'Talking Island', territory: 'Talking Island', type: 'hunting_zone', level: '1-20' },
    { id: 'elven-ruins', name: 'Elven Ruins', territory: 'Talking Island', type: 'dungeon', level: '12-18', coords: { x: -44672, y: 246188 } },
    { id: 'obelisk-of-victory', name: 'Obelisk of Victory', territory: 'Talking Island', type: 'hunting_zone', level: '8-15', coords: { x: -88672, y: 246188 } },

    // ============ GLUDIO TERRITORY ============
    { id: 'town-of-gludio', name: 'Town of Gludio', territory: 'Gludio', type: 'town', coords: { x: -12736, y: 122816 } },
    { id: 'gludio-castle', name: 'Gludio Castle', territory: 'Gludio', type: 'castle', coords: { x: -18212, y: 108827 } },
    { id: 'gludin-village', name: 'Gludin Village', territory: 'Gludio', type: 'village', coords: { x: -80752, y: 149776 } },
    { id: 'gludin-harbor', name: 'Gludin Harbor', territory: 'Gludio', type: 'special', coords: { x: -90812, y: 153303 } },
    { id: 'windmill-hill', name: 'Windmill Hill', territory: 'Gludio', type: 'hunting_zone', level: '15-22', coords: { x: -24112, y: 93648 } },
    { id: 'abandoned-camp', name: 'Abandoned Camp', territory: 'Gludio', type: 'hunting_zone', level: '18-25', coords: { x: -38352, y: 100768 } },
    { id: 'ruins-of-agony', name: 'Ruins of Agony', territory: 'Gludio', type: 'dungeon', level: '20-30', coords: { x: -22912, y: 110912 } },
    { id: 'ruins-of-despair', name: 'Ruins of Despair', territory: 'Gludio', type: 'dungeon', level: '22-32', coords: { x: -43296, y: 118432 } },
    { id: 'ant-nest', name: 'Ant Nest', territory: 'Gludio', type: 'dungeon', level: '28-38', coords: { x: -22912, y: 179200 } },
    { id: 'wasteland', name: 'Wasteland', territory: 'Gludio', type: 'hunting_zone', level: '25-35', coords: { x: -37520, y: 166768 } },
    { id: 'execution-grounds', name: 'Execution Grounds', territory: 'Gludio', type: 'hunting_zone', level: '32-42', coords: { x: 53232, y: 144576 } },

    // ============ DARK ELF TERRITORY ============
    { id: 'dark-elf-village', name: 'Dark Elf Village', territory: 'Dark Elf Territory', type: 'village', coords: { x: 10775, y: 14190 } },
    { id: 'spider-nest', name: 'Spider Nest', territory: 'Dark Elf Territory', type: 'dungeon', level: '15-25' },
    { id: 'school-of-dark-arts', name: 'School of Dark Arts', territory: 'Dark Elf Territory', type: 'special' },
    { id: 'swampland', name: 'Swampland', territory: 'Dark Elf Territory', type: 'hunting_zone', level: '20-30' },

    // ============ ELVEN FOREST ============
    { id: 'elven-village', name: 'Elven Village', territory: 'Elven Forest', type: 'village', coords: { x: 44692, y: 52261 } },
    { id: 'elven-forest', name: 'Elven Forest', territory: 'Elven Forest', type: 'hunting_zone', level: '1-15' },
    { id: 'elven-fortress', name: 'Elven Fortress', territory: 'Elven Forest', type: 'fortress' },
    { id: 'neutral-zone', name: 'Neutral Zone', territory: 'Elven Forest', type: 'hunting_zone', level: '18-28' },
    { id: 'iris-lake', name: 'Iris Lake', territory: 'Elven Forest', type: 'hunting_zone', level: '15-25' },
    { id: 'shadow-of-mother-tree', name: 'Shadow of the Mother Tree', territory: 'Elven Forest', type: 'hunting_zone', level: '55-65' },

    // ============ DION TERRITORY ============
    { id: 'town-of-dion', name: 'Town of Dion', territory: 'Dion', type: 'town', coords: { x: 15631, y: 142885 } },
    { id: 'dion-castle', name: 'Dion Castle', territory: 'Dion', type: 'castle', coords: { x: 22172, y: 160923 } },
    { id: 'floran-village', name: 'Floran Village', territory: 'Dion', type: 'village', coords: { x: 18016, y: 169968 } },
    { id: 'cruma-tower', name: 'Cruma Tower', territory: 'Dion', type: 'dungeon', level: '40-52', coords: { x: 17206, y: 113968 } },
    { id: 'cruma-marshlands', name: 'Cruma Marshlands', territory: 'Dion', type: 'hunting_zone', level: '35-45', coords: { x: 10000, y: 120000 } },
    { id: 'plains-of-dion', name: 'Plains of Dion', territory: 'Dion', type: 'hunting_zone', level: '30-40', coords: { x: 37376, y: 150016 } },
    { id: 'bee-hive', name: 'Bee Hive', territory: 'Dion', type: 'dungeon', level: '35-45', coords: { x: 32672, y: 164096 } },
    { id: 'tanor-canyon', name: 'Tanor Canyon', territory: 'Dion', type: 'hunting_zone', level: '38-48', coords: { x: -10896, y: 143872 } },
    { id: 'partisan-hideaway', name: 'Partisan Hideaway', territory: 'Dion', type: 'special', coords: { x: 57440, y: 101968 } },
    { id: 'shrine-of-loyalty', name: 'Shrine of Loyalty', territory: 'Dion', type: 'dungeon', level: '32-42' },
    { id: 'outlaw-forest', name: 'Outlaw Forest', territory: 'Dion', type: 'hunting_zone', level: '28-38', coords: { x: 116304, y: 157200 } },
    { id: 'hive-fortress', name: 'Hive Fortress', territory: 'Dion', type: 'fortress', coords: { x: 26000, y: 165000 } },
    { id: 'valley-fortress', name: 'Valley Fortress', territory: 'Dion', type: 'fortress' },
    { id: 'floran-fortress', name: 'Floran Fortress', territory: 'Dion', type: 'fortress', coords: { x: 18500, y: 168000 } },
    { id: 'tanor-fortress', name: 'Tanor Fortress', territory: 'Dion', type: 'fortress' },

    // ============ GIRAN TERRITORY ============
    { id: 'town-of-giran', name: 'Town of Giran', territory: 'Giran', type: 'town', coords: { x: 83396, y: 147904 } },
    { id: 'giran-castle', name: 'Giran Castle', territory: 'Giran', type: 'castle', coords: { x: 117095, y: 144997 } },
    { id: 'giran-harbor', name: 'Giran Harbor', territory: 'Giran', type: 'special', coords: { x: 48512, y: 186712 } },
    { id: 'dragon-valley', name: 'Dragon Valley', territory: 'Giran', type: 'hunting_zone', level: '65-80', coords: { x: 110608, y: 114544 } },
    { id: 'antharas-lair', name: "Antharas' Lair", territory: 'Giran', type: 'dungeon', level: '75+', coords: { x: 130544, y: 114560 } },
    { id: 'hardin-academy', name: "Hardin's Academy", territory: 'Giran', type: 'dungeon', level: '52-60', coords: { x: 104672, y: 107248 } },
    { id: 'breka-stronghold', name: "Breka's Stronghold", territory: 'Giran', type: 'hunting_zone', level: '45-55', coords: { x: 116304, y: 107248 } },
    { id: 'gorgon-flower-garden', name: 'Gorgon Flower Garden', territory: 'Giran', type: 'hunting_zone', level: '42-52', coords: { x: 104672, y: 114864 } },
    { id: 'devils-isle', name: "Devil's Isle", territory: 'Giran', type: 'dungeon', level: '55-65', coords: { x: 44096, y: 213968 } },
    { id: 'forgotten-temple', name: 'Forgotten Temple', territory: 'Giran', type: 'dungeon', level: '35-45', coords: { x: -5000, y: 190000 } },
    { id: 'bayou-fortress', name: 'Bayou Fortress', territory: 'Giran', type: 'fortress' },
    { id: 'white-sands-fortress', name: 'White Sands Fortress', territory: 'Giran', type: 'fortress' },
    { id: 'dragonspine-fortress', name: 'Dragonspine Fortress', territory: 'Giran', type: 'fortress' },
    { id: 'antharas-fortress', name: 'Antharas Fortress', territory: 'Giran', type: 'fortress' },

    // ============ ORC TERRITORY ============
    { id: 'orc-village', name: 'Orc Village', territory: 'Orc Territory', type: 'village', coords: { x: -45264, y: -112512 } },
    { id: 'paagrio-temple', name: "Pa'agrio Temple", territory: 'Orc Territory', type: 'special', coords: { x: -56631, y: -113602 } },
    { id: 'cave-of-trials', name: 'Cave of Trials', territory: 'Orc Territory', type: 'dungeon', level: '15-25', coords: { x: 9954, y: -112487 } },
    { id: 'frozen-waterfall', name: 'Frozen Waterfall', territory: 'Orc Territory', type: 'hunting_zone', level: '18-28', coords: { x: 9621, y: -139945 } },
    { id: 'immortal-plateau', name: 'Immortal Plateau', territory: 'Orc Territory', type: 'hunting_zone', level: '1-18' },
    { id: 'valley-of-lords', name: 'Valley of the Lords', territory: 'Orc Territory', type: 'hunting_zone', level: '70-80', coords: { x: 23006, y: -126115 } },
    { id: 'crypts-of-disgrace', name: 'Crypts of Disgrace', territory: 'Orc Territory', type: 'hunting_zone', level: '80-82', coords: { x: 47692, y: -115745 } },
    { id: 'graverobber-hideout', name: 'Graverobber Hideout', territory: 'Orc Territory', type: 'hunting_zone', level: '78-80', coords: { x: 48336, y: -107734 } },
    { id: 'windtail-waterfall', name: 'Windtail Waterfall', territory: 'Orc Territory', type: 'hunting_zone', level: '80-82', coords: { x: 40825, y: -90317 } },
    { id: 'valley-of-heroes', name: 'Valley of Heroes', territory: 'Orc Territory', type: 'special' },

    // ============ DWARVEN TERRITORY ============
    { id: 'dwarven-village', name: 'Dwarven Village', territory: 'Dwarven Territory', type: 'village', coords: { x: 115072, y: -178176 } },
    { id: 'coal-mines', name: 'Coal Mines', territory: 'Dwarven Territory', type: 'dungeon', level: '15-25' },
    { id: 'mithril-mines', name: 'Mithril Mines', territory: 'Dwarven Territory', type: 'dungeon', level: '25-35' },

    // ============ OREN TERRITORY ============
    { id: 'town-of-oren', name: 'Town of Oren', territory: 'Oren', type: 'town', coords: { x: 82992, y: 53171 } },
    { id: 'oren-castle', name: 'Oren Castle', territory: 'Oren', type: 'castle', coords: { x: 83171, y: 37092 } },
    { id: 'ivory-tower', name: 'Ivory Tower', territory: 'Oren', type: 'special', coords: { x: 85336, y: 16194 } },
    { id: 'ivory-tower-crater', name: 'Ivory Tower Crater', territory: 'Oren', type: 'hunting_zone', level: '45-55', coords: { x: 85344, y: 16160 } },
    { id: 'sea-of-spores', name: 'Sea of Spores', territory: 'Oren', type: 'hunting_zone', level: '40-50', coords: { x: 56960, y: 29632 } },
    { id: 'forest-of-mirrors', name: 'Forest of Mirrors', territory: 'Oren', type: 'hunting_zone', level: '48-58', coords: { x: 154624, y: 60816 } },
    { id: 'ancient-battleground', name: 'Ancient Battleground', territory: 'Oren', type: 'hunting_zone', level: '50-60', coords: { x: 142000, y: 40000 } },
    { id: 'tower-of-insolence', name: 'Tower of Insolence', territory: 'Oren', type: 'dungeon', level: '60-80', coords: { x: 114672, y: 16188 } },
    { id: 'plains-of-glory', name: 'Plains of Glory', territory: 'Oren', type: 'hunting_zone', level: '55-65', coords: { x: 140000, y: 25000 } },
    { id: 'war-torn-plains', name: 'War-Torn Plains', territory: 'Oren', type: 'hunting_zone', level: '52-62', coords: { x: 140608, y: 12224 } },
    { id: 'narsell-lake', name: 'Narsell Lake', territory: 'Oren', type: 'hunting_zone', level: '42-52', coords: { x: 104448, y: 46928 } },
    { id: 'death-pass', name: 'Death Pass', territory: 'Oren', type: 'hunting_zone', level: '52-62', coords: { x: 83072, y: 95344 } },
    { id: 'ivory-fortress', name: 'Ivory Fortress', territory: 'Oren', type: 'fortress', coords: { x: 82000, y: 12000 } },
    { id: 'narsell-fortress', name: 'Narsell Fortress', territory: 'Oren', type: 'fortress' },
    { id: 'lair-of-baium', name: 'Lair of Baium', territory: 'Oren', type: 'dungeon', level: '75+', coords: { x: 115664, y: 16640 } },
    { id: 'lair-of-orfen', name: 'Lair of Orfen', territory: 'Oren', type: 'dungeon', level: '70+', coords: { x: 56960, y: 29632 } },

    // ============ ADEN TERRITORY ============
    { id: 'town-of-aden', name: 'Town of Aden', territory: 'Aden', type: 'town', coords: { x: 146737, y: 25807 } },
    { id: 'aden-castle', name: 'Aden Castle', territory: 'Aden', type: 'castle', coords: { x: 147412, y: 3355 } },
    { id: 'coliseum', name: 'Coliseum', territory: 'Aden', type: 'special', coords: { x: 149448, y: 46760 } },
    { id: 'tower-of-insolence', name: 'Tower of Insolence', territory: 'Oren', type: 'dungeon', level: '60-80', coords: { x: 114672, y: 16188 } },
    { id: 'hunters-village', name: "Hunter's Village", territory: 'Aden', type: 'village', coords: { x: 117129, y: 76917 } },
    { id: 'enchanted-valley', name: 'Enchanted Valley', territory: 'Aden', type: 'hunting_zone', level: '55-65', coords: { x: 110608, y: 53248 } },
    { id: 'forest-of-the-dead', name: 'Forest of the Dead', territory: 'Aden', type: 'hunting_zone', level: '58-68', coords: { x: 53232, y: -61584 } },
    { id: 'valley-of-saints', name: 'Valley of Saints', territory: 'Aden', type: 'hunting_zone', level: '60-70', coords: { x: 87024, y: -86128 } },
    { id: 'blazing-swamp', name: 'Blazing Swamp', territory: 'Aden', type: 'hunting_zone', level: '55-65', coords: { x: 153072, y: -18944 } },
    { id: 'fields-of-massacre', name: 'Fields of Massacre', territory: 'Aden', type: 'hunting_zone', level: '58-68', coords: { x: 110608, y: -18944 } },
    { id: 'cemetery', name: 'Cemetery', territory: 'Aden', type: 'hunting_zone', level: '50-60', coords: { x: 173040, y: 24048 } },
    { id: 'devasted-castle', name: 'Devasted Castle', territory: 'Aden', type: 'hunting_zone', level: '52-62', coords: { x: 173040, y: -13808 } },
    { id: 'catacomb-of-dark-omens', name: 'Catacomb of Dark Omens', territory: 'Aden', type: 'dungeon', level: '55-65' },
    { id: 'catacomb-of-forbidden-path', name: 'Catacomb of the Forbidden Path', territory: 'Aden', type: 'dungeon', level: '58-68', coords: { x: 112000, y: 84000 } },
    { id: 'catacomb-of-apostate', name: 'Catacomb of the Apostate', territory: 'Aden', type: 'dungeon', level: '52-62', coords: { x: 74561, y: 78656 } },
    { id: 'necropolis-of-discrimination', name: 'Necropolis of Discrimination', territory: 'Aden', type: 'dungeon', level: '50-60' },
    { id: 'necropolis-of-worship', name: 'Necropolis of Worship', territory: 'Aden', type: 'dungeon', level: '55-65' },
    { id: 'borderland-fortress', name: 'Borderland Fortress', territory: 'Aden', type: 'fortress' },
    { id: 'swamp-fortress', name: 'Swamp Fortress', territory: 'Aden', type: 'fortress' },
    { id: 'hunters-fortress', name: "Hunter's Fortress", territory: 'Aden', type: 'fortress' },

    // ============ INNADRIL (HEINE) ============
    { id: 'heine', name: 'Heine', territory: 'Innadril', type: 'town', coords: { x: 111386, y: 219413 } },
    { id: 'innadril-castle', name: 'Innadril Castle', territory: 'Innadril', type: 'castle', coords: { x: 116123, y: 249702 } },
    { id: 'alligator-island', name: 'Alligator Island', territory: 'Innadril', type: 'hunting_zone', level: '45-55', coords: { x: 121856, y: 187680 } },
    { id: 'garden-of-eva', name: 'Garden of Eva', territory: 'Innadril', type: 'dungeon', level: '60-75', coords: { x: 106960, y: 237000 } },
    { id: 'field-of-silence', name: 'Field of Silence', territory: 'Innadril', type: 'hunting_zone', level: '52-62', coords: { x: 150000, y: 190000 } },
    { id: 'field-of-whispers', name: 'Field of Whispers', territory: 'Innadril', type: 'hunting_zone', level: '55-65', coords: { x: 155000, y: 200000 } },
    { id: 'archaic-fortress', name: 'Archaic Fortress', territory: 'Innadril', type: 'fortress' },
    { id: 'aaru-fortress', name: 'Aaru Fortress', territory: 'Innadril', type: 'fortress' },

    // ============ GODDARD TERRITORY ============
    { id: 'town-of-goddard', name: 'Town of Goddard', territory: 'Goddard', type: 'town', coords: { x: 147966, y: -55228 } },
    { id: 'goddard-castle', name: 'Goddard Castle', territory: 'Goddard', type: 'castle', coords: { x: 147408, y: -49296 } },
    { id: 'hot-springs', name: 'Hot Springs', territory: 'Goddard', type: 'hunting_zone', level: '70-78', coords: { x: 158304, y: -107248 } },
    { id: 'wall-of-argos', name: 'Wall of Argos', territory: 'Goddard', type: 'hunting_zone', level: '72-80', coords: { x: 173040, y: -42992 } },
    { id: 'varka-silenos-outpost', name: 'Varka Silenos Outpost', territory: 'Goddard', type: 'hunting_zone', level: '74-82', coords: { x: 115712, y: -67664 } },
    { id: 'ketra-orc-outpost', name: 'Ketra Orc Outpost', territory: 'Goddard', type: 'hunting_zone', level: '74-82', coords: { x: 145904, y: -67664 } },
    { id: 'forge-of-the-gods', name: 'Forge of the Gods', territory: 'Goddard', type: 'dungeon', level: '76-85', coords: { x: 167344, y: -101456 } },
    { id: 'monastery-of-silence', name: 'Monastery of Silence', territory: 'Goddard', type: 'dungeon', level: '75-82', coords: { x: 110608, y: -80880 } },
    { id: 'shrine-of-the-saints', name: 'Shrine of the Saints', territory: 'Goddard', type: 'special', coords: { x: 149000, y: -56000 } },
    { id: 'lair-of-valakas', name: 'Lair of Valakas', territory: 'Goddard', type: 'dungeon', level: '85+', coords: { x: 183600, y: -115000 } },

    // ============ RUNE TERRITORY ============
    { id: 'rune-township', name: 'Rune Township', territory: 'Rune', type: 'town', coords: { x: 38384, y: -48064 } },
    { id: 'rune-castle', name: 'Rune Castle', territory: 'Rune', type: 'castle', coords: { x: 10105, y: -49064 } },
    { id: 'den-of-evil', name: 'Den of Evil', territory: 'Rune', type: 'dungeon', level: '75-82', coords: { x: 76860, y: -125169 } },
    { id: 'beast-farm', name: 'Beast Farm', territory: 'Rune', type: 'special', coords: { x: 57440, y: -86128 } },
    { id: 'wild-beast-reserve', name: 'Wild Beast Reserve', territory: 'Rune', type: 'hunting_zone', level: '70-78', coords: { x: 57440, y: -86128 } },
    { id: 'cursed-village', name: 'Cursed Village', territory: 'Rune', type: 'hunting_zone', level: '72-80', coords: { x: 57000, y: -42000 } },
    { id: 'pavel-ruins', name: 'Pavel Ruins', territory: 'Rune', type: 'hunting_zone', level: '74-82', coords: { x: 88275, y: -125690 } },
    { id: 'ice-merchant-cabin', name: 'Ice Merchant Cabin', territory: 'Rune', type: 'special', coords: { x: 113487, y: -109888 } },
    { id: 'silent-valley', name: 'Silent Valley', territory: 'Rune', type: 'hunting_zone', level: '75-82', coords: { x: 80000, y: -135000 } },
    { id: 'giants-cave', name: "Giant's Cave", territory: 'Rune', type: 'dungeon', level: '72-80', coords: { x: 96000, y: -130000 } },
    { id: 'cloud-mountain-fortress', name: 'Cloud Mountain Fortress', territory: 'Rune', type: 'fortress' },
    { id: 'demon-fortress', name: 'Demon Fortress', territory: 'Rune', type: 'fortress' },
    { id: 'monastic-fortress', name: 'Monastic Fortress', territory: 'Rune', type: 'fortress' },

    // ============ SCHUTTGART TERRITORY ============
    { id: 'town-of-schuttgart', name: 'Town of Schuttgart', territory: 'Schuttgart', type: 'town', coords: { x: 87048, y: -143448 } },
    { id: 'schuttgart-castle', name: 'Schuttgart Castle', territory: 'Schuttgart', type: 'castle', coords: { x: 77493, y: -153350 } },
    { id: 'imperial-tomb', name: 'Imperial Tomb', territory: 'Schuttgart', type: 'dungeon', level: '78-85', coords: { x: 180000, y: -80000 } },
    { id: 'pagan-temple', name: 'Pagan Temple', territory: 'Schuttgart', type: 'dungeon', level: '80-85', coords: { x: -20230, y: -250788 } },
    { id: 'shilen-temple', name: 'Shilen Temple', territory: 'Schuttgart', type: 'dungeon', level: '75-82' },
    { id: 'strip-mine', name: 'Strip Mine', territory: 'Schuttgart', type: 'hunting_zone', level: '72-80', coords: { x: 100000, y: -165000 } },
    { id: 'plunderous-plains', name: 'Plunderous Plains', territory: 'Schuttgart', type: 'hunting_zone', level: '70-78', coords: { x: 113900, y: -154175 } },
    { id: 'sel-mahum-base', name: 'Sel Mahum Base', territory: 'Schuttgart', type: 'hunting_zone', level: '68-76' },
    { id: 'western-fortress', name: 'Western Fortress', territory: 'Schuttgart', type: 'fortress' },

    // ============ SPECIAL AREAS ============
    { id: 'primeval-isle', name: 'Primeval Isle', territory: 'Primeval Isle', type: 'hunting_zone', level: '78-85' },
    { id: 'hellbound', name: 'Hellbound', territory: 'Hellbound', type: 'special', level: '80+' },
    { id: 'isle-of-prayer', name: 'Isle of Prayer', territory: 'Special', type: 'dungeon', level: '78-85' },
    { id: 'stakato-nest', name: 'Stakato Nest', territory: 'Special', type: 'dungeon', level: '74-82', coords: { x: 179815, y: -115465 } },
    { id: 'fantasy-isle', name: 'Fantasy Isle', territory: 'Special', type: 'special' },
    { id: 'dimensional-rift', name: 'Dimensional Rift', territory: 'Special', type: 'dungeon', level: '65-80', coords: { x: -111971, y: -182437 } },
    { id: 'seven-signs-dungeon', name: 'Seven Signs Dungeon', territory: 'Special', type: 'dungeon', level: '60-80' },
    { id: 'lair-of-zaken', name: 'Lair of Zaken', territory: 'Special', type: 'dungeon', level: '60+' },
    { id: 'freya-throne', name: "Freya's Throne", territory: 'Special', type: 'dungeon', level: '82+' },
    { id: 'lair-of-core', name: 'Lair of Core', territory: 'Cruma', type: 'dungeon', level: '55+' },

    // ============ SEVEN SIGNS DUNGEONS ============
    { id: 'necropolis-of-sacrifice', name: 'Necropolis of Sacrifice', territory: 'Gludio', type: 'dungeon', level: '20-30', coords: { x: -41312, y: 206625 } },
    { id: 'pilgrims-necropolis', name: "Pilgrim's Necropolis", territory: 'Dion', type: 'dungeon', level: '30-40', coords: { x: 44545, y: 108867 } },
    { id: 'worshipers-necropolis', name: "Worshiper's Necropolis", territory: 'Innadril', type: 'dungeon', level: '40-50', coords: { x: 108097, y: 174274 } },
    { id: 'patriots-necropolis', name: "Patriot's Necropolis", territory: 'Gludio', type: 'dungeon', level: '50-60', coords: { x: -18021, y: 108909 } },
    { id: 'ascetics-necropolis', name: "Ascetic's Necropolis", territory: 'Oren', type: 'dungeon', level: '60-70', coords: { x: -22594, y: 13760 } },
    { id: 'martyrs-necropolis', name: "Martyr's Necropolis", territory: 'Giran', type: 'dungeon', level: '50-60', coords: { x: 116998, y: 145198 } },
    { id: 'saints-necropolis', name: "Saint's Necropolis", territory: 'Innadril', type: 'dungeon', level: '70-80', coords: { x: 79946, y: 209470 } }, // Estimated from 22_24
    { id: 'disciples-necropolis', name: "Disciple's Necropolis", territory: 'Aden', type: 'dungeon', level: '70-80', coords: { x: 178222, y: -14944 } },

    { id: 'heretics-catacomb', name: "Heretic's Catacomb", territory: 'Dion', type: 'dungeon', level: '30-40', coords: { x: 39872, y: 144193 } }, // Estimated
    { id: 'catacomb-of-branded', name: 'Catacomb of the Branded', territory: 'Giran', type: 'dungeon', level: '40-50', coords: { x: 43074, y: 170560 } },
    { id: 'catacomb-of-apostate', name: 'Catacomb of the Apostate', territory: 'Oren', type: 'dungeon', level: '50-60', coords: { x: 74561, y: 78656 } },
    { id: 'catacomb-of-witch', name: 'Catacomb of the Witch', territory: 'Aden', type: 'dungeon', level: '60-70', coords: { x: 117498, y: 76630 } },
    // Dark Omens and Forbidden Path already listed in ADEN/OREN

    // ============ MORE FORTRESSES ============
    { id: 'shanty-fortress', name: 'Shanty Fortress', territory: 'Gludio', type: 'fortress' },
    { id: 'southern-fortress', name: 'Southern Fortress', territory: 'Gludio', type: 'fortress' },
];

// Location type labels for UI
export const LOCATION_TYPES = [
    { value: 'town', label: 'Towns' },
    { value: 'village', label: 'Villages' },
    { value: 'castle', label: 'Castles' },
    { value: 'fortress', label: 'Fortresses' },
    { value: 'dungeon', label: 'Dungeons' },
    { value: 'hunting_zone', label: 'Hunting Zones' },
    { value: 'special', label: 'Special Areas' },
];

// Get all territories for filtering
export function getAllTerritories(): string[] {
    return [...new Set(LOCATIONS.map(loc => loc.territory))].sort();
}

// Get locations by territory
export function getLocationsByTerritory(territory: string): Location[] {
    return LOCATIONS.filter(loc => loc.territory === territory);
}

// Slugify location name for URL
export function locationSlug(name: string): string {
    return name.toLowerCase()
        .replace(/['']/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

// Region code to location name mapping
// Based on L2 internal region coordinates (x:y format)
export const REGION_CODE_MAP: Record<string, string> = {
    // ============ ADEN TERRITORY ============
    '24:18': 'Town of Aden',
    '25:18': 'Aden Territory',
    '25:19': 'Aden Territory',
    '26:18': 'Aden Territory',
    '26:19': 'Aden Territory',
    '23:18': 'Aden Territory',
    '19:17': 'Tower of Insolence',

    // ============ HUNTERS VILLAGE ============
    '18:14': "Hunter's Village",
    '18:15': "Hunter's Village",
    '17:14': "Hunter's Village",
    '17:15': "Hunter's Village",

    // ============ GIRAN ============
    '19:21': 'Town of Giran',
    '19:22': 'Town of Giran',
    '20:21': 'Town of Giran',
    '18:21': 'Giran Harbor',

    // ============ OREN ============
    '22:22': 'Town of Oren',
    '22:23': 'Town of Oren',
    '21:22': 'Town of Oren',
    '20:18': 'Ivory Tower',
    '20:19': 'Ivory Tower',

    // ============ DION ============
    '23:20': 'Town of Dion',
    '23:21': 'Town of Dion',
    '22:20': 'Town of Dion',
    '22:21': 'Floran Village',

    // ============ GLUDIO / GLUDIN ============
    '19:24': 'Town of Gludio',
    '19:25': 'Town of Gludio',
    '20:24': 'Town of Gludio',
    '17:22': 'Gludin Village',
    '17:23': 'Gludio Territory',
    '17:24': 'Gludio Territory',
    '17:25': 'Gludio Territory',
    '18:22': 'Gludio Territory',
    '18:23': 'Gludio Territory',
    '20:25': 'Gludin Village',
    '21:25': 'Gludin Village',

    // ============ TALKING ISLAND ============
    '18:25': 'Talking Island Village',
    '18:26': 'Talking Island',
    '17:26': 'Talking Island',
    '19:26': 'Talking Island',

    // ============ GODDARD ============
    '21:16': 'Town of Goddard',
    '21:17': 'Town of Goddard',
    '20:16': 'Town of Goddard',
    '20:22': 'Hot Springs',
    '20:23': 'Hot Springs',
    '21:19': 'Varka Silenos Outpost',
    '22:13': 'Ketra Orc Outpost',
    '21:18': 'Wall of Argos',

    // ============ SCHUTTGART ============
    '22:19': 'Town of Schuttgart',
    '23:19': 'Town of Schuttgart',
    '23:24': 'Strip Mine',
    '24:16': 'Cursed Village',
    '25:11': 'Schuttgart Territory',
    '25:12': 'Mithril Mines',

    // ============ RUNE ============
    '23:12': 'Rune Township',
    '23:13': 'Rune Township',
    '24:12': 'Rune Township',

    // ============ HEINE ============
    '19:23': 'Heine',
    // '20:23': 'Heine',

    // ============ RACE VILLAGES ============
    '17:17': 'Elven Village',
    '18:17': 'Elven Village',
    '17:18': 'Dark Elf Village',
    '18:18': 'Dark Elf Village',
    '23:17': 'Dwarven Village',
    '24:17': 'Dwarven Village',
    '22:16': 'Orc Village',
    '23:16': 'Orc Village',

    // ============ HUNTING ZONES ============
    '18:20': 'Dragon Valley',
    '19:20': 'Dragon Valley',
    '19:18': 'Forest of the Dead',
    '19:19': 'Forest of the Dead',
    '21:20': 'Blazing Swamp',
    // '22:20': 'Fields of Massacre',
    '20:17': 'Sea of Spores',
    '24:19': 'Enchanted Valley',
    '17:20': 'Plains of Glory',
    '18:19': 'Cemetery',

    // Orc/Elmore hunting grounds
    '19:15': 'Immortal Plateau',
    '19:14': 'Immortal Plateau',
    '19:13': 'Immortal Plateau',
    '19:16': 'Frozen Waterfall',
    '20:15': 'Frozen Waterfall',
    '20:14': 'Tanor Canyon',
    '18:16': 'Elven Ruins',
    '17:16': 'Elven Ruins',
    '16:24': 'Windmill Hill',
    '16:25': 'Obelisk of Victory',

    // Neutral zone / misc
    '17:21': 'Execution Grounds',
    '18:24': 'Wasteland',
    '21:23': 'Cruma Marshlands',
    '21:24': 'Cruma Marshlands',
    '22:24': 'Alligator Island',
    '22:25': 'Alligator Island',
    '23:23': 'Tanor Canyon',
    '24:20': 'Pavel Ruins',
    '24:21': 'Pavel Ruins',
    '25:17': 'Brekas Stronghold',

    // ============ DUNGEONS ============
    // '20:16': 'Forge of the Gods',
    '21:15': "Antharas' Lair",
    '22:14': 'Cruma Tower',
    '23:22': 'Ant Nest',
    '24:23': 'Abandoned Camp',

    // ============ SPECIAL ============
    '96:96': 'Event Zone',
    '0:0': 'Unknown Location',
};

// Resolve region code to location name
export function resolveRegionCode(code: string): string {
    // Check if it's a region code pattern (e.g., "17:22")
    if (/^\d+:\d+$/.test(code)) {
        return REGION_CODE_MAP[code] || `Unknown Region (${code})`;
    }
    // Return as-is if it's already a name
    return code;
}
