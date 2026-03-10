const getMatchId = (m) => {
    // Le regex /['"\s]/g cible : les apostrophes ('), les guillemets (") et les espaces (\s)
    const clean = (str) => str.replace(/['"\s]/g, '');

    const h = clean(m.home.name);
    const a = clean(m.away.name);
    
    // Sécurité supplémentaire : s'assurer que la date est valide
    const d = m.dateObj ? m.dateObj.toISOString().split('T')[0] : 'NODATE';
    
    return `${h}_${a}_${d}`;
};

// Fonction de cycle appelée au clic
function cycleStatus(event, matchId) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const icon = btn.querySelector('i');

    // Trouver le statut actuel et le suivant
    const currentStatus = matchStatuses[matchId] || null;
    const currentIndex = STATUS_CYCLE.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    const nextStatus = STATUS_CYCLE[nextIndex];

    // --- LOGIQUE D'ARCHIVAGE STRICTE ---
    // On nettoie l'ID pour la recherche
    const cleanId = matchId.replace(/\s+/g, '');
    const matchDataObj = allMatches.find(m => getMatchId(m) === cleanId);
    
    let snapshot = null;

    // RÈGLE : On archive UNIQUEMENT si le statut devient 'received'
    if (nextStatus === 'received' && matchDataObj) {
        snapshot = {
            sport: matchDataObj.sport,
            home: { name: matchDataObj.home.name },
            away: { name: matchDataObj.away.name },
            compFormatted: matchDataObj.compFormatted,
            dateObj: matchDataObj.dateObj.toISOString()
        };
        // On sauvegarde en local
        matchArchives[matchId] = snapshot;
    } else {
        // Pour tout autre statut (asked, envie, refused, null), on SUPPRIME l'archive
        delete matchArchives[matchId];
        snapshot = null; // Cela signalera à Firebase de supprimer le champ
    }
    // -----------------------------------

    // 1. Mise à jour des variables globales
    if (nextStatus) {
        matchStatuses[matchId] = nextStatus;
    } else {
        delete matchStatuses[matchId];
    }

    // 2. Mise à jour du Cache Local
    localStorage.setItem('matchStatuses', JSON.stringify(matchStatuses));
    localStorage.setItem('matchArchives', JSON.stringify(matchArchives)); // <--- Sauvegarde locale

    // 3. LOGIQUE CONNEXION & CLOUD
    if (auth.currentUser) {
        // On envoie le snapshot (qui est null si pas 'received', donc ça supprimera)
        syncFavoriteToFirebase(matchId, nextStatus, snapshot);
    } else {
        if (nextStatus && !localStorage.getItem('hasShownLoginHint')) {
            localStorage.setItem('hasShownLoginHint', 'true');
            const hintModal = document.getElementById('favHintModal');
            if (hintModal) hintModal.classList.remove('hidden');
        }
    }

    // 4. Mise à jour Visuelle
    btn.classList.remove('status-envie', 'status-asked', 'status-received', 'status-refused');
    if (nextStatus) btn.classList.add(`status-${nextStatus}`);
    icon.className = getStatusIcon(nextStatus);
    
    const titles = {
        envie: "Envie d'y aller",
        asked: "Accréditation demandée",
        received: "Accréditation confirmée !",
        refused: "Accréditation refusée",
        null: "Ajouter au suivi"
    };
    btn.title = titles[nextStatus] || titles.null;
}

// Fonction pour envoyer un changement unique à Firebase
async function syncFavoriteToFirebase(matchId, status, snapshotData) {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = db.collection('users').doc(user.uid);
    const payload = {};

    if (status) {
        payload.favorites = { [matchId]: status };
    } else {
        payload.favorites = { [matchId]: firebase.firestore.FieldValue.delete() };
    }

    if (snapshotData) {
        payload.archives = { [matchId]: snapshotData };
    } else {
        payload.archives = { [matchId]: firebase.firestore.FieldValue.delete() };
    }

    try {
        await userRef.set(payload, { merge: true });
    } catch (e) {
        console.error(e);
    }
}

// Helpers visuels (Icône selon le statut)
const getStatusIcon = (status) => {
    switch(status) {
        case 'envie': return 'fa-solid fa-star';          // Étoile pleine
        case 'asked': return 'fa-solid fa-paper-plane';   // Avion papier
        case 'received': return 'fa-solid fa-circle-check'; // Coche validée
        case 'refused': return 'fa-solid fa-circle-xmark'; // Croix refusée
        default: return 'fa-regular fa-star';             // Étoile vide
    }
};

const getTeamCoords = (name) => {
    const upperName = name.toUpperCase();
    const key = Object.keys(STADIUM_COORDS).find(k => upperName.includes(k));
    
    // --- AJOUT LOG ---
    if (!key) {
        console.warn(`❌ Pas de coordonnées pour : ${name}`);
    }
    // -----------------

    return key ? STADIUM_COORDS[key] : null;
};

async function fetchWeather(lat, lon, date) {
    if (!lat || !lon || !date || isNaN(date.getTime())) return null;

    const now = new Date();
    const diffInDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    // 1. Sécurité : Open-Meteo limite à 16 jours. On bloque à 14 pour éviter l'erreur 400.
    if (diffInDays > 14 || diffInDays < -1) return null; 

    // 2. Cache localStorage : Clé unique par lieu et par date
    const dateStr = date.toISOString().split('T')[0];
    const cacheKey = `weather_${lat}_${lon}_${dateStr}`;
    const stored = localStorage.getItem(cacheKey);
    
    if (stored) return stored;

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code&start_date=${dateStr}&end_date=${dateStr}&timezone=auto`;
        const res = await fetch(url);
        
        if (!res.ok) return null; // Si l'API renvoie 400 ou 500, on ignore proprement

        const data = await res.json();
        if (data.daily && data.daily.weather_code) {
            const icon = WEATHER_ICONS[data.daily.weather_code[0]] || "🌡️";
            // On mémorise l'émoji (valable pour toujours car la date est fixée)
            localStorage.setItem(cacheKey, icon);
            return icon;
        }
    } catch (e) {
        console.error("Erreur météo:", e);
    }
    return null;
}

async function updateDistances() {
    // Vérification de sécurité
    if (isCalculating) return;
    if (!userPosition) {
        // Optionnel : Alert si on appelle la fonction sans position (ne devrait pas arriver via le workflow actuel)
        console.warn("Tentative de calcul sans position utilisateur.");
        return;
    }

    isCalculating = true;

    // --- MISE À JOUR VISUELLE (Spinner sur le GPS si c'est lui qui a lancé ?) ---
    // Pour l'instant, on laisse l'UI gérée par requestUserLocation ou handleCitySearch
    // Mais on peut changer le curseur pour montrer que ça travaille
    document.body.style.cursor = "wait";

    const targets = currentlyFiltered;

    // --- RESET VISUEL ---
    // On remet les distances à 0 pour montrer à l'utilisateur que ça change
    allMatches.forEach(m => {
        m.distance = 0;
        m.times.car = 0;
        m.times.public = 0;
    });
    
    renderMatches(currentlyFiltered); 

    // --- CALCUL PARALLÈLE ---
    await Promise.all(targets.map(async (m) => {
        if (m.locationCoords) {
            const travel = await fetchTravelData(userPosition.lat, userPosition.lon, m.locationCoords.lat, m.locationCoords.lon);
            
            // Gestion Météo (si applicable)
            if (m.sport.toLowerCase() === "football") {
                m.weather = await fetchWeather(m.locationCoords.lat, m.locationCoords.lon, m.dateObj);
            }

            if (travel) {
                // On met à jour TOUTES les occurrences de ce match dans la mémoire globale
                allMatches.forEach(match => {
                    if (match.home.name === m.home.name) {
                        match.distance = travel.dist;
                        match.times.car = travel.car;
                        match.times.public = Math.round(travel.car * 1.5 + 15);
                    }
                });
            }
        }
    }));

    // Fin du calcul
    isCalculating = false;
    document.body.style.cursor = "default";
    
    // Rendu final avec les nouvelles valeurs
    applyFilters();
}

function exportToGoogleCalendar(home, away, dateObj, comp, sport, coords) {
    // --- VERIFICATION AUTH ---
    if (!checkAuthOrBlock()) return;
    // -------------------------

    const formatDate = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");

    // Si dateObj est passé comme string par le HTML inline, on le reconvertit
    const d = new Date(dateObj); 

    const startTime = formatDate(d);
    const endTime = formatDate(new Date(d.getTime() + 2 * 60 * 60 * 1000));

    const title = encodeURIComponent(`${home} vs ${away}`);
    const details = encodeURIComponent(`Accréditation photographe sur le match ${home} vs ${away} en ${comp} - Généré via Fokal Press`);
    
    const locationValue = coords ? `${coords.lat},${coords.lon}` : home;
    const location = encodeURIComponent(locationValue);

    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=${location}`;
    
    window.open(url, '_blank');
}

const getLogoUrl = (name) => {
    if (logoCache.has(name)) return logoCache.get(name);

    const upperName = name.toUpperCase();
    const customKey = Object.keys(CUSTOM_LOGOS).find(key => upperName.includes(key));
    
    let finalUrl;
    if (customKey) {
        finalUrl = CUSTOM_LOGOS[customKey];
    } else {
        finalUrl = ''; 
        console.warn(`⚠️ Aucun logo trouvé pour le club : "${name}"`);
    }

    logoCache.set(name, finalUrl);
    return finalUrl;
};


const getShortComp = (formattedComp, sport) => {
    if (formattedComp === "AUTRE") return "🔖";
    
    // On récupère l'émoji
    const emoji = SPORT_EMOJIS[sport.toLowerCase()] || "🏟️";
    
    // On décompose "SPORT - L1 - SENIOR"
    const parts = formattedComp.split(' - ');
    // parts[0] = Sport (on a déjà l'émoji)
    const level = parts[1] || "";
    let age = parts[2] || "";

    // Abréviations
    if (age === "SENIOR") age = "S";
    else if (age === "SENIOR F") age = "SF";
    else if (age === "U21" || age === "ESPOIRS") age = "U21";
    
    // Retourne "🏀 - L1 - S"
    return `${emoji} - ${level} - ${age}`;
};

const formatCompetition = (rawName, sport) => {
    if (!rawName) return "MATCH";
    const name = rawName.toUpperCase();
    const s = (sport).toLowerCase();
    
    let sportLabel = s.includes("basket") ? "BASKET" : (s.includes("foot") ? "FOOT" : "HAND");
    
    let level = "AUTRE", age = "SENIOR";

    // --- NIVEAU L1 ---<
    if (name.includes("BETCLIC") || name.includes("STARLIGUE") || name.includes("LIGUE 1") || name.includes("L1")) { level = "L1"; }
    else if (name.includes("BUTAGAZ") || name.includes("LBWL")) { level = "L1"; age = "SENIOR F"; }
    else if (name.includes("ARKEMA") || name.includes("PREMIERE LIGUE")) { level = "L1"; age = "SENIOR F"; }

    // --- NIVEAU L2 ---
    else if (name.includes("ÉLIT2") || name.includes("PROLIGUE")) { level = "L2"; }
    else if (name.includes("LIGUE 2") || name.includes("L2")) { level = "L2"; }
    else if (name.includes("SECONDE LIGUE")) { level = "L2"; age = "SENIOR F"; } 
    else if (name.includes("LF2")) { level = "L2"; age = "SENIOR F"; }

    // --- NIVEAU N1 ---
    else if (name.includes("NF1")) { level = "N1"; age = "SENIOR F"; }
    else if (name.includes("ESPOIRS")) { level = "L1"; age = "U21"; }
    else if (name.includes("NM1")) { level = "N1"; }
    else if (name.includes("NATIONALE 1") || name.includes("NATIONAL 1") || name.includes("NATIONAL - SENIOR")) { level = "N1"; }

    // --- LOGIQUE GÉNÉRIQUE ---
    else {
        const isFeminine = name.includes("FÉMININ") || name.includes("FEMININ") || name.includes(" F ") || name.includes("SEF");

        if (name.includes("COUPE") || name.includes("TROPH") || name.includes("CDF")) level = "COUPE";
        else if (name.includes("AMICAL") || name.includes("AMICAUX") || name.includes("PRÉPARATION") || name.includes("PREPARATION")) level = "AMICAL";
        
        if (name.includes("N3")) level = "N3";
        else if (name.includes("N2")) level = "N2";
        else if (name.includes("D3") && (name.includes("FÉMININE") || name.includes("FEMININE"))) level = "L3";
        else if (name.includes("NATIONAL - SENIOR")) level = "N1";
        else if (name.includes("NATIONAL") || name.includes("NAT")) level = "NAT";
        
        if (name.includes("U19")) age = "U19";
        else if (name.includes("U17")) age = "U17";
        
        if (isFeminine && !age.includes("F")) age += " F";
    }

    // --- MODIFICATION ICI ---
    // Si le niveau est "AUTRE", on ne met pas le sport devant.
    // Cela permet de grouper "AUTRE - SENIOR" pour le Foot et le Basket ensemble.
    if (level === "AUTRE") {
        return "AUTRE";
    }

    return `${sportLabel} - ${level} - ${age}`;
};

const getCompFilterGroup = (compFormatted) => {
    if (!compFormatted) return "AUTRE";
    
    const parts = compFormatted.split(' - ');
    // On vérifie qu'on a bien au moins "SPORT" et "NIVEAU"
    if (parts.length >= 2) {
        const sportLabel = parts[0]; // ex: "FOOT"
        const level = parts[1];      // ex: "COUPE" ou "AMICAL"
        
        if (level === "COUPE" || level === "AMICAL") {
            return `${sportLabel} - ${level}`; // Retourne "FOOT - COUPE"
        }
    }
    return compFormatted;
};

async function loadMatches() {
    try {
        const response = await fetch('data/matchs.json');
        const data = await response.json();
        allMatches = data.map(m => {
            const d = new Date(m.isoDate);
            // Formatage de l'heure (ex: 19h00)
            const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).replace(':', 'h');
            // On force le format : "sam. 7 févr. 2026" puis on enlève les points pour faire "sam 7 févr 2026"
            const shortDate = d.toLocaleDateString('fr-FR', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
            }).replace(/\./g, ''); // Enlève les points (ex: "sam." -> "sam")
                            
        return {
                sport: m.sport,
                sourceUrl: m.url || m.sourceUrl || "#",
                competition: m.competition || "N/A",
                compFormatted: formatCompetition(m.competition, m.sport),
                home: { name: m.home }, 
                away: { name: m.away },
                dateDisplay: shortDate,
                dateShort: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }), 
                dateObj: d,
                time: time,
                locationCoords: getTeamCoords(m.home),
                distance: 0,
                times: { car: 0, public: 0 },
                isCalculating: false
            };
        }).sort((a, b) => a.dateObj - b.dateObj);

        const uniqueTeamsSet = new Set();
        allMatches.forEach(m => {
            uniqueTeamsSet.add(m.home.name);
            uniqueTeamsSet.add(m.away.name);
        });
        // On convertit en tableau et on trie
        searchTeamsList = Array.from(uniqueTeamsSet).sort();

        // On lance l'initialisation de l'auto-complete principal
        initSearchAutocomplete();

        loadFiltersFromUrl();
                        
        applyFilters();
    } catch (error) {
        document.getElementById('grid').innerHTML = `<div class="error-msg">Erreur de chargement.</div>`;
        console.error("Détail de l'erreur :", error);
    }
}

async function fetchTravelData(uLat, uLon, dLat, dLon) {
    const cacheKey = `travel_${uLat}_${uLon}_${dLat}_${dLon}`;

    // 1. Vérification du localStorage (Persistance longue durée)
    const stored = localStorage.getItem(cacheKey);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            // On vérifie si le cache a moins de 24h (86400000 ms)
            if (Date.now() - parsed.timestamp < 86400000) {
                // On remet en mémoire vive pour les prochains accès rapides
                travelCache.set(cacheKey, parsed.data);
                return parsed.data;
            }
        } catch (e) {
            console.warn("Erreur lecture localStorage", e);
        }
    }
    
    // 2. Vérification du travelCache (Mémoire vive - Map)
    if (travelCache.has(cacheKey)) return travelCache.get(cacheKey);

    // 3. Appel API Geoapify si aucune donnée en cache
    try {
        const url = `https://api.geoapify.com/v1/routing?waypoints=${uLat},${uLon}|${dLat},${dLon}&mode=drive&apiKey=${GEOAPIFY_KEY}`;
        const res = await fetch(url);
        
        if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
        
        const data = await res.json();
        
        if (data.features?.length > 0) {
            const props = data.features[0].properties;
            const result = { 
                dist: Math.round(props.distance / 1000), 
                car: Math.round(props.time / 60) 
            };

            // 4. Sauvegarde dans les deux caches
            travelCache.set(cacheKey, result); // Mémoire vive
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: result
            })); // Stockage local

            return result;
        }
    } catch (e) { 
        console.warn("Erreur lors de la récupération du trajet :", e); 
    }
    return null;
}

function resetDistancesDisplay() {
    // Remet les données à zéro
    allMatches.forEach(m => {
        m.distance = 0;
        m.times.car = 0;
        m.times.public = 0;
    });
    // Rafraichit la grille
    applyFilters();
}

function requestUserLocation(btnElement, originalIcon) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async pos => {
            const newPos = { 
                lat: pos.coords.latitude, 
                lon: pos.coords.longitude 
            };

            // Gestion du changement de position (nettoyage cache)
            if (userPosition) {
                const latDiff = Math.abs(userPosition.lat - newPos.lat);
                const lonDiff = Math.abs(userPosition.lon - newPos.lon);
                if (latDiff > 0.05 || lonDiff > 0.05) {
                    travelCache.clear();
                    // Nettoyage localStorage partiel si besoin...
                }
            }

            userPosition = newPos;
            localStorage.setItem('userLastPosition', JSON.stringify(newPos)); 
            
            // Mise à jour visuelle (Succès)
            if(btnElement) {
                btnElement.innerHTML = originalIcon; // Remet l'icône normale
                btnElement.classList.add('active');
            }
            
            console.log("📍 Position GPS trouvée. Lancement du calcul...");
            
            // --- AUTOMATISATION : ON LANCE LE CALCUL ICI ---
            await updateDistances(); 
            
        }, (error) => {
            console.warn("Erreur géo:", error);
            if(btnElement) {
                btnElement.innerHTML = originalIcon;
                btnElement.classList.remove('active');
            }
            alert("Impossible de vous géolocaliser.");
        });
    } else {
        alert("Géolocalisation non supportée.");
    }
}