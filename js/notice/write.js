import { db, auth } from "../firebase.js"; // 📌 상위 폴더의 firebase.js 상대경로
import { doc, getDoc, collection, setDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("write-form");
    const editorContainer = document.getElementById("editor-container");
    
    // 🎯 글쓰기 전용 엘리먼트가 없으면 즉시 탈출 (다른 페이지에서 에러 터지는 것 방지)
    if (!form || !editorContainer) return;

    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get("edit");
    const isEditMode = !!editId;

    // 🛠️ 툴바 옵션에 'link' 버튼을 확실하게 추가했습니다.
    const quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: '공지사항 본문을 입력하세요.',
        modules: { 
            toolbar: [
                [{ 'size': ['small', false, 'large'] }], 
                ['bold', 'italic', 'underline'], 
                [{ 'color': [] }], 
                ['link'], // 🎯 여기에 링크 버튼(사슬 모양 아이콘)이 생성됩니다!
                ['clean']
            ] 
        }
    });

    // 1. 보안 가드 런타임
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            alert("로그인 정보가 필요합니다.");
            window.location.href = "../../account/"; 
            return;
        }
        const userDoc = await getDoc(doc(db, "user", user.uid));
        if (!["staff", "admin", "owner"].includes(userDoc.data()?.role)) {
            alert("⚠️ 접근 권한이 없습니다.");
            window.location.href = "../"; 
        }
    });

    // 2. 🔄 수정 모드 데이터 복원 바인딩
    if (isEditMode) {
        const submitBtn = form.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.innerText = "공지사항 수정완료";
        
        const mainTitle = document.querySelector(".write-title");
        if (mainTitle) mainTitle.innerText = "공지사항 수정하기";

        try {
            const noticeDocRef = doc(db, "notices", editId);
            const noticeSnap = await getDoc(noticeDocRef);

            if (noticeSnap.exists()) {
                const noticeData = noticeSnap.data();
                
                const fieldTitle = document.getElementById("field-title");
                const fieldImportant = document.getElementById("field-important");

                if (fieldTitle) fieldTitle.value = noticeData.title || "";
                if (fieldImportant) fieldImportant.checked = !!noticeData.important;
                
                if (noticeData.content) {
                    quill.root.innerHTML = noticeData.content;
                }
            } else {
                alert("존재하지 않거나 파기된 공지사항입니다.");
                window.location.href = "../";
            }
        } catch (err) {
            console.error("수정 바인딩 에러:", err);
        }
    }

    // 3. 서브밋 파이프라인
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const titleField = document.getElementById("field-title");
        const importantField = document.getElementById("field-important");

        const title = titleField ? titleField.value.trim() : "";
        const content = quill.root.innerHTML;
        const textLength = quill.getText().trim().length;
        const important = importantField ? importantField.checked : false;

        if (!title || textLength === 0) { 
            alert("제목과 내용을 모두 기입해 주세요."); 
            return; 
        }

        const submitBtn = form.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.disabled = true;

        try {
            const user = auth.currentUser;
            if (!user) {
                alert("인증 세션이 만료되었습니다. 다시 로그인해주세요.");
                if (submitBtn) submitBtn.disabled = false;
                return;
            }
            
            const userDoc = await getDoc(doc(db, "user", user.uid));
            const userData = userDoc.data();

            if (isEditMode) {
                const targetDocRef = doc(db, "notices", editId);
                
                await setDoc(targetDocRef, {
                    title: title,
                    content: content,
                    important: important,
                    updatedAt: new Date()
                }, { merge: true });

                alert("공지사항이 성공적으로 수정되었습니다.");
                window.location.href = `../detail/?id=${editId}`; 

            } else {
                const noticesRef = collection(db, "notices");
                const q = query(noticesRef, orderBy("id", "desc"), limit(1));
                const snap = await getDocs(q);
                
                let nextId = 1;
                if (!snap.empty) {
                    const maxId = snap.docs[0].data().id;
                    nextId = Number(maxId) ? maxId + 1 : 1;
                }

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
                window.location.href = "../"; 
            }
        } catch (err) {
            console.error(err);
            alert("저장 오류가 발생했습니다.");
            if (submitBtn) submitBtn.disabled = false;
        }
    });
});