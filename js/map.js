function initMap() {
    if (mapInstance) return; // Déjà initialisée

    // 1. Création de la map (centrée sur la France par défaut)
    mapInstance = L.map('leafletMap').setView([46.603354, 1.888334], 6);

    // 2. Ajout des tuiles Geoapify (Style OSM Bright)
    L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_KEY}`, {
        attribution: 'Powered by Geoapify | © OpenStreetMap',
        maxZoom: 20, 
        id: 'osm-bright',
    }).addTo(mapInstance);

    // 3. Groupe de marqueurs pour pouvoir les nettoyer facilement
    markersLayer = L.layerGroup().addTo(mapInstance);
}

function updateMapMarkers() {
    if (!mapInstance || !markersLayer) return;

    markersLayer.clearLayers(); // On efface les anciens points
    const bounds = []; // Pour ajuster le zoom à la fin

    // 1. Groupement des matchs par coordonnées (lat_lon)
    const groupedMatches = {};

    currentlyFiltered.forEach(m => {
        if (m.locationCoords && m.locationCoords.lat && m.locationCoords.lon) {
            const key = `${m.locationCoords.lat}_${m.locationCoords.lon}`;
            if (!groupedMatches[key]) {
                groupedMatches[key] = [];
            }
            groupedMatches[key].push(m);
        }
    });

    // 2. Création des marqueurs pour chaque groupe
    Object.keys(groupedMatches).forEach(key => {
        const matches = groupedMatches[key];
        const [lat, lon] = key.split('_').map(Number);
        
        let popupContent = '';

        // CAS A : Un seul match (Affichage standard comme avant)
        if (matches.length === 1) {
            const m = matches[0];
            popupContent = `
                <div class="map-popup-card">
                    <div class="map-popup-header">
                        <span>${m.home.name}</span>
                        <span style="color:var(--text-secondary)">vs</span>
                        <span>${m.away.name}</span>
                    </div>
                    <div style="font-size:12px; margin-bottom:4px;">
                        📅 ${m.dateDisplay} à ${m.time}
                    </div>
                    <div style="font-size:12px; margin-bottom:4px;">
                        🏆 ${m.compFormatted}
                    </div>
                    <button class="map-popup-btn" onclick="goToCard('${getMatchId(m)}')">
                        Voir la fiche
                    </button>
                </div>
            `;
        } 
        // CAS B : Plusieurs matchs (Affichage en liste)
        else {
            let listHtml = matches.map(m => `
                <div class="map-list-item">
                    <div class="map-list-title">
                        ${m.home.name} <span style="font-weight:400; opacity:0.7;">vs</span> ${m.away.name}
                    </div>
                    <div class="map-list-meta">
                        📅 ${m.dateDisplay} (${m.time})
                    </div>
                    <button class="map-popup-btn small-btn" onclick="goToCard('${getMatchId(m)}')">
                        Voir
                    </button>
                </div>
            `).join('');

            popupContent = `
                <div class="map-popup-card">
                    <div class="map-popup-header multi-header">
                        📍 ${matches.length} Matchs ici
                    </div>
                    <div class="map-scroll-container">
                        ${listHtml}
                    </div>
                </div>
            `;
        }

        // Création du marqueur
        const marker = L.marker([lat, lon]).bindPopup(popupContent);
        markersLayer.addLayer(marker);
        bounds.push([lat, lon]);
    });

    // Ajuster la vue pour voir tous les marqueurs
    if (bounds.length > 0) {
        mapInstance.fitBounds(bounds, { padding: [50, 50] });
    }
}

window.goToCard = (matchId) => {
    // 1. Fermer la modale
    mapModal.classList.add('hidden');
    
    // 2. Trouver la carte dans la grille
    const card = document.getElementById(`match-card-${matchId}`);
    
    if (card) {
        // 3. Scroll doux vers la carte
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // 4. Petit effet visuel pour mettre en évidence
        card.style.borderColor = "var(--accent)";
        setTimeout(() => { card.style.borderColor = ""; }, 2000);
    }
};

function toggleAdvancedFilters() {
    const isHidden = advancedFilters.classList.contains('hidden-filters');
    
    if (isHidden) {
        // --- OUVERTURE (Mode normal) ---
        advancedFilters.classList.remove('hidden-filters');
        advFiltersBtn.classList.add('active');
        
        // On retire le mode compact du header
        mainHeader.classList.remove('compact-mode');
        
        localStorage.setItem('showAdvancedFilters', 'true');
    } else {
        // --- FERMETURE (Mode compact) ---
        advancedFilters.classList.add('hidden-filters');
        advFiltersBtn.classList.remove('active');
        
        // On active le mode compact sur le header
        mainHeader.classList.add('compact-mode');
        
        localStorage.setItem('showAdvancedFilters', 'false');
    }
}