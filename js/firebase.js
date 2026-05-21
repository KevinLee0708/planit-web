/**
 * Planit — Firebase Initialization Configuration
 * [FIX] Firestore(db) 인스턴스 초기화 및 export 구문 누락 보완
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// 1. 🔥 Firestore 라이브러리 임포트 추가
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 본인의 파이어베이스 프로젝트 키값 세팅 대입 영

// 2. Firebase Core App 초기화
const app = initializeApp(firebaseConfig);

// 3. 인스턴스 생성 및 모듈별 내보내기(Export)
export const auth = getAuth(app);
export const db = getFirestore(app); // 🔥 [핵심] 여기서 'db'라는 이름으로 명확히 export 해주어야 auth.js가 읽을 수 있습니다.
