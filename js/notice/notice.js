import { db, auth } from "../firebase.js"; // 📌 상위 폴더의 firebase.js 상대경로
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, increment, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
    
    // 🎯 상세 보기용 본문 엘리먼트 존재 여부로 확실하게 페이지 판별
    const viewContent = document.getElementById("view-content");
    const isDetailPage = (viewContent !== null);

    if (!isDetailPage) {
        /* ==========================================================
           A. 공지사항 목록(List) 제어 파트
           ========================================================== */
        const listContainer = document.getElementById("notice-list-container");
        const writeBtn = document.getElementById("admin-write-btn");
        const searchInput = document.getElementById("notice-search");
        let allNotices = [];

        if (!listContainer) return; 

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await getDoc(doc(db, "user", user.uid));
                    if (userDoc.exists() && ["staff", "admin", "owner"].includes(userDoc.data()?.role)) {
                        if (writeBtn) writeBtn.style.display = "block";
                    }
                } catch (e) {
                    console.error("권한 확인 실패:", e);
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
                    <div class="col-author">${notice.author || "관리자"}</div>
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
            const filtered = allNotices.filter(n => 
                (n.title && n.title.toLowerCase().includes(kw)) || 
                (n.content && n.content.toLowerCase().includes(kw))
            );
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
            
            // 🛑 [수정] 존재하지 않는 공지사항(404) 감지 시 프리미엄 에러 스크린 렌더링
            if (!snap.exists()) {
                document.title = "Planit - 페이지를 찾을 수 없습니다";
                
                const viewTitle = document.getElementById("view-title");
                if (viewTitle) viewTitle.innerText = "404 Not Found";
                
                // 조회수, 작성자 레이아웃이 있는 메타 구역 미관상 초기화
                const viewMeta = document.querySelector(".view-meta");
                if (viewMeta) viewMeta.style.display = "none";

                // 하단 이전글/다음글 네비게이션 박스 숨김 처리
                const navBox = document.querySelector(".nav-prev-next");
                if (navBox) navBox.style.display = "none";

                // 프리미엄 다크테마 404 카드 삽입
                viewContent.innerHTML = `
                    <div class="error-404-container">
                        <div class="error-404-icon">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                        <h2 class="error-404-title">존재하지 않는 공지사항입니다</h2>
                        <p class="error-404-desc">
                            찾으시는 게시글이 파기되었거나, 링크 주소가 올바르지 않습니다.<br>
                            잠시 후 공지사항 목록 화면으로 자동 이동합니다.
                        </p>
                        <a href="../" class="btn-error-home">공지사항 목록으로 돌아가기</a>
                    </div>
                `;
                viewContent.style.cssText = "pointer-events: auto !important;";
                
                // 5초 후 리다이렉트 타이머 작동
                setTimeout(() => {
                    window.location.href = "../";
                }, 5000);
                return;
            }

            const data = snap.data();
            document.title = `Planit - ${data.title}`;

            const viewTitle = document.getElementById("view-title");
            const viewAuthor = document.getElementById("view-author");
            const viewCount = document.getElementById("view-count");
            const viewDate = document.getElementById("view-date");

            if (viewTitle) viewTitle.innerText = data.title;
            if (viewAuthor) viewAuthor.innerText = data.author || "관리자";
            if (viewCount) viewCount.innerText = `조회수 ${data.views || 0}`;
            
            // 🔓 [기능 추가] 생 텍스트 URL 링크 자동 파싱 변환 엔진
            let rawContent = data.content || "";
            const urlRegex = /(?<=>)(https?:\/\/[^\s<]+)(?=<)/gi;
            rawContent = rawContent.replace(urlRegex, (url) => {
                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
            });

            // 변환 완료된 데이터를 본문에 삽입
            viewContent.innerHTML = rawContent;
            viewContent.style.cssText = "user-select: text !important; pointer-events: auto !important;";

            // 🎯 본문 내부 에디터 링크/하이퍼링크 강제 라우팅 수복 파트
            setTimeout(() => {
                const bodyLinks = viewContent.querySelectorAll("a");
                bodyLinks.forEach(link => {
                    link.style.cssText = "position: relative !important; z-index: 9999 !important; pointer-events: auto !important; cursor: pointer !important; color: #00F0FF !important; text-decoration: underline !important; display: inline !important; word-break: break-all !important;";
                    link.setAttribute("target", "_blank");
                    link.setAttribute("rel", "noopener noreferrer");
                    
                    link.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const href = link.getAttribute("href");
                        if (href) {
                            window.open(href, '_blank', 'noopener,noreferrer');
                        }
                        return false;
                    };
                });
            }, 150);
            
            if (data.important) {
                const badgeTarget = document.getElementById("badge-target");
                if (badgeTarget) badgeTarget.innerHTML = `<span class="badge-important">중요</span>`;
            }

            const dateStr = data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleDateString('ko-KR') : "방금 전";
            if (viewDate) viewDate.innerText = dateStr;

            // 조회수 업데이트
            await updateDoc(docRef, { views: increment(1) });

            // 어드민 제어 박스 노출 파트
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    const userDoc = await getDoc(doc(db, "user", user.uid));
                    if (userDoc.exists() && ["staff", "admin", "owner"].includes(userDoc.data()?.role)) {
                        
                        let controlBox = document.getElementById("admin-control-box");
                        if (!controlBox) {
                            controlBox = document.createElement("div");
                            controlBox.id = "admin-control-box";
                            viewContent.after(controlBox);
                        }

                        if (controlBox) {
                            controlBox.style.cssText = "display: flex; gap: 10px; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.08);";
                            controlBox.innerHTML = `
                                <button type="button" id="btn-notice-edit" style="padding: 10px 20px; background: #00F0FF; color: #030509; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">수정하기</button>
                                <button type="button" id="btn-notice-delete" style="padding: 10px 20px; background: transparent; color: #FF4B4B; border: 1px solid #FF4B4B; border-radius: 6px; font-weight: 700; cursor: pointer;">삭제하기</button>
                            `;

                            document.getElementById("btn-notice-edit")?.addEventListener("click", () => {
                                window.location.href = `../write/?edit=${idParam}`;
                            });

                            document.getElementById("btn-notice-delete")?.addEventListener("click", async () => {
                                if (confirm("이 공지사항을 정말 파기하시겠습니까?")) {
                                    try {
                                        await deleteDoc(doc(db, "notices", idParam));
                                        alert("공지사항이 파기되었습니다.");
                                        window.location.href = "../";
                                    } catch (err) {
                                        console.error(err);
                                        alert("삭제 중 오류가 발생했습니다.");
                                    }
                                }
                            });
                        }
                    }
                }
            });

            // 네비게이션 링크 로드 실행
            await loadNavLinks(idParam);
        } catch (e) {
            console.error("데이터 로드 중 에러 발생:", e);
        }

        async function loadNavLinks(currentId) {
            try {
                const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);
                let list = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                
                const index = list.findIndex(item => item.id === currentId);

                const prevLink = document.getElementById("prev-link");
                const nextLink = document.getElementById("next-link");

                if (index > 0) {
                    const nextNotice = list[index - 1];
                    if (nextLink) {
                        nextLink.innerHTML = `<a href="?id=${nextNotice.id}" style="color: inherit; text-decoration: none; display: block; width: 100%;">${nextNotice.title}</a>`;
                    }
                } else {
                    if (nextLink) nextLink.innerText = "다음 글이 없습니다.";
                }
                
                if (index !== -1 && index < list.length - 1) {
                    const prevNotice = list[index + 1];
                    if (prevLink) {
                        prevLink.innerHTML = `<a href="?id=${prevNotice.id}" style="color: inherit; text-decoration: none; display: block; width: 100%;">${prevNotice.title}</a>`;
                    }
                } else {
                    if (prevLink) prevLink.innerText = "이전 글이 없습니다.";
                }
            } catch (err) {
                console.error("네비게이션 로드 실패:", err);
            }
        }
    }
});