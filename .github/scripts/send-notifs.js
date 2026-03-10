// .github/scripts/send-notifs.js
const admin = require('firebase-admin');
const webpush = require('web-push');
const fs = require('fs'); // Permet de lire les fichiers locaux

// 1. Charger la base de données locale pour retrouver les vrais noms
let matchsDb = [];
try {
    matchsDb = JSON.parse(fs.readFileSync('./data/matchs.json', 'utf8'));
} catch (err) {
    console.warn("Fichier matchs.json introuvable, on utilisera les ID sans espaces.");
}

// Fonction utilitaire pour faire correspondre les noms (comme dans app.js)
const cleanStr = (str) => str.replace(/['"\s]/g, '');

// Configuration Firebase via les secrets GitHub
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// Configuration Web Push
webpush.setVapidDetails(
    'mailto:contact@fokalpress.fr',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
);

async function run() {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; 
    
    const in3Days = new Date(today);
    in3Days.setDate(today.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split('T')[0];

    const usersSnapshot = await db.collection('users').get();

    for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        if (!userData.pushSubscription) continue; 
        const subscription = JSON.parse(userData.pushSubscription);

        // 1. Vérifier les matchs "Acceptés" pour AUJOURD'HUI
        if (userData.archives) {
            Object.values(userData.archives).forEach(match => {
                if (match.dateObj && match.dateObj.startsWith(todayStr)) {
                    sendPush(subscription, "📸 C'est le jour J !", `Ton match ${match.home.name} vs ${match.away.name} a lieu aujourd'hui. Prépare ton matériel !`);
                }
            });
        }

        // 2. Vérifier les matchs "Envoyés" pour DANS 3 JOURS
        if (userData.favorites) {
            Object.entries(userData.favorites).forEach(([matchId, status]) => {
                const matchDate = matchId.split('_').pop(); 
                if (status === 'asked' && matchDate === in3DaysStr) {
                    
                    let homeName = matchId.split('_')[0];
                    let awayName = matchId.split('_')[1];

                    const realMatch = matchsDb.find(m => 
                        cleanStr(m.home) === homeName && 
                        cleanStr(m.away) === awayName
                    );

                    if (realMatch) {
                        homeName = realMatch.home;
                        awayName = realMatch.away;
                    }

                    const teams = `${homeName} vs ${awayName}`;
                    sendPush(subscription, "⚠️ Toujours aucune réponse", `Le match ${teams} est dans 3 jours. N'oublie pas de relancer le club si tu n'as pas eu de réponse !`);
                }
            });
        }

        // 3. Vérifier les matchs "En envie" pour DANS 7 JOURS
        if (userData.favorites) {
            const in7Days = new Date(today);
            in7Days.setDate(today.getDate() + 7);
            const in7DaysStr = in7Days.toISOString().split('T')[0];

            Object.entries(userData.favorites).forEach(([matchId, status]) => {
                const matchDate = matchId.split('_').pop();
                if (status === 'envie' && matchDate === in7DaysStr) {

                    let homeName = matchId.split('_')[0];
                    let awayName = matchId.split('_')[1];

                    const realMatch = matchsDb.find(m =>
                        cleanStr(m.home) === homeName &&
                        cleanStr(m.away) === awayName
                    );

                    if (realMatch) {
                        homeName = realMatch.home;
                        awayName = realMatch.away;
                    }

                    const teams = `${homeName} vs ${awayName}`;
                    sendPush(subscription, "⭐ Match dans 1 semaine !", `Tu veux couvrir ${teams}. C'est le moment d'envoyer ta demande d'accréditation !`);
                }
            });
        }

        // 4. NOUVEAU : Vérifier les demandes d'amis en attente
        if (userData.friendRequests && userData.friendRequests.length > 0) {
            const reqCount = userData.friendRequests.length;
            const notifTitle = "Nouvel ami FokalPress 📸";
            const notifBody = reqCount === 1 
                ? "Quelqu'un vous a envoyé une demande d'ami. Ouvrez l'application pour l'accepter !" 
                : `Vous avez ${reqCount} demandes d'amis en attente. Ouvrez l'application pour les accepter !`;
            
            sendPush(subscription, notifTitle, notifBody);
        }
    }
}

async function sendPush(subscription, title, body) {
    try {
        await webpush.sendNotification(subscription, JSON.stringify({ title, body, url: 'https://fokalpress.fr' }));
        console.log(`Notification envoyée : ${title}`);
    } catch (err) {
        console.error("Erreur d'envoi push (peut-être expiré):", err.statusCode);
    }
}

run().catch(console.error);