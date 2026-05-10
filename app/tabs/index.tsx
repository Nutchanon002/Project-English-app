// app/(tabs)/index.tsx
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState, useRef } from 'react';
import { useIsFocused, useScrollToTop } from '@react-navigation/native';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { StatusBar } from 'expo-status-bar';

export default function DashboardScreen() {
  const router = useRouter();  
  const isFocused = useIsFocused();
  const scrollViewRef = useRef<ScrollView>(null);
  useScrollToTop(scrollViewRef);

  useEffect(() => {
    if (isFocused) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  }, [isFocused]);
  
  const [strands, setStrands] = useState<any[]>([]);
  const [allTopics, setAllTopics] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any>({});
  
  // เก็บผลสอบ { score, total }
  const [exerciseResults, setExerciseResults] = useState<any>({}); 
  const [questionCounts, setQuestionCounts] = useState<{[key: string]: number}>({});
  const [assessmentResult, setAssessmentResult] = useState<any>(null); // ✅ เก็บผลจาก AI

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>({});
  
  const fetchUser = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          setUserData({ nickname: user.email?.split('@')[0] });
        }
      } catch (e) {
        console.log("Error fetching user:", e);
      }
    } else {
        setUserData({ nickname: "Guest Learner" });
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    // ✅ เพิ่ม: ดึง User ปัจจุบันมาใช้
    const user = auth.currentUser;
    if (!user) return; // ถ้าไม่มี user (กรณีหลุด) ให้หยุดทำงาน

    setLoading(true);

    const qStrands = query(collection(db, "strands"), orderBy("no"));
    const unsubStrands = onSnapshot(qStrands, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStrands(data);
    });

    const unsubTopics = onSnapshot(collection(db, "topics"), (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllTopics(data);
    });

    // ✅ แก้ไข: ใช้ user.uid แทน CURRENT_STUDENT_ID
    const qProgress = query(collection(db, "learning_progress"), where("student_id", "==", user.uid));
    const unsubProgress = onSnapshot(qProgress, (snapshot) => {
        const map: any = {};
        snapshot.docs.forEach(doc => {
            const d = doc.data();
            if (d.is_completed) map[d.topic_id] = true;
        });
        setUserProgress(map);
    });

    // ✅ แก้ไข: ใช้ user.uid แทน CURRENT_STUDENT_ID
    const qExercises = query(collection(db, "exercise_results"), where("student_id", "==", user.uid));
    const unsubExercises = onSnapshot(qExercises, (snapshot) => {
        const map: any = {};
        snapshot.docs.forEach(doc => {
            const d = doc.data();
            // เก็บทั้ง score และ totalQuestions (จำนวนข้อตอนที่สอบ)
            map[d.strand_id] = { score: d.score, total: d.totalQuestions };
        });
        setExerciseResults(map);
    });

    // ดึงจำนวนข้อสอบจริง (Real-time)
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

    // ✅ เพิ่ม: ดึงผลประเมิน AI ของผู้ใช้คนนี้
    const unsubAssessment = onSnapshot(doc(db, "assessment_results", user.uid), (docSnap) => {
        if (docSnap.exists()) {
            setAssessmentResult(docSnap.data());
        } else {
            setAssessmentResult(null);
        }
    });

    return () => {
        unsubStrands();
        unsubTopics();
        unsubProgress();
        unsubExercises();
        unsubQuestions(); 
        unsubAssessment(); // ✅ ล้าง subscription
    };
  }, []);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchUser();
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const getProgressStats = (strandId: string) => {
    const strandTopics = allTopics.filter(t => t.strand_id === strandId);
    const total = strandTopics.length;
    if (total === 0) return { percent: 0, completed: 0, total: 0 };
    const completed = strandTopics.filter(t => userProgress[t.id]).length;
    const percent = Math.round((completed / total) * 100);
    return { percent, completed, total };
  };

  const getCardStyle = (percent: number) => {
    if (percent === 100) {
        return { color: '#5edd63', textColor: '#4CAF50', status: 'จบแล้ว' }; 
    } else if (percent > 0) {
        return { color: '#f8bf23', textColor: '#f8bf23', status: 'กำลังเรียน' }; 
    } else {
        return { color: '#EF5350', textColor: '#EF5350', status: 'เริ่มเรียน' }; 
    }
  };

  const renderCard = (item: any) => {
    const stats = getProgressStats(item.id);
    const styleConfig = getCardStyle(stats.percent);
    
    // ข้อมูลผลสอบเก่า
    const rawResult = exerciseResults[item.id]; 
    // จำนวนข้อจริงปัจจุบัน
    const realTotal = questionCounts[item.id] || 0; 

    // ✅ Logic เดิมของคุณ: เช็คว่าจำนวนข้อตรงกันไหม ถ้าไม่ตรงถือว่าเป็น 0
    let displayScore = 0;
    if (rawResult && rawResult.total === realTotal && realTotal > 0) {
        displayScore = rawResult.score;
    }
    
    const displayTotal = realTotal;
    
    // โชว์ป้ายคะแนนถ้าเคยมีประวัติการสอบ (แม้คะแนนจะโดนรีเซ็ตเป็น 0 ก็โชว์เพื่อให้รู้ว่าต้องทำใหม่)
    const showScoreBadge = rawResult !== undefined; 

    return (
      
      <TouchableOpacity 
        key={item.id}
        style={[styles.strandCard, { backgroundColor: styleConfig.color }]}
        activeOpacity={0.9}
        onPress={() => {
            router.push({ 
                pathname: "/topics", 
                params: { strandId: item.id, title: item.title } 
            } as any);
        }}
      >

        <View style={styles.cardInner}>
            <View style={{flex: 1, paddingRight: 15}}>
                <Text style={styles.cardTitle}>{item.no}. {item.title}</Text>
                {item.subtitle ? (
                  <Text style={styles.cardSubtitle}>({item.subtitle})</Text>
                ) : null}
                
                <Text style={{ color: 'rgba(255,255,255,1)', fontSize: 13, marginTop: 5 }}>
                  บทเรียน {stats.completed}/{stats.total} หัวข้อ
                </Text>

                {/* แสดงคะแนนสอบ */}
                {showScoreBadge && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, backgroundColor: 'rgba(0,0,0,0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>
                            ทำเเบบฝึกหัดไปเเล้ว : {displayScore}/{displayTotal}
                        </Text>
                    </View>
                )}
            </View>
            <View style={styles.cardRightAction}>
                <View style={styles.whiteBox}>
                    <Text style={[styles.boxText, { color: styleConfig.textColor }]}>
                      {stats.percent}%
                    </Text>
                </View>
                
                <View style={styles.whiteBoxButton}>
                    <Text style={[styles.boxTextButton, { color: styleConfig.textColor }]}>
                      {styleConfig.status}
                    </Text>
                </View>
            </View>
        </View>
      </TouchableOpacity>
    );
  };

  const firstLetter = userData.nickname ? userData.nickname.charAt(0).toUpperCase() : "U";

  return (
    <View style={styles.container}>
      {isFocused && <StatusBar style="dark" />}
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#4CAF50"]} />
        }
      >
        <View style={styles.header}>
            <View>
                <Text style={styles.subGreeting}>มาเรียนรู้ภาษาอังกฤษกันเถอะ!</Text>
                <Text style={styles.greeting}>สวัสดี, {userData.nickname || "Learner"}</Text>
            </View>
            <View style={styles.profileCircle}>
                <Text style={styles.profileInitial}>{firstLetter}</Text>
            </View>
        </View>

        {/* AI Banner / Pretest Banner */}
        {!assessmentResult ? (
            <TouchableOpacity 
                style={styles.assessmentBanner}
                onPress={() => router.push("/pretest" as any)}
            >
                <Text style={styles.assessTitle}>แบบทดสอบประเมินความรู้</Text>
                <Text style={styles.assessSub}>ทำแบบทดสอบเพื่อรับแผนการเรียนที่เหมาะสมจาก AI</Text>
                <Text style={styles.assessLink}>เริ่มทำแบบทดสอบ {'>'}</Text>
            </TouchableOpacity>
        ) : (
            <TouchableOpacity 
                style={[styles.assessmentBanner, { borderColor: '#FFA000', backgroundColor: '#FFF8E1' }]}
                onPress={() => router.push("/pretest" as any)}
            >
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 5}}>
                    <Text style={[styles.assessTitle, {marginBottom: 0, color: '#FF8F00'}]}>ผลประเมินของคุณ: {assessmentResult.learner_level || "Learner"}</Text>
                </View>
                <Text style={[styles.assessSub, {color: '#8D6E63'}]}>
                    คะแนน: {assessmentResult.score}/{assessmentResult.total} | ทดสอบซ้ำเพื่ออัปเดตผล 
                </Text>
                <Text style={[styles.assessLink, {color: '#FF8F00'}]}>ทำแบบทดสอบอีกครั้ง {'>'}</Text>
            </TouchableOpacity>
        )}

        {loading ? (
            <ActivityIndicator size="large" color="#4CAF50" style={{marginTop: 50}} />
        ) : (
            <View style={styles.listContainer}>
                {strands.length === 0 ? (
                    <Text style={styles.emptyText}>ยังไม่มีข้อมูลสาระ (เพิ่มใน Admin ได้เลย)</Text>
                ) : assessmentResult && assessmentResult.weak_strands && assessmentResult.weak_strands.length > 0 ? (
                    // 🌟 แสดงแบบ AI Personalized
                    <>
                        <Text style={[styles.sectionHeader, { color: '#E65100' }]}>🌟 สาระการเรียนรู้ที่เเนะนำ</Text>
                        {strands.filter(s => assessmentResult.weak_strands.includes(s.id)).map(renderCard)}
                        
                        <Text style={[styles.sectionHeader, { color: '#E65100', marginTop: 20 }]}>📚 สาระการเรียนรู้อื่นๆ</Text>
                        {strands.filter(s => !assessmentResult.weak_strands.includes(s.id)).map(renderCard)}
                    </>
                ) : (
                    // แบบปกติ หรือ สอบได้เต็ม
                    <>
                        {assessmentResult?.score === assessmentResult?.total && assessmentResult?.total > 0 && (
                            <Text style={{color: '#4CAF50', fontWeight: 'bold', fontSize: 16, marginBottom: 15, textAlign: 'center'}}>
                                🎉 คุณทำคะแนนได้เต็ม! ลุยเนื้อหาทั้งหมดได้เลยครับ
                            </Text>
                        )}
                        <Text style={styles.sectionHeader}>สาระการเรียนรู้</Text>
                        {strands.map(renderCard)}
                    </>
                )}
            </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 50, backgroundColor: '#ffffffc7' },
  
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 25, marginBottom: 25 
  },
  subGreeting: { fontSize: 14, color: '#888', marginBottom: 4 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  profileCircle: {
    width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#8BC34A', 
    justifyContent: 'center', alignItems: 'center',
  },
  profileInitial: { fontSize: 26, fontWeight: 'bold', color: '#fff' },

  assessmentBanner: {
    marginHorizontal: 20, padding: 20, borderRadius: 15,
    backgroundColor: '#fff', 
    borderWidth: 1.5, borderColor: '#8BC34A', 
    marginBottom: 30,
  },
  assessTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  assessSub: { fontSize: 14, color: '#666', marginBottom: 15 },
  assessLink: { fontSize: 14, color: '#4CAF50', fontWeight: 'bold' },

  sectionHeader: { 
    fontSize: 24, fontWeight: 'bold', color: '#000', 
    marginHorizontal: 20, marginBottom: 20 
  },

  listContainer: { paddingHorizontal: 20 },

  strandCard: {
    borderRadius: 16, marginBottom: 15, padding: 20,
    minHeight: 110, justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2, shadowRadius: 5, elevation: 4
  },
  cardInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 5, lineHeight: 26 },
  cardSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  
  cardRightAction: { alignItems: 'flex-end', justifyContent: 'center', gap: 10 },
  
  whiteBox: { 
    backgroundColor: '#fff', paddingHorizontal: 0, paddingVertical: 2, borderRadius: 6,
    width: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 6
  },
  boxText: { fontSize: 13, fontWeight: 'bold' },
  
  whiteBoxButton: {
    backgroundColor: '#fff', paddingHorizontal: 0, paddingVertical: 6, borderRadius: 8,
    width: 80, alignItems: 'center', justifyContent: 'center'
  },
  boxTextButton: { fontSize: 14, fontWeight: 'bold' },

  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 }
});