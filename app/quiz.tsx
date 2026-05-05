// app/quiz.tsx
import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, 
    ActivityIndicator, Image, ScrollView, Alert, Platform 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, query, where, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig'; // ตรวจสอบ path ให้ถูกต้อง
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
export default function QuizScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { strandId, title } = params;

    const [questions, setQuestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userAnswers, setUserAnswers] = useState<{[key: number]: number}>({});
    const [isReviewMode, setIsReviewMode] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const user = auth.currentUser;
            if (!user) {
                setLoading(false);
                return; 
            }

            try {
                // 1. ดึงโจทย์ข้อสอบปัจจุบัน
                const qQuestions = query(
                    collection(db, "questions"), 
                    where("ref_id", "==", strandId),
                    where("type", "==", "exercise")
                );
                const snapshot = await getDocs(qQuestions);
                const qData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setQuestions(qData);

                // 2. เช็คผลสอบเก่า (ใช้ user.uid แทนค่าตายตัว)
                // ID ของเอกสารเก็บเป็น: "ไอดีผู้ใช้_ไอดีบทเรียน"
                const resultId = `${user.uid}_${strandId}`;
                const resultRef = doc(db, "exercise_results", resultId);
                const resultSnap = await getDoc(resultRef);

                if (resultSnap.exists()) {
                    const resultData = resultSnap.data();
                    
                    // เงื่อนไข: เคยทำได้เต็ม และ คะแนนเต็มต้องไม่ใช่ 0
                    const isPerfectScore = (resultData.score === resultData.totalQuestions) && (resultData.totalQuestions > 0);
                    const isSameAmount = resultData.totalQuestions === qData.length;

                    if (isPerfectScore && isSameAmount) {
                        // กรณี 1: คะแนนเต็ม + โจทย์เท่าเดิม -> โหมดทบทวน
                        setIsReviewMode(true);
                    } else {
                        // กรณี 2: คะแนนไม่เต็ม หรือ โจทย์เปลี่ยน -> ต้องทำใหม่
                        setIsReviewMode(false);
                        
                        if (isPerfectScore && qData.length > resultData.totalQuestions) {
                            Alert.alert("มีโจทย์ใหม่!", "มีการเพิ่มแบบฝึกหัดใหม่ กรุณาทำแบบทดสอบอีกครั้งเพื่ออัปเดตคะแนน");
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [strandId]);

    const handleSelectChoice = (questionIndex: number, choiceIndex: number) => {
        if (isReviewMode) return;
        setUserAnswers(prev => ({ ...prev, [questionIndex]: choiceIndex }));
    };

    const handleSubmit = async () => {
        // ✅ 3. เช็ค User ตอนกดส่ง
        const user = auth.currentUser;
        if (!user) {
            Alert.alert("Error", "ไม่พบข้อมูลผู้ใช้งาน กรุณาล็อกอินใหม่");
            return;
        }

        if (Object.keys(userAnswers).length < questions.length) {
            Alert.alert("แจ้งเตือน", "กรุณาทำข้อสอบให้ครบทุกข้อก่อนส่งครับ");
            return;
        }

        let score = 0;
        questions.forEach((q, index) => {
            if (userAnswers[index] === q.correct_index) score++;
        });

        try {
            // ✅ 4. บันทึกผลสอบโดยใช้ user.uid
            const resultId = `${user.uid}_${strandId}`;
            await setDoc(doc(db, "exercise_results", resultId), {
                student_id: user.uid, // ใช้ ID จริง
                strand_id: strandId,
                score: score,
                totalQuestions: questions.length,
                timestamp: new Date()
            });

            Alert.alert(
                "ส่งคำตอบเรียบร้อย",
                `คุณได้คะแนน ${score} / ${questions.length}`,
                [{
                    text: "ตกลง",
                    onPress: () => {
                        if (score === questions.length) setIsReviewMode(true);
                        else router.back();
                    }
                }]
            );
        } catch (e) {
            console.error("Error saving score:", e);
        }
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#FFB74D" style={{ marginTop: 50 }} />;
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" translucent={true} backgroundColor="transparent" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                
                <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>{title || "แบบฝึกหัด"}</Text>
                    <Text style={styles.headerSubTitle}>
                        แบบฝึกหัดทั้งหมด {questions.length} ข้อ
                    </Text>
                </View>

                <View style={{ width: 40 }} /> 
            </View>

            {questions.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-text-outline" size={80} color="#ddd" />
                    <Text style={styles.emptyText}>ยังไม่มีแบบฝึกหัดในขณะนี้</Text>
                    <Text style={styles.emptySubText}>แอดมินกำลังเร่งดำเนินการเพิ่มเนื้อหาครับ</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Text style={styles.instructionText}>Choose the best answer.</Text>

                    {questions.map((q, qIndex) => {
                        return (
                            <View key={q.id} style={styles.questionContainer}>
                                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                                    <Text style={[styles.questionText, { marginBottom: 0, marginRight: 8 }]}>
                                        {qIndex + 1}).
                                    </Text>
                                    <Text style={[styles.questionText, { flex: 1, marginBottom: 0 }]}>
                                        {q.question_text}
                                    </Text>
                                </View>

                                {q.question_image && (
                                    <Image source={{ uri: q.question_image }} style={styles.questionImage} resizeMode="contain" />
                                )}

                                <View style={styles.choicesList}>
                                    {q.choices.map((choice: string, cIndex: number) => {
                                        let isSelected = userAnswers[qIndex] === cIndex;
                                        let iconName = isSelected ? "radio-button-on" : "radio-button-off";
                                        let iconColor = isSelected ? "#FF9800" : "#ccc"; 
                                        
                                        if (isReviewMode) {
                                            const isCorrect = cIndex === q.correct_index;
                                            if (isCorrect) {
                                                iconName = "checkmark-circle";
                                                iconColor = "#4CAF50"; 
                                            } else {
                                                iconName = "radio-button-off";
                                                iconColor = "#eee"; 
                                            }
                                        }

                                        return (
                                            <TouchableOpacity 
                                                key={cIndex} 
                                                style={styles.choiceRow}
                                                onPress={() => handleSelectChoice(qIndex, cIndex)}
                                                activeOpacity={0.8}
                                                disabled={isReviewMode} 
                                            >
                                                <Ionicons name={iconName as any} size={24} color={iconColor} />
                                                <Text style={[
                                                    styles.choiceText, 
                                                    isReviewMode && cIndex === q.correct_index && { color: '#4CAF50', fontWeight: 'bold' }
                                                ]}>
                                                    {choice}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })}

                    {!isReviewMode && (
                        <TouchableOpacity style={styles.finishButton} onPress={handleSubmit}>
                            <Text style={styles.finishButtonText}>Finish</Text>
                        </TouchableOpacity>
                    )}

                    {isReviewMode && (
                        <TouchableOpacity style={[styles.finishButton, { backgroundColor: '#4CAF50' }]} onPress={() => router.back()}>
                            <Text style={styles.finishButtonText}>กลับหน้าหลัก</Text>
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        paddingTop: Platform.OS === 'android' ? 45 : 60,
        paddingBottom: 20, paddingHorizontal: 20,
        backgroundColor: '#eec924', 
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: 20,
        elevation: 5
    },
    backButton: { 
        padding: 8, 
        backgroundColor: 'rgba(255,255,255,0.2)', 
        borderRadius: 12 
    },
    headerTextContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    headerTitle: { 
        fontSize: 18, 
        fontWeight: 'bold', 
        color: '#fff',
        textAlign: 'center',
    },
    headerSubTitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        marginTop: 4,
    },
    
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
    emptyText: { fontSize: 18, color: '#888', marginTop: 20, fontWeight: 'bold' },
    emptySubText: { fontSize: 14, color: '#aaa', marginTop: 5 },

    scrollContent: { padding: 20 },
    instructionText: { fontSize: 16, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    
    questionContainer: { marginBottom: 25 },
    questionText: { fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 10 },
    questionImage: { width: '100%', height: 150, marginBottom: 10, borderRadius: 8 },
    
    choicesList: { marginLeft: 10 },
    choiceRow: { 
        flexDirection: 'row', alignItems: 'center', 
        marginBottom: 12, paddingVertical: 4 
    },
    choiceText: { fontSize: 16, color: '#333', marginLeft: 10, flex: 1 },
    
    finishButton: {
        backgroundColor: '#FFB74D', 
        paddingVertical: 15, borderRadius: 10,
        alignItems: 'center', marginTop: 20,
        elevation: 3
    },
    finishButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});