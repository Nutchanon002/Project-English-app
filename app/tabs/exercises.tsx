// app/(tabs)/exercises.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ActivityIndicator, ScrollView, Platform
} from 'react-native';
import { useRouter } from 'expo-router'; 
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db, auth } from '../../firebaseConfig'; 
import { StatusBar } from 'expo-status-bar';
import { useIsFocused } from '@react-navigation/native';

// ❌ ลบตัวแปรนี้ออกแล้วครับ: const CURRENT_STUDENT_ID = "user_001"; 

export default function ExercisesScreen() {
  const router = useRouter();  
  const isFocused = useIsFocused();
  
  const [strands, setStrands] = useState<any[]>([]);
  // เก็บข้อมูลผลสอบแบบละเอียด (Score + Recorded Total)
  const [examResults, setExamResults] = useState<{[key: string]: { score: number, recordedTotal: number }}>({});
  const [questionCounts, setQuestionCounts] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ เพิ่ม: ตรวจสอบ User ก่อน
    const user = auth.currentUser;
    if (!user) return; // ถ้าไม่มี user ก็ไม่ต้องดึงข้อมูล

    // 1. ดึงข้อมูลสาระ (Strands)
    const qStrands = query(collection(db, "strands"), orderBy("no"));
    const unsubStrands = onSnapshot(qStrands, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStrands(data);
    });

    // 2. ดึงคะแนนสอบ (History)
    // ✅ แก้ไข: ใช้ user.uid แทน CURRENT_STUDENT_ID
    const qResults = query(collection(db, "exercise_results"), where("student_id", "==", user.uid));
    const unsubResults = onSnapshot(qResults, (snapshot) => {
        const map: any = {};
        snapshot.docs.forEach(doc => {
            const d = doc.data();
            // เก็บ recordedTotal เพื่อเช็คว่าตอนสอบมีกี่ข้อ
            // ถ้าเป็นข้อมูลเก่าที่ไม่มี field นี้ ให้ถือว่าเป็น 0
            map[d.strand_id] = { score: d.score, recordedTotal: d.totalQuestions || 0 };
        });
        setExamResults(map);
    });

    // 3. ดึงจำนวนข้อสอบจริง (Real-time Count)
    const qQuestions = query(collection(db, "questions"), where("type", "==", "exercise"));
    const unsubQuestions = onSnapshot(qQuestions, (snapshot) => {
        const counts: {[key: string]: number} = {};
        snapshot.docs.forEach(doc => {
            const d = doc.data();
            if (d.ref_id) {
                counts[d.ref_id] = (counts[d.ref_id] || 0) + 1;
            }
        });
        setQuestionCounts(counts);
        setLoading(false);
    });

    return () => { unsubStrands(); unsubResults(); unsubQuestions(); };
  }, []);

  const renderCard = (item: any) => {
    const resultData = examResults[item.id]; 
    const currentTotal = questionCounts[item.id] || 0; 
    
    // ✅ Logic ป้องกันบั๊ก 100% ค้าง:
    // เช็คว่า "จำนวนข้อที่บันทึกไว้" เท่ากับ "จำนวนข้อปัจจุบัน" หรือไม่
    let score = 0;
    if (resultData && resultData.recordedTotal === currentTotal && currentTotal > 0) {
        score = resultData.score;
    }

    // คำนวณเปอร์เซ็นต์
    let percent = 0;
    if (currentTotal > 0) {
        percent = Math.round((score / currentTotal) * 100);
    }

    // กำหนดสีและสถานะ
    let cardColor = '#EF5350'; // สีแดงเป็นค่าเริ่มต้น
    let statusText = "เริ่มทำ";
    
    if (currentTotal === 0) {
        statusText = "ไม่มีโจทย์";
        cardColor = '#EF5350'; // ยังคงเป็นสีแดงตามธีม
    } else if (percent >= 80) {
        cardColor = '#5edd63'; // เขียว
        statusText = "ยอดเยี่ยม";
    } else if (percent >= 50) {
        cardColor = '#F59E0B'; // เหลือง
        statusText = "ผ่านเกณฑ์";
    } else {
        cardColor = '#EF5350'; // แดง
        statusText = score > 0 ? "พยายามอีกนิด" : "เริ่มทำ";
    }

    return (
      <TouchableOpacity 
        key={item.id}
        style={[styles.card, { backgroundColor: cardColor }]}
        activeOpacity={0.9}
        onPress={() => {
            router.push({ 
                pathname: "/quiz", 
                params: { strandId: item.id, title: item.title } 
            } as any);
        }}
      >
        <View style={styles.cardInner}>
            <View style={{flex: 1, paddingRight: 15}}>
                <Text style={styles.cardTitle}>{item.no}. {item.title}</Text>
                {item.subtitle && <Text style={styles.cardSubtitle}>({item.subtitle})</Text>}
                
                {/* Badge คะแนนสอบ */}
                <View style={styles.scoreBadge}>
                    <Text style={styles.scoreBadgeText}>ทำเเบบฝึกหัดแล้ว: {score}/{currentTotal}</Text>
                </View>
            </View>
            
            <View style={styles.cardRightAction}>
                <View style={styles.whiteBox}>
                    <Text style={[styles.boxText, { color: cardColor }]}>{percent}%</Text>
                </View>
                <View style={styles.whiteBoxButton}>
                    <Text style={[styles.boxTextButton, { color: cardColor }]}>
                        {statusText}
                    </Text>
                </View>
            </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {isFocused && <StatusBar style="light" translucent={true} backgroundColor="transparent" />}
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>แบบฝึกหัดท้ายบท</Text>
        <Text style={styles.headerSub}>ทดสอบความรู้หลังเรียนจบแต่ละสาระ</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#EF4444" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
            {strands.map((item) => renderCard(item))}
            {strands.length === 0 && (
                <Text style={{ textAlign: 'center', color: '#999', marginTop: 50 }}>
                    ไม่พบข้อมูลสาระการเรียนรู้
                </Text>
            )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: Platform.OS === 'android' ? 45 : 60,
    paddingBottom: 20,
    paddingHorizontal: 25,
    marginBottom: 25,
    backgroundColor: '#eec924',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    alignItems: 'center'
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 14, color: '#FFEBEE', marginTop: 5 },

  card: {
    borderRadius: 16, marginBottom: 15, padding: 20,
    minHeight: 110, justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, shadowRadius: 5, elevation: 4
  },
  cardInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 2, lineHeight: 26 },
  cardSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.95)', marginBottom: 8 },
  
  scoreBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)', 
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 5
  },
  scoreBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  
  cardRightAction: { alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  whiteBox: { 
    backgroundColor: '#fff', paddingHorizontal: 0, paddingVertical: 5, borderRadius: 8,
    width: 90, alignItems: 'center', justifyContent: 'center', marginBottom: 2,
    elevation: 2
  },
  boxText: { fontSize: 12, fontWeight: 'bold' },
  
  whiteBoxButton: {
    backgroundColor: '#fff', paddingHorizontal: 0, paddingVertical: 6, borderRadius: 8,
    width: 90, alignItems: 'center', justifyContent: 'center',
    elevation: 2
  },
  boxTextButton: { fontWeight: 'bold', fontSize: 12 },
});