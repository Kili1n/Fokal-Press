const puppeteer = require('puppeteer');
const fs = require('fs');

// Liste des URLs fournie dans votre configuration
const TEAM_URLS = [
    'https://epreuves.fff.fr/competition/club/542781-a-f-c-compiegne/equipe/2025_22206_U17_5/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500695-aas-sarcelles-21/equipe/2025_670_U19_3/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/550141-afc-creil-21/equipe/2025_100490_U19_5/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/582560-c-chartres-football-23/equipe/2025_191772_U19_13/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500568-paris-fc-21/equipe/2025_616_U19_4/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500247-paris-saint-germain-fc/equipe/2025_364_U19_4/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500247-paris-saint-germain-fc/equipe/2025_364_U18F_2/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500247-paris-saint-germain-fc/equipe/2025_364_U17_6/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/539013-racing-club-de-france-football/equipe/2025_19429_U19_1/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/539013-racing-club-france/equipe/2025_19429_SEM_2/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/539013-racing-club-de-france-football/equipe/2025_19429_U17_3/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500164-st-quentin-o/equipe/2025_295_SEM_1/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/560836-le-pays-du-valois-us/equipe/2025_199020_SEM_1/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/523259-jeanne-d-arc-drancy/equipe/2025_8734_SEM_1/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/542397-stade-de-reims-2/equipe/2025_21944_SEM_10/resultat-calendrier',    
    'https://epreuves.fff.fr/competition/club/508884-neuilly-marne-sfc/equipe/2025_3359_SEM_1/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500240-amiens-scf-2/equipe/2025_358_SEM_8/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500054-lille-losc-associati-2/equipe/2025_199_SEM_8/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/563663-croix-fic/equipe/2025_172695_SEM_1/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500942-vimy-us/equipe/2025_773_SEM_1/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/582585-pays-de-cassel-us/equipe/2025_191820_SEM_1/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500650-versailles-78-f-c/equipe/2025_656_U17_4/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/516125-cs-mainvilliers/equipe/2025_4969_U17_12/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/544913-mantois-78-fc/equipe/2025_23013_U17_4/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500217-cs-bretigny-football/equipe/2025_343_U17_3/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/550679-montrouge-fc-92/equipe/2025_105489_U17_4/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500568-paris-fc/equipe/2025_616_U17_17/resultat-calendrier',
    "https://epreuves.fff.fr/competition/club/500695-aas-sarcelles/equipe/2025_670_SEF_1/resultat-calendrier",
    "https://epreuves.fff.fr/competition/club/531562-quevilly-rm/equipe/2025_14293_SEF_2/resultat-calendrier",
    "https://epreuves.fff.fr/competition/club/739890-vga-saint-maur/equipe/2025_32963_SEF_4/resultat-calendrier",
    "https://epreuves.fff.fr/competition/club/536214-saint-denis-rc/equipe/2025_17479_SEF_1/resultat-calendrier",
    "https://epreuves.fff.fr/competition/club/504891-us-orleans-loiret/equipe/2025_2421_SEF_2/resultat-calendrier"    
];

const OUTPUT_FILE = 'matchs.json';

/**
 * Normalisation améliorée pour ignorer les suffixes d'URL
 */
const normalize = (str) => {
    if (!str) return '';
    return str.toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace(/FC$|SFC$|21$|23$|78FC$|92$|SC$/, ''); // Nettoie les suffixes communs
};

function parseFFFDate(dateStr) {
    if (!dateStr) return null;
    const monthsMap = { jan: 0, fév: 1, mar: 2, avr: 3, mai: 4, jui: 5, jul: 6, aoû: 7, sep: 8, oct: 9, nov: 10, déc: 11 };
    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length < 4) return null;
    const day = parseInt(parts[1]);
    const month = monthsMap[parts[2].replace('.', '')];
    const year = parseInt(parts[3]);
    const time = parts[5] ? parts[5].split('h') : [0, 0];
    return new Date(year, month, day, parseInt(time[0] || 0), parseInt(time[1] || 0));
}

async function scrapeAll() {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify([], null, 4));
    console.log(`🧹 Fichier ${OUTPUT_FILE} réinitialisé.`);

    const browser = await puppeteer.launch({ 
        headless: "new", 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });

    const now = new Date();
    now.setHours(0,0,0,0); 
    
    let futureMatchesMap = new Map();

    for (let url of TEAM_URLS) {
        // Extraction du nom du club depuis l'URL de façon plus robuste
        const urlParts = url.split('/');
        const clubSlug = urlParts[5].split('-').slice(1).join(' ');
        const targetSearch = normalize(clubSlug);

        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
            
            // Fermeture forcée des cookies si présents
            try { 
                await page.waitForSelector('#didomi-notice-agree-button', { timeout: 3000 });
                await page.click('#didomi-notice-agree-button'); 
            } catch (e) {}

            let teamMatchCount = 0;

            for (let i = 0; i < 3; i++) {
                await new Promise(r => setTimeout(r, 1000));

                const monthMatches = await page.evaluate((target) => {
                    const cards = document.querySelectorAll('app-match-score');
                    return Array.from(cards).map(card => {
                        const home = card.querySelector('.recevant .equipe-name')?.innerText.trim() || "";
                        
                        // Normalisation locale pour la comparaison
                        const normHome = home.toUpperCase()
                            .replace(/[^A-Z0-9]/g, '')
                            .replace(/FC$|SFC$|21$|23$|78FC$|92$|SC$/, '');
                        
                        // Si le nom du club recevant ne correspond pas à notre cible, on ignore (on ne veut que le domicile)
                        if (!normHome.includes(target) && !target.includes(normHome)) return null;

                        const scoreLink = card.querySelector('a.score')?.getAttribute('href') || "";
                        const matchId = scoreLink.split('-').pop() || Math.random().toString();

                        return {
                            id: matchId,
                            dateRaw: card.querySelector('.schedule-match')?.innerText.trim(),
                            competition: card.querySelector('.match-score-competition a')?.childNodes[0]?.textContent.trim(),
                            round: card.querySelector('.match-score-competition .text-xs')?.innerText.trim(),
                            home: home,
                            away: card.querySelector('.visiteur .equipe-name')?.innerText.trim()
                        };
                    }).filter(m => m !== null);
                }, targetSearch);

                monthMatches.forEach(m => {
                    const matchDate = parseFFFDate(m.dateRaw);
                    
                    if (matchDate && matchDate >= now && !futureMatchesMap.has(m.id)) {
                        futureMatchesMap.set(m.id, {
                            isoDate: matchDate.toISOString(), 
                            date: matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                            home: m.home,
                            away: m.away,
                            competition: m.competition,
                            round: m.round,
                            location: "N/A",
                            timestamp: matchDate.getTime()
                        });
                        teamMatchCount++;
                    }
                });

                if (i < 2) {
                    try {
                        const nextBtn = await page.$('button.next-button');
                        if (nextBtn) {
                            await nextBtn.click();
                        } else {
                            break; 
                        }
                    } catch (e) { break; }
                }
            }
            console.log(`✅ ${clubSlug.toUpperCase().padEnd(30)} | ${teamMatchCount} matchs trouvés`);

        } catch (error) {
            console.log(`❌ Erreur sur ${url}`);
        }
    }

    const finalData = Array.from(futureMatchesMap.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(({timestamp, ...rest}) => rest);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 4));
    console.log(`\n✨ Scraping terminé ! ${finalData.length} matchs futurs à domicile enregistrés.`);
    
    await browser.close();
}

scrapeAll();