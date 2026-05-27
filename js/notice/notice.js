import { db, auth } from "../firebase.js"; // 📌 상위 폴더의 firebase.js 상대경로
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, increment, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 🎯 경로 체크 시스템 정밀화
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
                
                // 🎯 목록(/notice/)에서 상세(/notice/detail/)로 이동하는 상대경로 매핑
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
            document.title = `Planit - ${data.title}`;

            // 렌더링 동기화 후 DB 카운트 가산 구조로 리팩토링 (트래픽 중복 가산 제어)
            document.getElementById("view-title").innerText = data.title;
            document.getElementById("view-author").innerText = data.author;
            document.getElementById("view-count").innerText = `조회수 ${data.views || 0}`;
            document.getElementById("view-content").innerHTML = data.content;
            
            if (data.important) {
                const badgeTarget = document.getElementById("badge-target");
                if (badgeTarget) badgeTarget.innerHTML = `<span class="badge-important">중요</span>`;
            }

            const dateStr = data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : "방금 전";
            document.getElementById("view-date").innerText = dateStr;

            // 백엔드 어싱크 조회수 업데이트 진행
            await updateDoc(docRef, { views: increment(1) });

            // 🛠️ 어드민 컨트롤러 안전 결합 파이프
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    const userDoc = await getDoc(doc(db, "user", user.uid));
                    if (["staff", "admin", "owner"].includes(userDoc.data()?.role)) {
                        
                        let controlBox = document.getElementById("admin-control-box");
                        if (!controlBox) {
                            controlBox = document.createElement("div");
                            controlBox.id = "admin-control-box";
                            document.getElementById("view-content").after(controlBox);
                        }

                        controlBox.style.cssText = "display: flex; gap: 10px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.08);";
                        controlBox.innerHTML = `
                            <button type="button" id="btn-notice-edit" style="padding: 10px 20px; background: #00F0FF; color: #030509; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">수정하기</button>
                            <button type="button" id="btn-notice-delete" style="padding: 10px 20px; background: transparent; color: #FF4B4B; border: 1px solid #FF4B4B; border-radius: 6px; font-weight: 700; cursor: pointer;">삭제하기</button>
                        `;

                        // 🎯 상세 페이지(/notice/detail/)에서 작성 폼(/notice/write/)으로 전환하는 브릿지 연산
                        document.getElementById("btn-notice-edit")?.addEventListener("click", () => {
                            window.location.href = `../write/?edit=${idParam}`;
                        });

                        document.getElementById("btn-notice-delete")?.addEventListener("click", async () => {
                            if (confirm("이 공지사항을 정말 파기하시겠습니까?")) {
                                try {
                                    await deleteDoc(doc(db, "notices", idParam));
                                    alert("공지사항이 파기되었습니다.");
                                    window.location.href = "../";
                                    return;
                                } catch (err) {
                                    console.error(err);
                                    alert("삭제 중 오류가 발생했습니다.");
                                }
                            }
                        });
                    }
                }
            });

            // 체인 내비게이션 엔진 구동
            await loadNavLinks(data.id);
        } catch (e) {
            console.error(e);
        }

        async function loadNavLinks(currentId) {
            try {
                const q = query(collection(db, "notices"), orderBy("id", "asc"));
                const snap = await getDocs(q);
                let list = [];
                snap.forEach(d => list.push(d.data()));
                
                const index = list.findIndex(item => Number(item.id) === Number(currentId));

                // 🎯 이전글/다음글 클릭 시 동일 뎁스 디렉토리 세션(?id=) 안에서 루프 돌도록 안전 치환
                if (index > 0) {
                    const prev = list[index - 1];
                    document.getElementById("prev-link").innerText = prev.title;
                    const rowPrev = document.getElementById("row-prev");
                    rowPrev.style.cursor = "pointer";
                    rowPrev.onclick = () => { window.location.href = `?id=${prev.id}`; };
                } else {
                    document.getElementById("prev-link").innerText = "이전 글이 없습니다.";
                    document.getElementById("row-prev").style.cursor = "default";
                    document.getElementById("row-prev").onclick = null;
                }
                
                if (index < list.length - 1 && index !== -1) {
                    const next = list[index + 1];
                    document.getElementById("next-link").innerText = next.title;
                    const rowNext = document.getElementById("row-next");
                    rowNext.style.cursor = "pointer";
                    rowNext.onclick = () => { window.location.href = `?id=${next.id}`; };
                } else {
                    document.getElementById("next-link").innerText = "다음 글이 없습니다.";
                    document.getElementById("row-next").style.cursor = "default";
                    document.getElementById("row-next").onclick = null;
                }
            } catch (err) {
                console.error("네비게이션 로드 실패:", err);
            }
        }
    }
});