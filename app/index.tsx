import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithCredential, GoogleAuthProvider, FacebookAuthProvider,signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebaseConfig'; 
import { FontAwesome } from '@expo/vector-icons';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Import Google Sign-In
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
// Import Facebook 
import { LoginManager, AccessToken} from 'react-native-fbsdk-next';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ตั้งค่า Google Sign-In
  useEffect(() => {
    GoogleSignin.configure({
      // ใช้ Web Client ID ตัวเดิมของท่าน
      webClientId: '1090408504482-ifffpt6uktl2ht3gngi82kqi6m79mll6.apps.googleusercontent.com', 
      offlineAccess: true,
    });
  }, []);

  // ฟังก์ชันล็อกอินด้วย Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (idToken) {
        // 1. ล็อกอินกับ Firebase
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;

        // 2. เช็คและบันทึกข้อมูลลง Database
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            nickname: user.displayName || "General User",
            email: user.email,
            role: "user",
            createdAt: new Date()
          });
          console.log("บันทึกข้อมูล User ใหม่เรียบร้อย");
        }

        
        router.replace("/tabs" as any); 
      }
    } catch (error: any) {
      console.log(error);
      if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Login Error', error.toString());
      }
    } finally {
      setLoading(false);
    }
  };


// ฟังก์ชันล็อกอินด้วย Facebook
  // ฟังก์ชันล็อกอินด้วย Facebook (ฉบับสมบูรณ์)
  const handleFacebookLogin = async () => {
    setLoading(true);
    try {
      // 1. เปิดหน้า Login ของ Facebook
      const result = await LoginManager.logInWithPermissions(["public_profile", "email"]);

      if (result.isCancelled) {
        console.log("Login cancelled");
        setLoading(false);
        return;
      }

      // 2. ดึง Token
      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        console.log("Something went wrong obtaining access token");
        setLoading(false);
        return;
      }

      // 3. สร้างตั๋วผ่านทาง (Credential)
      const credential = FacebookAuthProvider.credential(data.accessToken);

      // 4. ยื่นตั๋วให้ Firebase ตรวจ (Sign In)
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;
      console.log("Firebase Login Success:", user.uid);

      // 5. บันทึกข้อมูลลง Database (ถ้ามี)
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          nickname: user.displayName || "Facebook User",
          email: user.email,
          role: "user",
          createdAt: new Date()
         });
      }

      // 6. ผ่านฉลุย! ไปหน้าหลัก
      router.replace("/tabs" as any); 

    } catch (error: any) {
      console.log("Facebook Login Error: ", error);
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันล็อกอินด้วย Email 
  const handleLogin = async () => {
    if (!email || !password) { 
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูล'); 
      return; 
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // ไปหน้า Profile หรือ Tabs ตามปกติ
      router.replace("/tabs" as any);
    } catch (error: any) {
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', error.message);
    } finally {
      setLoading(false);
    }
  };





  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image source={require('../assets/images/logo.png')} style={styles.logoImage} resizeMode="contain"/>
          </View>
          <Text style={styles.subtitle}>Welcome to english learning app</Text>

          {/* ช่องกรอก Email/Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>อีเมล</Text>
            <TextInput style={styles.input} placeholder="example@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"/>
          </View>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>รหัสผ่าน</Text>
            <TextInput style={styles.input} placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry/>
          </View>

          {/* ปุ่ม Login Email */}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>}
          </TouchableOpacity>

          {/* เส้นขีดคั่น */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>หรือเข้าสู่ระบบด้วย</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ปุ่ม Social Login */}
          <View style={styles.socialContainer}>
            <TouchableOpacity 
              style={[styles.socialButton, { backgroundColor: '#DB4437' }]}
              onPress={handleGoogleLogin} 
              disabled={loading}
            >
              <FontAwesome name="google" size={20} color="white" style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.socialButton, { backgroundColor: '#4267B2' }]} onPress={handleFacebookLogin}>
              <FontAwesome name="facebook" size={20} color="white" style={styles.socialIcon} />
              <Text style={styles.socialButtonText}>Facebook</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={{marginTop: 25}} onPress={() => router.push('/register')}>
            <Text style={{color: '#666', textAlign: 'center'}}>
              ยังไม่มีบัญชีผู้ใช้? <Text style={{color: '#4CAF50', fontWeight: 'bold'}}>สมัครสมาชิก</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9F5' },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 30, paddingVertical: 40 },
  logoContainer: { alignSelf: 'center', width: 100, height: 100, backgroundColor: '#fff', borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 20, elevation: 5 },
  logoImage: { width: '100%', height: '100%' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 30 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, fontSize: 16, borderWidth: 1, borderColor: '#E0E0E0', color: '#333' },
  loginButton: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10, elevation: 4 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { marginHorizontal: 10, color: '#888', fontSize: 14 },
  socialContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
  socialButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, elevation: 2 },
  socialIcon: { marginRight: 10 },
  socialButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});