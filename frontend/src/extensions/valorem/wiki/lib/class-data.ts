
// Static definition of Class Hierarchy 
// Based on standard Lineage 2 trees + Kamael

export const CLASS_PARENTS: Record<number, number> = {
    // Human Fighter Path
    1: 0, 4: 0, 7: 0, // 1st Class
    2: 1, 3: 1, // Warrior -> Gladiator, Warlord
    5: 4, 6: 4, // Knight -> Paladin, DA
    8: 7, 9: 7, // Rogue -> TH, HE
    88: 2, 89: 3, 90: 5, 91: 6, 93: 8, 92: 9, // 3rd Classes

    // Human Mystic Path
    11: 10, 15: 10, // Wizard, Cleric
    12: 11, 13: 11, 14: 11, // Sorc, Necro, Warlock
    16: 15, 17: 15, // Bishop, Prophet
    94: 12, 95: 13, 96: 14, 97: 16, 98: 17, // 3rd Classes

    // Elven Fighter
    19: 18, 22: 18, // Knight, Scout
    20: 19, 21: 19, // TK, SS
    23: 22, 24: 22, // PW, SR
    99: 20, 100: 21, 101: 23, 102: 24,

    // Elven Mystic
    26: 25, 29: 25, // Wizard, Oracle
    27: 26, 28: 26, // SpS, ES
    30: 29, // Elder
    103: 27, 104: 28, 105: 30,

    // Dark Fighter
    32: 31, 35: 31, // Palus Knight, Assassin
    33: 32, 34: 32, // SK, BD
    36: 35, 37: 35, // AW, PR
    106: 33, 107: 34, 108: 36, 109: 37,

    // Dark Mystic
    39: 38, 42: 38, // Wizard, Shillien Oracle
    40: 39, 41: 39, // SH, PS
    43: 42, // SE
    110: 40, 111: 41, 112: 43,

    // Orc Fighter
    45: 44, 47: 44, // Raider, Monk
    46: 45, // Destroyer
    48: 47, // Tyrant
    113: 46, 114: 48,

    // Orc Mystic
    50: 49, // Shaman
    51: 50, 52: 50, // Overlord, Warcryer
    115: 51, 116: 52,

    // Dwarf
    54: 53, 56: 53, // Scavenger, Artisan
    55: 54, // BH
    57: 56, // Warsmith
    117: 55, 118: 57,

    // Kamael (If exist)
    124: 123, // Trooper
    125: 123, // Warder
    126: 124, 127: 124,
    128: 125, 129: 125,
    130: 126, 131: 127, 132: 128, 133: 129,
    134: 124, 135: 134, 136: 123
};

// Computed children map
export const CLASS_CHILDREN: Record<number, number[]> = {};

Object.entries(CLASS_PARENTS).forEach(([childStr, parent]) => {
    const child = parseInt(childStr);
    if (!CLASS_CHILDREN[parent]) CLASS_CHILDREN[parent] = [];
    CLASS_CHILDREN[parent].push(child);
    CLASS_CHILDREN[parent].sort((a, b) => a - b);
});

export const CLASS_RACES: Record<number, string> = {
    // Human
    0: 'human', 1: 'human', 2: 'human', 3: 'human', 4: 'human',
    5: 'human', 6: 'human', 7: 'human', 8: 'human', 9: 'human',
    88: 'human', 89: 'human', 90: 'human', 91: 'human', 92: 'human', 93: 'human',
    10: 'human', 11: 'human', 12: 'human', 13: 'human', 14: 'human',
    15: 'human', 16: 'human', 17: 'human',
    94: 'human', 95: 'human', 96: 'human', 97: 'human', 98: 'human',

    // Elf
    18: 'elf', 19: 'elf', 20: 'elf', 21: 'elf', 22: 'elf', 23: 'elf', 24: 'elf', 25: 'elf',
    26: 'elf', 27: 'elf', 28: 'elf', 29: 'elf', 30: 'elf',
    99: 'elf', 100: 'elf', 101: 'elf', 102: 'elf', 103: 'elf', 104: 'elf', 105: 'elf',

    // Dark Elf
    31: 'dark_elf', 32: 'dark_elf', 33: 'dark_elf', 34: 'dark_elf', 35: 'dark_elf',
    36: 'dark_elf', 37: 'dark_elf', 38: 'dark_elf', 39: 'dark_elf', 40: 'dark_elf',
    41: 'dark_elf', 42: 'dark_elf', 43: 'dark_elf',
    106: 'dark_elf', 107: 'dark_elf', 108: 'dark_elf', 109: 'dark_elf', 110: 'dark_elf',
    111: 'dark_elf', 112: 'dark_elf',

    // Orc
    44: 'orc', 45: 'orc', 46: 'orc', 47: 'orc', 48: 'orc',
    49: 'orc', 50: 'orc', 51: 'orc', 52: 'orc',
    113: 'orc', 114: 'orc', 115: 'orc', 116: 'orc',

    // Dwarf
    53: 'dwarf', 54: 'dwarf', 55: 'dwarf', 56: 'dwarf', 57: 'dwarf',
    117: 'dwarf', 118: 'dwarf',

    // Kamael
    123: 'kamael', 124: 'kamael', 125: 'kamael', 126: 'kamael', 127: 'kamael',
    128: 'kamael', 129: 'kamael', 130: 'kamael', 131: 'kamael', 132: 'kamael',
    133: 'kamael', 134: 'kamael', 135: 'kamael', 136: 'kamael'
};

export type ClassRole = 'warrior' | 'wizard' | 'rogue' | 'knight' | 'support';

export const CLASS_ROLES: Record<number, ClassRole> = {
    // Human
    1: 'warrior', 2: 'warrior', 3: 'warrior', 88: 'warrior', 89: 'warrior',
    4: 'knight', 5: 'knight', 6: 'knight', 90: 'knight', 91: 'knight',
    7: 'rogue', 8: 'rogue', 9: 'rogue', 93: 'rogue', 92: 'rogue',
    10: 'wizard', 11: 'wizard', 12: 'wizard', 13: 'wizard', 14: 'wizard', 94: 'wizard', 95: 'wizard', 96: 'wizard',
    15: 'support', 16: 'support', 17: 'support', 97: 'support', 98: 'support',

    // Elf
    18: 'warrior', 19: 'knight', 20: 'knight', 21: 'warrior', 22: 'rogue', 23: 'rogue', 24: 'rogue',
    99: 'knight', 100: 'warrior', 101: 'rogue', 102: 'rogue',
    25: 'wizard', 26: 'wizard', 27: 'wizard', 28: 'wizard', 29: 'support', 30: 'support',
    103: 'wizard', 104: 'wizard', 105: 'support',

    // Dark Elf
    31: 'warrior', 32: 'knight', 33: 'knight', 34: 'warrior', 35: 'rogue', 36: 'rogue', 37: 'rogue',
    106: 'knight', 107: 'warrior', 108: 'rogue', 109: 'rogue',
    38: 'wizard', 39: 'wizard', 40: 'wizard', 41: 'wizard', 42: 'support', 43: 'support',
    110: 'wizard', 111: 'wizard', 112: 'support',

    // Orc
    44: 'warrior', 45: 'warrior', 46: 'warrior', 113: 'warrior',
    47: 'warrior', 48: 'warrior', 114: 'warrior',
    49: 'wizard', 50: 'support', 51: 'support', 52: 'support', 115: 'support', 116: 'support',

    // Dwarf
    53: 'warrior', 54: 'rogue', 55: 'rogue', 117: 'rogue',
    56: 'warrior', 57: 'warrior', 118: 'warrior',
};

export function getClassEvolution(currentId: number): number[] {
    const path = [currentId];
    let curr = currentId;
    while (CLASS_PARENTS[curr] !== undefined) {
        curr = CLASS_PARENTS[curr];
        path.unshift(curr);
    }
    return path;
}

export function getNextClasses(currentId: number): number[] {
    return CLASS_CHILDREN[currentId] || [];
}

export function getClassRace(id: number): string {
    return CLASS_RACES[id] || 'unknown';
}

export function getClassRole(id: number): ClassRole {
    // If it's a root class (tier 0), try to guess by its first child's role
    if (CLASS_ROLES[id]) return CLASS_ROLES[id];

    const children = CLASS_CHILDREN[id] || [];
    if (children.length > 0) {
        return getClassRole(children[0]);
    }

    return 'warrior'; // Default
}

export function getClassTier(id: any): number {
    let depth = 0;
    let curr = typeof id === 'string' ? parseInt(id) : id;
    // Avoid infinite loops just in case of cycles (though unlikely with this static data)
    let ops = 0;
    while (CLASS_PARENTS[curr] !== undefined && ops < 10) {
        curr = CLASS_PARENTS[curr];
        depth++;
        ops++;
    }
    return depth;
}

export function getClassRoot(id: number): number {
    let curr = id;
    let ops = 0;
    while (CLASS_PARENTS[curr] !== undefined && ops < 20) {
        curr = CLASS_PARENTS[curr];
        ops++;
    }
    return curr;
}

export interface ClassNode {
    id: number;
    children: ClassNode[];
}

export function getClassTree(rootId: number): ClassNode {
    const buildNode = (id: number): ClassNode => {
        const childrenIds = CLASS_CHILDREN[id] || [];
        return {
            id,
            children: childrenIds.map(buildNode)
        };
    };
    return buildNode(rootId);
}

export const CLASS_NAMES: Record<number, string> = {
    0: 'Human Fighter', 1: 'Warrior', 2: 'Gladiator', 3: 'Warlord', 4: 'Human Knight',
    5: 'Paladin', 6: 'Dark Avenger', 7: 'Rogue', 8: 'Treasure Hunter', 9: 'Hawkeye',
    10: 'Human Mystic', 11: 'Human Wizard', 12: 'Sorcerer', 13: 'Necromancer', 14: 'Warlock',
    15: 'Cleric', 16: 'Bishop', 17: 'Prophet',
    18: 'Elven Fighter', 19: 'Elven Knight', 20: 'Temple Knight', 21: 'Swordsinger', 22: 'Elven Scout',
    23: 'Plainswalker', 24: 'Silver Ranger', 25: 'Elven Mystic', 26: 'Elven Wizard', 27: 'Spellsinger',
    28: 'Elemental Summoner', 29: 'Elven Oracle', 30: 'Elven Elder',
    31: 'Dark Fighter', 32: 'Palus Knight', 33: 'Shillien Knight', 34: 'Bladedancer', 35: 'Assassin',
    36: 'Abyss Walker', 37: 'Phantom Ranger', 38: 'Dark Mystic', 39: 'Dark Wizard', 40: 'Spellhowler',
    41: 'Phantom Summoner', 42: 'Shillien Oracle', 43: 'Shillien Elder',
    44: 'Orc Fighter', 45: 'Orc Raider', 46: 'Destroyer', 47: 'Monk', 48: 'Tyrant',
    49: 'Orc Mystic', 50: 'Orc Shaman', 51: 'Overlord', 52: 'Warcryer',
    53: 'Dwarven Fighter', 54: 'Scavenger', 55: 'Bounty Hunter', 56: 'Artisan', 57: 'Warsmith',
    88: 'Duelist', 89: 'Dreadnought', 90: 'Phoenix Knight', 91: 'Hell Knight', 92: 'Sagittarius', 93: 'Adventurer',
    94: 'Archmage', 95: 'Soultaker', 96: 'Arcana Lord', 97: 'Cardinal', 98: 'Hierophant',
    99: 'Eva\'s Templar', 100: 'Sword Muse', 101: 'Wind Rider', 102: 'Moonlight Sentinel',
    103: 'Mystic Muse', 104: 'Elemental Master', 105: 'Eva\'s Saint',
    106: 'Shillien Templar', 107: 'Spectral Dancer', 108: 'Ghost Hunter', 109: 'Ghost Sentinel',
    110: 'Storm Screamer', 111: 'Spectral Master', 112: 'Shillien Saint',
    113: 'Titan', 114: 'Grand Khavatari', 115: 'Dominator', 116: 'Doomcryer',
    117: 'Fortune Seeker', 118: 'Maestro'
};

export function getClassName(id: number): string {
    return CLASS_NAMES[id] || `Class ${id}`;
}

