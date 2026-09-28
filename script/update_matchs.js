const puppeteer = require('puppeteer');
const fs = require('fs');

// --- CONFIGURATION ---
const FOOTBALL_URLS = [
    { name: "AFC COMPIEGNE", url: 'https://epreuves.fff.fr/competition/club/542781-a-f-c-compiegne/equipe/2026_22206_U17_5/saison'},
    { name: "AFC COMPIEGNE", url: 'https://epreuves.fff.fr/competition/club/542781-a-f-c-compiegne/equipe/2026_22206_SEM_1/saison'},
    { name: "FC VERSAILLES 78", url: 'https://epreuves.fff.fr/competition/club/500650-versailles-78-fc/equipe/2026_656_SEM_2/saison' },
    { name: "FC VERSAILLES 78", url: 'https://epreuves.fff.fr/competition/club/500650-versailles-78-fc-2/equipe/2026_656_SEM_4/saison' },
    { name: "FC VERSAILLES 78", url: 'https://epreuves.fff.fr/competition/club/500650-versailles-78-fc/equipe/2026_656_U19_1/saison' },
    { name: "FC VERSAILLES 78", url: 'https://epreuves.fff.fr/competition/club/500650-versailles-78-fc/equipe/2026_656_U17_3/saison' },
    { name: "RACING CLUB FRANCE", url: 'https://epreuves.fff.fr/competition/club/539013-racing-club-france/equipe/2026_19429_SEM_2/saison' },
    { name: "RACING CLUB FRANCE", url: 'https://epreuves.fff.fr/competition/club/539013-racing-club-france/equipe/2026_19429_U19_1/saison' },
    { name: "RACING CLUB FRANCE", url: 'https://epreuves.fff.fr/competition/club/539013-racing-club-france/equipe/2026_19429_U17_3/saison' },
    { name: "US LE PAYS DU VALOIS", url: 'https://epreuves.fff.fr/competition/club/560836-le-pays-du-valois-us/equipe/2026_199020_SEM_1/saison' },
    { name: "AMIENS SC", url: 'https://epreuves.fff.fr/competition/club/500240-amiens-scf/equipe/2026_358_SEM_4/saison' },
    { name: "QUEVILLY ROUEN METROPOLE", url: 'https://epreuves.fff.fr/competition/club/531562-qrm/equipe/2026_14293_SEM_1/saison' },
    { name: "QUEVILLY ROUEN METROPOLE", url: 'https://epreuves.fff.fr/competition/club/531562-quevilly-rm/equipe/2026_14293_U19_4/saison' },
    { name: "QUEVILLY ROUEN METROPOLE", url: 'https://epreuves.fff.fr/competition/club/531562-quevilly-rm/equipe/2026_14293_U17_13/saison' },
    { name: "U.S. ORLEANS LOIRET", url: 'https://epreuves.fff.fr/competition/club/504891-us-orleans-45/equipe/2026_2421_SEM_1/saison' },
    { name: "U.S. ORLEANS LOIRET", url: 'https://epreuves.fff.fr/competition/club/504891-us-orleans-loiret/equipe/2026_2421_U19_2/saison' },
    { name: "FC ROUEN", url: 'https://epreuves.fff.fr/competition/club/500037-fc-rouen-1899/equipe/2026_184_SEM_1/saison' },
    { name: "FC ROUEN", url: 'https://epreuves.fff.fr/competition/club/500037-fc-rouen-1899/equipe/2026_184_U19_4/saison' },
    { name: "FC SAINT PRYVE ST HILAIRE", url: 'https://epreuves.fff.fr/competition/club/548861-st-pryve-st-hilaire/equipe/2026_25783_SEM_1/saison' },
    { name: "ST MAUR LUSITANOS", url: 'https://epreuves.fff.fr/competition/club/526258-st-maur-lusitanos/equipe/2026_10744_SEM_2/saison' },
    { name: "US CRETEIL", url: 'https://epreuves.fff.fr/competition/club/500689-creteil-f/equipe/2026_667_SEM_2/saison' },
    { name: "FC CHAMBLY OISE", url: 'https://epreuves.fff.fr/competition/club/536772-chambly-oise-fc/equipe/2026_17767_SEM_1/saison' },
    { name: "US CHANTILLY", url: 'https://epreuves.fff.fr/competition/club/500260-chantilly-us/equipe/2026_374_SEM_1/saison' },
    { name: "FC FLEURY 91", url: 'https://epreuves.fff.fr/competition/club/524861-fc-fleury-91/equipe/2026_9753_SEM_2/saison' },
    { name: "FC FLEURY 91", url: 'https://epreuves.fff.fr/competition/club/524861-fc-fleury-91/equipe/2026_9753_U18F_4/saison' },
    { name: "FC FLEURY 91", url: 'https://epreuves.fff.fr/competition/club/524861-fc-fleury-91/equipe/2026_9753_SEF_3/saison' },
    { name: "PARIS 13 ATLETICO", url: 'https://epreuves.fff.fr/competition/club/523264-paris-13-atletico/equipe/2026_8738_SEM_2/saison' },
    { name: "C'CHARTRES FOOTBALL", url: 'https://epreuves.fff.fr/competition/club/582560-c-chartres-f/equipe/2026_191772_SEM_1/saison' },
    { name: "C'CHARTRES FOOTBALL", url: 'https://epreuves.fff.fr/competition/club/582560-c-chartres-f/equipe/2026_191772_U19_2/saison' },
    { name: "RED STAR", url: 'https://epreuves.fff.fr/competition/club/500002-red-star-fc-2/equipe/2026_154_SEM_3/saison' },
    { name: "RED STAR", url: 'https://epreuves.fff.fr/competition/club/500002-red-star-fc/equipe/2026_154_U17_4/saison' },
    { name: "OLYMPIQUE SAINT QUENTIN", url: 'https://epreuves.fff.fr/competition/club/500164-st-quentin-o/equipe/2026_295_SEM_1/saison' },
    { name: "LILLE LOSC", url: 'https://epreuves.fff.fr/competition/club/500054-losc-lille-2/equipe/2026_199_SEM_8/saison' },
    { name: "AS ST OUEN L'AUMONE", url: 'https://epreuves.fff.fr/competition/club/518488-st-ouen-l-aumone-as/equipe/2026_5883_SEM_2/saison' },
    { name: "JA DRANCY", url: 'https://epreuves.fff.fr/competition/club/523259-ja-drancy/equipe/2026_8734_SEM_2/saison' }, 
    { name: "JA DRANCY", url: 'https://epreuves.fff.fr/competition/club/523259-ja-drancy/equipe/2026_8734_U17_3/saison' }, 
    { name: "US TORCY", url: 'https://epreuves.fff.fr/competition/club/511876-us-torcy-pvm/equipe/2026_3896_SEM_2/saison' }, 
    { name: "FCM AUBERVILLIERS", url: 'https://epreuves.fff.fr/competition/club/527078-aubervilliers-fcm/equipe/2026_11270_SEM_2/saison' },
    { name: "JEUNES AUBERVILLIERS", url: 'https://epreuves.fff.fr/competition/club/544051-jeunes-aubervilliers/equipe/2026_22369_U17_2/saison' },
    { name: "IVRY US", url: 'https://epreuves.fff.fr/competition/club/523411-us-ivry-football/equipe/2026_8835_SEM_2/saison' },
    { name: "NEUILLY MARNE S.F.C.", url: 'https://epreuves.fff.fr/competition/club/508884-neuilly-marne-s-f-c/equipe/2026_3359_SEM_1/saison' },
    { name: "PARIS FC", url: 'https://epreuves.fff.fr/competition/club/500568-paris-fc-2/equipe/2026_616_SEM_4/saison' },
    { name: "PARIS FC", url: 'https://epreuves.fff.fr/competition/club/500568-paris-fc/equipe/2026_616_SEF_2/saison' },
    { name: "PARIS FC", url: 'https://epreuves.fff.fr/competition/club/500568-paris-fc/equipe/2026_616_U19_6/saison' },
    { name: "PARIS FC", url: 'https://epreuves.fff.fr/competition/club/500568-paris-fc/equipe/2026_616_U18F_5/saison' },
    { name: "PARIS FC", url: 'https://epreuves.fff.fr/competition/club/500568-paris-fc/equipe/2026_616_U17_7/saison' },
    { name: "CS BRETIGNY", url: 'https://epreuves.fff.fr/competition/club/500217-bretigny-fcs/equipe/2026_343_SEM_2/saison' },
    { name: "ESA LINAS MONTLHERY", url: 'https://epreuves.fff.fr/competition/club/518884-linas-montlhery-esa/equipe/2026_6071_SEM_2/saison' },
    { name: "LE MANS FC", url: 'https://epreuves.fff.fr/competition/club/537103-le-mans-fc-2/equipe/2026_18056_SEM_15/saison' },
    { name: "LE MANS FC", url: 'https://epreuves.fff.fr/competition/club/537103-le-mans-fc/equipe/2026_18056_U18F_2/saison' },
    { name: "LE MANS FC", url: 'https://epreuves.fff.fr/competition/club/537103-le-mans-fc/equipe/2026_18056_SEF_3/saison' },
    { name: "PARIS SAINT-GERMAIN", url: 'https://epreuves.fff.fr/competition/club/500247-paris-saint-germain/equipe/2026_364_SEF_3/saison' },
    { name: "PARIS SAINT-GERMAIN", url: 'https://epreuves.fff.fr/competition/club/500247-paris-saint-germain-fc/equipe/2026_364_SEM_2/saison' },
    { name: "PARIS SAINT-GERMAIN", url: 'https://epreuves.fff.fr/competition/club/500247-paris-saint-germain/equipe/2026_364_U19_1/saison' },
    { name: "PARIS SAINT-GERMAIN", url: 'https://epreuves.fff.fr/competition/club/500247-paris-saint-germain/equipe/2026_364_U18F_4/saison' },
    { name: "PARIS SAINT-GERMAIN", url: 'https://epreuves.fff.fr/competition/club/500247-paris-saint-germain/equipe/2026_364_U17_5/saison' },
    { name: "AMIENS SC", url: 'https://epreuves.fff.fr/competition/club/500240-amiens-sc/equipe/2026_358_U19_2/saison' },
    { name: "SARCELLES AAS", url: 'https://epreuves.fff.fr/competition/club/500695-aas-sarcelles/equipe/2026_670_U18F_3/saison' },
    { name: "SARCELLES AAS", url: 'https://epreuves.fff.fr/competition/club/500695-aas-sarcelles/equipe/2026_670_U17_5/saison' },
    { name: "FC MONTROUGE 92", url: 'https://epreuves.fff.fr/competition/club/550679-montrouge-fc-92/equipe/2026_105489_U17_3/saison' },
    { name: "FC MANTOIS 78", url: 'https://epreuves.fff.fr/competition/club/544913-mantois-78-fc/equipe/2026_23013_U17_3/saison' },
    { name: "CS MAINVILLIERS", url: 'https://epreuves.fff.fr/competition/club/516125-cs-mainvilliers/equipe/2026_4969_U17_3/saison' },
    { name: "EVREUX FC", url: 'https://epreuves.fff.fr/competition/club/554350-evreux-fc-27/equipe/2026_152041_U17_10/saison' },
    { name: "CS BRETIGNY", url: 'https://epreuves.fff.fr/competition/club/500217-cs-bretigny-football/equipe/2026_343_U17_3/saison' },
    { name: "FC MONTFERMEIL", url: 'https://epreuves.fff.fr/competition/club/548635-montfermeil-fc/equipe/2026_25590_U17_3/saison' },
    { name: "NANTERRE ES", url: 'https://epreuves.fff.fr/competition/club/500561-nanterre-es/equipe/2026_612_U17_2/saison' },
    { name: "THIONVILLE LUSITANOS", url: 'https://epreuves.fff.fr/competition/club/541471-thionville-lusitanos/equipe/2026_21305_U17_4/saison' },
    { name: "JOINVILLE R.C", url: 'https://epreuves.fff.fr/competition/club/537053-rc-joinville/equipe/2026_18023_U17_9/saison' },
    { name: "AS BEAUVAIS OISE", url: 'https://epreuves.fff.fr/competition/club/500108-beauvais-oise-as/equipe/2026_244_SEM_1/saison' },
    { name: "FC SAINTE GENEVIEVE", url: 'https://epreuves.fff.fr/competition/club/500710-sainte-genevieve-football-club/equipe/2026_675_SEM_2/saison' },
];

const BASKET_URLS = [
    { name: "C'CHARTRES METROPOLE BASKET", url: 'https://competitions.ffbb.com/ligues/cvl/comites/0028/clubs/cvl0028005/equipes/200000005334729' },
    { name: "C'CHARTRES METROPOLE BASKET", url: 'https://competitions.ffbb.com/ligues/cvl/comites/0028/clubs/cvl0028004/equipes/200000005334526' },
    { name: "POLE FRANCE BASKET", url: 'https://competitions.ffbb.com/ligues/idf/comites/0075/clubs/idf0075083/equipes/200000005334745' },
    { name: "POLE FRANCE BASKET", url: 'https://competitions.ffbb.com/ligues/idf/comites/0075/clubs/idf0075083/equipes/200000005334528' },
    { name: "VAL DE SEINE BASKET", url: 'https://competitions.ffbb.com/ligues/idf/comites/0092/clubs/idf0092056/equipes/200000005334545' },
    { name: "NANTERRE 92", url: 'https://competitions.ffbb.com/ligues/idf/comites/0092/clubs/idf0092031/equipes/200000005367092' },
    { name: "NANTERRE 92", url: 'https://competitions.ffbb.com/ligues/idf/comites/0092/clubs/idf0092031/equipes/200000005368245' },
    { name: "PARIS BASKETBALL", url: 'https://competitions.ffbb.com/ligues/idf/comites/0075/clubs/idf0075077/equipes/200000005368246' },
    { name: "PARIS BASKETBALL", url: 'https://competitions.ffbb.com/ligues/idf/comites/0075/clubs/idf0075077/equipes/200000005367093' },
    { name: "SAINT QUENTIN BASKET BALL", url: 'https://competitions.ffbb.com/ligues/hdf/comites/0002/clubs/hdf0002018/equipes/200000005368249' },
    { name: "SAINT QUENTIN BASKET BALL", url: 'https://competitions.ffbb.com/ligues/hdf/comites/0002/clubs/hdf0002018/equipes/200000005367096' },
    { name: "ALM EVREUX BASKET", url: 'https://competitions.ffbb.com/ligues/nor/comites/0027/clubs/nor0027002/equipes/200000005368356' },
    { name: "LEVALLOIS METROPOLITANS", url: 'https://competitions.ffbb.com/ligues/idf/comites/0092/clubs/idf0092051/equipes/200000005368362' }
];

const HANDBALL_URLS = [
    { name: "PARIS 92", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/ligue-butagaz-energie-2026-2027-30618/equipe-2118505/' },
    { name: "STELLA SAINT-MAUR HANDBALL", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/ligue-butagaz-energie-2026-2027-30618/equipe-2118508/' },
    { name: "PARIS SAINT-GERMAIN HANDBALL", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/daikin-starligue-2026-27-32372/equipe-2119699/' },
    { name: "PARIS SAINT-GERMAIN HANDBALL", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/nationale-1-masculine-2026-2027-32469/equipe-2121445/' },
    { name: "C'CHARTRES METROPOLE HANDBALL", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/daikin-starligue-2026-27-32372/equipe-2119693/' },
    { name: "C'CHARTRES METROPOLE HANDBALL", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/coupe-de-france/coupe-de-france-nationale-masculine-2026-2027-30617/equipe-2116834/' },
    { name: "SARAN LOIRET", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/daikin-starligue-2026-27-32372/equipe-2119701/' },
    { name: "SARAN LOIRET", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/nationale-1-masculine-2026-2027-32469/equipe-2121439/' },
    { name: "SARAN LOIRET", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/coupe-de-france/coupe-de-france-nationale-masculine-2026-2027-30617/equipe-2116820/' },
    { name: "TREMBLAY-EN-FRANCE", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/daikin-starligue-2026-27-32372/equipe-2119704/' },
    { name: "TREMBLAY-EN-FRANCE", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/nationale-1-masculine-2026-2027-32469/equipe-2121447/' },
    { name: "ELITE VAL D'OISE", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/proligue-2026-27-32243/equipe-2118167/' },
    { name: "ELITE VAL D'OISE", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/coupe-de-france/coupe-de-france-nationale-masculine-2026-2027-30617/equipe-2116833/' },
    { name: "US CRETEIL", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/proligue-2026-27-32243/equipe-2118164/' },
    { name: "US CRETEIL", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/coupe-de-france/coupe-de-france-nationale-masculine-2026-2027-30617/equipe-2116841/' },
    { name: "US IVRY", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/proligue-2026-27-32243/equipe-2118170/' },
    { name: "US IVRY", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/coupe-de-france/coupe-de-france-nationale-masculine-2026-2027-30617/equipe-2116831/' },
    { name: "PONTAULT-COMBAULT", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/proligue-2026-27-32243/equipe-2118173/' },
    { name: "PONTAULT-COMBAULT", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/coupe-de-france/coupe-de-france-nationale-masculine-2026-2027-30617/equipe-2116837/' },
    { name: "MASSY ESSONNE", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/proligue-2026-27-32243/equipe-2118171/' },
    { name: "MASSY ESSONNE", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/coupe-de-france/coupe-de-france-nationale-masculine-2026-2027-30617/equipe-2116839/' },
    { name: "SAINT CYR", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/nationale-1-masculine-2026-2027-32469/equipe-2121438/' },
    { name: "AC BOULOGNE-BILLANCOURT", url: 'https://www.ffhandball.fr/competitions/saison-2026-2027-22/national/nationale-1-masculine-2026-2027-32469/equipe-2121446/' }
];

const OUTPUT_FILE = 'data/matchs.json';

// --- UTILS ---
const normalize = (str) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlève les accents
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace(/FC$|SFC$|21$|23$|78FC$|92$|SC$/, '')
        .trim();
};

function parseFFFDate(dateStr) {
    if (!dateStr) return null;
    const monthsMap = { 
        'jan': 0, 'janv': 0,
        'fév': 1, 'fev': 1, 'févr': 1,
        'mar': 2, 'mars': 2,
        'avr': 3, 'avril': 3,
        'mai': 4,
        'juin': 5, 'jun': 5,
        'jui': 6, 'juil': 6, 'juillet': 6,
        'aoû': 7, 'aou': 7, 'août': 7,
        'sep': 8, 'sept': 8,
        'oct': 9,
        'nov': 10,
        'déc': 11, 'dec': 11
    };
    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length < 4) return null;
    const day = parseInt(parts[1]);
    const monthStr = parts[2].replace('.', '').trim();
    const month = monthsMap[monthStr];
    
    if (month === undefined) return null; // Sécurité si le mois n'est pas reconnu
    
    const year = parseInt(parts[3]);
    const time = parts[5] ? parts[5].split('h') : [0, 0];
    return new Date(year, month, day, parseInt(time[0] || 0), parseInt(time[1] || 0));
}

function parseFFBBDate(dateStr) {
    if (!dateStr) return null;
    const monthsMap = { 'janv.': 0, 'févr.': 1, 'mars': 2, 'avr.': 3, 'mai': 4, 'juin': 5, 'juil.': 6, 'août': 7, 'sept.': 8, 'oct.': 9, 'nov.': 10, 'déc.': 11 };
    const parts = dateStr.toLowerCase().split(' '); 
    if (parts.length < 3) return null;
    const day = parseInt(parts[0]);
    const month = monthsMap[parts[1]];
    
    // Calcul dynamique de la saison sportive
    const now = new Date();
    let year = now.getFullYear();
    
    // Si nous sommes en fin d'année (ex: oct 2026) et le match au début d'année civile (ex: fév), c'est l'année d'après (2027)
    if (now.getMonth() >= 7 && month <= 6) {
        year += 1;
    } 
    // Si nous sommes en début d'année (ex: mars 2027) et le match en fin d'année (ex: oct), c'était l'année d'avant (2026)
    else if (now.getMonth() <= 6 && month >= 7) {
        year -= 1;
    }

    const [hours, minutes] = parts[2].split('h').map(n => parseInt(n) || 0);
    return new Date(year, month, day, hours, minutes);
}

function parseFFHBDate(dateStr) {
    if (!dateStr) return null;
    const months = { 
        "janvier": 0, "fevrier": 1, "mars": 2, "avril": 3, "mai": 4, "juin": 5, 
        "juillet": 6, "aout": 7, "septembre": 8, "octobre": 9, "novembre": 10, "decembre": 11 
    };
    const match = dateStr.toLowerCase().match(/(\d+) ([a-zûéû]+) (\d{4}) à (\d+)h(\d+)/i);
    if (match) {
        const [ , day, monthName, year, hour, min] = match;
        const month = months[normalize(monthName).toLowerCase()];
        return new Date(year, month, day, hour, min);
    }
    return null;
}

// --- SCRAPERS ---

async function scrapeFootball(page) {
    console.log("\n⚽ DEBUT SCRAPING FOOTBALL");
    let futureMatchesMap = new Map();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const limitDate = new Date();
    limitDate.setMonth(now.getMonth() + 2); // Filtre à 2 mois

    for (let teamConfig of FOOTBALL_URLS) {
        try {
            await page.evaluate(() => document.body.innerHTML = '').catch(() => {});
            await page.goto(teamConfig.url, { waitUntil: 'networkidle2', timeout: 45000 });
            await page.waitForSelector('app-match-score', { timeout: 10000 });

            // 1. Gestion des cookies
            try {
                await page.waitForSelector('#didomi-notice-agree-button', { timeout: 2000 });
                await page.click('#didomi-notice-agree-button');
            } catch (e) {}

            // 2. Défilement automatique pour charger la liste complète (Saison)
            await page.evaluate(async () => {
                await new Promise((resolve) => {
                    let totalHeight = 0;
                    let distance = 100;
                    let timer = setInterval(() => {
                        let scrollHeight = document.body.scrollHeight;
                        window.scrollBy(0, distance);
                        totalHeight += distance;
                        if(totalHeight >= scrollHeight) {
                            clearInterval(timer);
                            resolve();
                        }
                    }, 100);
                });
            });
            await new Promise(r => setTimeout(r, 1000));

            // 3. Identification automatique du club
           // 3. Identification automatique infaillible du club (par fréquence)
            let targetTeam = await page.evaluate(() => {
                const blocks = Array.from(document.querySelectorAll('app-match-score'));
                if (blocks.length === 0) return null;
                
                const counts = {};
                blocks.forEach(b => {
                    const home = b.querySelector('.recevant .equipe-name')?.innerText.trim();
                    const away = b.querySelector('.visiteur .equipe-name')?.innerText.trim();
                    if (home) counts[home] = (counts[home] || 0) + 1;
                    if (away) counts[away] = (counts[away] || 0) + 1;
                });

                // Retourne l'équipe qui apparaît le plus souvent sur la page
                return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b, null);
            });

            if (!targetTeam) {
                targetTeam = teamConfig.name; 
            }

            const targetNorm = normalize(targetTeam);

            // 4. Extraction et filtrage silencieux
            const data = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('app-match-score')).map(block => {
                    const compLink = block.querySelector('.match-score-competition a');
                    const scoreLink = block.querySelector('a.score')?.getAttribute('href') || "";
                    
                    // On extrait les valeurs AVANT de créer le fallbackId
                    const dateRaw = block.querySelector('.schedule-match')?.innerText.trim() || "";
                    const home = block.querySelector('.recevant .equipe-name')?.innerText.trim() || "N/A";
                    const away = block.querySelector('.visiteur .equipe-name')?.innerText.trim() || "N/A";
                    
                    // Maintenant dateRaw, home et away existent bien
                    const fallbackId = `${dateRaw}-${home}-${away}`.replace(/\s+/g, '');
                    
                    return {
                        dateRaw: dateRaw,
                        home: home,
                        away: away,
                        competition: compLink?.childNodes[0]?.textContent.trim() || "Football",
                        round: compLink?.querySelector('.text-xs')?.innerText.trim() || "N/A",
                        id: scoreLink ? scoreLink.split('/').pop() : fallbackId
                    };
                });
            });

            let debugReasons = [];
            let filteredCount = 0;

            data.forEach((m, index) => {
                const matchDate = parseFFFDate(m.dateRaw);
                const homeNorm = normalize(m.home);
                const isHome = homeNorm === targetNorm;
                const isWithinRange = matchDate && matchDate >= now && matchDate <= limitDate;

                if (isHome && isWithinRange && !futureMatchesMap.has(m.id)) {
                    futureMatchesMap.set(m.id, {
                        sport: "football",
                        sourceUrl: teamConfig.url,
                        isoDate: matchDate.toISOString(),
                        date: matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                        home: teamConfig.name,
                        away: m.away,
                        competition: m.competition,
                        round: m.round,
                        location: "N/A",
                        timestamp: matchDate.getTime()
                    });
                    filteredCount++;
                } else {
                    // Collecte des raisons du rejet pour ce match
                    let reasons = [];
                    if (!isHome) reasons.push(`Pas à domicile (Lu: "${m.home}" [norm: ${homeNorm}] ≠ Cible: "${targetTeam}" [norm: ${targetNorm}])`);
                    if (!matchDate) reasons.push(`Date invalide ("${m.dateRaw}")`);
                    else if (!isWithinRange) reasons.push(`Date hors limite (${matchDate.toLocaleDateString()} n'est pas entre aujourd'hui et +2 mois)`);
                    if (futureMatchesMap.has(m.id)) reasons.push(`Doublon (ID déjà présent)`);
                    
                    debugReasons.push(`Match #${index + 1} (${m.home} vs ${m.away}) -> REJETÉ : ${reasons.join(' | ')}`);
                }
            });

            // 6. Affichage classique ou affichage DEBUG si 0 match
            if (filteredCount === 0) {
                console.log(`❌ ${teamConfig.name} : 0 match trouvé !`);
                console.log(`   🔍 --- RAPPORT DE DÉBUG (${data.length} matchs analysés sur la page) ---`);
                if (data.length === 0) {
                    console.log(`   👉 Aucun bloc 'app-match-score' trouvé dans le DOM.`);
                } else {
                    debugReasons.forEach(reason => console.log(`   👉 ${reason}`));
                }
                console.log(`   ------------------------------------------------------------------`);
            } else {
                console.log(`✅ ${teamConfig.name} : ${filteredCount} matchs trouvés.`);
            }

        } catch (error) {
            console.error(`❌ Erreur Football sur ${teamConfig.url} :`, error.message);
        }
    }
    return Array.from(futureMatchesMap.values());
}

async function scrapeBasketball(page) {
    console.log("\n🏀 DEBUT SCRAPING BASKETBALL");
    let allBasketMatches = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const limitDate = new Date();
    limitDate.setMonth(now.getMonth() + 2); 

    for (let teamConfig of BASKET_URLS) {
        try {
            await page.goto(teamConfig.url, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.waitForSelector('h1.font-AgencyFBBlackComp');

            const pageData = await page.evaluate(() => {
                const mainClubName = document.querySelector('h1.font-AgencyFBBlackComp')?.innerText.trim() || "CLUB";
                const compLabel = Array.from(document.querySelectorAll('span.text-\\[\\#8a8ea1\\]'))
                    .map(s => s.innerText).find(t => t.includes('|'))?.replace(/[|\s\u00A0]/g, '') || "N/A";

                const results = [];
                const rows = document.querySelectorAll('div.bg-white.h-\\[115px\\], div.bg-white.lg\\:h-\\[65px\\]');
                rows.forEach(row => {
                    // On ne récupère déjà que les matchs à domicile via le DOM
                    if (row.querySelector('.w-\\[50px\\]:not(.font-AgencyFBBlackComp)')?.innerText.trim() === "Domicile") {
                        results.push({
                            dateRaw: row.querySelector('.w-\\[100px\\].whitespace-nowrap')?.innerText.trim(),
                            home: mainClubName,
                            away: row.querySelector('.line-clamp-2')?.innerText.trim(),
                            competition: compLabel,
                            round: row.querySelector('.uppercase.w-\\[20px\\]')?.innerText.trim() || "N/A"
                        });
                    }
                });
                return { club: mainClubName, matches: results };
            });

            let debugReasons = [];
            let filtered = [];

            pageData.matches.forEach((m, index) => {
                const matchDate = parseFFBBDate(m.dateRaw);
                const isWithinRange = matchDate && matchDate >= now && matchDate <= limitDate;

                if (isWithinRange) {
                    filtered.push({
                        sport: "basketball",
                        sourceUrl: teamConfig.url,
                        isoDate: matchDate.toISOString(),
                        date: matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                        home: teamConfig.name,
                        away: m.away,
                        competition: m.competition,
                        round: m.round,
                        location: "N/A",
                        timestamp: matchDate.getTime()
                    });
                } else {
                    // Collecte des raisons du rejet pour ce match
                    let reasons = [];
                    if (!matchDate) reasons.push(`Date invalide ("${m.dateRaw}")`);
                    else if (!isWithinRange) reasons.push(`Date hors limite (${matchDate.toLocaleDateString()} n'est pas entre aujourd'hui et +2 mois)`);
                    
                    debugReasons.push(`Match #${index + 1} (${m.home} vs ${m.away}) -> REJETÉ : ${reasons.join(' | ')}`);
                }
            });

            // Affichage classique ou affichage DEBUG si 0 match
            if (filtered.length === 0) {
                console.log(`❌ ${teamConfig.name} : 0 match trouvé !`);
                console.log(`   🔍 --- RAPPORT DE DÉBUG (${pageData.matches.length} matchs analysés sur la page) ---`);
                if (pageData.matches.length === 0) {
                    console.log(`   👉 Aucun match à domicile trouvé dans le DOM.`);
                } else {
                    debugReasons.forEach(reason => console.log(`   👉 ${reason}`));
                }
                console.log(`   ------------------------------------------------------------------`);
            } else {
                console.log(`✅ ${teamConfig.name} : ${filtered.length} matchs trouvés.`);
            }

            allBasketMatches.push(...filtered);

        } catch (e) {
            console.error(`❌ Erreur FFBB sur ${teamConfig.url} :`, e.message);
        }
    }
    return allBasketMatches;
}

async function scrapeHandball(page) {
    console.log("\n🤾 DEBUT SCRAPING HANDBALL");
    let allHBMatches = [];
    const now = new Date();
    const limitDate = new Date();
    limitDate.setMonth(now.getMonth() + 2);

    for (let teamConfig of HANDBALL_URLS) {
        try {
            await page.goto(teamConfig.url, { waitUntil: 'networkidle2', timeout: 45000 });
            await page.waitForSelector('[class*="block_component__"]', { timeout: 15000 });

            let targetTeam = null;

            if (teamConfig.url.includes('coupe-de-france')) {
                targetTeam = teamConfig.name;
            } else {
                targetTeam = await page.evaluate(() => {
                    const blocks = Array.from(document.querySelectorAll('div[class*="block_component__"]'));
                    if (blocks.length < 2) return null;
                    const getTeams = (block) => ({
                        h: block.querySelector('div[class*="styles_left__"] [class*="styles_teamName__"]')?.innerText.trim(),
                        a: block.querySelector('div[class*="styles_right__"] [class*="styles_teamName__"]')?.innerText.trim()
                    });
                    const m1 = getTeams(blocks[0]);
                    const m2 = getTeams(blocks[1]);
                    const m1Set = [m1.h, m1.a];
                    const m2Set = [m2.h, m2.a];
                    return m1Set.find(team => m2Set.includes(team));
                });
            }

            if (!targetTeam) {
                console.log(`⚠️ Impossible d'identifier le club HB sur ${teamConfig.url}.`);
                continue;
            }

            const targetNorm = normalize(targetTeam);

            const data = await page.evaluate(() => {
                const title = document.querySelector('h1[class*="style_title"]')?.innerText.trim() || "Handball";
                return Array.from(document.querySelectorAll('div[class*="block_component__"]')).map(block => ({
                    dateRaw: block.querySelector('[class*="block_date"]')?.innerText.trim() || "",
                    round: block.querySelector('[class*="block_title"]')?.innerText.trim() || "N/A",
                    home: block.querySelector('div[class*="styles_left__"] [class*="styles_teamName__"]')?.innerText.trim() || "N/A",
                    away: block.querySelector('div[class*="styles_right__"] [class*="styles_teamName__"]')?.innerText.trim() || "N/A",
                    competition: title
                }));
            });

            const filtered = data.map(m => {
                const matchDate = parseFFHBDate(m.dateRaw);
                const isHome = normalize(m.home) === targetNorm;
                const isWithinRange = matchDate && matchDate >= now && matchDate <= limitDate;

                if (isHome && isWithinRange) {
                    return {
                        sport: "handball",
                        sourceUrl: teamConfig.url,
                        isoDate: matchDate.toISOString(),
                        date: matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                        home: teamConfig.name,
                        away: m.away,
                        competition: m.competition,
                        round: m.round,
                        location: "N/A",
                        timestamp: matchDate.getTime()
                    };
                }
                return null;
            }).filter(m => m !== null);

            allHBMatches.push(...filtered);
            console.log(`✅ ${teamConfig.name} : ${filtered.length} matchs.`);

        } catch (error) {
            console.error(`❌ Erreur FFHB sur ${teamConfig.url} :`, error.message);
        }
    }
    return allHBMatches;
}

// --- MAIN ---

async function run() {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 1000 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Exécution dans l'ordre demandé

    const basketMatches = await scrapeBasketball(page);
    const footballMatches = await scrapeFootball(page);
    const handballMatches = await scrapeHandball(page);

    // Fusion et tri par date
    const allMatches = [ ...basketMatches, ...footballMatches, ...handballMatches]
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(({ timestamp, ...rest }) => rest);

    // Sauvegarde
    if (!fs.existsSync('data')) fs.mkdirSync('data');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allMatches, null, 4));
    
    console.log(`\n====================================`);
    console.log(`✨ FIN DU SCRAPING GLOBAL`);
    console.log(`🤾 Handball : ${handballMatches.length}`);
    console.log(`🏀 Basketball : ${basketMatches.length}`);
    console.log(`⚽ Football : ${footballMatches.length}`);
    console.log(`📂 Fichier ${OUTPUT_FILE} mis à jour (${allMatches.length} matchs).`);
    console.log(`====================================`);

    await browser.close();
}

run();