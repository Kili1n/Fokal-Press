// .github/scripts/send-notifs.js
const admin = require('firebase-admin');
const webpush = require('web-push');

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
    const todayStr = today.toISOString().split('T')[0]; // "2026-02-24"
    
    const in3Days = new Date(today);
    in3Days.setDate(today.getDate() + 3);
    const in3DaysStr = in3Days.toISOString().split('T')[0];

    const usersSnapshot = await db.collection('users').get();

    for (const doc of usersSnapshot.docs) {
        const userData = doc.data();
        if (!userData.pushSubscription) continue; // Pas abonné
        const subscription = JSON.parse(userData.pushSubscription);

        // 1. Vérifier les matchs "Acceptés" pour AUJOURD'HUI (dans "archives")
        if (userData.archives) {
            Object.values(userData.archives).forEach(match => {
                if (match.dateObj && match.dateObj.startsWith(todayStr)) {
                    sendPush(subscription, "📸 Jour de match !", `Ton match ${match.home.name} vs ${match.away.name} a lieu aujourd'hui. Prépare ton matériel et bon match !`);
                }
            });
        }

        // 2. Vérifier les matchs "Envoyés" pour DANS 3 JOURS (dans "favorites" où le statut est 'asked')
        if (userData.favorites) {
            Object.entries(userData.favorites).forEach(([matchId, status]) => {
                // matchId ressemble à "EquipeA_EquipeB_2026-02-27"
                const matchDate = matchId.split('_').pop(); 
                if (status === 'asked' && matchDate === in3DaysStr) {
                    const teams = matchId.split('_').slice(0, 2).join(' vs ');
                    sendPush(subscription, "⚠️ Toujours aucune réponse", `Le match ${teams} est dans 3 jours. N'oublie pas de relancer le club si tu n'as pas eu de réponse !`);
                }
            });
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