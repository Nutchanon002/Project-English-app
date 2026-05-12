// app/pretest.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, 
    ActivityIndicator, Image, ScrollView, Alert, Platform, Modal, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig'; 
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';


interface Question {
    id: string;
    question_text: string;
    choices: string[];
    correct_index: number;
    ref_id: string;
    question_image?: string;
}

interface StrandMap {
    [key: string]: string; 
}

// ==========================================
//  COMPONENT: AI RESULT MODAL (หน้าต่าง AI สุดล้ำ)
// ==========================================
const AIResultModal = ({ visible, onClose, aiMessage, score, total }: any) => {
    const [displayStep, setDisplayStep] = useState(0); // 0=คิด, 1=พิมพ์, 2=เสร็จ
    const [displayedText, setDisplayedText] = useState("");
    const slideAnim = useRef(new Animated.Value(500)).current; 
  
    // เพิ่ม state และ ref สำหรับจำกัดรอบการเล่นอนิเมชั่น
    const [playCount, setPlayCount] = useState(0);
    const lottieRef = useRef<any>(null);

    useEffect(() => {
      if (visible) {
        // Reset ค่าเมื่อเปิด Modal
        setDisplayStep(0);
        setDisplayedText("");
        setPlayCount(0);
        slideAnim.setValue(500);
  
        // Slide ขึ้นมา
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
        }).start();
  
        // Step 1: แกล้งๆ คิด 2.5 วินาที
        setTimeout(() => {
          setDisplayStep(1);
          setPlayCount(0); // รีเซ็ตนับรอบอนิเมชั่นใหม่เมื่อเปลี่ยนท่า
        }, 2500);
      }
    }, [visible, slideAnim]);
  
    // Step 2: พิมพ์ทีละตัวอักษร
    useEffect(() => {
      if (displayStep === 1 && aiMessage) {
        let i = 0;
        let chars: string[] = [];
        
        // ใช้ Intl.Segmenter เพื่อแบ่งคำและสระภาษาไทยให้ถูกต้อง (ป้องกันสระ/วรรณยุกต์แยกกัน)
        try {
            const segmenter = new Intl.Segmenter('th', { granularity: 'grapheme' });
            chars = Array.from(segmenter.segment(aiMessage)).map(s => s.segment);
        } catch (e) {
            chars = Array.from(aiMessage); // Fallback
        }

        const timer = setInterval(() => {
          if (i < chars.length) {
            i++;
            setDisplayedText(chars.slice(0, i).join(''));
          } else {
            clearInterval(timer);
            setDisplayStep(2); // พิมพ์เสร็จ
          }
        }, 20); // ปรับให้พิมพ์เร็วขึ้นนิดหน่อยเพื่อความลื่นไหล
        return () => clearInterval(timer);
      }
    }, [displayStep, aiMessage]);
  
    return (
      <Modal transparent visible={visible} animationType="none">
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}>
            
            <LinearGradient colors={['#ffffff', '#e8f5e9']} style={styles.gradientBg}>
              
              {/* ส่วนแสดงอนิเมชั่น Lottie */}
              <View style={styles.lottieWrapper}>
                {displayStep === 0 ? (
                    // ⚠️ อย่าลืมเอาไฟล์ .json ไปใส่ใน assets/lottie/ นะครับ
                    // ถ้ายังไม่มีไฟล์ ให้ comment <LottieView> ออกก่อน แล้วใส่ <ActivityIndicator /> แทนได้ครับ
                    <LottieView
                        ref={displayStep === 0 ? lottieRef : null}
                        source={require('../assets/images/lottie/ai-thinking.json')} 
                        autoPlay 
                        loop={false}
                        onAnimationFinish={() => {
                            if (playCount < 1) {
                                setPlayCount(prev => prev + 1);
                                lottieRef.current?.play();
                            }
                        }}
                        style={{ width: 150, height: 150 }}
                    />
                ) : (
                    <LottieView
                        ref={displayStep > 0 ? lottieRef : null}
                        source={require('../assets/images/lottie/ai-talk.json')} 
                        autoPlay 
                        loop={false}
                        onAnimationFinish={() => {
                            if (playCount < 1) {
                                setPlayCount(prev => prev + 1);
                                lottieRef.current?.play();
                            }
                        }}
                        style={{ width: 120, height: 120 }}
                    />
                )}
              </View>
  
              {/* หัวข้อ */}
              <Text style={styles.modalTitle}>
                {displayStep === 0 ? "AI กำลังวิเคราะห์ผลสอบ..." : "ผลวิเคราะห์จาก AI Tutor"}
              </Text>
  
              {/* กล่องข้อความ AI */}
              {displayStep > 0 && (
                <ScrollView 
                    style={{ width: '100%', flex: 1, marginTop: 10, marginBottom: 10 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 20 }}
                >
                  <View style={styles.messageBox}>
                     <Text style={styles.aiTypingText}>
                       {displayedText}
                       {displayStep === 1 ? <Text style={{color: '#4CAF50'}}>|</Text> : null}
                     </Text>
                  </View>
                </ScrollView>
              )}
  
              {/* ปุ่มไปต่อ (โผล่มาตอนพิมพ์จบ) */}
              {displayStep === 2 && (
                 <TouchableOpacity style={styles.modalActionBtn} onPress={onClose}>
                   <Text style={styles.modalActionText}>ดูผลคะแนนละเอียด</Text>
                 </TouchableOpacity>
              )}
  
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    );
};

// ==========================================
// 📱 MAIN SCREEN: PretestScreen
// ==========================================
export default function PretestScreen() {
    const router = useRouter();
    
    const [questions, setQuestions] = useState<Question[]>([]);
    const [strandNames, setStrandNames] = useState<StrandMap>({}); 
    const [answers, setAnswers] = useState<{[key: number]: number}>({}); 
    
    const [loading, setLoading] = useState(true);
    const [finished, setFinished] = useState(false);
    
    // ✅ เพิ่ม State สำหรับ Modal
    const [showAIModal, setShowAIModal] = useState(false);
    
    const [score, setScore] = useState(0);
    const [aiRecommendation, setAiRecommendation] = useState<string>("");
    const [weakStrands, setWeakStrands] = useState<{id: string, name: string}[]>([]);

    useEffect(() => {
        const prepareExam = async () => {
            try {
                // 1. ดึงชื่อสาระ
                const strandSnap = await getDocs(query(collection(db, "strands")));
                const sMap: StrandMap = {};
                strandSnap.docs.forEach(d => {
                    sMap[d.id] = d.data().title; 
                });
                setStrandNames(sMap);

                // 2. ดึงโจทย์
                const q = query(
                    collection(db, "questions"), 
                    where("type", "in", ["exercise", "assessment"]) 
                );
                const snapshot = await getDocs(q);
                const allData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Question));

                // 3. สุ่มโจทย์
                const grouped: {[key: string]: Question[]} = {};
                allData.forEach(item => {
                    if (item.ref_id) {
                        if (!grouped[item.ref_id]) grouped[item.ref_id] = [];
                        grouped[item.ref_id].push(item);
                    }
                });

                let selectedQuestions: Question[] = [];
                Object.keys(grouped).forEach(strandId => {
                    const shuffled = grouped[strandId].sort(() => 0.5 - Math.random());
                    selectedQuestions.push(...shuffled.slice(0, 2)); 
                });

                selectedQuestions = selectedQuestions.sort(() => 0.5 - Math.random());
                setQuestions(selectedQuestions);

            } catch (e) {
                console.error(e);
                Alert.alert("Error", "เกิดข้อผิดพลาดในการเตรียมข้อสอบ");
            } finally {
                setLoading(false);
            }
        };
        prepareExam();
    }, []);

    const handleSelectAnswer = (questionIdx: number, choiceIdx: number) => {
        setAnswers(prev => ({ ...prev, [questionIdx]: choiceIdx }));
    };

    const submitExam = async () => {
        if (Object.keys(answers).length < questions.length) {
            Alert.alert("แจ้งเตือน", "กรุณาทำข้อสอบให้ครบทุกข้อก่อนส่งนะครับ");
            return;
        }

        
        let totalScore = 0;
        const incorrectStrands: {[key: string]: number} = {}; 

        questions.forEach((q, idx) => {
            const userChoice = answers[idx];
            if (userChoice === q.correct_index) {
                totalScore += 1;
            } else {
                if (q.ref_id) {
                    incorrectStrands[q.ref_id] = (incorrectStrands[q.ref_id] || 0) + 1;
                }
            }
        });

        // AI LOGIC
        const weakPoints: {id: string, name: string}[] = [];
        Object.keys(incorrectStrands).forEach(sid => {
            if (strandNames[sid]) {
                weakPoints.push({ id: sid, name: strandNames[sid] });
            }
        });

        // 1. Calculate Percent and Assign Level
        const percentScore = (totalScore / questions.length) * 100;
        let learnerLevel = "";
        let recommendationText = "";

        if (percentScore >= 80) {
            learnerLevel = "Advanced";
            recommendationText = "ว้าว สุดยอดไปเลยครับ! 🎉\nระดับของคุณคือ 🌟 Advanced (ระดับสูง)\n\nจากที่ AI วิเคราะห์ คุณมีพื้นฐานภาษาอังกฤษที่แน่นมากๆ เลยครับ ตอนนี้คุณพร้อมที่จะลุยเนื้อหาที่ท้าทายขึ้นตามความสนใจได้เลย ลุยกันเลย! 🚀";
        } else if (percentScore >= 50) {
            learnerLevel = "Intermediate";
            recommendationText = "ทำได้เยี่ยมมากครับ! 👍\nระดับของคุณคือ ⭐ Intermediate (ระดับกลาง)\n\nคุณมีพื้นฐานที่ดีเลยครับ แต่ยังมีบางจุดเล็กๆ ที่เราปรับอีกนิดจะเป๊ะมาก! ไม่ต้องห่วงนะครับ AI เตรียมเนื้อหาที่จะช่วยอุดรอยรั่วและพัฒนาจุดแข็งให้คุณไว้แล้ว 😊";
        } else {
            learnerLevel = "Beginner";
            recommendationText = "เริ่มต้นได้ดีครับ! ✌️\nระดับของคุณคือ 🔰 Beginner (ระดับพื้นฐาน)\n\nการเริ่มต้นคือก้าวที่สำคัญที่สุดครับ! AI ได้วิเคราะห์และเตรียมบทเรียนปูพื้นฐานแบบค่อยเป็นค่อยไปมาให้คุณแล้ว เรามาสร้างรากฐานที่แข็งแรงไปด้วยกันนะครับ สู้ๆ! 💪";
        }

        const user = auth.currentUser;
        if (user) {
            try {
                // บันทึกผลการประเมินลง Firestore เพื่อนำไปใช้หน้า Dashboard
                await setDoc(doc(db, "assessment_results", user.uid), {
                    score: totalScore,
                    total: questions.length,
                    percent: percentScore,
                    learner_level: learnerLevel,
                    weak_strands: weakPoints.map(w => w.id),
                    recommendation: recommendationText,
                    timestamp: new Date()
                });
            } catch (e) {
                console.error("Save Error", e);
            }
        }

        setScore(totalScore);
        setWeakStrands(weakPoints);
        setAiRecommendation(recommendationText);
        

        //setLoading(false);
        setShowAIModal(true); 
    };

    // ฟังก์ชันปิด Modal แล้วโชว์หน้าสรุป
    const handleCloseAIModal = () => {
        setShowAIModal(false);
        setFinished(true);
    };

    if (loading) return <ActivityIndicator size="large" color="#4CAF50" style={styles.center} />;
    
    if (questions.length === 0) {
         return (
            <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
                <Text style={{ marginTop: 10, color: '#666', fontSize: 16 }}>ยังไม่มีข้อสอบในระบบ</Text>
                <TouchableOpacity 
                    style={styles.backHomeButtonOutline}
                    onPress={() => router.replace("/(tabs)" as any)} 
                >
                    <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>กลับหน้าหลัก</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // --- Result Screen (หน้าสรุปผล - จะโชว์หลังจากปิด Modal) ---
    if (finished) {
        return (
            <View style={styles.container}>
                <StatusBar style="dark" />
                <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center', paddingBottom: 50 }}>
                    
                    <Ionicons name={score === questions.length ? "ribbon" : "analytics"} size={80} color="#4CAF50" />
                    
                    <Text style={styles.scoreTitle}>คะแนนของคุณ</Text>
                    <Text style={styles.scoreValue}>{score} / {questions.length}</Text>

                    <View style={styles.aiBox}>
                        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                            <Ionicons name="happy" size={20} color="#2E7D32" style={{marginRight: 5}}/>
                            <Text style={styles.aiLabel}>AI Recommendation</Text>
                        </View>
                        {/* โชว์ข้อความที่ AI พูดไปแล้วอีกครั้ง เพื่อให้อ่านทวนได้ */}
                        <Text style={styles.aiText}>{aiRecommendation}</Text>
                    </View>

                    {weakStrands.length > 0 && (
                        <View style={{width: '100%', marginTop: 10, marginBottom: 20}}>
                            <Text style={styles.subHeader}>สาระการเรียนรู้ที่แนะนำสำหรับคุณ :</Text>
                            {weakStrands.map((strand, index) => (
                                <View key={index} style={styles.recommendCardWrapper}>
                                    <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                                        {/* <View style={styles.numberBadge}><Text style={{color:'#fff', fontWeight:'bold'}}>{index+1}</Text></View> */}
                                        <Text style={[styles.recommendBtnText, {flex: 1, paddingHorizontal: 5}]}>{strand.name}</Text>
                                    </View>
                                    <View style={{flexDirection: 'row'}}>
                                        <TouchableOpacity 
                                            style={[styles.recommendActionBtn, { borderColor: '#4CAF50', marginRight: 5 }]}
                                            onPress={() => {
                                                router.push({
                                                    pathname: "/topics",
                                                    params: { strandId: strand.id, title: strand.name }
                                                } as any);
                                            }}
                                        >
                                            <Ionicons name="book" size={18} color="#4CAF50" />
                                            <Text style={[styles.recommendActionText, { color: '#4CAF50' }]}>อ่านบทเรียน</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity 
                                            style={[styles.recommendActionBtn, { borderColor: '#FF9800', marginLeft: 5 }]}
                                            onPress={() => {
                                                router.push({
                                                    pathname: "/quiz",
                                                    params: { strandId: strand.id, title: strand.name }
                                                } as any);
                                            }}
                                        >
                                            <Ionicons name="pencil" size={18} color="#FF9800" />
                                            <Text style={[styles.recommendActionText, { color: '#FF9800' }]}>แบบฝึกหัด</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity 
                        style={styles.backHomeButton} 
                        onPress={() => router.replace("/tabs" as any)}
                    >
                        <Text style={styles.backHomeText}>กลับหน้าหลัก</Text>
                    </TouchableOpacity>

                </ScrollView>
            </View>
        );
    }

    // --- Exam Screen ---
    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            
            {/* ✅ ใส่ Modal ไว้ตรงนี้ (มันจะลอยอยู่เหนือทุกอย่างเอง) */}
            <AIResultModal 
                visible={showAIModal}
                onClose={handleCloseAIModal}
                aiMessage={aiRecommendation}
                score={score}
                total={questions.length}
            />

            <View style={styles.header}>
                 <TouchableOpacity onPress={() => router.back()} style={{padding: 5}}>
                    <Ionicons name="close" size={24} color="#fff" style={{padding: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10}}/>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>แบบทดสอบประเมินความรู้</Text>
                <View style={{width: 30}}/>
            </View>

            <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 100}}>
                <Text style={styles.instructText}>ทำข้อสอบให้ครบทุกข้อ แล้วกดส่งคำตอบด้านล่าง</Text>
                
                {questions.map((q, idx) => (
                    <View key={q.id} style={styles.questionCard}>
                        <View style={{flexDirection: 'row', marginBottom: 10}}>
                            <Text style={styles.qIndex}>{idx + 1}.</Text>
                            <Text style={styles.qText}>{q.question_text}</Text>
                        </View>
                        {q.question_image && (
                            <Image source={{ uri: q.question_image }} style={styles.qImage} resizeMode="contain" />
                        )}
                        {q.choices.map((choice, cIdx) => {
                            const isSelected = answers[idx] === cIdx;
                            return (
                                <TouchableOpacity 
                                    key={cIdx} 
                                    style={[styles.choiceItem, isSelected && styles.choiceSelected]}
                                    onPress={() => handleSelectAnswer(idx, cIdx)}
                                    activeOpacity={0.8}
                                >
                                    <View style={[styles.radioCircle, isSelected && styles.radioSelected]}>
                                        {isSelected && <View style={styles.radioInner} />}
                                    </View>
                                    <Text style={[styles.choiceText, isSelected && {fontWeight: 'bold', color: '#4CAF50'}]}>
                                        {choice}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}

                <TouchableOpacity style={styles.submitButton} onPress={submitExam}>
                    <Text style={styles.submitButtonText}>ส่งคำตอบ</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F5F5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    header: {
        paddingTop: Platform.OS === 'android' ? 45 : 60,
        paddingBottom: 20, paddingHorizontal: 20,
        backgroundColor: '#4CAF50', flexDirection: 'row', 
        justifyContent: 'space-between', alignItems: 'center', elevation: 4
    },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    instructText: { textAlign: 'center', color: '#666', marginBottom: 20 },
    questionCard: {
        backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20,
        elevation: 2, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity:0.1, shadowRadius:3
    },
    qIndex: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50', marginRight: 10 },
    qText: { fontSize: 18, color: '#333', flex: 1, lineHeight: 26 },
    qImage: { width: '100%', height: 180, borderRadius: 8, marginBottom: 15 },
    choiceItem: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 15,
        borderWidth: 1, borderColor: '#eee', borderRadius: 10, marginBottom: 10, backgroundColor: '#FAFAFA'
    },
    choiceSelected: { borderColor: '#4CAF50', backgroundColor: '#F1F8E9' },
    choiceText: { fontSize: 16, color: '#555', marginLeft: 10 },
    radioCircle: {
        height: 20, width: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ccc',
        alignItems: 'center', justifyContent: 'center'
    },
    radioSelected: { borderColor: '#4CAF50' },
    radioInner: { height: 10, width: 10, borderRadius: 5, backgroundColor: '#4CAF50' },
    submitButton: {
        backgroundColor: '#4CAF50', padding: 18, borderRadius: 30, 
        alignItems: 'center', marginTop: 10, elevation: 5, shadowColor: '#4CAF50', shadowOpacity: 0.3
    },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    
    // Result Screen Styles
    scoreTitle: { fontSize: 18, color: '#666', marginTop: 10 },
    scoreValue: { fontSize: 48, fontWeight: 'bold', color: '#333', marginBottom: 20 },
    aiBox: { 
        backgroundColor: '#fff', padding: 25, borderRadius: 16, width: '100%',
        marginBottom: 20, borderWidth: 1, borderColor: '#C8E6C9', elevation: 2
    },
    aiLabel: { fontWeight: 'bold', color: '#2E7D32', fontSize: 16 },
    aiText: { fontSize: 16, color: '#333', lineHeight: 26, marginTop: 5 },
    subHeader: { alignSelf: 'flex-start', fontSize: 16, fontWeight: 'bold', color: '#555', marginBottom: 10 },
    recommendCardWrapper: {
        backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15,
        borderWidth: 1, borderColor: '#ddd', width: '100%', elevation: 2
    },
    recommendActionBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 10, borderRadius: 8, borderWidth: 1, backgroundColor: '#FAFAFA'
    },
    recommendActionText: { fontSize: 14, fontWeight: 'bold', marginLeft: 5 },
    recommendBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10,
        borderWidth: 1, borderColor: '#ddd', width: '100%', elevation: 2
    },
    recommendBtnText: { fontSize: 16, fontWeight: 'bold', color: '#333', lineHeight: 22 },
    numberBadge: { backgroundColor: '#FF9800', width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 5 },
    backHomeButton: {
        marginTop: 20, paddingVertical: 12, paddingHorizontal: 40,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#999', borderRadius: 25,
    },
    backHomeButtonOutline: {
        marginTop: 20, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: '#4CAF50', borderRadius: 8 
    },
    backHomeText: { color: '#666', fontSize: 16, fontWeight: 'bold' },

    // ✅ STYLES FOR MODAL (ใหม่)
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContainer: { height: '80%', width: '100%', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', backgroundColor: '#fff' },
    gradientBg: { flex: 1, padding: 25, paddingBottom: 35, alignItems: 'center' },
    lottieWrapper: { marginBottom: 10, marginTop: 10, height: 160, justifyContent: 'center', alignItems: 'center' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginBottom: 20, textAlign: 'center' },
    messageBox: { 
        backgroundColor: 'rgba(255,255,255,0.9)', width: '100%', padding: 20, borderRadius: 20,
        borderWidth: 1, borderColor: '#E8F5E9', shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
    },
    aiTypingText: { fontSize: 18, color: '#333', lineHeight: 28 },
    modalActionBtn: {
        marginTop: 10, backgroundColor: '#4CAF50', paddingVertical: 15, paddingHorizontal: 40,
        borderRadius: 30, shadowColor: "#4CAF50", shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
        width: '100%', alignItems: 'center'
    },
    modalActionText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});