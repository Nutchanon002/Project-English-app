// app/lesson.tsx
import React, { useState, useEffect, useCallback , useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Image, TouchableOpacity , Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore'; 
import { db, auth } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from "react-native-youtube-iframe"; 
import { StatusBar } from 'expo-status-bar';



export default function LessonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { topicId, title } = params;

  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);

const startTimeRef = useRef<number>(Date.now());


useEffect(() => {
    // รีเซ็ตเวลาเริ่มต้นทุกครั้งที่เข้ามาหน้านี้
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!topicId) return;

    const q = query(collection(db, "lessons"), where("topic_id", "==", topicId));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        if (!querySnapshot.empty) {
          const lessonData = querySnapshot.docs[0].data();
          setBlocks(lessonData.content_blocks || []);
        } else {
          setBlocks([]);
        }
        setLoading(false);
    }, (error) => {
        console.log(error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [topicId]);

  const getYoutubeId = (url: string) => {
    try {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    } catch (error) { 
        console.log(error); 
        return null; 
    }
  };
  
  const onStateChange = useCallback((state: string) => {
    if (state === "ended") setPlaying(false);
  }, []);

  const handleFinish = async () => {
    if (!topicId) return;

    // 3. ตรวจสอบ User ตัวจริงก่อนบันทึก
    const user = auth.currentUser;
    if (!user) {
        Alert.alert("แจ้งเตือน", "กรุณาเข้าสู่ระบบก่อนบันทึกสถานะการเรียน");
        return;
    }
    const endTime = Date.now();
    const durationSeconds = Math.floor((endTime - startTimeRef.current) / 1000);

    try {
        const progressId = `${user.uid}_${topicId}`;
        
        // ✅ 5. บันทึกข้อมูลจริงลง Firebase
        // field 'study_time' นี่แหละครับ ที่แอดมินจะเอาไปทำรายงานสรุปเวลาเรียน
        await setDoc(doc(db, "learning_progress", progressId), {
            student_id: user.uid,
            topic_id: topicId,
            is_completed: true,
            study_time: durationSeconds, // บันทึกเวลาเรียน (วินาที)
            timestamp: new Date()
        }, { merge: true }); // merge เพื่อไม่ให้ข้อมูลเก่าหาย

        // แสดงผลให้ผู้เรียนทราบนิดหน่อย
        const mins = Math.floor(durationSeconds / 60);
        const secs = durationSeconds % 60;
        
        Alert.alert(
            "เรียนจบแล้ว!", 
            `คุณใช้เวลาเรียนไป ${mins} นาที ${secs} วินาที\nระบบบันทึกผลเรียบร้อยแล้ว`, 
            [{ text: "ตกลง", onPress: () => router.back() }]
        );

    } catch (error) {
        console.error("Error saving progress:", error);
        Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกผลการเรียนได้");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" translucent={true} backgroundColor="transparent" />
      {/* Header */}
      <View style={styles.header}> 
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={{flex: 1, paddingHorizontal: 15, justifyContent: 'center'}}>
              <Text style={styles.headerTitle} numberOfLines={2}>
                  {title}
              </Text>
              <Text style={styles.headerSub}>เนื้อหาบทเรียน</Text>
          </View>

          <View style={{ width: 35 }} /> 
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
           <ActivityIndicator size="large" color="#EF4444" style={{ marginTop: 50 }} />
        ) : blocks.length === 0 ? (
           <View style={styles.emptyContainer}>
             <Ionicons name="document-text-outline" size={60} color="#ccc" />
             <Text style={styles.emptyText}>ยังไม่มีเนื้อหา</Text>
           </View>
        ) : (
           <>
             {blocks.map((block, index) => {
               if (block.type === 'video') {
                  const videoId = getYoutubeId(block.value);
                  if (!videoId) return null; 
                  return (
                    <View key={index} style={styles.card}>
                       <View style={styles.cardHeader}>
                          <Ionicons name="logo-youtube" size={20} color="#EF4444" />
                          <Text style={styles.cardTitle}>Example Clip</Text>
                       </View>
                       <View style={{ overflow: 'hidden', borderRadius: 8, backgroundColor: '#000' }}>
                          <YoutubePlayer height={200} play={playing} videoId={videoId} onChangeState={onStateChange} />
                       </View>
                    </View>
                  );
               }
               if (block.type === 'image') {
                  return (
                    <View key={index} style={styles.card}>
                      <Image source={{ uri: block.value }} style={styles.contentImage} resizeMode="contain" />
                    </View>
                  );
               }
               if (block.type === 'text') {
                  return (
                    <View key={index} style={styles.cardNoBorder}> 
                      <Text style={styles.contentText}>{block.value}</Text>
                    </View>
                  );
               }
               return null;
             })}

             <TouchableOpacity style={styles.finishButton} onPress={handleFinish}>
                <Text style={styles.finishButtonText}>Finish</Text>
             </TouchableOpacity>
           </>
        )}
        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' }, 
  
  header: {
      paddingTop: Platform.OS === 'android' ? 45 : 60,
      paddingBottom: 20, 
      paddingHorizontal: 20,
      backgroundColor: '#eec924', 
      flexDirection: 'row', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      borderBottomLeftRadius: 25, 
      borderBottomRightRadius: 25,
      elevation: 5, 
      minHeight: 100
  },
  
  backButton: { 
      padding: 5, 
      backgroundColor: 'rgba(255,255,255,0.2)', 
      borderRadius: 10 
  },
  
  headerTitle: { 
      fontSize: 16, 
      fontWeight: 'bold', 
      color: '#fff', 
      textAlign: 'center' 
  },
  
  headerSub: { 
      fontSize: 12, 
      color: '#FFEBEE', 
      textAlign: 'center', 
      marginTop: 4 
  },
  
  scrollContent: { paddingVertical: 20, paddingHorizontal: 20 },
  
  card: {
      backgroundColor: '#fff', borderRadius: 12, marginBottom: 20, padding: 10,
      borderWidth: 1, borderColor: '#eee', elevation: 2
  },
  cardNoBorder: {
      marginBottom: 20, padding: 5 
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#555' },
  contentImage: { width: '100%', height: 200 },
  contentText: { fontSize: 18, lineHeight: 28, color: '#333', textAlign: 'left' }, 
  
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 10 },

  finishButton: {
    backgroundColor: '#FFB74D', 
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
    elevation: 3
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  }
});