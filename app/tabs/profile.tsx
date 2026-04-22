// app/(tabs)/profile.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, ScrollView, Platform 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig'; 
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function ProfileScreen() {
  const router = useRouter();
  
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newNickname, setNewNickname] = useState("");

  // 1. ดึงข้อมูล User ปัจจุบัน
  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setUserData(docSnap.data());
          setNewNickname(docSnap.data().nickname || "");
        } else {
          // ถ้าไม่มีข้อมูลใน Database ให้ใช้ข้อมูลจาก Auth เบื้องต้น
          const fallbackData = { 
            nickname: user.displayName || "User", 
            email: user.email 
          };
          setUserData(fallbackData);
          setNewNickname(fallbackData.nickname);
        }
      } catch (e) {
        console.error("Error fetching user:", e);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // 2. ฟังก์ชันบันทึกการแก้ไข
  const handleSave = async () => {
    if (!newNickname.trim()) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกชื่อเล่น");
      return;
    }

    const user = auth.currentUser;
    if (user) {
      try {
        setLoading(true);
        await updateDoc(doc(db, "users", user.uid), {
          nickname: newNickname
        });
        
        // อัปเดต State ในหน้าจอ
        setUserData({ ...userData, nickname: newNickname });
        setIsEditing(false);
        Alert.alert("สำเร็จ", "บันทึกข้อมูลเรียบร้อยแล้ว");
      } catch (e) {
        Alert.alert("Error", "ไม่สามารถบันทึกข้อมูลได้");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "ออกจากระบบ",
      "คุณต้องการออกจากระบบใช่หรือไม่?",
      [
        { text: "ยกเลิก", style: "cancel" },
        { 
          text: "ยืนยัน", 
          style: "destructive",
          onPress: async () => {
            try {
              // 1. ออกจาก Google (สำคัญมาก! เพื่อให้ Login ใหม่ได้)
              try {
                await GoogleSignin.signOut();
              } catch (e) {
                console.log("Google SignOut Error:", e);
              }

              // 2. ออกจาก Firebase
              await signOut(auth);

              // 3. กลับไปหน้า Login
              router.replace('/'); 
            } catch (e) {
              console.error("Logout Error:", e);
            }
          }
        }
      ]
    );
  };

  if (loading && !userData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const firstLetter = userData?.nickname ? userData.nickname.charAt(0).toUpperCase() : "?";

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header Area */}
      <View style={styles.headerBackground}>
        <View style={styles.avatarContainer}>
             <Text style={styles.avatarText}>{firstLetter}</Text>
        </View>
        
        {/* ชื่อผู้ใช้ (โหมดแสดงผล vs โหมดแก้ไข) */}
        {isEditing ? (
          <View style={styles.editContainer}>
            <TextInput 
              style={styles.inputEdit}
              value={newNickname}
              onChangeText={setNewNickname}
              placeholder="กรอกชื่อเล่น"
              autoFocus
            />
          </View>
        ) : (
          <Text style={styles.name}>{userData?.nickname || "Guest"}</Text>
        )}
        
        <Text style={styles.email}>{userData?.email || auth.currentUser?.email}</Text>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.contentContainer}>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>การตั้งค่าบัญชี</Text>
          
          {/* ปุ่มแก้ไขข้อมูล */}
          {isEditing ? (
             <View style={{flexDirection: 'row', gap: 10}}>
                <TouchableOpacity style={[styles.menuItem, styles.saveButton]} onPress={handleSave}>
                  <Ionicons name="save-outline" size={22} color="#fff"  />
                  <Text style={[styles.menuText, {color: '#fff', fontWeight: 'bold', marginLeft: 7}]}>
                    บันทึก
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.menuItem, styles.cancelButton]} onPress={() => setIsEditing(false)}>
                  <Text style={[styles.menuText, {color: '#666', fontWeight: 'bold', marginLeft: 0}]}>ยกเลิก</Text>
                </TouchableOpacity>
             </View>
          ) : (
            <TouchableOpacity style={styles.menuItem} onPress={() => setIsEditing(true)}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={[styles.iconBox, {backgroundColor: '#E3F2FD'}]}>
                    <Ionicons name="person-outline" size={20} color="#1E88E5" />
                  </View>
                  <Text style={styles.menuText}>แก้ไขข้อมูลส่วนตัว</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          )}
           {/* ปุ่ม Logout */}
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={[styles.iconBox, {backgroundColor: '#FFEBEE'}]}>
                  <Ionicons name="log-out-outline" size={20} color="#E53935" />
                </View>
                <Text style={[styles.menuText, { color: '#E53935' }]}>ออกจากระบบ</Text>
              </View>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerBackground: {
    backgroundColor: '#4CAF50',
    paddingTop: Platform.OS === 'android' ? 60 : 70,
    paddingBottom: 40,
    alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: {width:0, height:2},
    marginBottom: 30
  },
  avatarContainer: {
    width: 100, height: 100, borderRadius: 50, 
    backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', marginBottom: 15,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)'
  },
  avatarText: { fontSize: 40, color: '#4CAF50', fontWeight: 'bold' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5 },
  email: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },

  contentContainer: { flex: 1, padding: 20, marginTop: -20 },
  section: { 
    backgroundColor: '#fff', borderRadius: 16, padding: 10, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: {width:0, height:2}, elevation: 2
  },
  sectionTitle: { 
    fontSize: 14, color: '#888', marginLeft: 10, marginTop: 10, marginBottom: 5, fontWeight: 'bold' 
  },
  menuItem: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' 
  },
  menuText: { fontSize: 16, color: '#333', marginLeft: 15 },
  iconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  // Edit Mode Styles
  editContainer: { width: '70%', marginBottom: 10 },
  inputEdit: { 
    backgroundColor: '#fff', borderRadius: 25, paddingVertical: 8, paddingHorizontal: 20,
    textAlign: 'center', fontSize: 18, color: '#333'
  },
  saveButton: { 
    flex: 2, backgroundColor: '#4CAF50', borderRadius: 10, justifyContent: 'center', 
    margin: 5, paddingVertical: 12, borderBottomWidth: 0
  },
  cancelButton: { 
    flex: 1, backgroundColor: '#f0f0f0', borderRadius: 10, justifyContent: 'center', 
    margin: 5, paddingVertical: 12, borderBottomWidth: 0 
  }
});