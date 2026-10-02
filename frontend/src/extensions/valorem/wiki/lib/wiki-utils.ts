export function getIconUrl(icon: string) {
    if (!icon) return '/icons/items/etc_question_mark_i00.png';
    return `/icons/items/${icon}${icon.toLowerCase().endsWith('.png') ? '' : '.png'}`;
}

export function getGradeColor(grade: string) {
    switch (grade?.toLowerCase()) {
        case 'd': return 'text-blue-500';
        case 'c': return 'text-orange-500';
        case 'b': return 'text-cyan-500';
        case 'a': return 'text-red-500';
        case 's': return 'text-purple-500';
        default: return 'text-gray-500';
    }
}

export function getGradeBgColor(grade: string) {
    switch (grade?.toLowerCase()) {
        case 'd': return 'bg-blue-500/10 border-blue-500/20';
        case 'c': return 'bg-orange-500/10 border-orange-500/20';
        case 'b': return 'bg-cyan-500/10 border-cyan-500/20';
        case 'a': return 'bg-red-500/10 border-red-500/20';
        case 's': return 'bg-purple-500/10 border-purple-500/20';
        default: return 'bg-gray-500/10 border-gray-500/20';
    }
}

export function getItemDisplayName(name: any): string {
    if (!name) return "";
    if (typeof name === 'string') return name;
    return name.en || name.pt || "";
}

export function getItemWikiUrl(item: any): string {
    if (!item) return "";
    const category = (item.category || item.type || 'etc').toLowerCase();
    const categoryPrefix = (category === 'etc' || category === 'etcitem' || category === 'asset') ? 'etc' : category;
    
    const id = item.id;
    const itemName = item.itemName || item.name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || "item";
    
    if (id) {
        return `/wiki/items/${categoryPrefix}/${id}-${itemName}`;
    }
    
    return `/wiki/items/${categoryPrefix}/${itemName}`;
}

export const ADENA_COSTS: Record<string, Record<number, number>> = {
    "ng": { 60: 5000, 70: 4000, 100: 3000 },
    "d": { 60: 50000, 70: 40000, 100: 30000 },
    "c": { 60: 250000, 70: 200000, 100: 150000 },
    "b": { 60: 1000000, 70: 800000, 100: 600000 },
    "a": { 60: 5000000, 70: 4000000, 100: 3000000 },
    "s": { 60: 20000000, 70: 15000000, 100: 10000000 },
    "s80": { 60: 50000000, 70: 40000000, 100: 30000000 },
};

export function calculateAdenaCraftCost(grade: string, successRate: number, quantity: number = 1): number {
    const g = (grade || "ng").toLowerCase();
    const rate = successRate || 100;
    const baseCost = ADENA_COSTS[g]?.[rate] || 0;
    return baseCost * quantity;
}
