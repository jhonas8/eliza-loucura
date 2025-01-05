import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, getDocs, Firestore, CollectionReference } from 'firebase/firestore';

interface NotificationData {
    data: any;
    created_at: Date;
}

export class FirebaseNotificationClient {
    private db: Firestore;
    private collection: CollectionReference;

    constructor() {
        const app = initializeApp({
            apiKey: process.env.FIREBASE_API_KEY,
            authDomain: process.env.FIREBASE_AUTH_DOMAIN,
            projectId: process.env.FIREBASE_PROJECT_ID,
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
            appId: process.env.FIREBASE_APP_ID
        });

        this.db = getFirestore(app);
        this.collection = collection(this.db, 'notifications');
    }

    async save_notification(data: any): Promise<NotificationData> {
        const notification_data: NotificationData = {
            data,
            created_at: new Date()
        };

        await addDoc(this.collection, notification_data);
        return notification_data;
    }

    async check_for_last_notification_by_token(token_address: string, days_ago: number) {
        const date = new Date();
        date.setDate(date.getDate() - days_ago);

        const q = query(
            this.collection,
            where('data.currency.address', '==', token_address),
            where('created_at', '>=', date),
            orderBy('created_at', 'desc'),
            limit(1)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs;
    }
}
