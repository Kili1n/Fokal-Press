const puppeteer = require('puppeteer');
const fs = require('fs');

// --- CONFIGURATION ---
const FOOTBALL_URLS = [
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
    'https://epreuves.fff.fr/competition/club/500942-vimy-us/equipe/2025_773_SEM_1/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/582585-pays-de-cassel-us/equipe/2025_191820_SEM_1/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500650-versailles-78-f-c/equipe/2025_656_U17_4/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/516125-cs-mainvilliers/equipe/2025_4969_U17_12/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/544913-mantois-78-fc/equipe/2025_23013_U17_4/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500217-cs-bretigny-football/equipe/2025_343_U17_3/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/550679-montrouge-fc-92/equipe/2025_105489_U17_4/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500568-paris-fc/equipe/2025_616_U17_17/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/500695-aas-sarcelles/equipe/2025_670_SEF_1/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/531562-quevilly-rm/equipe/2025_14293_SEF_2/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/739890-vga-saint-maur/equipe/2025_32963_SEF_4/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/536214-saint-denis-rc/equipe/2025_17479_SEF_1/resultat-calendrier',
    'https://epreuves.fff.fr/competition/club/504891-us-orleans-loiret/equipe/2025_2421_SEF_2/resultat-calendrier'    
];

const BASKET_URLS = [
    'https://competitions.ffbb.com/ligues/cvl/comites/0028/clubs/cvl0028005/equipes/200000005138535',
    'https://competitions.ffbb.com/ligues/idf/comites/0075/clubs/idf0075083/equipes/200000005138551',
    'https://competitions.ffbb.com/ligues/pdl/comites/0072/clubs/pdl0072021/equipes/200000005152744',
    'https://competitions.ffbb.com/ligues/idf/comites/0092/clubs/idf0092031/equipes/200000005152746',
    'https://competitions.ffbb.com/ligues/idf/comites/0092/clubs/idf0092031/equipes/200000005152781',
    'https://competitions.ffbb.com/ligues/idf/comites/0075/clubs/idf0075077/equipes/200000005152783',
    'https://competitions.ffbb.com/ligues/hdf/comites/0002/clubs/hdf0002018/equipes/200000005152787',
    'https://competitions.ffbb.com/ligues/nor/comites/0027/clubs/nor0027002/equipes/200000005152397',
    'https://competitions.ffbb.com/ligues/idf/comites/0095/clubs/idf0095010/equipes/200000005139349',
    'https://competitions.ffbb.com/ligues/idf/comites/0092/clubs/idf0092008/equipes/200000005139361',
    'https://competitions.ffbb.com/ligues/idf/comites/0075/clubs/idf0075055/equipes/200000005139357'
];

const HANDBALL_URLS = [
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/ligue-butagaz-energie-2025-26-28227/equipe-1949484/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/ligue-butagaz-energie-2025-26-28227/equipe-1949476/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/ligue-butagaz-energie-2025-26-28227/equipe-1949485/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/nationale-1-masculine-2025-26-28229/equipe-1954511/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/nationale-1-masculine-2025-26-28229/equipe-1954490/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/nationale-1-masculine-2025-26-28229/equipe-1954494/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/nationale-1-masculine-2025-26-28229/equipe-1954500/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/nationale-1-masculine-2025-26-28229/equipe-1954535/',
    'http://ffhandball.fr/competitions/saison-2025-2026-21/national/nationale-1-masculine-2025-26-28229/equipe-1954529/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/liqui-moly-starligue-2025-26-28399/equipe-1947866/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/proligue-2025-26-28551/equipe-1957555/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/liqui-moly-starligue-2025-26-28399/equipe-1947878/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/proligue-2025-26-28551/equipe-1957557/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/proligue-2025-26-28551/equipe-1957560/',
    'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/proligue-2025-26-28551/equipe-1957558/'
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
    const monthsMap = { jan: 0, fév: 1, mar: 2, avr: 3, mai: 4, jui: 5, jul: 6, aoû: 7, sep: 8, oct: 9, nov: 10, déc: 11 };
    const parts = dateStr.toLowerCase().split(' ');
    if (parts.length < 4) return null;
    const day = parseInt(parts[1]);
    const month = monthsMap[parts[2].replace('.', '')];
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
    const year = (month <= 5) ? 2026 : 2025; 
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
    now.setHours(0,0,0,0);

    for (let url of FOOTBALL_URLS) {
        const urlParts = url.split('/');
        const clubSlug = urlParts[5].split('-').slice(1).join(' ').toUpperCase();
        const targetSearch = normalize(clubSlug);
        let teamMatchCount = 0;

        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            try { 
                await page.waitForSelector('#didomi-notice-agree-button', { timeout: 2000 });
                await page.click('#didomi-notice-agree-button'); 
            } catch (e) {}

            for (let i = 0; i < 3; i++) {
                await new Promise(r => setTimeout(r, 500));
                const monthMatches = await page.evaluate((target) => {
                    const cards = document.querySelectorAll('app-match-score');
                    return Array.from(cards).map(card => {
                        const home = card.querySelector('.recevant .equipe-name')?.innerText.trim() || "";
                        const normHome = home.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/FC$|SFC$|21$|23$|78FC$|92$|SC$/, '');
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
                            sport: "football",
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

                const nextBtn = await page.$('button.next-button');
                if (nextBtn) await nextBtn.click(); else break;
            }
            console.log(`✅ ${clubSlug} : ${teamMatchCount} matchs trouvés.`);
        } catch (error) { 
            console.log(`❌ Erreur FFF sur ${clubSlug}`); 
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

    for (let url of BASKET_URLS) {
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.waitForSelector('h1.font-AgencyFBBlackComp');

            const pageData = await page.evaluate(() => {
                const mainClubName = document.querySelector('h1.font-AgencyFBBlackComp')?.innerText.trim() || "CLUB";
                const compLabel = Array.from(document.querySelectorAll('span.text-\\[\\#8a8ea1\\]'))
                    .map(s => s.innerText).find(t => t.includes('|'))?.replace(/[|\s\u00A0]/g, '') || "N/A";

                const results = [];
                const rows = document.querySelectorAll('div.bg-white.h-\\[115px\\], div.bg-white.lg\\:h-\\[65px\\]');
                rows.forEach(row => {
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

            const filtered = pageData.matches.map(m => {
                const matchDate = parseFFBBDate(m.dateRaw);
                if (matchDate && matchDate >= now && matchDate <= limitDate) {
                    return {
                        sport: "basketball",
                        isoDate: matchDate.toISOString(),
                        date: matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                        home: m.home,
                        away: m.away,
                        competition: m.competition,
                        round: m.round,
                        location: "N/A",
                        timestamp: matchDate.getTime()
                    };
                }
                return null;
            }).filter(m => m !== null);

            allBasketMatches.push(...filtered);
            console.log(`✅ ${pageData.club} : ${filtered.length} matchs trouvés.`);

        } catch (e) {
            console.error(`❌ Erreur FFBB sur ${url} :`, e.message);
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

    for (let url of HANDBALL_URLS) {
        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
            await page.waitForSelector('[class*="block_component__"]', { timeout: 15000 });

            const targetTeam = await page.evaluate(() => {
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

            if (!targetTeam) {
                console.log(`⚠️ Impossible d'identifier le club HB sur ${url}.`);
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
                        isoDate: matchDate.toISOString(),
                        date: matchDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
                        home: m.home,
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
            console.log(`✅ ${targetTeam} : ${filtered.length} matchs.`);

        } catch (error) {
            console.error(`❌ Erreur FFHB sur ${url} :`, error.message);
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

    const footballMatches = await scrapeFootball(page);
    const basketMatches = await scrapeBasketball(page);
    const handballMatches = await scrapeHandball(page);

    const allMatches = [...footballMatches, ...basketMatches, ...handballMatches]
        .sort((a, b) => a.timestamp - b.timestamp)
        .map(({ timestamp, ...rest }) => rest);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allMatches, null, 4));
    
    console.log(`\n====================================`);
    console.log(`✨ FIN DU SCRAPING GLOBAL`);
    console.log(`⚽ Football : ${footballMatches.length}`);
    console.log(`🏀 Basketball : ${basketMatches.length}`);
    console.log(`🤾 Handball : ${handballMatches.length}`);
    console.log(`📂 Fichier ${OUTPUT_FILE} mis à jour (${allMatches.length} matchs au total).`);
    console.log(`====================================`);

    await browser.close();
}

run();