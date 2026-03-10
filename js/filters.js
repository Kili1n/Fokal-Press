function applyFilters() {
    let filtered = [...allMatches];

    const now = new Date();

    filtered = filtered.filter(m => {
        return m.dateObj >= now;
    });

    filtered = filtered.filter(m => {
        if (m.distance > 0 && m.distance > currentFilters.maxDist) {
            return false; 
        }
        if (m.away.name.toUpperCase().includes("EXEMPT")) {
            return false;
        }
        return true;
    });

    if (currentFilters.search) {
        const term = currentFilters.search.toLowerCase();
        filtered = filtered.filter(m => m.home.name.toLowerCase().includes(term) || m.away.name.toLowerCase().includes(term));
    }

    if (currentFilters.sport !== "all") {
        filtered = filtered.filter(m => m.sport.toLowerCase() === currentFilters.sport);
    }

    populateCompFilter(filtered);

    if (currentFilters.comp !== "all") {
        filtered = filtered.filter(m => getCompFilterGroup(m.compFormatted, m.sport) === currentFilters.comp);
    }

    if (currentFilters.accredOnly) {
        const accredKeys = Object.keys(ACCRED_LIST);
        filtered = filtered.filter(m => accredKeys.some(key => m.home.name.toUpperCase().includes(key)));
    }

    if (currentFilters.week) {
        filtered = filtered.filter(m => {
            const d = new Date(Date.UTC(m.dateObj.getFullYear(), m.dateObj.getMonth(), m.dateObj.getDate()));
            const dayNum = d.getUTCDay() || 7; // Convertit Dimanche de 0 à 7
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
            
            const matchWeek = `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
            return matchWeek === currentFilters.week;
    });
}

    filtered.sort((a, b) => {
        if (currentFilters.sortBy === "favorite") {
            // On donne un poids à chaque statut pour le tri
            const weights = { 'received': 3, 'asked': 2, 'envie': 1, 'refused': -1, null: 0 };
            
            const statusA = matchStatuses[getMatchId(a)];
            const statusB = matchStatuses[getMatchId(b)];
            
            const weightA = weights[statusA] || 0;
            const weightB = weights[statusB] || 0;

            // Le plus grand poids en premier
            if (weightA !== weightB) {
                return weightB - weightA;
            }
            
            // Si même statut, tri par date
            return a.dateObj - b.dateObj;
        }
        if (currentFilters.sortBy === "distance") {
            return (a.distance || 9999) - (b.distance || 9999);
        }
        if (currentFilters.sortBy === "level") {
            const priority = { "L1": 1, "L2": 2, "N1": 3, "N2": 4, "N3": 5, "NAT": 6, "COUPE": 7, "REG": 8, "AMICAL": 9 };
            const getLevel = (comp) => comp.split(' - ')[1] || "REG";
            return (priority[getLevel(a.compFormatted)] || 99) - (priority[getLevel(b.compFormatted)] || 99);
        }
        return a.dateObj - b.dateObj;
    });

    currentlyFiltered = filtered;
    renderMatches(filtered);
    updateUrlFromFilters();
}

function resetFilters() {
    currentFilters = { week: "", comp: "all", sport: "all", accredOnly: false, sortBy: "date", search: "", maxDist: 300 };
    
    // Reset des éléments UI
    document.getElementById('weekFilter').value = "";
    document.getElementById('compFilter').value = "all";
    document.getElementById('sortFilter').value = "date";
    document.getElementById('searchInput').value = "";
    document.getElementById('accredToggle').checked = false;
    
    document.getElementById('gpsBtn').classList.remove('active');
    userPosition = null;

    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');

    const slider = document.getElementById('distSlider');
    const label = document.getElementById('distValue');
    
    if (slider && label) {
        slider.value = 300;        // Remet le curseur à droite
        label.textContent = "300km"; // Remet le texte à jour
    }
    
    updateFilterSlider();
    applyFilters();
}

function populateCompFilter(filteredMatches) {
    const select = document.getElementById('compFilter');
    const savedValue = currentFilters.comp;
    
    // Réinitialisation du menu
    select.innerHTML = '<option value="all">📊 Toutes compétitions</option>';
    
    const uniqueComps = [];
    const seen = new Set();
    
    filteredMatches.forEach(m => {
        const groupName = getCompFilterGroup(m.compFormatted);
        if (!seen.has(groupName)) {
            seen.add(groupName);
            uniqueComps.push({ name: groupName, sport: m.sport.toLowerCase() });
        }
    });

    uniqueComps.sort((a, b) => {
        if (a.name === "AUTRE") return 1;
        if (b.name === "AUTRE") return -1;
        return a.name.localeCompare(b.name);
    }).forEach(c => {
        
       let emoji = SPORT_EMOJIS[c.sport] || "🏟️";
        
        if (c.name === "AUTRE") {
            emoji = "🔖"; 
        }

        const opt = document.createElement('option');
        opt.value = c.name;
        // On supprime le texte du sport (ex: "FOOT - ") du nom affiché
        const displayName = c.name.replace(/^(FOOT|BASKET|HAND) - /, ''); 
        opt.textContent = `${emoji} ${displayName}`;
        
        if (c.name === savedValue) opt.selected = true;
        select.appendChild(opt);
    });

    if (!seen.has(savedValue)) currentFilters.comp = "all";
}

function updateUrlFromFilters() {
    const url = new URL(window.location);
    
    // On n'ajoute dans l'URL que les filtres qui diffèrent de l'état par défaut (pour garder un lien propre)
    if (currentFilters.sport !== "all") url.searchParams.set('sport', currentFilters.sport);
    else url.searchParams.delete('sport');

    if (currentFilters.comp !== "all") url.searchParams.set('comp', currentFilters.comp);
    else url.searchParams.delete('comp');

    if (currentFilters.week) url.searchParams.set('week', currentFilters.week);
    else url.searchParams.delete('week');

    if (currentFilters.search) url.searchParams.set('search', currentFilters.search);
    else url.searchParams.delete('search');

    if (currentFilters.sortBy !== "date") url.searchParams.set('sortBy', currentFilters.sortBy);
    else url.searchParams.delete('sortBy');

    if (currentFilters.maxDist !== 300) url.searchParams.set('maxDist', currentFilters.maxDist);
    else url.searchParams.delete('maxDist');

    if (currentFilters.accredOnly) url.searchParams.set('accredOnly', 'true');
    else url.searchParams.delete('accredOnly');

    // On modifie l'URL sans recharger la page et sans polluer l'historique de navigation
    window.history.replaceState({}, '', url);
}

function loadFiltersFromUrl() {
    const params = new URLSearchParams(window.location.search);

    // 1. Mise à jour de l'objet d'état
    if (params.has('sport')) currentFilters.sport = params.get('sport');
    if (params.has('comp')) currentFilters.comp = params.get('comp');
    if (params.has('week')) currentFilters.week = params.get('week');
    if (params.has('search')) currentFilters.search = params.get('search');
    if (params.has('sortBy')) currentFilters.sortBy = params.get('sortBy');
    if (params.has('maxDist')) currentFilters.maxDist = parseInt(params.get('maxDist')) || 300;
    if (params.has('accredOnly')) currentFilters.accredOnly = params.get('accredOnly') === 'true';

    // 2. Synchronisation visuelle des boutons et inputs avec l'URL
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === currentFilters.sport) {
            document.querySelector('.filter-btn.active')?.classList.remove('active');
            btn.classList.add('active');
        }
    });

    const weekEl = document.getElementById('weekFilter');
    if (weekEl && currentFilters.week) weekEl.value = currentFilters.week;

    const searchEl = document.getElementById('searchInput');
    if (searchEl && currentFilters.search) searchEl.value = currentFilters.search;

    const sortEl = document.getElementById('sortFilter');
    if (sortEl && currentFilters.sortBy !== "date") sortEl.value = currentFilters.sortBy;

    const accredEl = document.getElementById('accredToggle');
    if (accredEl && currentFilters.accredOnly) accredEl.checked = true;

    const slider = document.getElementById('distSlider');
    const distValue = document.getElementById('distValue');
    if (slider && distValue) {
        slider.value = currentFilters.maxDist;
        distValue.textContent = currentFilters.maxDist + "km";
    }

    // (Le select 'compFilter' sera mis à jour dynamiquement dans applyFilters via populateCompFilter)
}

function renderSavedFilters() {
    const list = document.getElementById('savedFiltersList');
    if (!list) return;

    if (!Array.isArray(mySavedFilters)) mySavedFilters = [];
    list.innerHTML = '';

    if (mySavedFilters.length === 0) {
        list.innerHTML = '<p style="font-size: 13px; color: var(--text-muted); text-align: center;">Aucune recherche sauvegardée.</p>';
        return;
    }

    mySavedFilters.forEach(item => {
        if (!item || !item.filters) return; 

        let summary = [];
        if (item.filters.sport !== 'all') summary.push(item.filters.sport);
        if (item.filters.comp !== 'all') summary.push(item.filters.comp);
        if (item.filters.maxDist < 300) summary.push(`-${item.filters.maxDist}km`);
        if (item.filters.accredOnly) summary.push('Accréd. ✅');
        
        const summaryText = summary.length > 0 ? summary.join(' • ') : 'Tous les matchs';

        list.innerHTML += `
            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 10px; border-radius: 8px;">
                <div style="cursor: pointer; flex: 1;" onclick="applySavedFilter('${item.id}')">
                    <strong style="display: block; font-size: 14px; color: var(--text-primary); margin-bottom: 4px;">${item.name}</strong>
                    <span style="font-size: 11px; color: var(--text-secondary);">${summaryText}</span>
                </div>
                
                <div style="display: flex; gap: 4px; align-items: center;">
                    <button onclick="shareSavedFilter('${item.id}', this)" style="background: transparent; border: none; color: var(--accent); cursor: pointer; padding: 8px;" title="Copier le lien">
                        <i class="fa-solid fa-link"></i>
                    </button>
                    <button onclick="deleteSavedFilter('${item.id}')" style="background: transparent; border: none; color: #FF3B30; cursor: pointer; padding: 8px;" title="Supprimer">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
}

async function saveCurrentFilter() {
    const user = firebase.auth().currentUser;
    if (!user) {
        document.getElementById('featureAuthModal').classList.remove('hidden');
        return;
    }

    const filterName = prompt("Donnez un nom à cette recherche (ex: N2 IDF) :");
    if (!filterName) return;

    const newFilter = {
        id: 'filter_' + Date.now(),
        name: filterName,
        filters: JSON.parse(JSON.stringify(currentFilters)) // Copie propre
    };

    mySavedFilters.push(newFilter);
    renderSavedFilters();

    try {
        await db.collection('users').doc(user.uid).update({
            savedFilters: mySavedFilters
        });
        
        // Petit feedback visuel sur le bouton
        const btn = document.getElementById('saveFilterBtn');
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check" style="color: #34C759;"></i> Sauvegardé !';
        setTimeout(() => btn.innerHTML = originalHtml, 2000);
        
    } catch (e) {
        console.error("Erreur sauvegarde filtre :", e);
        alert("Erreur lors de la sauvegarde.");
    }
}

window.applySavedFilter = function(id) {
    const target = mySavedFilters.find(f => f.id === id);
    if (!target) return;

    // 1. Écraser les filtres actuels
    currentFilters = { ...target.filters };

    // 2. Mettre à jour visuellement les éléments du header/menu
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === currentFilters.sport) {
            document.querySelector('.filter-btn.active')?.classList.remove('active');
            btn.classList.add('active');
        }
    });

    const weekEl = document.getElementById('weekFilter');
    if (weekEl) weekEl.value = currentFilters.week || "";

    const searchEl = document.getElementById('searchInput');
    if (searchEl) searchEl.value = currentFilters.search || "";

    const sortEl = document.getElementById('sortFilter');
    if (sortEl) sortEl.value = currentFilters.sortBy || "date";

    const accredEl = document.getElementById('accredToggle');
    if (accredEl) accredEl.checked = currentFilters.accredOnly;

    const slider = document.getElementById('distSlider');
    const distValue = document.getElementById('distValue');
    if (slider && distValue) {
        slider.value = currentFilters.maxDist;
        distValue.textContent = currentFilters.maxDist + "km";
    }

    updateFilterSlider(); // Repositionne la barre sous le sport
    
    // 3. Appliquer et fermer la modale
    applyFilters(); 
    document.getElementById('savedFiltersModal').classList.add('hidden');
};

window.deleteSavedFilter = async function(id) {
    if (!confirm("Supprimer ce filtre ?")) return;
    
    mySavedFilters = mySavedFilters.filter(f => f.id !== id);
    renderSavedFilters();

    const user = firebase.auth().currentUser;
    if (user) {
        try {
            await db.collection('users').doc(user.uid).update({ savedFilters: mySavedFilters });
        } catch (e) { console.error("Erreur suppression filtre:", e); }
    }
};

window.shareSavedFilter = function(id, btnElement) {
    const target = mySavedFilters.find(f => f.id === id);
    if (!target) return;

    // 1. On construit l'URL de base (sans les paramètres actuels)
    const url = new URL(window.location.origin + window.location.pathname);
    const f = target.filters;
    
    // 2. On ajoute uniquement les paramètres de CE filtre spécifique
    if (f.sport !== "all") url.searchParams.set('sport', f.sport);
    if (f.comp !== "all") url.searchParams.set('comp', f.comp);
    if (f.week) url.searchParams.set('week', f.week);
    if (f.search) url.searchParams.set('search', f.search);
    if (f.sortBy !== "date") url.searchParams.set('sortBy', f.sortBy);
    if (f.maxDist !== 300) url.searchParams.set('maxDist', f.maxDist);
    if (f.accredOnly) url.searchParams.set('accredOnly', 'true');

    // 3. On copie dans le presse-papier
    navigator.clipboard.writeText(url.toString()).then(() => {
        // Petit effet visuel sympa : l'icône se transforme en "Check" vert pendant 2 secondes
        if (btnElement) {
            const originalHTML = btnElement.innerHTML;
            btnElement.innerHTML = '<i class="fa-solid fa-check" style="color: #34C759;"></i>';
            setTimeout(() => {
                btnElement.innerHTML = originalHTML;
            }, 2000);
        }
    }).catch(err => {
        console.error('Erreur lors de la copie :', err);
        alert("Impossible de copier le lien. Vérifiez les permissions de votre navigateur.");
    });
};

function initSearchAutocomplete() {
    const input = document.getElementById('searchInput');
    const resultsContainer = document.getElementById('searchResults');

    if (!input || !resultsContainer) return;

    // Fonction d'affichage des résultats
    const showResults = (val) => {
        resultsContainer.innerHTML = '';
        const filterVal = val.toLowerCase();

        // Filtrer les équipes qui contiennent la recherche
        const matches = searchTeamsList.filter(team => 
            team.toLowerCase().includes(filterVal)
        );

        // Si aucun résultat ou champ vide
        if (matches.length === 0 || val.length < 1) {
            resultsContainer.classList.add('hidden');
            return;
        }

        // On affiche max 8 résultats pour ne pas polluer
        matches.slice(0, 8).forEach(teamName => {
            const div = document.createElement('div');
            div.className = 'result-item';
            
            // On récupère le logo pour faire joli
            const logo = getLogoUrl(teamName) || 'data/default-team.png';
            
            div.innerHTML = `
                <img src="${logo}" onerror="this.src='data/default-team.png'"> 
                <span>${teamName}</span>
            `;

            // Au clic sur une suggestion
            div.addEventListener('click', () => {
                input.value = teamName;      // 1. Remplir l'input
                currentFilters.search = teamName; // 2. Mettre à jour le filtre
                applyFilters();              // 3. Mettre à jour la grille
                resultsContainer.classList.add('hidden'); // 4. Cacher la liste
            });

            resultsContainer.appendChild(div);
        });

        resultsContainer.classList.remove('hidden');
    };

    // Écouteur de saisie
    input.addEventListener('input', (e) => {
        const val = e.target.value;
        
        // Mise à jour du filtre global en temps réel
        currentFilters.search = val;
        applyFilters();

        // Affichage de l'auto-complétion
        if (val.length > 0) {
            showResults(val);
        } else {
            resultsContainer.classList.add('hidden');
        }
    });

    // Écouteur pour fermer si on clique ailleurs
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
            resultsContainer.classList.add('hidden');
        }
    });
    
    // Réouvrir si on clique dans le champ et qu'il y a du texte
    input.addEventListener('focus', () => {
        if (input.value.length > 0) showResults(input.value);
    });
}


document.addEventListener('DOMContentLoaded', () => {

    // (Ajoute ça vers la ligne 692, avec tes autres listeners)
    const saveFilterBtn = document.getElementById('saveFilterBtn');
    if (saveFilterBtn) saveFilterBtn.addEventListener('click', saveCurrentFilter);

    const openSavedFiltersBtn = document.getElementById('openSavedFiltersBtn');
    const savedFiltersModal = document.getElementById('savedFiltersModal');
    const closeSavedFiltersBtn = document.getElementById('closeSavedFiltersBtn');

    if (openSavedFiltersBtn) {
        openSavedFiltersBtn.addEventListener('click', () => {
            if (savedFiltersModal) {
                // 1. On met à jour la liste
                renderSavedFilters(); 
                // 2. On affiche la modale
                savedFiltersModal.classList.remove('hidden');
            }
        });
    }

    if (closeSavedFiltersBtn) {
        closeSavedFiltersBtn.addEventListener('click', () => savedFiltersModal.classList.add('hidden'));
    }

    if (savedFiltersModal) {
        savedFiltersModal.addEventListener('click', (e) => {
            if (e.target === savedFiltersModal) savedFiltersModal.classList.add('hidden');
        });
    }
});