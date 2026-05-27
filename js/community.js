import { db, auth } from "./firebase.js";
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    const isDetailPage = window.location.pathname.includes("/notice/detail/");

    if (!isDetailPage) {
        /* ==========================================================
           A. 공지사항 목록(List) 제어 파트
           ========================================================== */
        const listContainer = document.getElementById("notice-list-container");
        const writeBtn = document.getElementById("admin-write-btn");
        const searchInput = document.getElementById("notice-search");
        let allNotices = [];

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const userDoc = await getDoc(doc(db, "user", user.uid));
                if (["staff", "admin", "owner"].includes(userDoc.data()?.role)) {
                    if (writeBtn) writeBtn.style.display = "block";
                }
            }
        });

        try {
            const q = query(collection(db, "notices"), orderBy("important", "desc"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            allNotices = [];
            querySnapshot.forEach(doc => allNotices.push({ id: doc.id, ...doc.data() }));
            renderList(allNotices);
        } catch (err) {
            console.error(err);
            if (listContainer) listContainer.innerHTML = `<li class="notice-empty">공지를 불러올 수 없습니다.</li>`;
        }

        function renderList(data) {
            if (!listContainer) return;
            listContainer.innerHTML = "";
            if (data.length === 0) {
                listContainer.innerHTML = `<li class="notice-empty">등록된 공지사항이 없습니다.</li>`;
                return;
            }
            data.forEach(notice => {
                const li = document.createElement("li");
                li.className = `notice-row ${notice.important ? 'is-important' : ''}`;
                const date = notice.createdAt?.seconds ? new Date(notice.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : "방금 전";

                li.innerHTML = `
                    <div class="col-title">
                        ${notice.important ? '<span class="badge-important">중요</span>' : ''}
                        <span class="title-text">${notice.title}</span>
                    </div>
                    <div class="col-author">${notice.author}</div>
                    <div class="col-date">${date}</div>
                    <div class="col-views">${notice.views || 0}</div>
                `;
                
                li.addEventListener("click", () => {
                    window.location.href = `./detail/?id=${notice.id}`;
                });
                listContainer.appendChild(li);
            });
        }

        searchInput?.addEventListener("input", (e) => {
            const kw = e.target.value.toLowerCase();
            const filtered = allNotices.filter(n => n.title.toLowerCase().includes(kw) || n.content.toLowerCase().includes(kw));
            renderList(filtered);
        });

    } else {
        /* ==========================================================
           B. 공지사항 상세 보기(Detail) 제어 파트
           ========================================================== */
        const urlParams = new URLSearchParams(window.location.search);
        const idParam = urlParams.get("id");

        if (!idParam) {
            window.location.href = "../";
            return;
        }

        try {
            const docRef = doc(db, "notices", idParam);
            const snap = await getDoc(docRef);
            if (!snap.exists()) {
                alert("존재하지 않는 공지사항입니다.");
                window.location.href = "../";
                return;
            }

            const data = snap.data();
            
            // 🎯 브라우저 상단 탭 타이틀을 공지 제목으로 커스텀 변경
            document.title = `Planit - ${data.title}`;

            // 조회수 1 트랜잭션 증가 업로드
            await updateDoc(docRef, { views: increment(1) });

            // DOM 바인딩
            document.getElementById("view-title").innerText = data.title;
            document.getElementById("view-author").innerText = data.author;
            document.getElementById("view-count").innerText = `조회수 ${data.views + 1}`;
            document.getElementById("view-content").innerHTML = data.content;
            
            if (data.important) {
                document.getElementById("badge-target").innerHTML = `<span class="badge-important">중요</span>`;
            }

            const dateStr = data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : "방금 전";
            document.getElementById("view-date").innerText = dateStr;

            // 체인 내비게이션 엔진 구동
            loadNavLinks(data.id);
        } catch (e) {
            console.error(e);
        }

        async function loadNavLinks(currentId) {
            const q = query(collection(db, "notices"), orderBy("id", "asc"));
            const snap = await getDocs(q);
            let list = [];
            snap.forEach(d => list.push(d.data()));
            const index = list.findIndex(item => item.id === Number(currentId));

            // 🔥 버그 픽스: 이전글/다음글 링크 이동 경로가 누적 갱신되지 않도록 절대 주소 세팅
            if (index > 0) {
                const prev = list[index - 1];
                document.getElementById("prev-link").innerText = prev.title;
                document.getElementById("row-prev").style.cursor = "pointer";
                document.getElementById("row-prev").addEventListener("click", () => {
                    window.location.href = `/community/notice/detail/?id=${prev.id}`;
                });
            }
            if (index < list.length - 1 && index !== -1) {
                const next = list[index + 1];
                document.getElementById("next-link").innerText = next.title;
                document.getElementById("row-next").style.cursor = "pointer";
                document.getElementById("row-next").addEventListener("click", () => {
                    window.location.href = `/community/notice/detail/?id=${next.id}`;
                });
            }
        }
    }
});