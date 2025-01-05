import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, orderBy, limit } from 'firebase/firestore';

export class FirebaseNotificationClient {
    private db;
    private collection;

    constructor() {
        const app = initializeApp({
            // Add your Firebase config here
        });

        this.db = getFirestore(app);
        this.collection = collection(this.db, 'notifications');
    }

    async save_notification(data) {
        const notification_data = {
            data,
            created_at: new Date()
        };

        await addDoc(this.collection, notification_data);
        return notification_data;
    }

    async check_for_last_notification_by_token(token_address, days_ago) {
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
