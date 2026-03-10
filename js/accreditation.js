const getAccreditationHTML = (match) => {
    if (!match || !match.home) return `<div class="accred-status accred-unavailable"><i class="fa-solid fa-circle-xmark"></i> <span>Inconnu</span></div>`;

    const isLogged = firebase.auth() && firebase.auth().currentUser;
    const teamName = match.home.name.toUpperCase();
    const isEspoirs = match.compFormatted.includes("U21") || match.compFormatted.includes("ESPOIRS");
    
    let key = null;
    if (isEspoirs) {
        // Recherche souple : On cherche une clé dans la config qui finit par _U21 
        // et dont la partie principale est incluse dans le nom de l'équipe affichée.
        key = Object.keys(ACCRED_LIST).find(k => {
            if (k.includes('_U21') || k.includes('_ESPOIRS')) {
                const baseKey = k.replace('_U21', '').replace('_ESPOIRS', '');
                return teamName.includes(baseKey);
            }
            return false;
        });
    }
    if (!key) {
        key = Object.keys(ACCRED_LIST).find(k => teamName.includes(k) && !k.includes("_U21") && !k.includes("_ESPOIRS"));
    }
    
    if (key) {
        const contact = ACCRED_LIST[key];
        
        // --- CAS : UTILISATEUR NON CONNECTÉ ---
        if (!isLogged) {
            return `
                <div class="accred-status accred-available" 
                    onclick="document.getElementById('featureAuthModal').classList.remove('hidden')" 
                    style="gap: 12px; opacity: 0.7; cursor: pointer;" 
                    title="Connectez-vous pour voir l'adresse">
                    <i class="fa-solid fa-lock" style="font-size: 12px; color: var(--text-muted);"></i>
                    <span class="accred-text accred-email-text" style="filter: blur(4px); user-select: none;">
                        adresse@masquee.fr
                    </span>
                </div>`;
        }

        // --- CAS : UTILISATEUR CONNECTÉ ---
        if (contact.startsWith('http')) {
            return `<div class="accred-status accred-available">
                        <a href="${contact}" target="_blank" class="accred-email" title="Accéder à la plateforme" style="display:flex; align-items:center; gap:6px;">
                            <i class="fa-solid fa-external-link-alt"></i> 
                            <span class="accred-text">Plateforme</span>
                        </a>
                    </div>`;
        } 

        const d = match.dateObj;
        const shortDate = ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2);
        const home = match.home.name.replace(/'/g, "\\'");
        const away = match.away.name.replace(/'/g, "\\'");
        const compRaw = match.competition.replace(/'/g, "\\'");

        return `
            <div class="accred-status accred-available" style="gap: 12px;">
                <a href="#" onclick="copyToClipboard(event, '${contact}')" title="Copier le mail">
                    <i class="fa-solid fa-copy"></i>
                </a>
                <a href="#" onclick="openGmailCompose('${contact}', '${home}', '${away}', '${shortDate}', '${match.sport}', '${compRaw}')" title="Ouvrir dans Gmail" style="color: #ea4335;">
                    <i class="fa-solid fa-envelope"></i>
                </a>
                <span class="accred-text accred-email-text">${contact}</span>
            </div>`;
    }
    
    return `<div class="accred-status accred-unavailable">
                <i class="fa-solid fa-circle-xmark"></i> 
                <span class="accred-text">Inconnu</span>
            </div>`;
};

function openGmailCompose(email, homeTeam, awayTeam, matchDate, sport, compet) {
    // --- VERIFICATION AUTH ---
    if (!checkAuthOrBlock()) return;
    // -------------------------

    // 1. Récupération des infos
    const user = firebase.auth().currentUser;
    const storedInsta = localStorage.getItem('userInsta');
    const storedPortfolio = localStorage.getItem('userPortfolio');

    const userName = (user && user.displayName) ? user.displayName : "[VOTRE NOM ET PRÉNOM]";

    // 2. Construction de la phrase de présentation du travail
    let workSentence = "";

    // app.js ligne 160 environ
    if (storedInsta && storedPortfolio) {
        workSentence = `Vous pouvez avoir un aperçu de mon travail sur mon portfolio : ${storedPortfolio} ainsi que sur mon compte Instagram : @${storedInsta}`;
    } else if (storedInsta) {
        // Si storedInsta est déjà propre (ex: "l.kilian6"), le @ s'affichera correctement
        workSentence = `Vous pouvez avoir un aperçu de mon travail sur mon compte Instagram : @${storedInsta}`;
    } else if (storedPortfolio) {
        workSentence = `Vous pouvez avoir un aperçu de mon travail sur mon portfolio : ${storedPortfolio}`;
    } else {
        workSentence = `Vous pouvez avoir un aperçu de mon travail ici : [LIEN VERS VOTRE PORTFOLIO / INSTAGRAM]`;
    }

    const subject = `Demande d'accréditation : ${homeTeam} vs ${awayTeam} (${matchDate})`;
    
    // 3. Corps du mail
    const body = `Madame, Monsieur,\n\n` +
        `Photographe de sport indépendant, je vous sollicite afin d'obtenir une accréditation pour la rencontre de ${compet} opposant ${homeTeam} au ${awayTeam}, prévu le ${matchDate}.\n\n` +
        'Mon objectif est de couvrir cette rencontre pour alimenter mon portfolio. En remerciement, je m engage à vous transmettre une sélection de mes images après le match, que vous pourrez utiliser librement pour votre communication.\n\n' +
        `${workSentence}\n\n` +
        `Dans l'attente de votre retour, je vous souhaite une excellente journée.\n\n` +
        `Bien à vous,\n\n` +
        `${userName}\n` +
        `---\n` +
        `Demande préparée via fokalpress.fr - Outil de planification pour photographes de sport.`;
    
    if (isMobile()) {
        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoUrl;
    } else {
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(gmailUrl, '_blank');
    }
}

function checkAuthOrBlock() {
    if (firebase.auth().currentUser) {
        return true;
    } else {
        document.getElementById('featureAuthModal').classList.remove('hidden');
        return false;
    }
}