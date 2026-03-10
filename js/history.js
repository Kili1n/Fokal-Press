function initManualMatchForm() {
    // 1. Reset Mode Édition
    editingMatchId = null; 
    const submitBtn = document.querySelector('#addMatchForm button[type="submit"]');
    if(submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-plus"></i> Ajouter le match';

    const deleteBtn = document.getElementById('manualDeleteBtn');
    if (deleteBtn) {
        deleteBtn.style.display = 'none';
    }

    // 2. Reset des données
    const uniqueTeams = new Map(); 
    const uniqueComps = new Map(); 

    allMatches.forEach(m => {
        const s = m.sport.toLowerCase();
        
        // --- A. GESTION DES ÉQUIPES ---
        if(!uniqueTeams.has(m.home.name)) uniqueTeams.set(m.home.name, s);
        if(!uniqueTeams.has(m.away.name)) uniqueTeams.set(m.away.name, s);
        
        // --- B. GESTION DES COMPÉTITIONS (CORRECTION ICI) ---
        // Format habituel : "SPORT - NIVEAU - AGE"
        const parts = m.compFormatted.split(' - ');
        
        let displayComp = "";
        
        if (parts.length >= 3) {
            const level = parts[1]; // Ex: "L1", "N3"
            const age = parts[2];   // Ex: "SENIOR F", "U19", "SENIOR"
            
            // NOUVELLE LOGIQUE :
            // On garde l'âge si ce n'est pas juste "SENIOR" (homme standard).
            // Si c'est "SENIOR F", on veut afficher "L1 F".
            
            // Est-ce une catégorie féminine ?
            const isWomen = age.includes("F") || age.includes("FEM") || age.includes("FÉM");
            // Est-ce une catégorie jeune ?
            const isYouth = age.includes("U") || age.includes("ESPOIRS");

            if (isWomen || isYouth) {
                // On nettoie "SENIOR" pour ne garder que le "F" si présent
                let suffix = age.replace("SENIOR", "").replace("Sr", "").trim();
                
                // Si le suffixe est vide mais que c'était U19, on garde l'original
                if (!suffix && isYouth) suffix = age;
                
                displayComp = `${level} ${suffix}`.trim();
            } else {
                // C'est un Senior Homme standard, on affiche juste le niveau
                displayComp = level;
            }

        } else {
            // Cas de secours
            displayComp = m.compFormatted.replace(`${m.sport.toUpperCase()} - `, '');
        }

        // On stocke : Clé unique = "Nom + Sport" pour éviter les mélanges
        const uniqueKey = `${displayComp}_${s}`;
        
        if (!uniqueComps.has(uniqueKey)) {
            // On stocke l'objet propre pour l'autocomplete
            uniqueComps.set(uniqueKey, { name: displayComp, sport: s });
        }
    });

    // Conversion en tableaux exploitables
    manualTeamsData = Array.from(uniqueTeams, ([name, sport]) => ({ name, sport })).sort((a,b) => a.name.localeCompare(b.name));
    manualCompsData = Array.from(uniqueComps, ([key, val]) => val).sort((a,b) => a.name.localeCompare(b.name));

    // 3. Initialisation de l'affichage (charge la liste par défaut, souvent Football)
    refreshManualLists();

    // 4. Reset UI
    document.getElementById('step-1').classList.remove('hidden');
    document.getElementById('step-2').classList.add('hidden');
    document.getElementById('manualHomeLogoDiv').classList.add('hidden');
    document.getElementById('manualAwayLogoDiv').classList.add('hidden');
    
    // Vider les champs
    document.getElementById('manualComp').value = "";
    document.getElementById('manualHome').value = "";
    document.getElementById('manualAway').value = "";
    document.getElementById('manualHomeLogo').value = "";
    document.getElementById('manualAwayLogo').value = "";
    document.getElementById('manualDate').value = ""; 
    document.getElementById('manualTime').value = "";
}

function refreshManualLists() {
    // 1. Quel sport est sélectionné ?
    const selectedSport = document.querySelector('input[name="manualSport"]:checked').value;
    
    // 2. Filtrer les données
    const filteredTeams = manualTeamsData.filter(t => t.sport === selectedSport).map(t => t.name);
    const filteredComps = manualCompsData.filter(c => c.sport === selectedSport); // Garde l'objet {name, sport} pour l'emoji

    // 3. Ré-initialiser les autocompletes avec les nouvelles données
    
    // A. Équipe Domicile
    setupAutocomplete(
        document.getElementById('manualHome'), 
        document.getElementById('homeResults'), 
        filteredTeams, 
        (teamName) => {
            const logo = getLogoUrl(teamName) || 'data/default-team.png';
            return `<img src="${logo}" class="result-icon" onerror="this.src='data/default-team.png'"> <span>${teamName}</span>`;
        }
    );

    // B. Équipe Extérieur
    setupAutocomplete(
        document.getElementById('manualAway'), 
        document.getElementById('awayResults'), 
        filteredTeams, 
        (teamName) => {
            const logo = getLogoUrl(teamName) || 'data/default-team.png';
            return `<img src="${logo}" class="result-icon" onerror="this.src='data/default-team.png'"> <span>${teamName}</span>`;
        }
    );

    // C. Compétition
    setupAutocomplete(
        document.getElementById('manualComp'), 
        document.getElementById('compResults'), 
        filteredComps, 
        (compObj) => {
            // compObj est {name, sport}
            const emoji = SPORT_EMOJIS[compObj.sport] || "🏆";
            return `<span class="result-emoji">${emoji}</span> <span>${compObj.name}</span>`;
        },
        true // Flag objet
    );
}

function setupAutocomplete(input, resultsContainer, dataArray, renderer, isObject = false) {
    // On clone le noeud pour supprimer les anciens EventListeners (éviter les doublons lors du refresh)
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    input = newInput;

    const showResults = (val) => {
        resultsContainer.innerHTML = '';
        const filterVal = val.toLowerCase();
        
        const matches = dataArray.filter(item => {
            const textToCheck = isObject ? item.name : item;
            return textToCheck.toLowerCase().includes(filterVal);
        });

        if (matches.length === 0) {
            resultsContainer.classList.add('hidden');
            return;
        }

        matches.slice(0, 10).forEach(item => {
            const div = document.createElement('div');
            div.className = 'result-item';
            const textValue = isObject ? item.name : item;
            
            div.innerHTML = renderer(item);
            
            div.addEventListener('click', () => {
                input.value = textValue;
                resultsContainer.classList.add('hidden');
            });
            
            resultsContainer.appendChild(div);
        });
        
        resultsContainer.classList.remove('hidden');
    };

    input.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length < 1) {
            resultsContainer.classList.add('hidden');
            return;
        }
        showResults(val);
    });

    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
    
    input.addEventListener('focus', () => {
        if(input.value.length > 0) showResults(input.value);
    });
}

function editMatch(id) {
    const m = matchArchives[id];
    if (!m) return;

    // 1. Ouvrir la modale et reset le formulaire
    initManualMatchForm(); 
    document.getElementById('addMatchModal').classList.remove('hidden');

    // 2. Passer en mode Édition
    editingMatchId = id;
    
    // On met à jour le texte du bouton final (au cas où on va à l'étape 2)
    const form = document.getElementById('addMatchForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    if(submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Modifier le match';

    // --- CORRECTION : CIBLER L'ÉTAPE 1 (VISIBLE) ---
    let deleteBtn = document.getElementById('manualDeleteBtn');
    
    // On cible le bouton "Suivant" qui est dans l'étape 1
    const nextBtn = document.getElementById('nextStepBtn');

    // A. Création du bouton s'il n'existe pas
    if (!deleteBtn) {
        deleteBtn = document.createElement('button');
        deleteBtn.type = 'button'; 
        deleteBtn.id = 'manualDeleteBtn';
        deleteBtn.className = 'login-btn'; 
        
        // Styles Rouge
        deleteBtn.style.backgroundColor = '#FF3B30';
        deleteBtn.style.borderColor = '#FF3B30';
        deleteBtn.style.color = 'white';
        deleteBtn.style.marginTop = '10px';
        deleteBtn.style.width = '100%';
        deleteBtn.style.fontWeight = '600';
    }

    // B. INSERTION DANS L'ÉTAPE 1
    // On insère le bouton rouge juste après le bouton "Suivant"
    if (nextBtn && nextBtn.parentNode) {
        nextBtn.parentNode.insertBefore(deleteBtn, nextBtn.nextSibling);
    } 

    // C. Configuration
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Supprimer ce match';
    deleteBtn.style.display = 'block'; 
    
    deleteBtn.onclick = () => {
        document.getElementById('addMatchModal').classList.add('hidden');
        askDeleteMatch(id);
    };
    // ---------------------------------------------------------

    // 3. Remplir les champs existants
    const radios = document.querySelectorAll('input[name="manualSport"]');
    radios.forEach(r => {
        if (r.value === m.sport) r.checked = true;
    });
    refreshManualLists(); 

    // Récupération de la compétition
    const compParts = m.compFormatted.split(' - ');
    let displayComp = compParts[1] || m.compFormatted; 
    const suffix = compParts[2];

    if (suffix && suffix !== "SENIOR") {
        displayComp += ` ${suffix}`;
    }
    
    document.getElementById('manualComp').value = displayComp;
    document.getElementById('manualHome').value = m.home.name;
    document.getElementById('manualAway').value = m.away.name;
    
    if (m.home.logo) document.getElementById('manualHomeLogo').value = m.home.logo;
    if (m.away.logo) document.getElementById('manualAwayLogo').value = m.away.logo;

    if (m.dateObj && m.dateObj !== "UNKNOWN") {
        const d = new Date(m.dateObj);
        document.getElementById('manualDate').value = d.toISOString().split('T')[0];
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        document.getElementById('manualTime').value = `${hh}:${mm}`;
    }

    if(m.home.logo) document.getElementById('manualHomeLogoDiv').classList.remove('hidden');
    if(m.away.logo) document.getElementById('manualAwayLogoDiv').classList.remove('hidden');
}

function askDeleteMatch(matchId) {
    matchToDelete = matchId; // On mémorise l'ID
    document.getElementById('deleteConfirmModal').classList.remove('hidden');
}

async function executeDeleteMatch() {
    if (!matchToDelete) return;

    const btn = document.getElementById('confirmDeleteBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const user = firebase.auth().currentUser;
        
        // A. Suppression Locale
        delete matchArchives[matchToDelete];
        
        // Si c'est un match "Favori" (pas manuel), on le retire aussi des statuts
        // pour qu'il ne réapparaisse pas comme "Accréditation confirmée"
        if (matchStatuses[matchToDelete]) {
            delete matchStatuses[matchToDelete];
            localStorage.setItem('matchStatuses', JSON.stringify(matchStatuses));
        }

        localStorage.setItem('matchArchives', JSON.stringify(matchArchives));

        // B. Suppression Firebase
        if (user) {
            const updateData = {};
            // Suppression de l'archive
            updateData[`archives.${matchToDelete}`] = firebase.firestore.FieldValue.delete();
            // Suppression du statut favori (si existant)
            updateData[`favorites.${matchToDelete}`] = firebase.firestore.FieldValue.delete();
            
            await db.collection('users').doc(user.uid).update(updateData);
        }

        // C. UI Update
        renderHistory();
        renderMatches(currentlyFiltered); // Met à jour la grille principale pour enlever le statut vert
        
        // Fermer la modale
        document.getElementById('deleteConfirmModal').classList.add('hidden');

    } catch (error) {
        console.error("Erreur suppression :", error);
        alert("Erreur lors de la suppression.");
    } finally {
        // Reset bouton
        btn.innerHTML = 'Supprimer';
        btn.disabled = false;
        matchToDelete = null;
    }
}

function exportHistoryToCSV() {
    // 1. Récupération des données
    const archives = matchArchives ? Object.values(matchArchives) : [];

    if (archives.length === 0) {
        alert("Aucun historique à exporter.");
        return;
    }

    // 2. FILTRAGE STRICT (Identique à l'affichage)
    // On ne garde que les matchs qui n'ont pas "Inconnue" dans leurs noms d'équipes
    const validArchives = archives.filter(m => {
        // Sécurité : si m.home est undefined, on considère que c'est "Inconnue"
        const homeName = m.home?.name || "Inconnue";
        const awayName = m.away?.name || "Inconnue";
        
        // Si l'un des deux contient "Inconnue", on EXCLUT du CSV
        if (homeName.includes("Inconnue") || awayName.includes("Inconnue")) {
            return false;
        }
        return true;
    });

    if (validArchives.length === 0) {
        alert("Aucune donnée valide à exporter.");
        return;
    }

    // 3. Préparation du CSV
    const headers = ["Date", "Heure", "Sport", "Competition", "Domicile", "Exterieur", "Type"];
    
    // Fonction de nettoyage pour éviter les bugs CSV (guillemets, null, etc.)
    const clean = (data) => {
        if (data === null || data === undefined) return '""';
        const str = String(data);
        return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = validArchives.map(m => {
        let dateStr = "Date Inconnue";
        let timeStr = "--:--";

        try {
            if (m.dateObj && m.dateObj !== "UNKNOWN") {
                const d = new Date(m.dateObj);
                if (!isNaN(d.getTime())) {
                    dateStr = d.toLocaleDateString('fr-CA'); // YYYY-MM-DD
                    timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                }
            }
        } catch (e) { console.warn("Erreur date export", e); }

        return [
            clean(dateStr),
            clean(timeStr),
            clean(m.sport || "Inconnu"),
            clean(m.compFormatted || "Autre"),
            clean(m.home?.name || ""), // Plus besoin de valeur par défaut "Inconnue" car déjà filtré
            clean(m.away?.name || ""),
            clean(m.isManual ? "Manuel" : "Accréditation")
        ].join(",");
    });

    // 4. Génération et Téléchargement
    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `FokalPress_Historique_${today}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function handleManualMatchSubmit() {
    const user = firebase.auth().currentUser;
    if (!user) { alert("Erreur auth."); return; }

    const sport = document.querySelector('input[name="manualSport"]:checked').value;
    
    // --- CORRECTION ANALYSE DU TEXTE ---
    let compRaw = document.getElementById('manualComp').value.trim(); // ex: "L1 SENIOR F"
    
    let age = "SENIOR";
    let level = compRaw;

    const upperComp = compRaw.toUpperCase();

    // 1. Détection Féminin (SENIOR F ou juste F à la fin)
    if (upperComp.includes("SENIOR F") || upperComp.includes("SF") || (upperComp.endsWith(" F") && !upperComp.includes("U"))) {
        age = "SENIOR F";
        // On nettoie le niveau pour ne garder que "L1"
        level = compRaw.replace(/SENIOR F/i, '').replace(/ SF/i, '').replace(/ F$/i, '').trim();
    }
    // 2. Détection Jeunes (U19, U17...)
    else {
        const ageMatch = compRaw.match(/(U\d+|ESPOIRS|PRO A|PRO B)/i);
        if (ageMatch) {
             age = ageMatch[0].toUpperCase();
             // Si c'est "NAT U19", level devient "NAT"
             level = compRaw.replace(ageMatch[0], '').trim();
        }
    }
    
    // On reformate : "HAND - L1 - SENIOR F"
    const compFormatted = `${sport.toUpperCase()} - ${level.toUpperCase()} - ${age}`;
    // -----------------------------------
    
    const homeName = document.getElementById('manualHome').value.trim();
    const awayName = document.getElementById('manualAway').value.trim();
    const homeLogo = document.getElementById('manualHomeLogo').value.trim();
    const awayLogo = document.getElementById('manualAwayLogo').value.trim();

    const dateVal = document.getElementById('manualDate').value;
    const timeVal = document.getElementById('manualTime').value;

    let dateObjString = "UNKNOWN";
    if (dateVal) {
        const d = new Date(dateVal);
        if (timeVal) {
            const [h, m] = timeVal.split(':');
            d.setHours(h, m);
        } else { d.setHours(20, 0); }
        dateObjString = d.toISOString();
    }

    const matchId = editingMatchId ? editingMatchId : `manual_${Date.now()}`;
    
    const matchSnapshot = {
        sport: sport,
        compFormatted: compFormatted,
        home: { name: homeName, logo: homeLogo }, 
        away: { name: awayName, logo: awayLogo },
        dateObj: dateObjString,
        isManual: true
    };

    try {
        matchArchives[matchId] = matchSnapshot;
        localStorage.setItem('matchArchives', JSON.stringify(matchArchives));
        
        const updateData = {};
        updateData[`archives.${matchId}`] = matchSnapshot;
        await db.collection('users').doc(user.uid).update(updateData);

        document.getElementById('addMatchModal').classList.add('hidden');
        document.getElementById('addMatchForm').reset();
        
        editingMatchId = null;
        renderHistory();
        

    } catch (e) {
        console.error(e);
        alert("Erreur lors de la sauvegarde.");
    }
}

async function deleteManualArchive(dateStr, homeName) {
    if(!confirm("Supprimer ce match de l'historique ?")) return;

    // Retrouver la clé (un peu laborieux car on n'a pas stocké l'ID dans l'objet archive, 
    // mais on peut itérer sur matchArchives pour trouver la clé correspondante)
    const entry = Object.entries(matchArchives).find(([key, val]) => {
        return val.isManual && val.home.name === homeName && val.dateObj === dateStr;
    });

    if (entry) {
        const [keyToDelete] = entry;
        const user = firebase.auth().currentUser;

        // Delete Local
        delete matchArchives[keyToDelete];
        localStorage.setItem('matchArchives', JSON.stringify(matchArchives));

        // Delete Firebase
        if (user) {
            const updateData = {};
            updateData[`archives.${keyToDelete}`] = firebase.firestore.FieldValue.delete();
            await db.collection('users').doc(user.uid).update(updateData);
        }

        renderHistory();
    }
}