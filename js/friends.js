// Mettre à jour l'affichage de la Modale "Mes Amis"
async function updateFriendsUI() {
    const friendsList = document.getElementById('friendsList');
    const pendingList = document.getElementById('pendingRequestsList');
    const pendingSection = document.getElementById('pendingRequestsSection');
    const friendsCount = document.getElementById('friendsCount');
    const pendingCount = document.getElementById('pendingCount');

    if (!friendsList || !pendingList) return;

    // --- 1. GESTION DES DEMANDES EN ATTENTE ---
    if (myFriendRequests.length > 0) {
        pendingSection.style.display = 'block';
        pendingCount.textContent = myFriendRequests.length;
        pendingList.innerHTML = ''; // On vide

        for (const reqUid of myFriendRequests) {
            const reqUser = await fetchUserProfile(reqUid);
            if (reqUser) {
                pendingList.innerHTML += `
                    <div style="display: flex; align-items: center; justify-content: space-between; background: var(--card-bg); padding: 10px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 5px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${getAvatarHTML(reqUser.photoURL, reqUser.displayName, 36)}
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 11px; color: var(--text-secondary);">@${reqUser.instagram}</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="acceptFriend('${reqUid}')" class="login-submit-btn" style="width: 32px; height: 32px; padding: 0; margin: 0; background: #34C759; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <i class="fa-solid fa-check"></i>
                            </button>
                            <button onclick="declineFriend('${reqUid}')" class="login-submit-btn" style="width: 32px; height: 32px; padding: 0; margin: 0; background: transparent; border: 1px solid #FF3B30; color: #FF3B30; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>
                    </div>`;
            }
        }
    } else {
        pendingSection.style.display = 'none';
    }

    // --- 2. GESTION DE LA LISTE D'AMIS ---
    friendsCount.textContent = myFriends.length;
    friendsList.innerHTML = '';

    if (myFriends.length === 0) {
        friendsList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 20px;">Vous n'avez pas encore ajouté d'amis.</div>`;
    } else {
        for (const friendUid of myFriends) {
            const friend = await fetchUserProfile(friendUid);
            if (friend) {
                friendsList.innerHTML += `
                    <div onclick="openFriendProfile('${friendUid}')" style="display: flex; align-items: center; justify-content: space-between; background: var(--card-bg); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); cursor: pointer; margin-bottom: 5px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            ${getAvatarHTML(friend.photoURL, friend.instagram, 36)}
                            <span style="font-weight: 600; font-size: 14px; color: var(--text-primary);">@${friend.instagram}</span>
                        </div>
                        <i class="fa-solid fa-chevron-right" style="color: var(--text-secondary); font-size: 14px;"></i>
                    </div>
                `;
            }
        }
    }
    loadSentRequests();
}

// Fonction pour récupérer et afficher les demandes envoyées
async function loadSentRequests() {
    const user = auth.currentUser;
    if (!user) return;

    const sentSection = document.getElementById('sentRequestsSection');
    const sentList = document.getElementById('sentRequestsList');
    const sentCount = document.getElementById('sentCount');

    if (!sentSection || !sentList) return;

    try {
        // Requête magique : Trouve tous les users qui ont MON uid en attente
        const querySnapshot = await db.collection('users').where('friendRequests', 'array-contains', user.uid).get();
        
        if (querySnapshot.empty) {
            sentSection.style.display = 'none';
            return;
        }

        sentSection.style.display = 'block';
        sentCount.textContent = querySnapshot.docs.length;
        sentList.innerHTML = '';

        querySnapshot.docs.forEach(doc => {
            const targetData = doc.data();
            const targetUid = doc.id;

            sentList.innerHTML += `
                <div style="display: flex; align-items: center; justify-content: space-between; background: var(--card-bg); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${getAvatarHTML(targetData.photoURL, targetData.displayName, 36)}
                        <div style="display: flex; flex-direction: column;">
                            <span style="font-size: 11px; color: var(--text-secondary);">@${targetData.instagram}</span>
                        </div>
                    </div>
                    <button onclick="cancelFriendRequest('${targetUid}')" class="login-submit-btn" style="width: auto; padding: 6px 12px; margin: 0; background: transparent; border: 1px solid #FF3B30; color: #FF3B30; font-size: 12px; border-radius: 6px;">
                        Annuler
                    </button>
                </div>`;
        });
    } catch (e) {
        console.error("Erreur chargement demandes envoyées", e);
    }
}

window.injectFriendsOnCards = async function() {
    // Si l'utilisateur n'est pas connecté ou n'a pas d'amis, on arrête.
    if (!auth.currentUser || myFriends.length === 0) return;

    // 1. Récupérer les données à jour de tous les amis (Utilise le cache pour être ultra rapide)
    const friendsData = [];
    for (const uid of myFriends) {
        const f = await fetchUserProfile(uid);
        if (f) {
            f.uid = uid; // On garde l'UID pour pouvoir cliquer sur le profil
            friendsData.push(f);
        }
    }

    // 2. Parcourir toutes les zones d'avatars (.friends-stack) générées sur l'écran
    const stacks = document.querySelectorAll('.friends-stack');
    
    stacks.forEach(stack => {
        // L'ID de la stack est au format "friends-stack-MATCH_ID"
        const matchId = stack.id.replace('friends-stack-', '');
        let html = '';
        let count = 0;
        let friendsHere = [];

        // 3. Vérifier quels amis vont à ce match
        friendsData.forEach(friend => {
            const favStatus = friend.favorites ? friend.favorites[matchId] : null;
            const isArchived = friend.archives ? !!friend.archives[matchId] : false;

            // --- CORRECTION ICI : Condition explicite pour les 3 statuts ---
            if (favStatus === 'envie' || favStatus === 'asked' || favStatus === 'received' || isArchived) {
                friendsHere.push(friend);
                
                // On affiche un maximum de 3 photos empilées
                if (count < 3) {
                    const marginLeft = count === 0 ? '0' : '-10px';
                    const zIndex = 10 - count;
                    const initial = (friend.displayName || "U").charAt(0).toUpperCase();
                    
                    // Sécurisation de l'image (Proxy anti-CORS)
                    let safeUrl = friend.photoURL || '';
                    if (safeUrl && !safeUrl.includes('wsrv.nl') && !safeUrl.includes('ui-avatars.com')) {
                        safeUrl = `https://wsrv.nl/?url=${encodeURIComponent(safeUrl)}&maxage=1d`;
                    }

                    // Détermination du statut exact
                    let currentStatus = 'envie'; // Par défaut
                    let statusTitle = "a prévu d'y aller";

                    if (isArchived || favStatus === 'received') {
                        currentStatus = 'received';
                        statusTitle = "est accrédité(e)";
                    } else if (favStatus === 'asked') {
                        currentStatus = 'asked';
                        statusTitle = "a fait la demande";
                    }

                    // Génération de la pastille de statut
                    let statusIconHtml = '';
                    if (currentStatus === 'received') {
                        statusIconHtml = '<div style="position: absolute; bottom: -2px; right: -4px; background: white; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #34C759; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 2;"><i class="fa-solid fa-circle-check"></i></div>';
                    } else if (currentStatus === 'asked') {
                        statusIconHtml = '<div style="position: absolute; bottom: -2px; right: -4px; background: white; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #0071E3; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 2;"><i class="fa-solid fa-paper-plane"></i></div>';
                    } else if (currentStatus === 'envie') {
                        statusIconHtml = '<div style="position: absolute; bottom: -2px; right: -4px; background: white; border-radius: 50%; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #FF9500; box-shadow: 0 1px 3px rgba(0,0,0,0.3); z-index: 2;"><i class="fa-solid fa-star"></i></div>';
                    }

                    // Création de l'avatar avec un conteneur parent relatif pour que la pastille sorte du cadre
                    html += `
                    <div onclick="event.stopPropagation(); openFriendProfile('${friend.uid}')" 
                         style="position: relative; width: 26px; height: 26px; margin-left: ${marginLeft}; z-index: ${zIndex}; cursor: pointer; transition: transform 0.2s ease;"
                         onmouseover="this.style.transform='translateY(-2px)'"
                         onmouseout="this.style.transform='translateY(0)'"
                         title="${friend.instagram} ${statusTitle}">
                        
                        <div style="width: 100%; height: 100%; background: white; color: var(--accent); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; border: 2px solid var(--card-bg);">
                            <img src="${safeUrl}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentNode.innerText='${initial}';">
                        </div>
                        
                        ${statusIconHtml}
                    </div>`;
                }
                count++;
            }
        });

        // 4. S'il y a plus de 3 amis, on ajoute une petite pastille "+X"
        if (count > 3) {
            const extraNames = friendsHere.map(f => f.displayName).join(', ');
            html += `
            <div style="width: 26px; height: 26px; border-radius: 50%; background: var(--bg-secondary); color: var(--text-secondary); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; border: 2px solid var(--card-bg); margin-left: -10px; z-index: 1; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" title="${extraNames}">
                +${count - 3}
            </div>`;
        }

        // On injecte le tout dans la carte
        stack.innerHTML = html;
    });
};

window.sendFriendRequest = async (targetUid) => {
    const user = auth.currentUser;
    if (!user) return;

    // --- SÉCURITÉ : VÉRIFICATIONS AVANT ENVOI ---
    if (myFriends.includes(targetUid)) {
        alert("Vous êtes déjà amis avec ce photographe !");
        return;
    }
    if (myFriendRequests.includes(targetUid)) {
        alert("Cette personne vous a déjà envoyé une demande. Acceptez-la dans vos demandes reçues !");
        return;
    }

    try {
        await db.collection('users').doc(targetUid).update({
            friendRequests: firebase.firestore.FieldValue.arrayUnion(user.uid)
        });
        
        const resultDiv = document.getElementById('friendSearchResult');
        if(resultDiv) resultDiv.innerHTML = "<span style='color: #34C759;'><i class='fa-solid fa-check'></i> Demande envoyée !</span>";
        
        // Met à jour la liste des demandes envoyées immédiatement (si la fonction existe)
        if (typeof loadSentRequests === 'function') loadSentRequests();
        
    } catch(e) { console.error("Erreur envoi demande", e); }
};

window.acceptFriend = async (requesterUid) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        // Opération par lot (batch) pour que les deux profils soient mis à jour simultanément
        const batch = db.batch();
        const myRef = db.collection('users').doc(user.uid);
        const requesterRef = db.collection('users').doc(requesterUid);

        // Moi : Je l'ajoute en ami et j'enlève la demande
        batch.update(myRef, {
            friendRequests: firebase.firestore.FieldValue.arrayRemove(requesterUid),
            friends: firebase.firestore.FieldValue.arrayUnion(requesterUid)
        });
        
        // Lui : Il m'ajoute en ami
        batch.update(requesterRef, {
            friends: firebase.firestore.FieldValue.arrayUnion(user.uid)
        });

        await batch.commit();
        // UI se mettra à jour automatiquement grâce au onSnapshot !
    } catch(e) { console.error("Erreur acceptation", e); }
};

window.declineFriend = async (requesterUid) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await db.collection('users').doc(user.uid).update({
            friendRequests: firebase.firestore.FieldValue.arrayRemove(requesterUid)
        });
    } catch(e) { console.error("Erreur refus", e); }
};


// Fonction pour annuler une demande envoyée
window.cancelFriendRequest = async (targetUid) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
        await db.collection('users').doc(targetUid).update({
            friendRequests: firebase.firestore.FieldValue.arrayRemove(user.uid)
        });
        
        // On recharge la liste instantanément pour voir la ligne disparaître
        loadSentRequests();
        
    } catch(e) { console.error("Erreur annulation demande", e); }
};

// Fonction pour retirer un ami
window.removeFriend = async (friendUid) => {
    if(!confirm("Voulez-vous vraiment retirer cet ami de votre réseau ?")) return;
    const user = auth.currentUser;
    if(!user) return;
    
    try {
        const batch = db.batch();
        // On supprime la relation des deux côtés
        batch.update(db.collection('users').doc(user.uid), {
            friends: firebase.firestore.FieldValue.arrayRemove(friendUid)
        });
        batch.update(db.collection('users').doc(friendUid), {
            friends: firebase.firestore.FieldValue.arrayRemove(user.uid)
        });
        await batch.commit();
        
        // Retour à la liste d'amis
        document.getElementById('friendProfileModal').classList.add('hidden');
        document.getElementById('friendsModal').classList.remove('hidden');
    } catch(e) { console.error("Erreur suppression ami", e); }
};

window.openFriendProfile = async (friendUid) => {
    
    // On mémorise si on venait de la modale amis
    const friendsModal = document.getElementById('friendsModal');
    window._profileOpenedFromFriends = friendsModal && 
        !friendsModal.classList.contains('hidden');

    const friend = await fetchUserProfile(friendUid);
    if (!friend) return;

    if (friend.instagram) {
        const url = new URL(window.location);
        url.searchParams.set('profile', friend.instagram.toLowerCase());
        window.history.pushState({}, '', url);
    }

    // 1. Remplir l'en-tête (Uniquement Pseudo Insta)
    const picContainer = document.getElementById('friendProfilePic');
    if (picContainer) picContainer.innerHTML = getAvatarHTML(friend.photoURL, friend.instagram, 60);
    
    document.getElementById('friendProfileName').innerHTML = `<i class="fa-brands fa-instagram"></i> @${friend.instagram || 'inconnu'}`;
    const instaDiv = document.getElementById('friendProfileInsta');
    if (instaDiv) instaDiv.style.display = 'none';

    const actionBtn = document.getElementById('removeFriendBtn');
        if (actionBtn) {
            const currentUser = firebase.auth() ? firebase.auth().currentUser : null;
            
            // Helper pour changer l'apparence et l'action du bouton facilement
            const setBtn = (text, icon, bg, color, border, onClick) => {
                actionBtn.innerHTML = `<i class="fa-solid ${icon}"></i> ${text}`;
                actionBtn.style.background = bg;
                actionBtn.style.color = color;
                actionBtn.style.border = border;
                actionBtn.onclick = onClick;
                actionBtn.style.display = 'inline-flex';
            };

            if (!currentUser) {
                // CAS 1 : Inconnu (Non connecté)
                setBtn("Se connecter pour l'ajouter", "fa-user-astronaut", "var(--accent)", "white", "none", () => {
                    document.getElementById('friendProfileModal').classList.add('hidden');
                    document.getElementById('loginModal').classList.remove('hidden');
                    document.getElementById('loginView').style.display = 'block';
                });
            } else if (currentUser.uid === friendUid) {
                // CAS 2 : C'est son propre profil (Il s'est auto-cherché)
                actionBtn.style.display = 'none';
            } else {
                // CAS 3 : Utilisateur connecté regarde un autre profil
                // Sécurité au cas où les tableaux ne sont pas encore chargés
                const safeMyFriends = typeof myFriends !== 'undefined' ? myFriends : [];
                const safeMyRequests = typeof myFriendRequests !== 'undefined' ? myFriendRequests : [];
                
                const isFriend = safeMyFriends.includes(friendUid);
                const sentReq = friend.friendRequests && friend.friendRequests.includes(currentUser.uid);
                const receivedReq = safeMyRequests.includes(friendUid);

                if (isFriend) {
                    setBtn("Retirer cet ami", "fa-user-minus", "transparent", "#FF3B30", "1px solid #FF3B30", () => removeFriend(friendUid));
                } else if (sentReq) {
                    setBtn("Demande envoyée", "fa-clock", "transparent", "var(--text-secondary)", "1px solid var(--border-color)", () => cancelFriendRequest(friendUid));
                } else if (receivedReq) {
                    setBtn("Accepter la demande", "fa-check", "#34C759", "white", "none", async () => {
                        await acceptFriend(friendUid);
                        openFriendProfile(friendUid); // Rafraîchit visuellement
                    });
                } else {
                    setBtn("Ajouter en ami", "fa-user-plus", "var(--accent)", "white", "none", async () => {
                        await sendFriendRequest(friendUid);
                        openFriendProfile(friendUid); // Rafraîchit visuellement
                    });
                }
            }
        }

    // 2. Calcul des Stats de base et Camembert
    const friendArchives = friend.archives || {};
    const friendFavorites = friend.favorites || {};
    
    let asked = 0, received = Object.keys(friendArchives).length, refused = 0;
    
    // Structure requise pour le camembert Sunburst
    let compBreakdown = { football: {}, basketball: {}, handball: {} };

    Object.values(friendFavorites).forEach(status => {
        if (status === 'asked') asked++;
        if (status === 'refused') refused++;
    });
    
    Object.values(friendArchives).forEach(m => {
        const s = (m.sport || "football").toLowerCase();
        const compStr = m.compFormatted || "AUTRE - AUTRE - SENIOR";
        const parts = compStr.split(' - ');
        
        let compName = parts[1] || "Autre";
        const ageCat = parts[2];
        if (ageCat && !ageCat.includes("SENIOR") && !ageCat.includes("S")) {
            compName += ` ${ageCat}`;
        }
        
        if (!compBreakdown[s]) compBreakdown[s] = {};
        compBreakdown[s][compName] = (compBreakdown[s][compName] || 0) + 1;
    });

    const totalReq = asked + refused + received;
    const rate = totalReq > 0 ? Math.round((received / totalReq) * 100) : 0;

    document.getElementById('friendStatRequests').textContent = totalReq;
    document.getElementById('friendStatAccreds').textContent = received;
    document.getElementById('friendStatRate').textContent = `${rate}%`;

    // 3. Génération du Camembert (Double Donut)
    const pieChartDiv = document.getElementById('friendSportPieChart');
    const pieLegendDiv = document.getElementById('friendPieLegend');
    
    if (pieChartDiv && pieLegendDiv) {
        // Utilisation de la même fonction que pour tes propres stats !
        pieChartDiv.innerHTML = getPieChartSVG(compBreakdown, { 'football': '#34C759', 'basketball': '#FF9500', 'handball': '#0071E3' });
        
        let legendHtml = '';
        if (received === 0) {
            legendHtml = '<span style="font-size:11px; color:gray; display:block; text-align:center; margin-top:10px;">Aucune donnée</span>';
        } else {
            // --- NOUVEAU : Ajout de la ligne avec les émojis des sports ---
            legendHtml += '<div style="display: flex; justify-content: center; gap: 16px; margin-top: 8px; margin-bottom: 8px;">';
            ['football', 'basketball', 'handball'].forEach(sport => {
                if (compBreakdown[sport] && Object.keys(compBreakdown[sport]).length > 0) {
                    const baseColor = { 'football': '#34C759', 'basketball': '#FF9500', 'handball': '#0071E3' }[sport];
                    const emoji = SPORT_EMOJIS[sport]; 
                    legendHtml += `
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <span style="width: 6px; height: 6px; border-radius: 50%; background: ${baseColor};"></span>
                            <span style="font-size: 12px; line-height: 1;">${emoji}</span>
                        </div>`;
                }
            });
            legendHtml += '</div>';
            legendHtml += '<div style="height: 1px; background: var(--border-color); margin: 0 10px 6px; opacity: 0.3;"></div>';

            // --- SUITE : Création de la légende (Top 2 par sport) ---
            ['football', 'basketball', 'handball'].forEach(sport => {
                const comps = compBreakdown[sport];
                if (!comps || Object.keys(comps).length === 0) return;
                const baseColor = { 'football': '#34C759', 'basketball': '#FF9500', 'handball': '#0071E3' }[sport];
                const sortedComps = Object.entries(comps).sort((a,b) => b[1] - a[1]);

                sortedComps.slice(0, 2).forEach(([cName, count], index) => {
                    const percent = (count / received) * 100;
                    const opacity = 0.5 + (0.5 * (1 - (index / sortedComps.length)));
                    legendHtml += `
                        <div class="legend-item" style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; padding: 0 10px; color: var(--text-secondary);">
                            <span style="display: flex; align-items: center; gap: 6px;">
                                <span class="legend-color" style="width:5px; height:5px; border-radius:2px; background:${baseColor}; opacity:${opacity}"></span> 
                                ${cName}
                            </span>
                            <span style="font-weight:600; opacity:0.8;">${Math.round(percent)}%</span>
                        </div>`;
                });
            });
        }
        pieLegendDiv.innerHTML = legendHtml;
    }

    // 4. Calcul des Matchs couverts ensemble
    const commonSection = document.getElementById('friendCommonSection');
    const commonMatchesList = document.getElementById('friendCommonMatchesList');
    const commonCount = document.getElementById('friendCommonCount');
    
    if (commonMatchesList && commonCount && commonSection) {
        commonMatchesList.innerHTML = '';
        let commonMatchesArray = [];
        
        const currentUser = firebase.auth() ? firebase.auth().currentUser : null;

        // Si on n'est pas connecté OU qu'on regarde notre propre profil, on cache cette section
        if (!currentUser || currentUser.uid === friendUid) {
            commonSection.style.display = 'none';
        } else {
            Object.keys(matchArchives).forEach(myMatchId => {
                if (friendArchives[myMatchId]) {
                    commonMatchesArray.push(matchArchives[myMatchId]);
                }
            });

            commonCount.textContent = commonMatchesArray.length;
            
            if (commonMatchesArray.length > 0) {
                commonSection.style.display = 'block';
                
                // --- TRI ABSOLU DU PLUS RÉCENT AU PLUS ANCIEN ---
                commonMatchesArray.sort((a, b) => {
                    const dateA = new Date(a.dateObj).getTime();
                    const dateB = new Date(b.dateObj).getTime();
                    return dateB - dateA; 
                });

                commonMatchesArray.forEach(m => {
                    const dateStr = new Date(m.dateObj).toLocaleDateString('fr-FR', { 
                        day: '2-digit', 
                        month: 'short',
                        year: '2-digit' 
                    });
                    
                    commonMatchesList.innerHTML += `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); padding:10px; border-radius:8px; border: 1px solid var(--border-color); margin-bottom: 5px;">
                            <span style="font-size:12px; font-weight:600; color:var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">${m.home.name} <span style="font-weight:400; opacity:0.6;">vs</span> ${m.away.name}</span>
                            <span style="font-size:11px; color:var(--text-secondary); background:var(--tag-bg); padding:2px 6px; border-radius:4px; flex-shrink: 0;">${dateStr}</span>
                        </div>
                    `;
                });
            } else {
                commonSection.style.display = 'none';
            }
        }
    }

    const upcomingList = document.getElementById('friendUpcomingMatchesList');
    const upcomingSection = document.getElementById('friendUpcomingSection');
    const upcomingCount = document.getElementById('friendUpcomingCount');
    
    if (upcomingList && upcomingSection && upcomingCount) {
        upcomingList.innerHTML = '';
        let upcomingMatches = [];
        const now = new Date();

        // On cherche dans ses favoris ceux qui ont le statut 'envie', 'asked' ou 'received'
        Object.keys(friendFavorites).forEach(matchId => {
            const status = friendFavorites[matchId];
            if (status === 'envie' || status === 'asked' || status === 'received') {
                // On croise avec la base globale des matchs pour récupérer les infos
                const matchObj = allMatches.find(m => getMatchId(m) === matchId);
                
                // On s'assure que le match existe et qu'il est dans le futur
                if (matchObj && matchObj.dateObj >= now) {
                    // On clone l'objet pour lui attacher son statut spécifique
                    upcomingMatches.push({ ...matchObj, friendStatus: status });
                }
            }
        });

        if (upcomingMatches.length > 0) {
            upcomingCount.textContent = upcomingMatches.length;
            upcomingSection.style.display = 'block'; // On affiche la section

            // Tri par date de match (le plus proche en premier)
            upcomingMatches.sort((a, b) => a.dateObj - b.dateObj);

            // Définition de l'apparence selon le statut
            const statusVisuals = {
                'envie': { icon: 'fa-star', color: '#FF9500', text: 'Envie d\'y aller' },
                'asked': { icon: 'fa-paper-plane', color: '#0071E3', text: 'Demande envoyée' },
                'received': { icon: 'fa-circle-check', color: '#34C759', text: 'Validé' }
            };

            upcomingMatches.forEach(m => {
                const dateStr = m.dateObj.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                const timeStr = m.time; 
                const compBadge = getShortComp(m.compFormatted, m.sport); 
                
                // On génère la petite pastille avec la bonne icône/couleur
                const visual = statusVisuals[m.friendStatus];
                const statusHtml = `<span style="font-size:10px; color:${visual.color}; display:flex; align-items:center; gap:4px; font-weight:600;"><i class="fa-solid ${visual.icon}"></i> ${visual.text}</span>`;
                
                upcomingList.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--card-bg); padding:10px; border-radius:8px; border: 1px solid var(--border-color);">
                        <div style="display: flex; flex-direction: column; gap: 4px; overflow: hidden; padding-right: 10px;">
                            <span style="font-size:12px; font-weight:600; color:var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.home.name} <span style="font-weight:400; opacity:0.6;">vs</span> ${m.away.name}</span>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:10px; color:var(--text-muted); background:var(--bg-secondary); padding:2px 4px; border-radius:4px;">${compBadge}</span>
                                ${statusHtml}
                            </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;">
                            <span style="font-size:11px; color:var(--text-secondary); background:var(--tag-bg); padding:2px 6px; border-radius:4px;">${dateStr}</span>
                            <span style="font-size:10px; color:var(--text-muted); font-weight: 600;">${timeStr}</span>
                        </div>
                    </div>
                `;
            });
        } else {
            upcomingSection.style.display = 'none'; // On cache s'il n'y a rien
        }
    }

    // 5. Générer l'Historique de l'ami
    renderFriendHistory(friendArchives);

    // 6. Afficher la modale
    document.getElementById('friendsModal').classList.add('hidden');
    document.getElementById('friendProfileModal').classList.remove('hidden');
};

// Fonction utilitaire pour récupérer un profil (avec cache pour économiser Firebase)
async function fetchUserProfile(uid) {
    if (usersCache.has(uid)) return usersCache.get(uid);
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            usersCache.set(uid, data);
            return data;
        }
    } catch (e) { console.error("Erreur fetch user", e); }
    return null;
}

// Interception et Traitement du lien d'invitation
window.checkPendingInvitations = async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const profileInsta = urlParams.get('profile');
    if (profileInsta) {
        // Boucle d'attente pour s'assurer que les matchs sont bien chargés en arrière-plan
        const tryOpenProfile = async () => {
            if (typeof allMatches !== 'undefined' && allMatches.length > 0) {
                try {
                    // On cherche l'utilisateur dans la base de données via son pseudo
                    const query = await db.collection('users')
                        .where('instagram', '==', profileInsta.toLowerCase().trim())
                        .limit(1)
                        .get();
                        
                    if (!query.empty) {
                        const targetUid = query.docs[0].id;
                        openFriendProfile(targetUid);
                    } else {
                        alert("Profil FokalPress introuvable pour ce pseudo.");
                        cleanUrlParameters(); // Nettoie l'URL si erreur
                    }
                } catch (e) {
                    console.error("Erreur chargement profil public:", e);
                }
            } else {
                setTimeout(tryOpenProfile, 100);
            }
        };
        tryOpenProfile();
        return; // On arrête l'exécution ici pour prioriser l'affichage du profil
    }
    const inviteMatchId = urlParams.get('inviteMatch');
    const fromUid = urlParams.get('from');
    const addFriendUid = urlParams.get('addFriend');

    if (!inviteMatchId && !fromUid && !addFriendUid) return; 

    const user = auth.currentUser;

    if (!user) {
        const hostUid = fromUid || addFriendUid;
        let hostName = "Un photographe";
        let hostPicHtml = `<div style="width: 80px; height: 80px; background: var(--tag-bg); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px;"><i class="fa-solid fa-user"></i></div>`;

        // On tente de récupérer les infos publiques de l'hôte
        if (hostUid) {
            try {
                const doc = await db.collection('users').doc(hostUid).get();
                if (doc.exists) {
                    const data = doc.data();
                    hostName = data.instagram || "Un ami";
                    hostPicHtml = getAvatarHTML(data.photoURL, hostName, 80);
                }
            } catch(e) {
                console.warn("Lecture du profil public bloquée ou impossible", e);
            }
        }

        // Préparation de la modale d'accueil
        const onboardingModal = document.getElementById('inviteOnboardingModal');
        document.getElementById('onboardingHostName').textContent = hostName;
        document.getElementById('onboardingHostPic').innerHTML = hostPicHtml;

        const textEl = document.getElementById('onboardingText');
        
        if (inviteMatchId) {
            // C'est une invitation à un match
            const parts = inviteMatchId.split('_');
            const home = parts[0] || "Domicile";
            const away = parts[1] || "Extérieur";
            textEl.innerHTML = `Il vous invite à venir photographier le match <strong style="color:var(--text-primary);">${home} vs ${away}</strong> avec lui !<br><br>Créez votre compte pour accepter l'invitation.`;
        } else {
            // C'est une invitation générique au réseau
            textEl.innerHTML = `Il souhaite vous ajouter à son réseau sur <strong style="color:var(--text-primary);">FokalPress</strong>, l'outil de planification des photographes de sport.<br><br>Créez votre compte pour voir ses matchs.`;
        }

        onboardingModal.classList.remove('hidden');

        // Gestion de la fermeture (On nettoie l'URL pour ne pas le harceler)
        document.getElementById('closeInviteOnboardingBtn').onclick = () => {
            onboardingModal.classList.add('hidden');
            cleanUrlParameters();
        };

        // Gestion du Clic sur "Créer mon compte Google"
        const onboardingBtn = document.getElementById('onboardingLoginBtn');
        onboardingBtn.onclick = async () => {
            const originalHtml = onboardingBtn.innerHTML;
            onboardingBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Connexion...</span>';
            onboardingBtn.disabled = true;

            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await auth.signInWithPopup(provider);
                onboardingModal.classList.add('hidden');
                // Note : On NE NETTOIE PAS l'URL ici !
                // Comme ça, dès qu'il est connecté, `checkPendingInvitations` sera relancée 
                // automatiquement par Firebase et passera au CAS 2 pour finaliser l'ajout !
            } catch (err) {
                console.error("Erreur login via onboarding :", err);
                onboardingBtn.innerHTML = originalHtml;
                onboardingBtn.disabled = false;
            }
        };

        return; // On arrête l'exécution ici car il n'est pas connecté
    }

    // A. Traitement du lien d'ajout d'ami générique (?addFriend=...)
    if (addFriendUid && addFriendUid !== user.uid) {
        if (myFriends.includes(addFriendUid) || myFriendRequests.includes(addFriendUid)) {
            if (!inviteMatchId) cleanUrlParameters(); 
        } else {
            const hostUser = await fetchUserProfile(addFriendUid);
            if (hostUser) {
                const friendModal = document.getElementById('inviteFriendModal');
                document.getElementById('inviteFriendName').textContent = hostUser.instagram || "Un ami";
                document.getElementById('inviteFriendPicContainer').innerHTML = getAvatarHTML(hostUser.photoURL, hostUser.displayName, 80);
                
                friendModal.classList.remove('hidden');

                const closeAndCleanFriend = () => {
                    friendModal.classList.add('hidden');
                    if (!inviteMatchId) cleanUrlParameters();
                };

                document.getElementById('closeInviteFriendBtn').onclick = closeAndCleanFriend;
                document.getElementById('declineFriendInviteBtn').onclick = closeAndCleanFriend;
                document.getElementById('acceptFriendInviteBtn').onclick = async () => {
                    await acceptFriend(addFriendUid);
                    closeAndCleanFriend();

                    alert(`Vous êtes maintenant ami avec @${hostUser.instagram} !`);
                };
                if (!inviteMatchId) return; 
            }
        }
    }

    // B. Traitement du lien de match (?inviteMatch=...&from=...)
    if (inviteMatchId && fromUid) {
        if (user.uid === fromUid) {
            cleanUrlParameters();
            return;
        }

        // CORRECTION ANTI-BOUCLE : On interroge la BDD directement pour être 100% sûr de la relation
        try {
            const myDoc = await db.collection('users').doc(user.uid).get();
            const myData = myDoc.exists ? myDoc.data() : {};
            const myCurrentFriends = myData.friends || [];
            const myCurrentRequests = myData.friendRequests || [];

            if (!myCurrentFriends.includes(fromUid) && !myCurrentRequests.includes(fromUid)) {
                await db.collection('users').doc(fromUid).update({
                    friendRequests: firebase.firestore.FieldValue.arrayUnion(user.uid)
                });
            }
        } catch(e) {}

        const hostUser = await fetchUserProfile(fromUid);
        if (!hostUser) {
            cleanUrlParameters();
            return;
        }

        const modal = document.getElementById('inviteMatchModal');
        document.getElementById('inviteHostName').textContent = hostUser.instagram || "Un ami";
        
        let safeUrl = hostUser.photoURL || 'data/default-team.png';
        if (safeUrl !== 'data/default-team.png' && !safeUrl.includes('wsrv.nl') && !safeUrl.includes('ui-avatars.com')) {
            safeUrl = `https://wsrv.nl/?url=${encodeURIComponent(safeUrl)}&maxage=1d`;
        }
        document.getElementById('inviteHostPic').src = safeUrl;

        const parts = inviteMatchId.split('_');
        const home = parts[0] || "Domicile";
        const away = parts[1] || "Extérieur";
        document.getElementById('inviteMatchTitle').textContent = `${home} vs ${away}`;

        // --- NOUVEAU : SCROLL ET FOCUS SUR LA CARTE ---
        // On cherche la carte correspondante dans la grille
        const targetCard = document.getElementById(`match-card-${inviteMatchId}`);
        
        if (targetCard) {
            // 1. Scroll doux pour centrer la carte à l'écran
            targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // 2. Application d'un effet visuel de focus (surbrillance)
            const originalBorder = targetCard.style.borderColor;
            const originalShadow = targetCard.style.boxShadow;
            
            targetCard.style.transition = 'all 0.5s ease';
            targetCard.style.borderColor = 'var(--accent)'; // Utilise la couleur principale du site
            targetCard.style.boxShadow = '0 0 15px rgba(255, 45, 85, 0.4)'; // Halo coloré

            // 3. On retire l'effet au bout de 3 secondes pour que ça redevienne normal
            setTimeout(() => {
                targetCard.style.borderColor = originalBorder;
                targetCard.style.boxShadow = originalShadow;
            }, 3000);
        }
        // ----------------------------------------------

        modal.classList.remove('hidden');

        const joinBtn = document.getElementById('joinMatchBtn');
        const declineBtn = document.getElementById('declineMatchBtn');
        const closeBtn = document.getElementById('closeInviteModalBtn');

        const closeAndClean = () => {
            modal.classList.add('hidden');
            cleanUrlParameters();
        };

        declineBtn.onclick = closeAndClean;
        closeBtn.onclick = closeAndClean;

        joinBtn.onclick = () => {
            if (!matchStatuses[inviteMatchId]) {
                matchStatuses[inviteMatchId] = 'envie';
                localStorage.setItem('matchStatuses', JSON.stringify(matchStatuses));
                syncFavoriteToFirebase(inviteMatchId, 'envie', null);
                
                const btn = document.querySelector(`#match-card-${inviteMatchId} .fav-btn`);
                if (btn) {
                    btn.classList.remove('status-envie', 'status-asked', 'status-received', 'status-refused');
                    btn.classList.add('status-envie');
                    btn.querySelector('i').className = getStatusIcon('envie');
                }
                if (typeof injectFriendsOnCards === 'function') injectFriendsOnCards();
                
                // NOUVEAU : ALERTE POUR RAPPELER L'ACCRÉDITATION
                setTimeout(() => {
                    alert("✅ Match ajouté à vos favoris !\n\n⚠️ Attention : rejoindre ce match ne vaut pas accréditation. N'oubliez pas de générer votre demande mail auprès du club.");
                }, 300);
            }
            closeAndClean();
        };
    }
};

// Fonction utilitaire pour nettoyer l'URL après traitement
function cleanUrlParameters() {
    const url = new URL(window.location);
    url.searchParams.delete('inviteMatch');
    url.searchParams.delete('from');
    url.searchParams.delete('addFriend'); // <-- Ajout du nettoyage du paramètre ami
    window.history.replaceState({}, document.title, url);
}

// Génération du lien de partage
window.shareMatch = function(event, matchId, homeName, awayName) {
    event.stopPropagation(); // Évite d'ouvrir la carte sur mobile quand on clique sur partager
    
    const user = auth.currentUser;
    if (!user) {
        // S'il n'est pas connecté, on l'invite à se connecter
        document.getElementById('featureAuthModal').classList.remove('hidden');
        return;
    }

    // Création de l'URL avec les paramètres
    const inviteUrl = `https://fokalpress.fr/app.html?inviteMatch=${matchId}&from=${user.uid}`;
    const shareText = `Rejoins-moi pour photographier le match ${homeName} vs ${awayName} !`;

    // Utilisation du partage natif (Web Share API) sur mobile/tablette
    if (navigator.share && window.isSecureContext) {
        navigator.share({
            title: 'Invitation FokalPress',
            text: shareText,
            url: inviteUrl
        }).catch(err => {
            console.log("Partage annulé ou erreur", err);
            fallbackShareCopy(inviteUrl, event.currentTarget);
        });
    } else {
        // Sur PC, on copie le lien dans le presse-papier
        fallbackShareCopy(inviteUrl, event.currentTarget);
    }
};

async function fetchInstaProfilePic(username) {
    if (!username) return null;
    
    // Nettoyage du pseudo
    const cleanUser = username.replace('@', '').trim();
    const url = 'https://instagram120.p.rapidapi.com/api/instagram/userInfo';

    const options = {
        method: 'POST',
        headers: {
            'x-rapidapi-key': 'cc89b1eb44mshde21357fdba7aafp191632jsncd0b3b0b5d6d',
            'x-rapidapi-host': 'instagram120.p.rapidapi.com',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: cleanUser
        })
    };

    try {
        // 1. ENDPOINT CORRIGÉ : /userInfo
        const response = await fetch(url, options);

        if (!response.ok) {
            console.warn(`Erreur API Instagram (${response.status})`);
            return null;
        }

        const data = await response.json();
        console.log("Données Instagram reçues :", data);

        // 2. CHEMIN D'ACCÈS CORRIGÉ : result[0].user.hd_profile_pic_url_info
        let imageUrl = null;

        if (data.result && data.result.length > 0) {
            const userObj = data.result[0].user;
            
            if (userObj && userObj.hd_profile_pic_url_info) {
                // Souvent 'hd_profile_pic_url_info' est un objet qui contient une propriété 'url'
                if (userObj.hd_profile_pic_url_info.url) {
                    imageUrl = userObj.hd_profile_pic_url_info.url;
                } 
                // Par sécurité, si c'est directement une chaîne de caractères
                else if (typeof userObj.hd_profile_pic_url_info === 'string') {
                    imageUrl = userObj.hd_profile_pic_url_info;
                }
            }
        }

        if (imageUrl) {
            return `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&t=${Date.now()}&maxage=1d`;
        }

        return null;

    } catch (error) {
        console.error("Erreur technique Instagram :", error);
        return null;
    }
}

// Extrait le pseudo d'une URL Instagram ou d'une saisie avec @
const cleanInstagramInput = (input) => {
    if (!input) return "";
    let username = input.trim();
    username = username.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, "");
    username = username.replace(/\/$/, "");
    username = username.replace(/^@/, "");
    return username.split('?')[0].toLowerCase();
};

// Fonction pour générer la grille d'historique de l'ami (Façon Vue Liste)
function renderFriendHistory(archivesObj) {
    const grid = document.getElementById('friendHistoryGrid');
    if (!grid) return;
    grid.innerHTML = '';
    
    const historyList = Object.entries(archivesObj).map(([key, data]) => ({ ...data, id: key }));
    
    if (historyList.length === 0) {
        grid.innerHTML = `<div style="text-align:center; width:100%; color:var(--text-muted); font-size:13px; padding:20px;">Aucun match couvert pour le moment.</div>`;
        return;
    }

    // Tri par date décroissante
    historyList.sort((a,b) => new Date(b.dateObj) - new Date(a.dateObj));

    historyList.forEach(m => {
        const homeName = m.home?.name || "Inconnu";
        const awayName = m.away?.name || "Inconnu";
        let dateShort = "00/00";
        let time = "--h--";
        
        if (m.dateObj && m.dateObj !== "UNKNOWN") {
            const d = new Date(m.dateObj);
            dateShort = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
            time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
        }
        
        const homeLogo = m.home.logo || getLogoUrl(homeName) || 'data/default-team.png';
        const awayLogo = m.away.logo || getLogoUrl(awayName) || 'data/default-team.png';
        const compShort = getShortComp(m.compFormatted || "AUTRE", m.sport || "football");

        // Layout compact : Équipe | Heure | Équipe | Date & Compétition
        grid.innerHTML += `
            <article class="card" style="flex-direction: row; align-items: center; padding: 10px 12px; gap: 10px; border-radius: 12px; margin-bottom: 8px; min-height: 50px;">
                
                <div class="match-header" style="flex: 2; display: flex; justify-content: flex-start; align-items: center; gap: 8px; margin-bottom: 0; width: auto;">
                    
                    <div class="team" style="display: flex; flex-direction: row-reverse; align-items: center; width: auto; gap: 8px; margin: 0;">
                        <img src="${homeLogo}" class="team-logo" style="width: 28px; height: 28px; object-fit: contain;" onerror="this.onerror=null; this.src='data/default-team.png'">
                        <span class="team-name" style="font-size: 12px; text-align: right; max-width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${homeName}</span>
                    </div>
                    
                    <div class="match-center" style="display: flex; flex-direction: column; align-items: center; min-width: auto;">
                        <div class="match-time" style="font-size: 11px; background: var(--tag-bg); padding: 2px 6px; border-radius: 4px; font-weight: 700;">${time}</div>
                    </div>
                    
                    <div class="team" style="display: flex; flex-direction: row; align-items: center; width: auto; gap: 8px; margin: 0;">
                        <img src="${awayLogo}" class="team-logo" style="width: 28px; height: 28px; object-fit: contain;" onerror="this.onerror=null; this.src='data/default-team.png'">
                        <span class="team-name" style="font-size: 12px; text-align: left; max-width: 80px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block;">${awayName}</span>
                    </div>
                </div>
                
                <div class="match-meta" style="flex: 1; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 4px; border-top: none; padding-top: 0;">
                    <span class="badge" style="font-size: 9px; padding: 3px 6px; margin: 0;">${compShort}</span>
                    <span class="date-time" style="font-size: 11px; color: var(--text-secondary);">${dateShort}</span>
                </div>

            </article>
        `;
    });
}

// Bouton retour de la modale Profil Ami
document.addEventListener('DOMContentLoaded', () => {
    const closeFriendProfileBtn = document.getElementById('closeFriendProfileBtn');
    if (closeFriendProfileBtn) {
        closeFriendProfileBtn.addEventListener('click', () => {
            document.getElementById('friendProfileModal').classList.add('hidden');

            const url = new URL(window.location);
            url.searchParams.delete('profile');
            window.history.pushState({}, '', url);
            if (window._profileOpenedFromFriends) {
                document.getElementById('friendsModal').classList.remove('hidden');
                window._profileOpenedFromFriends = false;
            }
        });
    }

    const shareProfileBtn = document.getElementById('shareMyProfileBtn');
    if (shareProfileBtn) {
        shareProfileBtn.addEventListener('click', () => {
            const insta = localStorage.getItem('userInsta');
            if (!insta) {
                alert("Vous devez renseigner votre pseudo Instagram pour pouvoir partager votre profil.");
                return;
            }
            
            const profileUrl = `https://fokalpress.fr/app.html?profile=${encodeURIComponent(insta.toLowerCase())}`;
            const shareText = `Viens voir mon portfolio et mes prochains matchs sur FokalPress ! 📸`;

            if (navigator.share && window.isSecureContext) {
                navigator.share({
                    title: 'Mon Profil FokalPress',
                    text: shareText,
                    url: profileUrl
                }).catch(err => {
                    console.log("Partage annulé ou erreur", err);
                    fallbackShareCopy(profileUrl, shareProfileBtn);
                });
            } else {
                fallbackShareCopy(profileUrl, shareProfileBtn);
            }
        });
    }
});

// Recherche et Demande d'ami
document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchFriendBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', async () => {
            const inputVal = document.getElementById('friendSearchInput').value;
            // On nettoie et on force les minuscules
            const cleanVal = cleanInstagramInput(inputVal); 
            const resultDiv = document.getElementById('friendSearchResult');

            if (!cleanVal) return;

            const currentUser = auth.currentUser;
            const myInsta = localStorage.getItem('userInsta') ? localStorage.getItem('userInsta').toLowerCase() : "";

            if (cleanVal === myInsta) {
                resultDiv.innerHTML = "Vous ne pouvez pas vous ajouter vous-même !";
                resultDiv.style.display = 'block';
                return;
            }

            // Affichage chargement
            resultDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Recherche...';
            resultDiv.style.display = 'block';

            try {
                // Recherche exacte (minuscules) dans Firestore
                const query = await db.collection('users').where('instagram', '==', cleanVal).limit(1).get();
                
                if (query.empty) {
                    resultDiv.innerHTML = "<span style='color: #FF3B30;'><i class='fa-solid fa-circle-xmark'></i> Aucun compte FokalPress trouvé avec ce pseudo.</span>";
                } else {
                    const targetUser = query.docs[0];
                    const targetData = targetUser.data();
                    const targetUid = targetUser.id;

                    // Vérification de l'état actuel de la relation
                    if (myFriends.includes(targetUid)) {
                        resultDiv.innerHTML = "Vous êtes déjà amis sur FokalPress !";
                    } else if (targetData.friendRequests && targetData.friendRequests.includes(currentUser.uid)) {
                        resultDiv.innerHTML = "Vous avez déjà envoyé une demande FokalPress.";
                    } else if (myFriendRequests.includes(targetUid)) {
                         resultDiv.innerHTML = "Cette personne vous a déjà envoyé une demande. Regardez au-dessus !";
                    } else {
                        // Bouton pour ajouter (Utilisation du nouvel avatar robuste)
                        resultDiv.innerHTML = `
                        <div style="display:flex; align-items:center; justify-content:space-between;">
                            <div style="display:flex; align-items:center; gap:10px;" onclick="openFriendProfile('${targetUid}')" title="Voir le profil">
                                ${getAvatarHTML(targetData.photoURL, targetData.instagram, 36)}
                                <span style="font-weight: 600; font-size: 13px;">@${targetData.instagram}</span>
                            </div>
                            <button onclick="sendFriendRequest('${targetUid}')" class="login-submit-btn" style="width:auto; padding:6px 12px; margin:0; background:var(--accent); color:white; font-size: 12px;">
                                <i class="fa-solid fa-user-plus"></i> Ajouter
                            </button>
                        </div>
                    `;
                    }
                }
            } catch(e) {
                console.error(e);
                resultDiv.innerHTML = "Erreur de recherche.";
            }
        });
    }

    // app.js - Autour de la ligne 1764
    const friendSearchInput = document.getElementById('friendSearchInput');

    if (friendSearchInput) {
        friendSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Évite tout comportement par défaut
                searchBtn.click();  // Déclenche le clic du bouton de recherche
            }
        });
    }

    // Gestion de l'ouverture / Fermeture de la modale Amis
    const openFriendsBtn = document.getElementById('openFriendsBtn');
    const closeFriendsBtn = document.getElementById('closeFriendsBtn');
    const friendsModal = document.getElementById('friendsModal');

    if (openFriendsBtn) {
        openFriendsBtn.addEventListener('click', () => {
            document.getElementById('settingsModal').classList.add('hidden'); // Ferme settings
            friendsModal.classList.remove('hidden'); // Ouvre amis
            updateFriendsUI(); // Force le rafraichissement visuel
        });
    }

    if (closeFriendsBtn) {
        closeFriendsBtn.addEventListener('click', () => {
            friendsModal.classList.add('hidden');
            document.getElementById('settingsModal').classList.remove('hidden'); 
        });
    }
});