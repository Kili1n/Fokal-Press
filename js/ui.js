// Fonction utilitaire pour générer l'avatar robuste (Image + Proxy + Initiale)
function getAvatarHTML(photoURL, displayName, size = 36) {
    const initial = (displayName || "U").charAt(0).toUpperCase();
    
    // On applique le même principe que fetchInstaProfilePic (Proxy wsrv.nl) 
    // pour éviter les blocages CORS sur les photos des amis.
    let safeUrl = photoURL || '';
    if (safeUrl && !safeUrl.includes('wsrv.nl') && !safeUrl.includes('ui-avatars.com')) {
        safeUrl = `https://wsrv.nl/?url=${encodeURIComponent(safeUrl)}&maxage=1d`;
    }
    
    return `
    <div style="width: ${size}px; height: ${size}px; background: white; color: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: ${Math.round(size/2.5)}px; font-weight: 700; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); overflow: hidden; border: 1px solid var(--border-color);">
        <img src="${safeUrl}" 
             crossorigin="anonymous" 
             style="width: 100%; height: 100%; object-fit: cover;" 
             onerror="this.style.display='none'; this.parentNode.innerText='${initial}';">
    </div>`;
}

function updateProfileBadge(count) {
    // 1. Pastille dans la modale Paramètres (sur le bouton "Mes Amis")
    const settingsBadge = document.getElementById('friendsNotifBadge');
    if (settingsBadge) {
        settingsBadge.style.display = count > 0 ? 'flex' : 'none';
        settingsBadge.textContent = count;
    }

    // 2. Pastille rouge sur les boutons de profil (Mobile et Desktop)
    document.querySelectorAll('.login-trigger').forEach(btn => {
        // On nettoie d'abord l'ancienne pastille si elle existe
        const oldBadge = btn.querySelector('.profile-notif-badge');
        if (oldBadge) oldBadge.remove();

        if (count > 0) {
            // Force le parent en relative pour que la pastille absolue se place bien
            btn.style.position = 'relative';
            
            // Création de la pastille
            const badge = document.createElement('div');
            badge.className = 'profile-notif-badge';
            badge.style.position = 'absolute';
            badge.style.top = '-2px';
            badge.style.right = '-2px';
            badge.style.width = '12px';
            badge.style.height = '12px';
            badge.style.backgroundColor = '#FF3B30'; // Rouge notification
            badge.style.borderRadius = '50%';
            badge.style.border = '2px solid var(--bg-color)'; // Fait un effet de détourage
            badge.style.zIndex = '10';
            badge.title = `${count} demande(s) d'ami`;

            btn.appendChild(badge);
        }
    });
}

function updateLoginUI(isLogged, photoURL) {
    document.querySelectorAll('.login-trigger').forEach(btn => {
        if (isLogged) {
            btn.title = "Mon Compte";
            if (photoURL) {
                btn.innerHTML = `<img src="${photoURL}" style="width:28px; height:28px; border-radius:50%; border: 2px solid #34C759; object-fit: cover;">`;
            } else {
                btn.innerHTML = '<i class="fa-solid fa-user-astronaut logged-in-icon"></i>';
            }
        } else {
            btn.title = "Se connecter";
            btn.innerHTML = '<i class="fa-regular fa-user"></i>'; 
        }
    });
}

function renderMatches(data) {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    // Dans app.js, à l'intérieur de renderMatches(data)

    if (data.length === 0) {
        const currentSearch = document.getElementById('searchInput').value.trim();
        const truncatedSearch = currentSearch.length > 15 ? currentSearch.substring(0, 15) + '...' : currentSearch;
        const btnLabel = currentSearch ? `Ajouter "${truncatedSearch}"` : "Suggérer une équipe";

        // On utilise <article class="card"> pour reprendre le style exact des cartes de match
        // grid-column: 1 / -1 permet de centrer la carte sur toute la largeur de la grille
        grid.innerHTML = `
            <article class="card" style="grid-column: 1 / -1; max-width: 380px; margin: 20px 0; text-align: center; align-items: center; padding: 30px 20px; gap: 10px;">
                
                <div style="margin-bottom: 5px;">
                    <i class="fa-regular fa-calendar-xmark" style="font-size: 36px; color: var(--text-secondary);"></i>
                </div>
                
                <h3 style="font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0;">
                    Aucun match trouvé
                </h3>
                
                <p style="font-size: 13px; color: var(--text-secondary); margin: 0 0 15px 0; line-height: 1.4;">
                    Aucun match ne correspond à vos critères de recherche.
                </p>
                
                <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
                    <button onclick="openSuggestionModal()" class="login-submit-btn" style="background: var(--accent); color: white; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; font-size: 14px; margin: 0;">
                        <i class="fa-solid fa-plus"></i> ${btnLabel}
                    </button>
                    
                    <button onclick="resetFilters()" class="login-submit-btn" style="background: transparent; border: 1px solid var(--border-color); color: var(--text-primary); padding: 10px; font-size: 13px; margin: 0;">
                        Réinitialiser les filtres
                    </button>
                </div>
            </article>
        `;
        return;
    }
    
    data.forEach(m => {
        const card = document.createElement('article');
        card.className = 'card';
        card.id = `match-card-${getMatchId(m)}`;

        const matchId = getMatchId(m);
        const currentStatus = matchStatuses[matchId] || null;
        const statusClass = currentStatus ? `status-${currentStatus}` : '';

        const emoji = SPORT_EMOJIS[m.sport.toLowerCase()] || "🏟️";
        const coordsArg = m.locationCoords ? JSON.stringify(m.locationCoords) : 'null';
        
        const distText = m.isCalculating ? '<i class="fa-solid fa-spinner fa-spin"></i>' : (m.distance > 0 ? `${m.distance} km` : '-- km');
        const compShort = getShortComp(m.compFormatted, m.sport);

        let mapsUrl = "#";
        if (m.locationCoords) {
            if (userPosition) {
                mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userPosition.lat},${userPosition.lon}&destination=${m.locationCoords.lat},${m.locationCoords.lon}&travelmode=driving`;
            } else {
                mapsUrl = `https://www.google.com/maps/search/?api=1&query=${m.locationCoords.lat},${m.locationCoords.lon}`;
            }
        }
        card.setAttribute('onclick', `toggleMobileCard(event, '${matchId}')`);

        // --- LOGIQUE GENRE POUR LA CARTE ---
        // Détection Féminin
        const isWomen = m.compFormatted.includes("SENIOR F") || m.compFormatted.includes(" SF") || m.compFormatted.includes(" F ") || m.compFormatted.endsWith(" F");
        
        // Icône Rose si femme, sinon vide (pas d'icône homme)
        const genderIcon = isWomen 
            ? `<i class="fa-solid fa-venus" title="Féminin" style="color: #FF2D55; margin-left: 10px; font-size: 14px;"></i>` 
            : ``; 

        card.innerHTML = `
            <button class="fav-btn ${statusClass}" 
                    onclick="cycleStatus(event, '${matchId}')" 
                    title="Cliquez pour changer le statut">
                <i class="${getStatusIcon(currentStatus)}"></i>
            </button>
            <div class="match-header">
                <div class="team">
                    <img src="${getLogoUrl(m.home.name)}" class="team-logo" data-team="${m.home.name.replace(/"/g, '&quot;')}" onerror="console.warn('Erreur logo - ' + this.getAttribute('data-team') + ' :', this.src); this.onerror=null; this.src='data/default-team.png'">
                    <span class="team-name">${m.home.name}</span>
                </div>
                <div class="match-center">
                    <div class="match-time">${m.time}</div>
                    <div class="vs">VS</div>
                </div>
                <div class="team">
                    <img src="${getLogoUrl(m.away.name)}" class="team-logo" data-team="${m.away.name.replace(/"/g, '&quot;')}" onerror="console.warn('Erreur logo - ' + this.getAttribute('data-team') + ' :', this.src); this.onerror=null; this.src='data/default-team.png'">
                    <span class="team-name">${m.away.name}</span>
                </div>
            </div>
            
            <div class="match-meta">
                <div style="display:flex; align-items:center;">
                    <span class="badge badge-long"><span>${emoji}</span> ${m.compFormatted}</span>
                    <span class="badge badge-short">${compShort}</span>
                    ${genderIcon} </div>
                <div class="date-group" style="display: flex; align-items: center; gap: 8px;">
                    <span class="date-time">${m.dateDisplay}</span>
                    <button class="calendar-btn" 
                            onclick='exportToGoogleCalendar("${m.home.name.replace(/"/g, "")}", "${m.away.name.replace(/"/g, "")}", new Date("${m.dateObj.toISOString()}"), "${m.compFormatted}", "${m.sport}", ${coordsArg})'
                            title="Ajouter à Google Agenda"
                            style="background:none; border:none; cursor:pointer; color: var(--accent); font-size: 14px; padding: 0;">
                        <i class="fa-solid fa-calendar-plus"></i>
                    </button>
                </div>
            </div>

            <div class="transport-block">
                <div class="transport-info">
                    <div class="distance">${distText}</div>
                    <div class="modes">
                        ${m.weather ? `<div class="mode weather-badge" title="Météo prévue">${m.weather}</div>` : ''}
                        <div class="mode"><i class="fa-solid fa-car"></i> ${m.times.car || '--'}'</div>
                        <div class="mode"><i class="fa-solid fa-train-subway"></i> ${m.times.public || '--'}'</div>
                    </div>
                </div>
                <a href="${mapsUrl}" target="_blank" rel="nofollow noopener"class="maps-arrow ${!m.locationCoords ? 'disabled' : ''}" title="Voir l'itinéraire sur Google Maps">
                    <i class="fa-solid fa-chevron-right"></i>
                </a>
            </div>
            <div class="accred-footer">
                ${getAccreditationHTML(m)}
                
                <div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">
                    
                    <div class="friends-stack" id="friends-stack-${matchId}" style="display: flex; align-items: center;">
                        </div>

                    <button class="share-match-btn" onclick="shareMatch(event, '${matchId}', '${m.home.name.replace(/'/g, "\\'")}', '${m.away.name.replace(/'/g, "\\'")}')" 
                            style="color: var(--text-secondary); border: none; background: transparent; cursor: pointer; font-size: 16px; padding: 4px;" 
                            title="Inviter un ami à ce match">
                        <i class="fa-solid fa-share-nodes"></i>
                    </button>

                    <a href="${m.sourceUrl}" target="_blank" rel="nofollow noopener" class="source-link" title="Voir la source officielle" style="margin-left: 0;">
                        <i class="fa-solid fa-link"></i>
                    </a>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });

    if (typeof injectFriendsOnCards === 'function') {
        injectFriendsOnCards();
    }
}

function renderHistory() {
    const historyGrid = document.getElementById('historyGrid');
    historyGrid.innerHTML = '';

    // 1. Récupération des IDs
    let historyList = Object.entries(matchArchives).map(([key, data]) => {
        return { ...data, id: key };
    });

    if (historyList.length === 0) {
        historyGrid.innerHTML = `
            <div class="empty-history" style="text-align: center; padding: 60px 20px;">
                <i class="fa-solid fa-camera-retro" style="font-size: 2.5rem; margin-bottom: 20px; color: var(--border-color);"></i>
                <p style="font-size: 1.1rem; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">
                    Aucun match couvert pour le moment.
                </p>
                <p style="font-size: 0.95rem; color: var(--text-secondary); max-width: 320px; margin: 0 auto; line-height: 1.6; opacity: 0.8;">
                    Parcourez les prochains matchs et <b>ajoutez vos accréditations validées</b> pour construire votre historique de saison.
                </p>
            </div>`;
        return;
    }
    
    // 2. Tri par date (plus récent en premier)
    historyList.sort((a, b) => {
        const dateA = (a.dateObj === "UNKNOWN") ? 0 : new Date(a.dateObj).getTime();
        const dateB = (b.dateObj === "UNKNOWN") ? 0 : new Date(b.dateObj).getTime();
        if (dateA === 0 && dateB === 0) return 0;
        if (dateA === 0) return 1;
        if (dateB === 0) return -1;
        return dateB - dateA;
    });

    historyList.forEach(m => {
        const homeName = m.home?.name || "Équipe Inconnue";
        const awayName = m.away?.name || "Équipe Inconnue";
        if (homeName.includes("Inconnue") || awayName.includes("Inconnue")) return;

        let dateDisplay = "Date inconnue";
        let time = "--h--";
        if (m.dateObj && m.dateObj !== "UNKNOWN") {
            try {
                const d = new Date(m.dateObj);
                dateDisplay = d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
                time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
            } catch (e) {}
        }

        const homeLogo = m.home.logo || getLogoUrl(homeName);
        const awayLogo = m.away.logo || getLogoUrl(awayName);
        const emoji = SPORT_EMOJIS[(m.sport || "autre").toLowerCase()] || "🏟️";
        const badgeManual = m.isManual ? '<span style="font-size:10px; opacity:0.6; margin-left:5px;">(Manuel)</span>' : '';

        const card = document.createElement('article');
        card.className = 'card history-card';
        card.style.position = 'relative'; 

        card.innerHTML = `
            <button class="history-btn edit-btn" onclick="editMatch('${m.id}')" title="Modifier" 
                style="position: absolute; top: 15px; right: 15px; background: transparent; border: none; cursor: pointer; color: var(--text-secondary); font-size: 14px; z-index: 10;">
                 <i class="fa-solid fa-pen"></i>
            </button>

            <div class="match-header">
                <div class="team">
                    <img src="${homeLogo}" class="team-logo" onerror="this.onerror=null; this.src='data/default-team.png'">
                    <span class="team-name">${homeName}</span>
                </div>
                <div class="match-center">
                    <div class="match-time">${time}</div>
                    <div class="vs">VS</div>
                </div>
                <div class="team">
                    <img src="${awayLogo}" class="team-logo" onerror="this.onerror=null; this.src='data/default-team.png'">
                    <span class="team-name">${awayName}</span>
                </div>
            </div>
            
            <div class="match-meta" style="border-top: 1px solid var(--border-color); margin-top: 10px; padding-top: 10px;">
                <span class="badge badge-long"><span>${emoji}</span> ${m.compFormatted || 'Compétition'}</span>
                <span class="date-time">${dateDisplay}</span>
            </div>

            <div class="history-badge">
                <span><i class="fa-solid fa-circle-check"></i> Couvert ${badgeManual}</span>
            </div>
        `;

        historyGrid.appendChild(card);
    });
}

function toggleMobileCard(event, matchId) {
    // Vérifier si on est sur mobile (<= 768px)
    if (window.innerWidth > 768) return;

    // Vérifier si on est en vue liste
    const grid = document.getElementById('grid');
    if (!grid.classList.contains('list-view')) return;

    const card = document.getElementById(`match-card-${matchId}`);
    if (card) {
        // Bascule la classe qui force l'affichage "Grille"
        card.classList.toggle('mobile-expanded');
    }
}

function getPieChartSVG(data, colors) {
    const size = 100; 
    const center = size / 2;
    
    // Configuration des rayons
    const r1_in = 20; // Trou central
    const r1_out = 35; // Fin étage 1 (Sport)
    const gap = 2;     // Espace blanc
    const r2_in = r1_out + gap; // Début étage 2 (Niveaux)
    const r2_out = 50; // Fin étage 2

    let total = 0;
    ['football', 'basketball', 'handball'].forEach(sport => {
        if(data[sport]) Object.values(data[sport]).forEach(val => total += val);
    });

    if (total === 0) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
                    <circle cx="${center}" cy="${center}" r="${r2_out}" fill="#F2F2F7" />
                    <circle cx="${center}" cy="${center}" r="${r1_in}" fill="var(--card-bg)" />
                </svg>`;
    }

    let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">`;
    
    // Helper amélioré pour gérer le 360° (Cercle complet)
    const createArc = (startA, endA, rIn, rOut, color, opacity = 1) => {
        // FIX : Si l'angle est un tour complet (2*PI), on le réduit infimement 
        // pour éviter que point de départ == point d'arrivée (sinon le SVG ne s'affiche pas)
        if (endA - startA >= 2 * Math.PI) {
            endA -= 0.0001;
        }

        const x1_out = center + rOut * Math.cos(startA);
        const y1_out = center + rOut * Math.sin(startA);
        const x2_out = center + rOut * Math.cos(endA);
        const y2_out = center + rOut * Math.sin(endA);

        const x1_in = center + rIn * Math.cos(startA);
        const y1_in = center + rIn * Math.sin(startA);
        const x2_in = center + rIn * Math.cos(endA);
        const y2_in = center + rIn * Math.sin(endA);

        // Large Arc Flag : 1 si l'angle est > 180 degrés
        const largeArc = (endA - startA) > Math.PI ? 1 : 0;

        const d = [
            `M ${x1_out} ${y1_out}`,
            `A ${rOut} ${rOut} 0 ${largeArc} 1 ${x2_out} ${y2_out}`,
            `L ${x2_in} ${y2_in}`,
            `A ${rIn} ${rIn} 0 ${largeArc} 0 ${x1_in} ${y1_in}`,
            `Z`
        ].join(' ');

        return `<path d="${d}" fill="${color}" fill-opacity="${opacity}" stroke="var(--card-bg)" stroke-width="1" />`;
    };

    let currentAngle = 0;

    ['football', 'basketball', 'handball'].forEach(sport => {
        const comps = data[sport];
        if (!comps || Object.keys(comps).length === 0) return;

        const baseColor = colors[sport];
        
        let sportTotal = 0;
        Object.values(comps).forEach(v => sportTotal += v);
        
        const sportSliceAngle = (sportTotal / total) * 2 * Math.PI;
        const sportEndAngle = currentAngle + sportSliceAngle;

        // --- ÉTAGE 1 : SPORT ---
        // Dessine le sport (ex: Vert pour Foot)
        svg += createArc(currentAngle, sportEndAngle, r1_in, r1_out, baseColor, 1);

        // --- ÉTAGE 2 : NIVEAUX ---
        let levelCurrentAngle = currentAngle;
        const sortedComps = Object.entries(comps).sort((a, b) => b[1] - a[1]);

        sortedComps.forEach(([compName, count], index) => {
            const levelSliceAngle = (count / sportTotal) * sportSliceAngle;
            const levelEndAngle = levelCurrentAngle + levelSliceAngle;
            
            // Opacité dégressive
            const opacity = 0.5 + (0.5 * (1 - (index / sortedComps.length)));

            svg += createArc(levelCurrentAngle, levelEndAngle, r2_in, r2_out, baseColor, opacity);
            
            levelCurrentAngle = levelEndAngle;
        });

        currentAngle = sportEndAngle;
    });

    svg += `</svg>`;
    return svg;
}

function showSuccess(link, originalText) {
    link.innerHTML = '<span style="color: #34C759;"><i class="fa-solid fa-check"></i> Copié !</span>';
    setTimeout(() => {
        link.innerHTML = originalText;
    }, 2000);
}

function copyToClipboard(event, text) {
    event.preventDefault();
    const link = event.currentTarget;
    const originalText = link.innerHTML;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => showSuccess(link, originalText))
            .catch(err => fallbackCopy(text, link, originalText));
    } else {
        fallbackCopy(text, link, originalText);
    }
}

function fallbackCopy(text, link, originalText) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showSuccess(link, originalText);
    } catch (err) {
        console.error('Impossible de copier', err);
    }
    
    document.body.removeChild(textArea);
}

// Fonction de secours pour copier le lien dans le presse-papier (bouton partager de la carte)
function fallbackShareCopy(url, btnElement) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => {
            const originalHtml = btnElement.innerHTML;
            btnElement.innerHTML = '<i class="fa-solid fa-check" style="color:#34C759;"></i>';
            setTimeout(() => { btnElement.innerHTML = originalHtml; }, 2000);
        });
    }
}

function sendFooterMail(type) {
    const adminEmail = "contact@fokalPress.fr"; 
    const siteTitle = "Fokal Press";

    const mailConfigs = {
        'add': {
            subject: `[${siteTitle}] Suggestion d'ajout : Nouveau Club`,
            body: "Bonjour,\n\n" +
                  "Je souhaiterais suggérer l'ajout d'une nouvelle entité sur le dashboard :\n\n" +
                  "• Nom du club : \n" +
                  "• Discipline (Foot/Basket/Hand) : \n" +
                  "• Niveau de compétition : \n" +
                  "• Lien site fédération (si connu) : \n\n" +
                  "Cordialement,\n" +
                  "[Prénom NOM]"
        },
        'suggest': {
            subject: `[${siteTitle}] Suggestion de contact d'accréditation`,
            body: "Bonjour,\n\n" +
                  "Je souhaite proposer un contact d'accréditation vérifié pour la base de données :\n\n" +
                  "• Club concerné : \n" +
                  "• Niveau de compétition : \n" +
                  "• Adresse e-mail de contact : \n\n" +
                  "IMPORTANT : Conformément aux règles de fiabilité, j'ai joint à cet e-mail une capture d'écran d'une réponse officielle du club prouvant la validité de ce contact.\n\n" +
                  "Cordialement,\n" +
                  "[Prénom NOM]"
        },
        'remove': {
            subject: `[${siteTitle}] Demande de retrait de données`,
            body: "Bonjour,\n\n" +
                  "En tant que propriétaire légitime, je sollicite le retrait des informations suivantes de votre plateforme :\n\n" +
                  "• Élément à supprimer (Nom du club ou adresse e-mail) : \n" +
                  "• Motif du retrait : \n\n" +
                  "IMPORTANT : J'ai joint à cet e-mail un justificatif prouvant ma qualité de propriétaire ou de responsable autorisé pour cette entité.\n\n" +
                  "Dans l'attente de votre confirmation,\n\n" +
                  "Cordialement,\n" +
                  "[Prénom NOM]"
        },
        'bug': {
            subject: `[${siteTitle}] Signalement d'anomalie`,
            body: "Bonjour,\n\n" +
                  "Je signale un dysfonctionnement technique :\n" +
                  "- \n\n" +
                  "Infos techniques :\n" +
                  `• Date : ${new Date().toLocaleString('fr-FR')}\n` +
                  `• Navigateur : ${navigator.userAgent}\n` +
                  "Cordialement,\n" +
                  "[Prénom NOM]"
        },
        'contact': {
            subject: `[${siteTitle}] Prise de contact`,
            body: "Bonjour,\n\n"
        }
    };

    const config = mailConfigs[type] || mailConfigs['contact'];
    const encodedSubject = encodeURIComponent(config.subject);
    const encodedBody = encodeURIComponent(config.body);

    // 1. On prépare les deux types d'URLs
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${adminEmail}&su=${encodedSubject}&body=${encodedBody}`;
    const mailtoUrl = `mailto:${adminEmail}?subject=${encodedSubject}&body=${encodedBody}`;

    // 2. On applique la même logique que openGmailCompose
    if (isMobile()) {
        // Sur mobile, on tente d'ouvrir l'application mail par défaut
        window.location.href = mailtoUrl;
    } else {
        // Sur ordinateur, on ouvre l'onglet Gmail Web
        window.open(gmailUrl, '_blank');
    }
}

// --- FONCTION NAVIGATION TUTO ---
window.nextTutoStep = function(currentStep = 1) {
    const step1 = document.getElementById('tutoStep1');
    const step2 = document.getElementById('tutoStep2');
    const step3 = document.getElementById('tutoStep3');
    const dot1 = document.getElementById('dot1');
    const dot2 = document.getElementById('dot2');
    const dot3 = document.getElementById('dot3');

    // Passage Étape 1 -> Étape 2
    if (currentStep === 1) {
        if(step1) step1.style.display = 'none';
        if(step2) step2.style.display = 'block';
        if(step3) step3.style.display = 'none';
        
        if(dot1) dot1.style.background = 'var(--border-color)';
        if(dot2) dot2.style.background = 'var(--accent)';
        if(dot3) dot3.style.background = 'var(--border-color)';
    } 
    // Passage Étape 2 -> Étape 3
    else if (currentStep === 2) {
        if(step1) step1.style.display = 'none';
        if(step2) step2.style.display = 'none';
        if(step3) step3.style.display = 'block';
        
        if(dot1) dot1.style.background = 'var(--border-color)';
        if(dot2) dot2.style.background = 'var(--border-color)';
        if(dot3) dot3.style.background = 'var(--accent)';
    }
};

function updateFilterSlider() {
    const activeBtn = document.querySelector('.filter-btn.active');
    const slider = document.querySelector('.filter-slider');
    
    if (activeBtn && slider) {
        slider.style.width = `${activeBtn.offsetWidth}px`;
        slider.style.left = `${activeBtn.offsetLeft}px`;
    }
}

// Fonction pour mettre à jour l'UI (Placeholder + Autocomplete)
function refreshSuggestUI() {
    // 1. Récupérer le sport sélectionné
    const selectedRadio = document.querySelector('input[name="suggestSport"]:checked');
    if (!selectedRadio) return;
    const sport = selectedRadio.value; // "Football", "Basketball" ou "Handball"
    
    // 2. Mise à jour du Placeholder du lien
    const linkInput = document.getElementById('suggestLink');
    if (linkInput) {
        linkInput.placeholder = FEDERATION_EXAMPLES[sport] || "https://...";
    }

    // 3. Mise à jour de l'Autocomplete Championnat
    // On convertit le sport "Football" (HTML) en "football" (Données JS)
    const sportKey = sport.toLowerCase();
    
    // On s'assure que les données sont chargées (sécurité)
    if (typeof manualCompsData === 'undefined' || manualCompsData.length === 0) {
        // Si manualCompsData est vide, on essaie de le remplir grossièrement avec initManualMatchForm
        // Mais idéalement, initManualMatchForm devrait avoir été appelé une fois au chargement.
        // Pour éviter de tout casser, on filtre seulement si les données existent.
    }

    const filteredComps = (typeof manualCompsData !== 'undefined') 
        ? manualCompsData.filter(c => c.sport === sportKey)
        : [];

    setupAutocomplete(
        document.getElementById('suggestComp'), 
        document.getElementById('suggestCompResults'), 
        filteredComps, 
        (compObj) => {
            const emoji = SPORT_EMOJIS[compObj.sport] || "🏆";
            return `<span class="result-emoji">${emoji}</span> <span>${compObj.name}</span>`;
        },
        true // Flag objet
    );
}

function openSuggestionModal() {
    const modal = document.getElementById('suggestTeamModal');
    const nameInput = document.getElementById('suggestTeamName');
    const searchInput = document.getElementById('searchInput');

    // 1. Pré-remplir avec la recherche actuelle
    if (searchInput && searchInput.value.trim() !== "") {
        nameInput.value = searchInput.value.trim();
    } else {
        nameInput.value = "";
    }
    
    // 2. Si les données d'autocomplete ne sont pas encore générées (utilisateur n'a jamais ouvert "Ajouter match")
    // On force leur génération
    if (typeof manualCompsData === 'undefined' || manualCompsData.length === 0) {
         // Petite astuce : on appelle la fonction d'init du manuel pour remplir les variables globales
         // sans afficher la modale manuel.
         initManualMatchForm(); 
         // On referme/reset l'UI manuel immédiatement pour ne pas interférer
         document.getElementById('addMatchModal').classList.add('hidden');
    }

    // 3. Initialiser l'UI (Placeholder + Autocomplete)
    refreshSuggestUI();

    // 4. Afficher la modale
    modal.classList.remove('hidden');
}

const isMobile = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
           || window.innerWidth <= 768;
};

async function calculateAndShowStats(e) {
    if(e) e.preventDefault();

    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Connectez-vous pour voir vos statistiques.");
        return;
    }

    // --- 1. Récupération de la photo (inchangé) ---
    let finalPhotoURL = user.photoURL;
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.photoURL) finalPhotoURL = userData.photoURL;
        }
    } catch (err) { console.warn("Erreur photo stats:", err); }

    // --- 2. Mise à jour UI User (inchangé) ---    
    const initial = (user.displayName || "U").charAt(0).toUpperCase();
    const proxyUrl = finalPhotoURL;

    // On ajoute un fallback onerror : Si l'image (proxy ou originale) échoue (404), on affiche l'initiale
    document.getElementById('statsUserInitial').innerHTML = proxyUrl 
        ? `<img src="${proxyUrl}" 
                crossorigin="anonymous" 
                data-initial="${initial}"
                style="width:100%; height:100%; border-radius:50%; object-fit:cover;" 
                onerror="this.style.display='none'; this.parentNode.innerText='${initial}';">`
        : initial;

    const userNameEl = document.getElementById('statsUserName');
    const insta = localStorage.getItem('userInsta');
    const portfolio = localStorage.getItem('userPortfolio');
    const statsSocialsEl = document.getElementById('statsSocials');
    if (insta) {
        // SI INSTA : On ajoute l'icône Instagram avant le pseudo
        if (userNameEl) {
            userNameEl.innerHTML = `<i class="fa-brands fa-instagram" style="margin-right: 6px; opacity: 0.9;"></i>@${insta.replace('@','')}`;
        }
        if (statsSocialsEl) statsSocialsEl.innerHTML = ''; // On n'affiche rien en dessous
    } else {
        // SI PAS D'INSTA : On met le Nom Prénom dans le titre principal
        if (userNameEl) userNameEl.textContent = user.displayName || "Photographe";
        
        // On peut mettre une info par défaut dans le sous-titre si on veut
        if (statsSocialsEl) {
            statsSocialsEl.innerHTML = `<span>Saison 2024-2025</span>`;
        }
    }

    // --- 3. Initialisation des compteurs ---
    let counts = { asked: 0, received: 0, refused: 0 };
    let monthsCount = {};
    let clubsCount = {};
    let topMatchesCandidates = [];
    let compBreakdown = { football: {}, basketball: {}, handball: {} };
    
    let maxLevelVal = -1;
    let bestMatchName = "--";

    // --- 4. ÉTAPE A : Compter "Demandés" et "Refusés" depuis matchStatuses ---
    // On garde matchStatuses pour ce qui est "en cours" ou "refusé", car ce n'est pas dans les archives.
    Object.values(matchStatuses).forEach(status => {
        if (status === 'asked') counts.asked++;
        if (status === 'refused') counts.refused++;
        // Note : On ne compte pas 'received' ici pour éviter les doublons, on le fera via les archives.
    });

    // --- 5. ÉTAPE B : Analyser TOUT l'historique (Flux + Manuel) depuis matchArchives ---
    // C'est ici que la correction opère : on parcourt les archives au lieu des statuts pour les stats de couverture.
    const allArchives = Object.values(matchArchives);
    counts.received = allArchives.length; // Le nombre total de matchs couverts

    allArchives.forEach(matchData => {
        // Sécurité sur l'objet date (parfois string dans les archives)
        const d = new Date(matchData.dateObj);
        
        // A. Data pour Camembert (Sport & Compétition + Age)
        const s = (matchData.sport || "autre").toLowerCase();
        
        // Sécurité si le format n'est pas "SPORT - L1 - AGE"
        const compStr = matchData.compFormatted || "AUTRE - AUTRE - SENIOR";
        const parts = compStr.split(' - ');
        
        let compName = parts[1] || "Autre"; // Ex: "L1"
        const ageCat = parts[2]; // Ex: "U19"

        // Si catégorie jeune (hors SENIOR), on l'ajoute au nom (ex: "NAT U19")
        if (ageCat && !ageCat.includes("SENIOR") && !ageCat.includes("S")) {
            compName += ` ${ageCat}`;
        }
        
        // Initialisation si sport inconnu
        if (!compBreakdown[s]) compBreakdown[s] = {};
        
        compBreakdown[s][compName] = (compBreakdown[s][compName] || 0) + 1;

        // B. Club le plus visité
        const club = matchData.home?.name || "Inconnu";
        clubsCount[club] = (clubsCount[club] || 0) + 1;

        // C. Mois record (Si la date est valide)
        if (!isNaN(d.getTime())) {
            const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
            monthsCount[monthKey] = (monthsCount[monthKey] || 0) + 1;
        }

        // D. Meilleur Match (Logique de classement)
        // Recalcul des parts pour le ranking
        const lvl = parts[1] || "AUTRE";
        const cat = (parts[2] || "").toUpperCase();

        let rank = LEVEL_RANK[lvl] || 99;
        if (cat === "SENIOR" || cat === "S" || cat === "") rank += 0;   // meilleur : aucune pénalité
        else if (cat.includes("F") || cat.includes("FEM")) rank += 0.3; // féminin : légère pénalité
        else rank += 0.5;

        matchData._rankScore = rank;
        topMatchesCandidates.push(matchData);
    });
    topMatchesCandidates.sort((a, b) => {
        // 1. D'abord par niveau (Score)
        if (b._rankScore !== a._rankScore) {
            return a._rankScore - b._rankScore;
        }
        // 2. Ensuite par date (Le plus récent en haut)
        return new Date(b.dateObj) - new Date(a.dateObj);
    });

    const bestMatchEl = document.getElementById('statBestMatch');
    bestMatchEl.style.display = "flex";
    bestMatchEl.style.width = "100%";
    bestMatchEl.style.position = "relative"; // Pour le dropdown
    
    // Fonction helper pour générer le HTML d'un match (Logo vs Logo + Niveau)
    const generateMatchHTML = (m) => {
        const homeLogo = m.home.logo || getLogoUrl(m.home.name) || "https://placehold.co/42x42/png?text=?";
        const awayLogo = m.away.logo || getLogoUrl(m.away.name) || "https://placehold.co/42x42/png?text=?";
        
        const parts = (m.compFormatted || "").split(' - ');
        let displayLvl = parts[1] || "MATCH";
        // Ajout catégorie jeune si besoin
        if (parts[2] && !parts[2].includes("SENIOR") && parts[2] !== "S") {
            displayLvl += ` ${parts[2].replace("ESPOIRS", "U21")}`;
        }

        // Emoji sport
        const sportEmoji = SPORT_EMOJIS[(m.sport || "").toLowerCase()] || "";

        return `
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <img src="${homeLogo}" style="width: 28px; height: 28px; object-fit: contain;">
                    <span style="font-size: 9px; opacity: 0.5;">VS</span>
                    <img src="${awayLogo}" style="width: 28px; height: 28px; object-fit: contain;">
                </div>
                <div style="font-size: 11px; font-weight: 600; color: var(--text-primary); text-align:right;">
                    ${sportEmoji} ${displayLvl}
                </div>
            </div>
        `;
    };

        if (topMatchesCandidates.length > 0) {
        // Le "Top 1" est le premier de la liste triée
        let currentTopMatch = topMatchesCandidates[0];

        // On autorise le dépassement pour voir le menu
        // On autorise le dépassement sur l'élément ET son parent pour voir le menu
        bestMatchEl.style.overflow = "visible"; 
        if (bestMatchEl.parentElement) {
            bestMatchEl.parentElement.style.overflow = "visible"; 
        }

        // Si on a au moins un match, on affiche le menu pour pouvoir changer
        // (Même s'il n'y en a qu'un, ça garde la mise en page, ou mettez > 1 pour cacher la flèche)
        if (topMatchesCandidates.length > 0) {
            
            // HTML principal (Conteneur + Flèche + Dropdown vide pour l'instant)
            bestMatchEl.innerHTML = `
                <div id="selectedTopMatch" style="flex: 1; cursor: pointer;">
                    ${generateMatchHTML(currentTopMatch)}
                </div>
                <div id="topMatchArrow" class="top-match-arrow" style="padding: 0 10px;">
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div id="topMatchDropdown" class="top-match-dropdown"></div>
            `;

            // Récupération des éléments
            const arrow = document.getElementById('topMatchArrow');
            const dropdown = document.getElementById('topMatchDropdown');
            const selectedContainer = document.getElementById('selectedTopMatch');
            const mainContainer = bestMatchEl; // Le parent

            // Remplissage du menu avec TOUS les matchs triés
            topMatchesCandidates.forEach((match) => {
                const item = document.createElement('div');
                item.className = 'top-match-item';
                
                // On ajoute une classe si c'est le match actuellement sélectionné (optionnel pour le style)
                if (match === currentTopMatch) item.style.background = "var(--bg-secondary)";

                item.innerHTML = generateMatchHTML(match);
                
                // Au clic sur un item du menu
                item.addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    
                    // 1. Mettre à jour l'affichage principal
                    selectedContainer.innerHTML = generateMatchHTML(match);
                    
                    // 2. Fermer le menu
                    dropdown.classList.remove('show');
                    arrow.classList.remove('open');
                    bestMatchEl.style.zIndex = ""; // Reset z-index
                });
                
                dropdown.appendChild(item);
            });

            // Fonction d'ouverture/fermeture
            const toggleMenu = (e) => {
                e.stopPropagation();
                const isOpen = dropdown.classList.contains('show');
                
                if (isOpen) {
                    dropdown.classList.remove('show');
                    arrow.classList.remove('open');
                    bestMatchEl.style.zIndex = "";
                } else {
                    dropdown.classList.add('show');
                    arrow.classList.add('open');
                    bestMatchEl.style.zIndex = "100"; // Passe au premier plan
                }
            };

            // On active le menu au clic sur la flèche OU sur le match lui-même
            arrow.addEventListener('click', toggleMenu);
            selectedContainer.addEventListener('click', toggleMenu);

            // Fermer si on clique ailleurs
            document.addEventListener('click', () => {
                dropdown.classList.remove('show');
                arrow.classList.remove('open');
                bestMatchEl.style.zIndex = "";
            });
        }
    } else {
        bestMatchEl.textContent = "--";
    }
    // --- 6. Affichage Chiffres Clés ---
    // Total = Demandés (en cours) + Refusés + Archives (Reçus + Manuels)
    const totalRequests = counts.asked + counts.refused + counts.received; 
    
    // Taux de réussite : On ne compte que ce qui a été demandé via l'app (pas les manuels qui faussent le % car 100% succès)
    // OU on inclut tout. Ici je choisis d'inclure tout pour valoriser l'utilisateur.
    const successRate = totalRequests > 0 ? Math.round((counts.received / totalRequests) * 100) : 0;

    document.getElementById('statRequests').textContent = totalRequests;
    document.getElementById('statAccreds').textContent = counts.received;
    document.getElementById('statRate').textContent = `${successRate}%`;
    

    // --- 7. Calcul "Mois Record" ---
    let bestMonthTxt = "--";
    let maxMatchesMonth = 0;
    Object.keys(monthsCount).forEach(key => {
        if (monthsCount[key] > maxMatchesMonth) {
            maxMatchesMonth = monthsCount[key];
            const [year, monthIdx] = key.split('-');
            const date = new Date(year, monthIdx, 1);
            const mName = date.toLocaleString('fr-FR', { month: 'long' });
            bestMonthTxt = `${mName.charAt(0).toUpperCase() + mName.slice(1)} (${maxMatchesMonth})`;
        }
    });
    document.getElementById('statBestMonth').textContent = bestMonthTxt;

    // --- 8. Calcul "Club Favori" ---
    let bestClubTxt = "--";
    let maxMatchesClub = 0;
    Object.keys(clubsCount).forEach(clubName => {
        if (clubsCount[clubName] > maxMatchesClub) {
            maxMatchesClub = clubsCount[clubName];
            bestClubTxt = clubName;
        }
    });

    const favClubEl = document.getElementById('statFavClub');
    if (maxMatchesClub > 0) {
        // On essaie de trouver le logo dans les archives si c'est un club manuel avec logo perso
        let foundLogo = getLogoUrl(bestClubTxt);
        // Si pas de logo auto, on cherche dans les archives si un match manuel contient ce logo
        if (!foundLogo) {
            const archiveMatch = allArchives.find(m => m.home.name === bestClubTxt && m.home.logo);
            if (archiveMatch) foundLogo = archiveMatch.home.logo;
        }
        
        const fallback = "https://placehold.co/42x42/png?text=?";

        favClubEl.style.display = "flex";
        favClubEl.style.alignItems = "center";
        favClubEl.style.width = "100%";
        favClubEl.style.justifyContent = "space-between";

        favClubEl.innerHTML = `
            <div class="stat-info-main">
                <img src="${foundLogo || fallback}" 
                    style="width: 28px; height: 28px; object-fit: contain; flex-shrink: 0;" 
                    onerror="this.src='${fallback}'">
                <span class="stat-club-name" title="${bestClubTxt}">
                    ${bestClubTxt}
                </span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                <span style="opacity: 0.2; font-weight: 300;">—</span>
                <span class="stat-count-badge">
                    ${maxMatchesClub}
                </span>
            </div>
        `;
    } else {
        favClubEl.textContent = "--";
    }

    // --- 9. Génération Camembert & Légende  ---
    const chartEl = document.getElementById('sportPieChart');
    const legendEl = document.getElementById('pieLegend');
    
    chartEl.innerHTML = getPieChartSVG(compBreakdown, SPORT_COLORS);

    let legendHtml = '';
    if (counts.received === 0) {
        legendHtml = '<span style="font-size:11px; color:gray; display:block; text-align:center; margin-top:10px;">Aucune donnée</span>';
    } else {
        legendHtml += '<div style="display: flex; justify-content: center; gap: 16px; margin-top: 8px; margin-bottom: 8px;">';
        ['football', 'basketball', 'handball'].forEach(sport => {
            if (compBreakdown[sport] && Object.keys(compBreakdown[sport]).length > 0) {
                const color = SPORT_COLORS[sport];
                const emoji = SPORT_EMOJIS[sport]; 
                legendHtml += `
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span style="width: 6px; height: 6px; border-radius: 50%; background: ${color};"></span>
                        <span style="font-size: 12px; line-height: 1;">${emoji}</span>
                    </div>`;
            }
        });
        legendHtml += '</div>';
        legendHtml += '<div style="height: 1px; background: var(--border-color); margin: 0 10px 6px; opacity: 0.3;"></div>';

        ['football', 'basketball', 'handball'].forEach(sport => {
            const comps = compBreakdown[sport];
            if (!comps || Object.keys(comps).length === 0) return;
            const baseColor = SPORT_COLORS[sport];
            const sortedComps = Object.entries(comps).sort((a,b) => b[1] - a[1]);

            sortedComps.forEach(([cName, count], index) => {
                if (index < 2) { 
                    const percent = (count / counts.received) * 100;
                    const opacity = 0.5 + (0.5 * (1 - (index / sortedComps.length)));
                    legendHtml += `
                        <div class="legend-item" style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; padding: 0 10px; color: var(--text-secondary);">
                            <span style="display: flex; align-items: center; gap: 6px;">
                                <span class="legend-color" style="width:5px; height:5px; border-radius:2px; background:${baseColor}; opacity:${opacity}"></span> 
                                ${cName}
                            </span>
                            <span style="font-weight:600; opacity:0.8;">${Math.round(percent)}%</span>
                        </div>`;
                }
            });
        });
    }
    legendEl.innerHTML = legendHtml;

    // --- 10. Affichage Final ---
    document.getElementById('settingsModal').classList.add('hidden');
    statsModal.classList.remove('hidden');
}