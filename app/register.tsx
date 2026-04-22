// app/register.tsx
import React, { useState } from 'react';
import { 
    View, Text, TextInput, TouchableOpacity, StyleSheet, 
    Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; 
import { auth, db } from '../firebaseConfig'; // ตรวจสอบ path ให้ถูกต้อง

export default function RegisterScreen() {
    const router = useRouter();

    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
    // 1. ตรวจสอบข้อมูลเบื้องต้น
    if (!email || !password || !nickname || !confirmPassword) {
        Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบทุกช่อง');
        return;
    }
    if (password !== confirmPassword) {
        Alert.alert('แจ้งเตือน', 'รหัสผ่านยืนยันไม่ตรงกัน');
        return;
    }
    if (password.length < 6) {
        Alert.alert('แจ้งเตือน', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
        return;
    }

    setLoading(true);
    try {
      // 2. สร้าง User ใน Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

      // 3. บันทึก "ชื่อเล่น" ลงฐานข้อมูล Firestore
        await setDoc(doc(db, "users", user.uid), {
        email: email,
        nickname: nickname,
        role: 'student', 
        createdAt: new Date().toISOString()
        });

      // 4. แจ้งเตือนและพาไปหน้าหลัก
        Alert.alert("สำเร็จ!", "สมัครสมาชิกเรียบร้อยแล้ว", [
        { text: "เริ่มใช้งาน", onPress: () => router.replace('/(tabs)' as any) }
        ]);

    } catch (error: any) {
        console.log(error);
        let msg = 'เกิดข้อผิดพลาด';
        if (error.code === 'auth/email-already-in-use') msg = 'อีเมลนี้มีผู้ใช้งานแล้ว';
        if (error.code === 'auth/invalid-email') msg = 'รูปแบบอีเมลไม่ถูกต้อง';
        Alert.alert('สมัครไม่สำเร็จ', msg);
    } finally {
        setLoading(false);
        }
    };

    return (
    <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
    >
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

          {/* โลโก้ (ใช้เหมือนหน้า Login) */}
            <View style={styles.logoContainer}>
            <Image 
                source={require('../assets/images/logo.png')} 
                style={styles.logoImage}
                resizeMode="contain"
            />
            </View>

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Welcome to english learning app</Text>

          {/* ฟอร์มกรอกข้อมูล */}
            <View style={styles.formSection}>
            
            <View style={styles.inputContainer}>
                <Text style={styles.label}>ชื่อเล่น (Nickname)</Text>
                <TextInput
                style={styles.input}
                placeholder="เช่น น้องอินอิน"
                value={nickname}
                onChangeText={setNickname}
                />
            </View>

            <View style={styles.inputContainer}>
                <Text style={styles.label}>อีเมล</Text>
                <TextInput
                style={styles.input}
                placeholder="example@email.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>รหัสผ่าน</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>ยืนยันรหัสผ่าน</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
              />
            </View>
          </View>

          {/* ปุ่มสมัครสมาชิก */}
          <TouchableOpacity 
            style={styles.registerButton} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>สมัครสมาชิก</Text>
            )}
          </TouchableOpacity>

          {/* ลิงก์กลับไปหน้า Login */}
          <TouchableOpacity 
            style={{ marginTop: 25, alignSelf: 'center' }} 
            onPress={() => router.back()} // กดแล้วย้อนกลับไป Login
          >
            <Text style={{ color: '#666' }}>
              มีบัญชีผู้ใช้แล้ว? <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>เข้าสู่ระบบ</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles เดียวกับ Login เป๊ะๆ
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9F5' }, // สีพื้นหลังเขียวอ่อนเหมือนกัน
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 30, paddingVertical: 40 },
  
  logoContainer: {
    alignSelf: 'center', width: 90, height: 90, backgroundColor: '#fff',
    borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    elevation: 5, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10,
    padding: 10
  },
  logoImage: { width: '100%', height: '100%' },
  
  title: { fontSize: 26, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  
  formSection: { marginBottom: 10 },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
    fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', color: '#333',
  },
  
  registerButton: {
    backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10,
    elevation: 4, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
  },
  registerButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});