// app/topics.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, FlatList, TouchableOpacity, 
    ActivityIndicator, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
// ✅ 1. เพิ่ม auth เข้ามาใน import
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

// ❌ 2. ลบตัวแปรนี้ออกครับ: const CURRENT_STUDENT_ID = "user_001";

export default function TopicScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { strandId, title } = params; 

    const [topics, setTopics] = useState<any[]>([]);
    const [progressMap, setProgressMap] = useState<any>({}); // เก็บสถานะว่าบทไหนจบแล้ว
    const [loading, setLoading] = useState(true);

    // 1. ดึงรายการ Topics
    useEffect(() => {
        if (!strandId) { setLoading(false); return; }
        const q = query(
            collection(db, "topics"), 
            where("strand_id", "==", strandId),
            orderBy("sequence")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTopics(data);
        });
        return () => unsubscribe();
    }, [strandId]);

    // 2. ✅ แก้ไข: ดึงข้อมูล Progress ของ User ตัวจริง (auth.currentUser)
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return; // ถ้าไม่มี User (กรณีหลุด) ให้หยุด

        // ใช้ user.uid แทนค่าตายตัว
        const q = query(collection(db, "learning_progress"), where("student_id", "==", user.uid));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const map: any = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                // เก็บลง map ว่า topic_id นี้ จบแล้วหรือยัง
                if (data.is_completed) {
                    map[data.topic_id] = true;
                }
            });
            setProgressMap(map);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const renderItem = ({ item }: { item: any }) => {
        // เช็คจาก progressMap ว่า Topic นี้จบหรือยัง
        const isCompleted = progressMap[item.id] || false;
        
        let statusColor = '#EF4444'; // สีแดง (ยังไม่ทำ)
        let statusBg = '#FEF2F2';
        let btnIcon = "play-circle";

        if (isCompleted) {
            statusColor = '#4CAF50'; // สีเขียว (ทำเสร็จแล้ว)
            statusBg = '#F0FDF4';
            btnIcon = "checkmark-circle";
        }

        return (
            <TouchableOpacity 
                style={[styles.card, { backgroundColor: statusBg, borderColor: isCompleted ? statusColor : '#FECACA' }]}
                activeOpacity={0.7}
                onPress={() => {
                    router.push({
                        pathname: "/lesson",
                        params: { topicId: item.id, title: item.title_th }
                    } as any);
                }}
            >
                {/* ส่วนเนื้อหาซ้าย (เลขข้อ) */}
                <View style={styles.cardLeft}>
                    <View style={[styles.numberBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.numberText}>{item.sequence}</Text>
                    </View>
                </View>
                
                {/* ส่วนเนื้อหากลาง */}
                <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{item.title_th}</Text>
                    <Text style={styles.cardSubtitle}>{item.title_en || "English Topic"}</Text>
                    
                    {/* Progress Text */}
                    <Text style={[styles.progressText, { color: statusColor }]}>
                        {isCompleted ? "เรียนจบแล้ว" : "ยังไม่เริ่มเรียน"}
                    </Text>
                </View>

                {/* ปุ่มด้านขวา */}
                <View style={styles.playBtn}>
                    <Ionicons name={btnIcon as any} size={42} color={statusColor} />
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" translucent={true} backgroundColor="transparent" />
            <View style={[styles.header, { backgroundColor: '#eec924' }]}> 
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{flex: 1, paddingHorizontal: 15, justifyContent: 'center'}}>
                    <Text style={styles.headerTitle}>{title}</Text>
                    <Text style={styles.headerSub}>บทเรียนทั้งหมด {topics.length} หัวข้อ</Text>
                </View>
                <View style={{ width: 30 }} /> 
            </View>

            <View style={styles.body}>
                {loading ? (
                    <ActivityIndicator size="large" color="#EF4444" style={{ marginTop: 50 }} />
                ) : (
                    <FlatList
                        data={topics}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        paddingTop: Platform.OS === 'android' ? 45 : 60,
        paddingBottom: 20, paddingHorizontal: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomLeftRadius: 25, borderBottomRightRadius: 25,
        elevation: 5, minHeight: 100
    },
    backButton: { padding: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
    headerSub: { fontSize: 12, color: '#FFEBEE', textAlign: 'center', marginTop: 4 },
    body: { flex: 1 },
    card: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 16, marginBottom: 15, padding: 15,
        borderWidth: 1, borderColor: '#FECACA', elevation: 2
    },
    cardLeft: { alignItems: 'center', marginRight: 15 },
    numberBadge: {
        width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', elevation: 2
    },
    numberText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
    cardContent: { flex: 1, justifyContent: 'center' },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 2 },
    cardSubtitle: { fontSize: 13, color: '#888', marginBottom: 8 },
    progressText: { fontSize: 12, fontWeight: 'bold' },
    playBtn: { marginLeft: 10 },
});