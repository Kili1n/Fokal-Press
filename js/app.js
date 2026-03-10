// --- INITIALISATION SÉCURISÉE DES FILTRES ---
try {
    const storedFilters = localStorage.getItem('fokal_saved_filters');
    if (storedFilters) {
        mySavedFilters = JSON.parse(storedFilters);
    }
} catch (e) {
    console.error("Erreur de lecture du cache local :", e);
    mySavedFilters = [];
}

// Listeners
document.addEventListener('DOMContentLoaded', () => {
        // --- GESTION HISTORIQUE ---
    const historyModal = document.getElementById('historyModal');
    const openHistoryBtn = document.getElementById('openHistoryBtn');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');

    if (openHistoryBtn) {
        openHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Ferme les paramètres
            document.getElementById('settingsModal').classList.add('hidden');
            // Ouvre l'historique
            historyModal.classList.remove('hidden');
            // Charge les données
            renderHistory();
        });
    }

    if (closeHistoryBtn) {
        closeHistoryBtn.addEventListener('click', () => {
            historyModal.classList.add('hidden');
            document.getElementById('settingsModal').classList.remove('hidden');
        });
    }

    // Fermeture clic extérieur
    historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) historyModal.classList.add('hidden');
    });
    localStorage.removeItem('hasShownLoginHint');
    loadMatches();
    
    document.getElementById('gpsBtn').addEventListener('click', () => {
        const btn = document.getElementById('gpsBtn');
        const cityInput = document.getElementById('startCityInput');
        
        // CAS 1 : DÉSACTIVATION DU GPS
        if (btn.classList.contains('active')) {
            btn.classList.remove('active');
            userPosition = null; 
            localStorage.removeItem('userLastPosition');
            
            // On réinitialise l'affichage des distances à "-- km"
            resetDistancesDisplay();
            
            console.log("📍 GPS désactivé, affichage de la recherche manuelle.");
        } 
        // CAS 2 : ACTIVATION DU GPS
        else {
            cityInput.value = ""; 
            const savedPos = localStorage.getItem('userLastPosition');

            if (savedPos) {
                // On récupère la position sauvegardée sans redemander au navigateur
                userPosition = JSON.parse(savedPos);
                btn.classList.add('active');
                console.log("📍 Position récupérée du stockage local. Calcul...");
                updateDistances(); 
            } else {
                // Si rien en mémoire, on lance la demande de géolocalisation classique
                const originalIcon = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                requestUserLocation(btn, originalIcon);
            }
        }
    });

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            btn.classList.add('active');
            currentFilters.sport = btn.dataset.filter;
            
            updateFilterSlider();
            applyFilters();
        });
    });

    // On cible uniquement le texte pour le reset, car le logo est maintenant un lien <a>
    const siteTitleBtn = document.getElementById('siteTitle');
    if(siteTitleBtn) {
        siteTitleBtn.addEventListener('click', resetFilters);
    }
    document.getElementById('weekFilter').addEventListener('change', e => { currentFilters.week = e.target.value; applyFilters(); });
    document.getElementById('compFilter').addEventListener('change', e => { currentFilters.comp = e.target.value; applyFilters(); });
    document.getElementById('sortFilter').addEventListener('change', e => { currentFilters.sortBy = e.target.value; applyFilters(); });
    document.getElementById('accredToggle').addEventListener('change', e => { currentFilters.accredOnly = e.target.checked; applyFilters(); });
    
    window.addEventListener('scroll', () => {
        document.getElementById('mainHeader').classList.toggle('scrolled', window.scrollY > 20);
    });

    window.addEventListener('load', updateFilterSlider);
    window.addEventListener('resize', updateFilterSlider);

    document.getElementById('menuToggle').addEventListener('click', (e) => {
        e.stopPropagation(); 
        document.getElementById('mainHeader').classList.toggle('menu-open');
    });
    const themeToggle = document.getElementById('themeToggle');
    const body = document.body;
    const themeIcon = themeToggle.querySelector('i');

    // 1. Vérifier si un thème est déjà sauvegardé ou utiliser la préférence système
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        body.classList.add('dark-mode');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    // 2. Gérer le clic sur le bouton
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        
        const isDark = body.classList.contains('dark-mode');
        
        // Changer l'icône
        if (isDark) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });

    const cityInput = document.getElementById('startCityInput');

    // Fonction pour gérer la recherche et le calcul
    const handleCitySearch = async () => {
        const city = cityInput.value.trim();
        if (!city) return;

        // Feedback visuel : ça charge
        cityInput.style.opacity = "0.5";
        cityInput.disabled = true;
        document.body.style.cursor = "wait";

        try {
            const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(city)}&limit=1&apiKey=${GEOAPIFY_KEY}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.features && data.features.length > 0) {
                const props = data.features[0].properties;
                
                // 1. On force la mise à jour de la position
                userPosition = { lat: props.lat, lon: props.lon };
                
                // 2. On s'assure que le bouton GPS est visuellement éteint
                document.getElementById('gpsBtn').classList.remove('active');
                
                // 3. IMPORTANT : On nettoie le cache précédent
                travelCache.clear();
                Object.keys(localStorage).forEach(key => {
                    if (key.startsWith('travel_')) localStorage.removeItem(key);
                });

                console.log(`✅ Ville trouvée : ${props.city || city} (${userPosition.lat}, ${userPosition.lon})`);

                // 4. On force le recalcul immédiat
                // On remet isCalculating à false au cas où il serait bloqué
                isCalculating = false; 
                await updateDistances();
                
                // Succès visuel
                cityInput.style.borderColor = "#34C759";
            } else {
                alert("Ville introuvable. Essayez avec le code postal (ex: Paris 75001)");
                cityInput.style.borderColor = "red";
                userPosition = null; // On annule la position si ville fausse
            }
        } catch (e) {
            console.error("Erreur Geocoding:", e);
            alert("Erreur de connexion lors de la recherche de la ville.");
        } finally {
            // Rétablissement de l'interface
            cityInput.disabled = false;
            cityInput.style.opacity = "1";
            document.body.style.cursor = "default";
            // On redonne le focus au champ pour pouvoir corriger si besoin
            cityInput.focus(); 
        }
    };

    // Déclenchement sur "Entrée"
    cityInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleCitySearch();
        }
    });

    // Déclenchement quand on clique ailleurs (changement de focus)
    cityInput.addEventListener('change', handleCitySearch);

    const viewToggle = document.getElementById('viewToggle');
    const matchesGrid = document.getElementById('grid');
    const viewIcon = viewToggle.querySelector('i');

    // Fonction pour appliquer la vue
    const setViewMode = (mode) => {
        if (mode === 'list') {
            matchesGrid.classList.add('list-view');
            viewToggle.classList.add('active');
            viewIcon.classList.replace('fa-list', 'fa-border-all');
            viewToggle.title = "Passer en vue Grille";
        } else {
            matchesGrid.classList.remove('list-view');
            viewToggle.classList.remove('active');
            viewIcon.classList.replace('fa-border-all', 'fa-list');
            viewToggle.title = "Passer en vue Liste";
        }
        localStorage.setItem('viewMode', mode);
    };

    // Chargement de la préférence
    const savedView = localStorage.getItem('viewMode');
    if (savedView === 'list') {
        setViewMode('list');
    }

    // Event Listener
    viewToggle.addEventListener('click', () => {
        const isList = matchesGrid.classList.contains('list-view');
        setViewMode(isList ? 'grid' : 'list');
    });

    const distSlider = document.getElementById('distSlider');
    const distValue = document.getElementById('distValue');

    // On vérifie que les éléments existent AVANT d'ajouter les écouteurs
    if (distSlider && distValue) {
        
        // Mise à jour visuelle
        distSlider.addEventListener('input', (e) => {
            distValue.textContent = e.target.value + "km";
        });

        // Application du filtre
        distSlider.addEventListener('change', (e) => {
            currentFilters.maxDist = parseInt(e.target.value);
            applyFilters();
        });
    }

    const mapModal = document.getElementById('mapModal');
    const mapToggleBtn = document.getElementById('mapToggle');
    const closeMapBtn = document.getElementById('closeMapBtn');

    // Event Listeners pour la carte
    mapToggleBtn.addEventListener('click', () => {
        mapModal.classList.remove('hidden');
        
        // Petit délai pour laisser le DOM afficher la div avant d'init Leaflet
        setTimeout(() => {
            initMap();
            mapInstance.invalidateSize(); // Important : recalculer la taille car la div était cachée
            updateMapMarkers(); // Charger les matchs filtrés actuels
        }, 100);
    });

    closeMapBtn.addEventListener('click', () => {
        mapModal.classList.add('hidden');
    });

    // Fermer si on clique en dehors de la carte (sur le fond gris)
    mapModal.addEventListener('click', (e) => {
        if (e.target === mapModal) {
            mapModal.classList.add('hidden');
        }
    });

    // --- GESTION DES FILTRES AVANCÉS & MODE COMPACT ---

    advFiltersBtn = document.getElementById('advFiltersBtn');
    advancedFilters = document.getElementById('advancedFilters');
    mainHeader = document.getElementById('mainHeader'); 

    // Initialisation au chargement de la page
    if (advFiltersBtn && advancedFilters) {
        advFiltersBtn.addEventListener('click', toggleAdvancedFilters);

        const savedState = localStorage.getItem('showAdvancedFilters');
        
        if (savedState === 'true') {
            // État initial : OUVERT
            advancedFilters.classList.remove('hidden-filters');
            advFiltersBtn.classList.add('active');
            mainHeader.classList.remove('compact-mode');
        } else {
            // État initial : FERMÉ (Compact)
            advancedFilters.classList.add('hidden-filters');
            advFiltersBtn.classList.remove('active');
            mainHeader.classList.add('compact-mode');
        }
    }

    requestAnimationFrame(() => {
        document.body.classList.add('loaded');
    }); 
    // --- GESTION STATISTIQUES ---
    const statsModal = document.getElementById('statsModal');
    const openStatsBtn = document.getElementById('openStatsBtn');
    const closeStatsBtn = document.getElementById('closeStatsBtn');
    const shareStatsBtn = document.getElementById('shareStatsBtn');
    const saveStatsBtn = document.getElementById('saveStatsBtn'); // Nouveau bouton

    // --- LISTENER BOUTON ENREGISTRER (IMAGE) ---
    if (saveStatsBtn) {
        saveStatsBtn.addEventListener('click', () => {
            const card = document.querySelector('#statsModal .login-card');
            const closeBtn = document.getElementById('closeStatsBtn');
            const btnsWrapper = document.getElementById('statsButtonsWrapper');
            const buttonsRow = btnsWrapper.querySelector('div[style*="display: flex"]');

            // 1. Masquage UI pour la photo
            closeBtn.style.display = 'none';
            if(buttonsRow) buttonsRow.style.display = 'none';

            const arrowBtn = document.getElementById('topMatchArrow');
            if(arrowBtn) arrowBtn.style.display = 'none';
            
            const originalBtnText = saveStatsBtn.innerHTML;
            saveStatsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

            // --- FIX COULEURS ---
            const originalCardBg = card.style.background;
            const originalCardColor = card.style.color;
            const computedStyle = getComputedStyle(card);
            const computedBgColor = computedStyle.backgroundColor;
            const computedTextColor = computedStyle.color;
            const isDark = document.body.classList.contains('dark-mode');
            const realBgColor = isDark ? '#1C1C1E' : '#FFFFFF';

            card.style.backgroundColor = computedBgColor;
            card.style.color = computedTextColor;
            const headerDiv = card.querySelector('div[style*="linear-gradient"]');
            if(headerDiv) headerDiv.style.color = 'white';

            // 2. Capture
            html2canvas(card, {
                scale: window.innerWidth < 768 ? 2 : 3,
                backgroundColor: realBgColor,
                useCORS: true,
                onclone: (clonedDoc) => {
                const clonedCard = clonedDoc.querySelector('.login-card');
                clonedCard.style.boxShadow = 'none';
                clonedCard.style.border = 'none';
            }
            }).then(originalCanvas => {

                // On ajoute 15% de marge en largeur pour que la carte "respire"
                const targetWidth = originalCanvas.width * 1.15; 
                // Hauteur proportionnelle pour du 9:16 (ex: 1080x1920)
                const targetHeight = Math.round(targetWidth * (16 / 9)); 

                const storyCanvas = document.createElement('canvas');
                storyCanvas.width = targetWidth;
                storyCanvas.height = targetHeight;
                const ctx = storyCanvas.getContext('2d');

                // Remplissage du fond (clair ou sombre selon le thème)
                ctx.fillStyle = realBgColor;
                ctx.fillRect(0, 0, targetWidth, targetHeight);

                // Centrage horizontal
                const xOffset = (targetWidth - originalCanvas.width) / 2;
                // Centrage vertical (légèrement remonté à 45% pour ne pas être gêné par les boutons Insta en bas)
                const yOffset = (targetHeight - originalCanvas.height) * 0.45;

                // On dessine la carte sur le fond 9:16
                ctx.drawImage(originalCanvas, xOffset, yOffset);
                
                // --- CORRECTION MOBILE ICI ---
                if (isMobile() && navigator.share) {
                    storyCanvas.toBlob(async (blob) => { // <-- On utilise storyCanvas
                        if (!blob) return;
                        const file = new File([blob], "FokalPress_Stats.png", { type: "image/png" });
                        
                        try {
                            await navigator.share({
                                files: [file],
                                title: 'Mes Stats FokalPress'
                            });
                        } catch (err) {
                            console.log("Partage annulé ou erreur", err);
                        }
                        restoreUI();
                    }, 'image/png');
                } else {
                    const link = document.createElement('a');
                    link.download = `FokalPress_Stats_${new Date().toISOString().slice(0,10)}.png`;
                    link.href = storyCanvas.toDataURL('image/png'); // <-- On utilise storyCanvas
                    link.click();
                    restoreUI();
                }
            }).catch(err => {
                console.error("Erreur capture :", err);
                alert("Erreur lors de la création de l'image.");
                restoreUI();
            });

            // Fonction utilitaire pour remettre l'interface
            function restoreUI() {
                closeBtn.style.display = 'flex';
                if(buttonsRow) buttonsRow.style.display = 'flex';
                if(arrowBtn) arrowBtn.style.display = 'block';
                saveStatsBtn.innerHTML = originalBtnText;
                card.style.backgroundColor = originalCardBg;
                card.style.color = originalCardColor;
                if(headerDiv) headerDiv.style.color = ''; 
            }
        });
    }

    // Listener Share (Copié Presse-papier) - Inchangé
// --- LISTENER BOUTON PARTAGER (Web Share API) ---
    if (shareStatsBtn) {
        shareStatsBtn.addEventListener('click', async () => {
            // 1. Préparation (Comme pour Enregistrer)
            const card = document.querySelector('#statsModal .login-card');
            const closeBtn = document.getElementById('closeStatsBtn');
            const btnsWrapper = document.getElementById('statsButtonsWrapper');
            const buttonsRow = btnsWrapper.querySelector('div[style*="display: flex"]');

            // Masquage UI
            closeBtn.style.display = 'none';
            if(buttonsRow) buttonsRow.style.display = 'none';

            // Feedback visuel
            const originalBtnText = shareStatsBtn.innerHTML;
            shareStatsBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';

            // --- FIX COULEURS (Mode Sombre/Clair) ---
            const originalCardBg = card.style.background;
            const originalCardColor = card.style.color;
            const computedStyle = getComputedStyle(card);
            const computedBgColor = computedStyle.backgroundColor;
            const computedTextColor = computedStyle.color;

            card.style.backgroundColor = computedBgColor;
            card.style.color = computedTextColor;
            const headerDiv = card.querySelector('div[style*="linear-gradient"]');
            if(headerDiv) headerDiv.style.color = 'white';

            try {
                // 2. Génération de l'image
                const canvas = await html2canvas(card, {
                    scale: 3,
                    backgroundColor: computedBgColor,
                    useCORS: true
                });

                // 3. Conversion en Fichier (Blob)
                canvas.toBlob(async (blob) => {
                    if (!blob) throw new Error("Erreur génération blob");

                    const file = new File([blob], "FokalPress_Stats.png", { type: "image/png" });

                    // 4. Déclenchement du Partage Natif
                    if (navigator.share && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: 'Mes Stats FokalPress',
                            text: 'Regarde ma saison sur FokalPress !',
                            files: [file]
                        });
                    } else {
                        // Fallback PC (Si le partage natif n'existe pas)
                        // On copie l'image dans le presse-papier
                        try {
                            const item = new ClipboardItem({ "image/png": blob });
                            await navigator.clipboard.write([item]);
                            alert("Image copiée dans le presse-papier !");
                        } catch (err) {
                            alert("Partage non supporté sur cet appareil.");
                        }
                    }

                    // 5. Restauration (Dans le callback du blob)
                    closeBtn.style.display = 'flex';
                    if(buttonsRow) buttonsRow.style.display = 'flex';
                    shareStatsBtn.innerHTML = originalBtnText;
                    card.style.backgroundColor = originalCardBg;
                    card.style.color = originalCardColor;
                    if(headerDiv) headerDiv.style.color = '';

                }, 'image/png');

            } catch (err) {
                console.error("Erreur partage :", err);
                alert("Impossible de partager l'image.");
                
                // Restauration en cas d'erreur
                closeBtn.style.display = 'flex';
                if(buttonsRow) buttonsRow.style.display = 'flex';
                shareStatsBtn.innerHTML = originalBtnText;
                card.style.backgroundColor = originalCardBg;
                card.style.color = originalCardColor;
            }
        });
    }

    // Listeners Ouverture/Fermeture
    if (openStatsBtn) openStatsBtn.addEventListener('click', calculateAndShowStats);
    if (closeStatsBtn) {
        closeStatsBtn.addEventListener('click', () => {
            statsModal.classList.add('hidden');
            document.getElementById('settingsModal').classList.remove('hidden'); // ← ajout
        });
    }
});

// Initialisation de Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Initialisation des services
const auth = firebase.auth();
const db = firebase.firestore();
const analytics = firebase.analytics();

// --- LOGIQUE GLOBALE (Connexion, Profil, Paramètres) ---

document.addEventListener('DOMContentLoaded', () => {
    // Éléments UI LOGIN
    const loginModal = document.getElementById('loginModal');
    const closeLoginBtn = document.getElementById('closeLoginBtn');
    const googleBtn = document.getElementById('googleLoginBtn');
    const loginView = document.getElementById('loginView');
    const profileView = document.getElementById('completeProfileView');
    const profileForm = document.getElementById('profileForm');

    // Éléments UI SETTINGS
    const settingsModal = document.getElementById('settingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsForm = document.getElementById('settingsForm');
    const settingsLogoutBtn = document.getElementById('settingsLogoutBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');

    // --- GESTION POPUP FAVORIS ---
    const favHintModal = document.getElementById('favHintModal');
    const closeFavHintBtn = document.getElementById('closeFavHintBtn');
    const favLoginBtn = document.getElementById('favLoginBtn');
    const favDismissBtn = document.getElementById('favDismissBtn');

    // Gestion du bouton "Inviter un extérieur"
    const inviteOutsiderBtn = document.getElementById('inviteOutsiderBtn');
    if (inviteOutsiderBtn) {
        inviteOutsiderBtn.addEventListener('click', (e) => {
            const user = auth.currentUser;
            if (!user) return;
            
            // On génère un texte sympa avec le lien de l'application
            const inviteText = `Rejoins-moi sur FokalPress, l'outil indispensable pour organiser nos matchs et accréditations photos ! 📸\n\nCrée ton compte ici : https://fokalpress.fr/app.html?addFriend=${user.uid}`;

            // On utilise ta fonction existante (qui gère PC et Mobile) pour copier
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(inviteText)
                    .then(() => {
                        const originalHtml = inviteOutsiderBtn.innerHTML;
                        inviteOutsiderBtn.innerHTML = '<i class="fa-solid fa-check"></i> Lien copié !';
                        inviteOutsiderBtn.style.color = "#34C759";
                        inviteOutsiderBtn.style.borderColor = "#34C759";
                        
                        setTimeout(() => {
                            inviteOutsiderBtn.innerHTML = originalHtml;
                            inviteOutsiderBtn.style.color = "var(--accent)";
                            inviteOutsiderBtn.style.borderColor = "var(--accent)";
                        }, 2000);
                    })
                    .catch(err => console.error("Erreur copie", err));
            } else {
                // Fallback si le clipboard natif n'est pas dispo
                fallbackCopy(inviteText, inviteOutsiderBtn, inviteOutsiderBtn.innerHTML);
            }
        });
    }

    // 1. Clic sur "Me connecter maintenant"
    if (favLoginBtn) {
        favLoginBtn.addEventListener('click', () => {
            favHintModal.classList.add('hidden'); // On ferme la pub
            loginModal.classList.remove('hidden'); // On ouvre le vrai login
            // On s'assure d'afficher la vue connexion
            document.getElementById('loginView').style.display = 'block';
            document.getElementById('completeProfileView').style.display = 'none';
        });
    }

    // 2. Clic sur "Plus tard" ou la Croix
    const closeFavHint = () => favHintModal.classList.add('hidden');
    
    if (favDismissBtn) favDismissBtn.addEventListener('click', closeFavHint);
    if (closeFavHintBtn) closeFavHintBtn.addEventListener('click', closeFavHint);
    
    // Fermeture en cliquant dehors
    favHintModal.addEventListener('click', (e) => {
        if (e.target === favHintModal) closeFavHint();
    });

    // --- LOGIQUE TUTORIEL ---
    const closeTutoBtn = document.getElementById('closeTutoBtn');
    if (closeTutoBtn) {
        closeTutoBtn.addEventListener('click', async () => {
            // 1. Fermer visuellement
            document.getElementById('tutorialModal').classList.add('hidden');
            
            // 2. Sauvegarder dans Firebase que c'est vu
            const user = firebase.auth().currentUser;
            if (user) {
                try {
                    await db.collection('users').doc(user.uid).set(
                        { hasSeenTutorial: true }, 
                        { merge: true }
                    );
                } catch (e) {
                    console.error("Erreur save tuto", e);
                }
            }
        });
    }
    // --- 1. ÉCOUTEUR D'ÉTAT AUTHENTIFICATION (Chargement initial) ---
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("Utilisateur connecté :", user.email);
            
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();

                if (userDoc.exists) {
                    const userData = userDoc.data();

                    const notifBtn = document.getElementById('enableNotifsBtn');
                    if (notifBtn) {
                        if (userData.pushSubscription) {
                            notifBtn.classList.add('active-notifs');
                            notifBtn.style.backgroundColor = "#34C759";
                            notifBtn.style.color = "white";
                            notifBtn.innerHTML = '<i class="fa-solid fa-bell-slash"></i> Désactiver';
                        } else {
                            notifBtn.classList.remove('active-notifs');
                            notifBtn.style.backgroundColor = "";
                            notifBtn.style.color = "";
                            notifBtn.innerHTML = '<i class="fa-solid fa-bell"></i> Activer les notifs';
                        }
                    }

                    const today = new Date().toISOString().slice(0, 10); // Format "YYYY-MM-DD"
                    const lastSyncDate = localStorage.getItem('last_connection_date');
                    // On met à jour seulement si la date stockée est différente d'aujourd'hui
                    if (lastSyncDate !== today) {
                        db.collection('users').doc(user.uid).update({
                            last_connection: firebase.firestore.FieldValue.serverTimestamp(),
                            // Optionnel : on peut aussi stocker la version de l'app ou l'OS
                            // last_device: navigator.userAgent 
                        }).then(() => {
                            localStorage.setItem('last_connection_date', today);
                        }).catch(err => {
                            console.warn("Pas bloquant : Erreur maj last_connection", err);
                        });
                    }

                    // 1. Vérification : L'utilisateur a-t-il un Instagram renseigné ?
                    const hasInsta = userData.instagram && userData.instagram.trim() !== "";

                    // 2. Vérification : L'URL actuelle est-elle à l'ancien format ?
                    // Si l'URL ne contient pas "t=" (notre nouveau paramètre temps), c'est une vieille URL cache
                    const isOldUrlFormat = userData.photoURL && !userData.photoURL.includes('t=');

                    // 3. Vérification du délai (pour ne pas spammer l'API à chaque rechargement de page)
                    const lastCheck = localStorage.getItem('last_insta_check');
                    const now = Date.now();
                    // On revérifie si ça fait plus de 1h (3600000ms) OU si on n'a jamais vérifié
                    const isTimeToCheck = !lastCheck || (now - lastCheck > 3600000);

                    // --- CONDITION DE MISE À JOUR ---
                    // On met à jour SI : (Il a Insta) ET (C'est une vieille URL OU le délai est passé)
                    if (hasInsta && (isOldUrlFormat || isTimeToCheck)) {
                        console.log("🔄 Mise à jour automatique de la photo Instagram pour l'ancien user...");
                        
                        // On appelle la fonction (qui contient maintenant le correctif JSON.stringify et le timestamp)
                        fetchInstaProfilePic(userData.instagram).then(newUrl => {
                            if (newUrl) {
                                // A. Mise à jour Firestore (Sauvegarde définitive)
                                db.collection('users').doc(user.uid).update({ 
                                    photoURL: newUrl 
                                });

                                // B. Mise à jour Visuelle immédiate (sans recharger la page)
                                updateLoginUI(true, newUrl);
                                
                                // C. On met à jour le compteur de temps
                                localStorage.setItem('last_insta_check', now);
                                
                                console.log("✅ Photo mise à jour avec succès !");
                            }
                        }).catch(err => console.warn("Échec mise à jour auto photo", err));
                    }

                    
                    // A. Sync Favoris (Priorité Cloud)
                    matchStatuses = userData.favorites || {};
                    localStorage.setItem('matchStatuses', JSON.stringify(matchStatuses));

                    if (userData.savedFilters && Array.isArray(userData.savedFilters)) {
                        mySavedFilters = userData.savedFilters; // On récupère de Firebase
                        localStorage.setItem('fokal_saved_filters', JSON.stringify(mySavedFilters)); // On met en cache
                    }
                    renderSavedFilters();

                    // --- B. Sync Historique (Priorité Cloud + Local existant si vide) ---
                    // On s'assure de ne pas mélanger avec des données résiduelles
                    const cloudArchives = userData.archives || {};
                    
                    // On écrase matchArchives avec les données du cloud pour cet utilisateur
                    // (ou on fusionne si tu veux garder le fonctionnement actuel, mais le cloud doit primer)
                    matchArchives = { ...cloudArchives }; 
                    
                    localStorage.setItem('matchArchives', JSON.stringify(matchArchives));

                    // Mise à jour visuelle si la modale historique est ouverte
                    const historyModal = document.getElementById('historyModal');
                    if (historyModal && !historyModal.classList.contains('hidden')) {
                        renderHistory();
                    }

                    // ... (Reste du code de gestion photo, etc. inchangé) ...
                    // [Code photo Instagram / Google inchangé ici]

                    renderMatches(currentlyFiltered);

                    // C. Cache Profil
                    localStorage.setItem('userInsta', userData.instagram || "");
                    localStorage.setItem('userPortfolio', userData.portfolio || "");

                    // D. Update UI
                    updateLoginUI(true, userData.photoURL || user.photoURL);
                    loginModal.classList.add('hidden');

                    if (!userData.hasSeenTutorial) {
                        setTimeout(() => {
                            const tutoModal = document.getElementById('tutorialModal');
                            if(tutoModal) tutoModal.classList.remove('hidden');
                        }, 1000);
                    }

                    if (typeof checkPendingInvitations === 'function') {
                        checkPendingInvitations();
                    }

                } else {
                    // Nouveau compte (Pas encore en base)
                    // On nettoie tout par sécurité pour partir sur une base vierge
                    matchStatuses = {};
                    matchArchives = {}; 
                    localStorage.setItem('matchStatuses', JSON.stringify(matchStatuses));
                    localStorage.setItem('matchArchives', JSON.stringify(matchArchives)); // <--- Important
                    
                    renderMatches(currentlyFiltered);

                    // Ouvrir modale profil pour finir l'inscription
                    loginModal.classList.remove('hidden'); 
                    loginView.style.display = 'none';
                    profileView.style.display = 'block';
                }

                // --- ÉCOUTE TEMPS RÉEL DU PROFIL (AMIS & NOTIFS) ---
                if (unsubUserListener) unsubUserListener(); // Nettoyage au cas où
                
                unsubUserListener = db.collection('users').doc(user.uid).onSnapshot((docSnap) => {
                        if (docSnap.exists) {
                            const data = docSnap.data();
                            myFriends = data.friends || [];
                            myFriendRequests = data.friendRequests || [];
                            
                            // 1. Mise à jour de toutes les pastilles rouges (Menu + Paramètres)
                            updateProfileBadge(myFriendRequests.length);
                            
                            // 2. Rafraîchir l'interface de la modale Amis (si elle est générée)
                            if (typeof updateFriendsUI === 'function') {
                                updateFriendsUI();
                            }
                            
                            // 3. Rafraîchir les cartes pour voir les avatars des amis en direct
                            if (typeof injectFriendsOnCards === 'function') {
                                injectFriendsOnCards();
                            } else {
                                // Fallback de sécurité au cas où l'injection n'est pas encore chargée
                                renderMatches(currentlyFiltered);
                            }
                        }
                });
            } catch (error) {
                console.error("Erreur chargement données:", error);
            }
        } else {
            // ---------------------------------------------------------
            // PARTIE DÉCONNEXION (C'est ici que la correction opère)
            // ---------------------------------------------------------
            console.log("Utilisateur déconnecté");
            if (typeof checkPendingInvitations === 'function') {
                checkPendingInvitations();
            }
            updateLoginUI(false);
            
            // 1. Nettoyage des FAVORIS
            matchStatuses = {}; 
            localStorage.removeItem('matchStatuses');

            // 2. Nettoyage de l'HISTORIQUE (CORRECTION ICI)
            matchArchives = {}; // On vide la variable en mémoire
            localStorage.removeItem('matchArchives'); // On vide le stockage local
            
            // 3. Nettoyage du PROFIL
            localStorage.removeItem('userInsta');
            localStorage.removeItem('userPortfolio');
            
            // 4. Reset visuel
            // On vide aussi la grille d'historique au cas où elle est ouverte
            const historyGrid = document.getElementById('historyGrid');
            if(historyGrid) historyGrid.innerHTML = '';

            if (unsubUserListener) {
                unsubUserListener();
                unsubUserListener = null;
            }
            myFriends = [];
            myFriendRequests = [];
            updateProfileBadge(0);

            renderMatches(currentlyFiltered);
        }
        renderMatches(currentlyFiltered);
    });

    // --- 2. GESTION DU CLIC SUR L'ICÔNE UTILISATEUR ---
    document.querySelectorAll('.login-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            const currentUser = auth.currentUser;

            if (currentUser) {
                // CAS A : CONNECTÉ -> On ouvre les PARAMÈTRES
                openSettingsModal();
            } else {
                // CAS B : DÉCONNECTÉ -> On ouvre le LOGIN
                loginModal.classList.remove('hidden');
                loginView.style.display = 'block';
                profileView.style.display = 'none';
            }
        });
    });

    // --- 3. FONCTIONS MODALE PARAMÈTRES ---
    
    // Ouvrir et charger les données
    async function openSettingsModal() {
        const user = auth.currentUser;
        if (!user) return;

        const emailEl = document.getElementById('settingsUserEmail');
        if (emailEl) {
            emailEl.textContent = user.email;

            // --- NOUVEAU : Rendre l'email cliquable vers le profil public ---
            emailEl.style.cursor = "pointer";
            emailEl.title = "Voir mon profil public";
            
            // Au survol, on peut ajouter un petit effet (optionnel)
            emailEl.onmouseenter = () => emailEl.style.textDecoration = "underline";
            emailEl.onmouseleave = () => emailEl.style.textDecoration = "none";

            emailEl.onclick = () => {
                document.getElementById('settingsModal').classList.add('hidden');
                openFriendProfile(user.uid); // Ouvre le profil de l'utilisateur actuel
            };
            // ----------------------------------------------------------------
        }

        settingsModal.classList.remove('hidden');

        // Pré-remplissage des champs
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                if(document.getElementById('settingsInsta')) document.getElementById('settingsInsta').value = data.instagram || '';
                if(document.getElementById('settingsPortfolio')) document.getElementById('settingsPortfolio').value = data.portfolio || '';
            }
        } catch (e) {
            console.error("Erreur chargement profil", e);
        }
    }

    // Sauvegarder modifications
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            const btn = settingsForm.querySelector('button');
            const originalText = "Enregistrer les modifications";
            
            // MODIFICATION ICI
            const rawInsta = document.getElementById('settingsInsta').value.trim();
            const newInsta = cleanInstagramInput(rawInsta); // On nettoie avant d'enregistrer

            const newPortfolio = document.getElementById('settingsPortfolio').value.trim();

            // 1. État de chargement
            btn.disabled = true;
            btn.innerText = "Enregistrement...";

            try {
                const updateData = {
                    instagram: newInsta,
                    portfolio: newPortfolio
                };

                // --- AJOUT : Si l'Insta change ou est présent, on tente de maj la photo ---
                if (newInsta) {
                    const picUrl = await fetchInstaProfilePic(newInsta);
                    if (picUrl) {
                        updateData.photoURL = picUrl;
                        document.querySelectorAll('.login-trigger img').forEach(img => img.src = picUrl);
                    }
                }else {
                    const user = firebase.auth().currentUser;
                    updateData.photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}`;
                    
                    // On nettoie explicitement le localStorage
                    localStorage.removeItem('userInsta');
                }
                await db.collection('users').doc(user.uid).update(updateData);

                // 2. SUCCÈS : Bouton Vert + Message
                btn.style.backgroundColor = "#34C759";
                btn.style.borderColor = "#34C759";
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Enregistré !';

                // 3. Fermeture après délai (1.5s)
                setTimeout(() => {
                    settingsModal.classList.add('hidden');
                    
                    // Reset du bouton pour la prochaine fois
                    btn.innerText = originalText;
                    btn.style.backgroundColor = "";
                    btn.style.borderColor = "";
                    btn.disabled = false;
                }, 1500);

            } catch (error) {
                console.error(error);
                alert("Erreur : " + error.message);
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    // Déconnexion via le bouton gris
    if (settingsLogoutBtn) {
        settingsLogoutBtn.addEventListener('click', async () => {
            const originalText = '<i class="fa-solid fa-right-from-bracket"></i> Se déconnecter';
            
            // 1. État de chargement
            settingsLogoutBtn.disabled = true;
            settingsLogoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Déconnexion...';

            try {
                await auth.signOut();

                // 2. SUCCÈS : Bouton Vert
                settingsLogoutBtn.style.backgroundColor = "#34C759";
                settingsLogoutBtn.style.borderColor = "#34C759";
                settingsLogoutBtn.style.color = "#ffffff"; // Force le texte en blanc
                settingsLogoutBtn.innerHTML = '<i class="fa-solid fa-check"></i> Déconnecté !';

                console.log("Déconnexion réussie"); 
                resetFilters(); 

                // 3. Fermeture après délai (1.5s)
                setTimeout(() => {
                    settingsModal.classList.add('hidden');
                    
                    // Reset du bouton (invisible, mais propre pour la prochaine fois)
                    settingsLogoutBtn.style.backgroundColor = "";
                    settingsLogoutBtn.style.borderColor = "";
                    settingsLogoutBtn.style.color = ""; // Retour couleur css
                    settingsLogoutBtn.innerHTML = originalText;
                    settingsLogoutBtn.disabled = false;
                }, 1000);

            } catch (error) {
                console.error(error);
                settingsLogoutBtn.innerHTML = originalText;
                settingsLogoutBtn.disabled = false;
            }
        });
    }

    // Suppression de compte via le bouton rouge
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            const confirmation = prompt("Pour confirmer la suppression définitive, tapez 'SUPPRIMER' ci-dessous :");
            if (confirmation === "SUPPRIMER") {
                const user = auth.currentUser;
                const uid = user.uid;
                try {
                    await db.collection('users').doc(uid).delete();
                    await user.delete();
                    alert("Votre compte a été supprimé.");
                    settingsModal.classList.add('hidden');
                    resetFilters();
                } catch (error) {
                    if (error.code === 'auth/requires-recent-login') {
                        alert("Par sécurité, veuillez vous déconnecter et vous reconnecter avant de supprimer votre compte.");
                    } else {
                        alert("Erreur : " + error.message);
                    }
                }
            }
        });
    }

    // Fermeture Settings
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
    }
    settingsModal.addEventListener('click', (e) => {
        if(e.target === settingsModal) settingsModal.classList.add('hidden');
    });


    // --- 4. FONCTIONS MODALE LOGIN (Google & Inscription) ---

    // Connexion Google
    if(googleBtn) {
        googleBtn.addEventListener('click', async () => {
            // On stocke le contenu HTML original pour pouvoir le remettre plus tard
            const originalContent = `
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="18" height="18">
                <span>Continuer avec Google</span>
            `;
            
            // 1. État de chargement
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Connexion...';
            
            const provider = new firebase.auth.GoogleAuthProvider();
            
            try {
                await auth.signInWithPopup(provider);
                
                // 2. SUCCÈS : Bouton Vert
                googleBtn.classList.remove('google-btn'); // Enlève le style blanc
                googleBtn.style.backgroundColor = "#34C759";
                googleBtn.style.borderColor = "#34C759";
                googleBtn.style.color = "white";
                googleBtn.innerHTML = '<i class="fa-solid fa-check"></i> Connecté !';

                // 3. RESET AUTOMATIQUE après 1.5 seconde (pour la prochaine fois)
                setTimeout(() => {
                    googleBtn.disabled = false;
                    googleBtn.classList.add('google-btn'); // Remet le style blanc
                    googleBtn.style.backgroundColor = "";
                    googleBtn.style.borderColor = "";
                    googleBtn.style.color = "";
                    googleBtn.innerHTML = originalContent;
                }, 1500);

            } catch (error) {
                console.error("Erreur login Google:", error);
                alert("Erreur de connexion : " + error.message);
                
                // Reset immédiat en cas d'erreur
                googleBtn.disabled = false;
                googleBtn.classList.add('google-btn');
                googleBtn.style.backgroundColor = "";
                googleBtn.style.borderColor = "";
                googleBtn.style.color = "";
                googleBtn.innerHTML = originalContent;
            }
        });
    }

    // Enregistrement Profil (Premier login)
    if(profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if(!user) return;

            // MODIFICATION ICI
            const rawInsta = document.getElementById('profileInsta').value.trim();
            const insta = cleanInstagramInput(rawInsta); // On nettoie ici aussi
            const portfolio = document.getElementById('profilePortfolio').value.trim(); 
            const errorMsg = document.getElementById('formError');
            const submitBtn = profileForm.querySelector('button');
            const originalText = "Valider mon profil";

            if (!insta && !portfolio) {
                errorMsg.style.display = 'block';
                return; 
            } else {
                errorMsg.style.display = 'none';
            }

            // 1. État de chargement
            submitBtn.disabled = true;
            submitBtn.innerText = "Enregistrement...";

            try {

                let finalPhotoURL = user.photoURL; // Par défaut : photo Google
    
                if (insta) {
                    const instaPic = await fetchInstaProfilePic(insta);
                    if (instaPic) {
                        finalPhotoURL = instaPic;
                    }
                }
                if (!finalPhotoURL) {
                    finalPhotoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName)}&background=random&color=fff&size=128`;
                }   
                await db.collection('users').doc(user.uid).set({
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: finalPhotoURL,
                    instagram: insta,
                    portfolio: portfolio,
                    favorites: {},
                    friends: [],
                    friendRequests: [],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    last_connection: firebase.firestore.FieldValue.serverTimestamp()
                });

                const today = new Date().toISOString().slice(0, 10);
                localStorage.setItem('last_connection_date', today);
                
                // 2. SUCCÈS : Bouton Vert
                submitBtn.style.backgroundColor = "#34C759";
                submitBtn.style.borderColor = "#34C759";
                submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> Profil créé !';

                updateLoginUI(true, user.photoURL);

                // 3. Fermeture après délai
                setTimeout(() => {
                    loginModal.classList.add('hidden');
                    // Reset
                    submitBtn.innerText = originalText;
                    submitBtn.style.backgroundColor = "";
                    submitBtn.style.borderColor = "";
                    submitBtn.disabled = false;

                    setTimeout(() => {
                        const tutoModal = document.getElementById('tutorialModal');
                        if (tutoModal) tutoModal.classList.remove('hidden');
                    }, 1200);

                    // NOUVEAU : On relance la lecture de l'URL pour afficher l'invitation !
                    if (typeof checkPendingInvitations === 'function') {
                        checkPendingInvitations();
                    }
                }, 1500);

            } catch (error) {
                alert("Erreur : " + error.message);
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Fonction pour remettre les boutons à zéro quand on ferme les modales
    function resetAllButtons() {
        // Reset Google
        if (googleBtn) {
            googleBtn.disabled = false;
            googleBtn.classList.add('google-btn');
            googleBtn.style = ""; // Enlève tous les styles inline (vert/bordures)
            googleBtn.innerHTML = `
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" width="18" height="18">
                <span>Continuer avec Google</span>
            `;
        }
        // Reset Logout
        if (settingsLogoutBtn) {
            settingsLogoutBtn.disabled = false;
            settingsLogoutBtn.style = "";
            settingsLogoutBtn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Se déconnecter';
        }
    }

    // Fermeture Login
    if(closeLoginBtn) {
        closeLoginBtn.addEventListener('click', () => {
            const user = auth.currentUser;
            if (user && profileView.style.display === 'block') {
                auth.signOut(); 
            }
            loginModal.classList.add('hidden');
            resetAllButtons(); // <--- AJOUT ICI
        });
    }
    // Fermeture Login (Clic extérieur)
    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            const user = auth.currentUser;
            if (user && profileView.style.display === 'block') {
                auth.signOut();
            }
            loginModal.classList.add('hidden');
            resetAllButtons(); // <--- AJOUT ICI
        }
    });

    // Fermeture Settings (Bouton Croix)
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            resetAllButtons(); // <--- AJOUT ICI
        });
    }
    // Fermeture Settings (Clic extérieur)
    settingsModal.addEventListener('click', (e) => {
        if(e.target === settingsModal) {
            settingsModal.classList.add('hidden');
            resetAllButtons(); // <--- AJOUT ICI
        }
    });

    loginModal.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            const user = auth.currentUser;
            if (user && profileView.style.display === 'block') {
                auth.signOut();
            }
            loginModal.classList.add('hidden');
        }
    });

    // --- 5. LOGIQUE BASCULE VUES LOGIN (Optionnel si usage Google unique) ---
    const showSignupLink = document.getElementById('showSignupLink');
    const showLoginLink = document.getElementById('showLoginLink');
    
    if(showSignupLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginView.style.display = 'none';
            document.getElementById('signupView').style.display = 'block';
        });
    }
    if(showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('signupView').style.display = 'none';
            loginView.style.display = 'block';
        });
    }

    // --- GESTION MODALE FONCTIONNALITÉ RESTREINTE ---
    const featureAuthModal = document.getElementById('featureAuthModal');
    const closeFeatureAuthBtn = document.getElementById('closeFeatureAuthBtn');
    const featureLoginBtn = document.getElementById('featureLoginBtn');
    const featureDismissBtn = document.getElementById('featureDismissBtn');

    // Fermer la modale
    const closeFeatureModal = () => featureAuthModal.classList.add('hidden');
    
    if (closeFeatureAuthBtn) closeFeatureAuthBtn.addEventListener('click', closeFeatureModal);
    if (featureDismissBtn) featureDismissBtn.addEventListener('click', closeFeatureModal);
    
    // Clic en dehors
    featureAuthModal.addEventListener('click', (e) => {
        if (e.target === featureAuthModal) closeFeatureModal();
    });

    // Redirection vers le Login
    if (featureLoginBtn) {
        featureLoginBtn.addEventListener('click', () => {
            closeFeatureModal(); // Ferme la modale "Restriction"
            document.getElementById('loginModal').classList.remove('hidden'); // Ouvre la modale "Login"
            document.getElementById('loginView').style.display = 'block'; // S'assure qu'on est sur la vue connexion
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {

    // --- GESTION CHANGEMENT DE SPORT (DANS LE FORMULAIRE) ---
    const sportRadios = document.querySelectorAll('input[name="manualSport"]');
    sportRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            // 1. On vide les champs pour éviter les incohérences (ex: Equipe de Foot dans Basket)
            document.getElementById('manualComp').value = "";
            document.getElementById('manualHome').value = "";
            document.getElementById('manualAway').value = "";
            
            // 2. On recharge les listes d'autocomplétion avec le bon sport
            refreshManualLists();
        });
    });
    
    // Bouton "Suivant" (Step 1 -> Step 2 OU Submit direct)
    const nextBtn = document.getElementById('nextStepBtn');
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const home = document.getElementById('manualHome').value.trim();
            const away = document.getElementById('manualAway').value.trim();
            const comp = document.getElementById('manualComp').value.trim();
            
            // On récupère le sport actuellement sélectionné
            const selectedSport = document.querySelector('input[name="manualSport"]:checked').value;

            if(!home || !away || !comp) {
                alert("Merci de remplir les équipes et la compétition.");
                return;
            }

            // --- NOUVELLE LOGIQUE : VRAIE VÉRIFICATION (Liste + config_LOGO) ---
            const knownTeamsForSport = manualTeamsData.filter(t => t.sport === selectedSport).map(t => t.name);

            // 1. Vérification dans l'autocomplétion
            let homeKnown = knownTeamsForSport.includes(home);
            let awayKnown = knownTeamsForSport.includes(away);

            // 2. Si non trouvé, vérification STRICTE dans CUSTOM_LOGOS
            // On utilise "===" et non ".includes()" pour éviter que "BASKET CLUB MONTPELLIER" 
            // valide "MONTPELLIER" par erreur.
            if (!homeKnown) {
                homeKnown = Object.keys(CUSTOM_LOGOS).some(key => home.toUpperCase() === key.toUpperCase());
            }
            if (!awayKnown) {
                awayKnown = Object.keys(CUSTOM_LOGOS).some(key => away.toUpperCase() === key.toUpperCase());
            }
            // -------------------------------------------------------------------

            // Si les deux sont connues, on passe à la sauvegarde
            if (homeKnown && awayKnown) {
                handleManualMatchSubmit(); 
            } else {
                // Sinon on affiche l'étape 2
                document.getElementById('step-1').classList.add('hidden');
                document.getElementById('step-2').classList.remove('hidden');

                const homeLogoDiv = document.getElementById('manualHomeLogoDiv');
                const awayLogoDiv = document.getElementById('manualAwayLogoDiv');
                
                homeLogoDiv.classList.add('hidden');
                awayLogoDiv.classList.add('hidden');

                if (!homeKnown) {
                    homeLogoDiv.classList.remove('hidden');
                    document.getElementById('lblHomeLogo').textContent = `Lien logo pour "${home}"`;
                }
                if (!awayKnown) {
                    awayLogoDiv.classList.remove('hidden');
                    document.getElementById('lblAwayLogo').textContent = `Lien logo pour "${away}"`;
                }
            }
        });
    }
    // Bouton "Passer" (Step 2 -> Submit sans logos)
    const skipBtn = document.getElementById('skipStepBtn');
    if(skipBtn) {
        skipBtn.addEventListener('click', () => {
            // On vide les champs logo pour être sûr
            document.getElementById('manualHomeLogo').value = "";
            document.getElementById('manualAwayLogo').value = "";
            handleManualMatchSubmit();
        });
    }

    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportHistoryToCSV);
    }

    // Soumission finale (via le bouton "Terminer" du formulaire)
    const form = document.getElementById('addMatchForm');
    if(form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleManualMatchSubmit();
        });
    }

    const openAddMatchBtn = document.getElementById('openAddMatchBtn');
    const addMatchModal = document.getElementById('addMatchModal');
    const closeAddMatchBtn = document.getElementById('closeAddMatchBtn');

    if (openAddMatchBtn) {
        openAddMatchBtn.addEventListener('click', () => {
            // 1. Initialiser le formulaire (vider les champs, charger les listes)
            initManualMatchForm(); 
            // 2. Afficher la modale
            addMatchModal.classList.remove('hidden');
        });
    }

    if (closeAddMatchBtn) {
        closeAddMatchBtn.addEventListener('click', () => {
            addMatchModal.classList.add('hidden');
        });
    }

    // Fermeture en cliquant en dehors (sur le fond gris)
    if (addMatchModal) {
        addMatchModal.addEventListener('click', (e) => {
            if (e.target === addMatchModal) {
                addMatchModal.classList.add('hidden');
            }
        });
    }


    const deleteModal = document.getElementById('deleteConfirmModal');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const cancelBtn = document.getElementById('cancelDeleteBtn');

    if (confirmBtn) confirmBtn.addEventListener('click', executeDeleteMatch);
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            deleteModal.classList.add('hidden');
            matchToDelete = null;
        });
    }

    // Fermeture clic extérieur
    if (deleteModal) {
        deleteModal.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                deleteModal.classList.add('hidden');
                matchToDelete = null;
            }
        });
    }
});

const isPWA = () => {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
};

// 1. Détection de l'événement d'installation (Android / Chrome Desktop)
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // SÉCURITÉ : On bloque formellement l'affichage si on est déjà dans la PWA
    if (!isPWA()) {
        const installBtn = document.getElementById('installAppBtn');
        if (installBtn) {
            installBtn.style.display = 'block';
        }
    }
});

// 2. Détection iOS (car iOS ne lance pas 'beforeinstallprompt')
const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
};

// 3. Logique au chargement
document.addEventListener('DOMContentLoaded', () => {
    const installBtn = document.getElementById('installAppBtn');
    const iosModal = document.getElementById('iosInstallModal');
    const closeIosBtn = document.getElementById('closeIosModalBtn');

    // Si on est sur iOS, on affiche toujours le bouton (car on ne peut pas détecter si c'est déjà installé facilement)
    // Sauf si on est en mode "standalone" (l'app est déjà ouverte comme une app)
    const isInStandaloneMode = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone;
    
    if (installBtn) {
        if (isPWA()) {
            // FORCE la disparition dans la PWA
            installBtn.style.display = 'none';
        } else if (isIos()) {
            // Sur iOS navigateur (Safari), on l'affiche par défaut
            installBtn.style.display = 'block';
        } else {
            // Sur Android/PC navigateur, on cache par défaut en attendant l'événement beforeinstallprompt
            installBtn.style.display = 'none';
        }
    }

    // Gestion du clic sur le bouton "Installer"
    if (installBtn) {
        installBtn.addEventListener('click', async () => {
            // CAS A : Android / Desktop (Event capturé)
            if (deferredPrompt) {
                deferredPrompt.prompt(); // Affiche la pop-up native
                const { outcome } = await deferredPrompt.userChoice;
                console.log(`Résultat installation: ${outcome}`);
                deferredPrompt = null; // Reset
            } 
            // CAS B : iOS (Pas d'event, mode manuel)
            else if (isIos()) {
                // Ferme les settings
                document.getElementById('settingsModal').classList.add('hidden');
                // Ouvre le tutoriel iOS
                if(iosModal) iosModal.classList.remove('hidden');
            }
        });
    }

    // Fermeture du tuto iOS
    if (closeIosBtn && iosModal) {
        closeIosBtn.addEventListener('click', () => {
            iosModal.classList.add('hidden');
        });
        iosModal.addEventListener('click', (e) => {
            if (e.target === iosModal) iosModal.classList.add('hidden');
        });
    }
});

// ==========================================
// INTEGRATION GOOGLE ONE TAP (CONNEXION RAPIDE)
// ==========================================

// 1. Fonction qui gère la réponse de Google (le clic utilisateur)
function handleOneTapResponse(response) {
    // On récupère le "Credential" (le jeton d'identité) envoyé par Google
    const idToken = response.credential;
    
    // On crée un identifiant Firebase compatible
    const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
    
    // On connecte l'utilisateur à Firebase
    firebase.auth().signInWithCredential(credential)
        .then((result) => {
            console.log("✅ Connexion One Tap réussie :", result.user.email);
            // La détection auth.onAuthStateChanged fera le reste (mise à jour UI)
        })
        .catch((error) => {
            console.error("Erreur One Tap Firebase :", error);
        });
}

// 2. Fonction d'initialisation
function initGoogleOneTap() {
    // On ne lance le One Tap QUE si personne n'est connecté
    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            // VOTRE ID CLIENT CORRIGÉ
            const YOUR_CLIENT_ID = "646309909772-t8kkjkc0b2t85v0bm58npauvg1bbj8b6.apps.googleusercontent.com";

            if (typeof google !== 'undefined' && google.accounts) {
                google.accounts.id.initialize({
                    client_id: YOUR_CLIENT_ID,
                    callback: handleOneTapResponse,
                    cancel_on_tap_outside: false, // Empêche de fermer en cliquant à côté
                    context: "signin"
                });

                // Affiche la popup
                google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        console.log("One Tap non affiché (info):", notification.getNotDisplayedReason());
                    }
                });
            }
        }
    });
}

// 3. On lance l'initialisation une fois la page chargée
window.addEventListener('load', initGoogleOneTap);

// --- LOGIQUE SUGGESTION ÉQUIPE ---

// URLs d'exemple par sport
const FEDERATION_EXAMPLES = {
    'Football': 'https://epreuves.fff.fr/competition/club/518488-st-ouen-l-aumone-as/equipe/2025_5883_SEM_1/saison',
    'Basketball': 'https://competitions.ffbb.com/ligues/cvl/comites/0028/clubs/cvl0028005/equipes/200000005138535',
    'Handball': 'https://www.ffhandball.fr/competitions/saison-2025-2026-21/national/ligue-butagaz-energie-2025-26-28227/equipe-1949484/'
};

// Fonction utilitaire indispensable pour convertir la clé VAPID (à mettre tout en bas de app.js par exemple)
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

document.addEventListener('DOMContentLoaded', () => {
    const enableNotifsBtn = document.getElementById('enableNotifsBtn');

    if (enableNotifsBtn) {
        enableNotifsBtn.addEventListener('click', async () => {
            const user = firebase.auth().currentUser;
            if (!user) {
                alert("Vous devez être connecté pour gérer les notifications.");
                return;
            }

            const isEnabled = enableNotifsBtn.classList.contains('active-notifs');
            enableNotifsBtn.disabled = true;

            if (isEnabled) {
                // ==========================================
                // LOGIQUE DE DÉSACTIVATION
                // ==========================================
                enableNotifsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Désactivation...';

                try {
                    // 1. Désinscrire le navigateur
                    const registration = await navigator.serviceWorker.getRegistration();
                    if (registration) {
                        const subscription = await registration.pushManager.getSubscription();
                        if (subscription) {
                            await subscription.unsubscribe();
                        }
                    }

                    // 2. Supprimer de Firebase
                    await db.collection('users').doc(user.uid).update({
                        pushSubscription: firebase.firestore.FieldValue.delete()
                    });

                    // 3. Mise à jour visuelle
                    enableNotifsBtn.classList.remove('active-notifs');
                    enableNotifsBtn.style.backgroundColor = ""; 
                    enableNotifsBtn.style.color = "";
                    enableNotifsBtn.innerHTML = '<i class="fa-solid fa-bell"></i> Activer les notifs';

                } catch (err) {
                    console.error("Erreur de désactivation :", err);
                    alert("Erreur lors de la désactivation.");
                    enableNotifsBtn.innerHTML = '<i class="fa-solid fa-bell-slash"></i> Désactiver';
                } finally {
                    enableNotifsBtn.disabled = false;
                }

            } else {
                // ==========================================
                // LOGIQUE D'ACTIVATION (Ton code adapté)
                // ==========================================
                enableNotifsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Activation...';

                try {
                    const permission = await Notification.requestPermission();
                    if (permission !== 'granted') throw new Error('Permission refusée.');

                    const registration = await navigator.serviceWorker.register('sw.js');
                    const publicVapidKey = 'BHXLM_lvgVjR020rrfglRN31xr3WGaA56uWCBH4U0LGsOlmXXnGqxr3pAS9y6ldn_f7OdRrK8dU4f70jrsniD0c';
                    
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
                    });

                    await db.collection('users').doc(user.uid).update({
                        pushSubscription: JSON.stringify(subscription)
                    });

                    // Mise à jour visuelle
                    enableNotifsBtn.classList.add('active-notifs');
                    enableNotifsBtn.style.backgroundColor = "#34C759"; 
                    enableNotifsBtn.style.color = "white";
                    enableNotifsBtn.innerHTML = '<i class="fa-solid fa-bell-slash"></i> Désactiver';

                } catch (err) {
                    console.error("Erreur d'activation :", err);
                    alert("Impossible d'activer les notifications.");
                    enableNotifsBtn.innerHTML = '<i class="fa-solid fa-bell"></i> Activer les notifs';
                } finally {
                    enableNotifsBtn.disabled = false;
                }
            }
        });
    }
    
    const suggestModal = document.getElementById('suggestTeamModal');
    const closeSuggestBtn = document.getElementById('closeSuggestBtn');
    const suggestForm = document.getElementById('suggestTeamForm');
    const suggestRadios = document.querySelectorAll('input[name="suggestSport"]');

    // Écouteur changement de sport -> Mise à jour Placeholder & Autocomplete
    suggestRadios.forEach(radio => {
        radio.addEventListener('change', refreshSuggestUI);
    });

    // Fermeture Croix
    if (closeSuggestBtn) {
        closeSuggestBtn.addEventListener('click', () => {
            suggestModal.classList.add('hidden');
        });
    }

    // Fermeture Clic Extérieur
    if (suggestModal) {
        suggestModal.addEventListener('click', (e) => {
            if (e.target === suggestModal) suggestModal.classList.add('hidden');
        });
    }

    // Gestion de l'envoi du formulaire
    if (suggestForm) {
        suggestForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // 1. Récupération des données
            const sport = document.querySelector('input[name="suggestSport"]:checked').value;
            const team = document.getElementById('suggestTeamName').value.trim();
            const comp = document.getElementById('suggestComp').value.trim();
            const link = document.getElementById('suggestLink').value.trim();

            // 2. Construction de l'e-mail
            const adminEmail = "contact@fokalPress.fr"; 
            const subject = `[FokalPress] Suggestion Ajout : ${team}`;
            
            const body = `Bonjour,\n\n` +
                         `Je ne trouve pas cette équipe sur l'application, merci de l'ajouter :\n\n` +
                         `----------------------------\n` +
                         `⚽ Sport : ${sport}\n` +
                         `🛡️ Équipe : ${team}\n` +
                         `🏆 Championnat : ${comp}\n` +
                         `🔗 Lien : ${link || "Non renseigné"}\n` +
                         `----------------------------\n\n` +
                         `Merci d'avance !`;

            // 3. Encodage et Envoi
            const encodedSubject = encodeURIComponent(subject);
            const encodedBody = encodeURIComponent(body);

            if (isMobile()) {
                window.location.href = `mailto:${adminEmail}?subject=${encodedSubject}&body=${encodedBody}`;
            } else {
                window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${adminEmail}&su=${encodedSubject}&body=${encodedBody}`, '_blank');
            }

            // 4. Feedback et Fermeture
            suggestModal.classList.add('hidden');
            // Petit reset visuel
            suggestForm.reset();
        });
    }
});