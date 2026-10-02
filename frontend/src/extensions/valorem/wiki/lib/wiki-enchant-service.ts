import rawData from '../../data/enchant-bonuses.json';

const translations = {
    pt: {
        "Accuracy": "Precisão",
        "Evasion": "Evasão",
        "Weight limit": "Limite de peso",
        "P. Def.": "P. Def.",
        "M. Def.": "M. Def.",
        "MP Regeneration": "Regeneração de MP",
        "P. Skill MP Consumption": "Consumo de MP Hab. Físicas",
        "M. Skill MP Consumption": "Consumo de MP Hab. Mágicas",
        "Speed": "Velocidade",
        "Debuff resistance": "Resistência a Debuffs",
        "and above": "e acima",
        "one piece": "peça única",
        "fullbody": "corpo inteiro"
    },
    es: {
        "Accuracy": "Precisión",
        "Evasion": "Evasión",
        "Weight limit": "Límite de peso",
        "P. Def.": "P. Def.",
        "M. Def.": "M. Def.",
        "MP Regeneration": "Regeneración de MP",
        "P. Skill MP Consumption": "Consumo de MP Hab. Físicas",
        "M. Skill MP Consumption": "Consumo de MP Hab. Mágicas",
        "Speed": "Velocidad",
        "Debuff resistance": "Resistencia a Debuffs",
        "and above": "y superior",
        "one piece": "pieza única",
        "fullbody": "cuerpo entero"
    },
    en: {}
};

function translateText(text: string, lang: string): string {
    let t = text;
    const dict = translations[lang as keyof typeof translations] || {};
    for (const [en, local] of Object.entries(dict)) {
        t = t.replace(new RegExp(en, 'g'), local as string);
    }
    return t;
}

function processGrade(data: any[], lang: string) {
    if (lang === 'en') return data;
    const localized = JSON.parse(JSON.stringify(data));
    localized.forEach((row: any) => {
        row.enchant = translateText(row.enchant, lang);
        row.heavy = translateText(row.heavy, lang);
        row.light = translateText(row.light, lang);
        row.robe = translateText(row.robe, lang);
    });
    return localized;
}

function processHp(data: any, lang: string) {
    if (lang === 'en') return data;
    const localizedRows = JSON.parse(JSON.stringify(data.rows));
    localizedRows.forEach((row: any) => {
        row.type = translateText(row.type, lang);
    });
    return {
        headers: data.headers,
        rows: localizedRows
    };
}

export async function getLocalizedEnchantData(lang: string) {
    const localeKey = (lang === 'pt' || lang === 'es') ? lang : 'en';

    return {
        d: processGrade(rawData.d, localeKey),
        c: processGrade(rawData.c, localeKey),
        b: processGrade(rawData.b, localeKey),
        a_s: processGrade(rawData.a_s, localeKey),
        hpIncrease: processHp(rawData.hpIncrease, localeKey)
    };
}
