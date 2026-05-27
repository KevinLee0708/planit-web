import { db, auth } from "../firebase.js"; // 📌 상위 폴더의 firebase.js 상대경로
import { doc, getDoc, collection, setDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("write-form");
    
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("edit");
    const isEditMode = !!editId;

    const quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: '공지사항 본문을 입력하세요.',
        modules: { toolbar: [[{ 'size': ['small', false, 'large'] }], ['bold', 'italic', 'underline'], [{ 'color': [] }], ['clean']] }
    });

    // 1. 보안 가드 런타임
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            alert("로그인 정보가 필요합니다.");
            window.location.href = "/account/";
            return;
        }
        const userDoc = await getDoc(doc(db, "user", user.uid));
        if (!["staff", "admin", "owner"].includes(userDoc.data()?.role)) {
            alert("⚠️ 접근 권한이 없습니다.");
            // 🎯 [교정] 권한 없을 때 notice 목록(상위 폴더)으로 안전하게 튕기기
            window.location.href = "../";
        }
    });

    // 2. 🔄 수정 모드 데이터 복원 바인딩
    if (isEditMode) {
        const submitBtn = form?.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.innerText = "공지사항 수정완료";
        
        const mainTitle = document.querySelector(".write-title");
        if (mainTitle) mainTitle.innerText = "공지사항 수정하기";

        try {
            const noticeDocRef = doc(db, "notices", editId);
            const noticeSnap = await getDoc(noticeDocRef);

            if (noticeSnap.exists()) {
                const noticeData = noticeSnap.data();
                
                document.getElementById("field-title").value = noticeData.title || "";
                document.getElementById("field-important").checked = !!noticeData.important;
                
                if (noticeData.content) {
                    quill.root.innerHTML = noticeData.content;
                }
            } else {
                alert("존재하지 않거나 파기된 공지사항입니다.");
                // 🎯 [교정] 문서 없을 때 notice 목록(상위 폴더)으로 복귀
                window.location.href = "../";
            }
        } catch (err) {
            console.error("수정 바인딩 에러:", err);
        }
    }

    // 3. 서브밋 파이프라인
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("field-title").value.trim();
        const content = quill.root.innerHTML;
        const textLength = quill.getText().trim().length;
        const important = document.getElementById("field-important").checked;

        if (!title || textLength === 0) { 
            alert("제목과 내용을 모두 기입해 주세요."); 
            return; 
        }

        const submitBtn = form.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.disabled = true;

        try {
            const user = auth.currentUser;
            const userDoc = await getDoc(doc(db, "user", user.uid));
            const userData = userDoc.data();

            if (isEditMode) {
                // 🛠️ 수정 처리 분기
                const targetDocRef = doc(db, "notices", editId);
                
                await setDoc(targetDocRef, {
                    title: title,
                    content: content,
                    important: important,
                    updatedAt: new Date()
                }, { merge: true });

                alert("공지사항이 성공적으로 수정되었습니다.");
                
                // 🎯 [404 해결 픽스] 상대 경로(../)를 활용해 /community/notice/detail/ 구조로 정확하게 안착시킵니다.
                window.location.href = `../detail/?id=${editId}`;

            } else {
                // 📝 신규 등록 처리 분기
                const noticesRef = collection(db, "notices");
                const q = query(noticesRef, orderBy("id", "desc"), limit(1));
                const snap = await getDocs(q);
                
                let nextId = 1;
                if (!snap.empty) nextId = snap.docs[0].data().id + 1;

                await setDoc(doc(db, "notices", String(nextId)), {
                    id: nextId,
                    title: title,
                    content: content,
                    author: userData?.nickname || "운영진",
                    role: userData?.role || "staff",
                    important: important,
                    createdAt: new Date(),
                    views: 0
                });

                alert("공지사항이 안전하게 등록되었습니다.");
                
                // 🎯 [404 해결 픽스] 상위 폴더인 /community/notice/ 목록으로 깔끔하게 이동
                window.location.href = "../";
            }
        } catch (err) {
            console.error(err);
            alert("저장 오류가 발생했습니다.");
            if (submitBtn) submitBtn.disabled = false;
        }
    });
});