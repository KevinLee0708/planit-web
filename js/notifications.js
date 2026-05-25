/**
 * Planit Realtime Notification Listener & Component UI Injection Architecture Engine
 * [SPECIFICATION PERFECT COMPLIANCE]
 * - Firestore Security Rules인 'user/{uid}' 경로 표준을 완벽히 준수하도록 수정 완료.
 */
import { db, auth } from "./firebase.js";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 함수 및 스냅샷 순회에서 공유할 글로벌 캐시 배열 전역 선언
let cachedNotificationArray = []; 

// 글로벌 브로드캐스트 토스트 함수 수출용 선언
export function triggerToastNotification(title, message) {
    const hub = document.getElementById('toast-center-hub');
    if (!hub) return;

    const unit = document.createElement('div');
    unit.className = 'toast-unit';
    unit.innerHTML = `
        <div class="toast-head">${title}</div>
        <div class="toast-body">${message}</div>
    `;

    hub.appendChild(unit);

    // 딜레이 프레임 렌더링 후 가시성 큐 처리
    setTimeout(() => unit.classList.add('visible'), 50);

    // 4.5초 유지 후 자동 디졸브 파기 프로세스
    setTimeout(() => {
        unit.classList.remove('visible');
        setTimeout(() => unit.remove(), 400);
    }, 4500);
}

document.addEventListener("DOMContentLoaded", () => {
    const notiWrapper = document.getElementById("notification-wrapper");
    const notiTrigger = document.getElementById("noti-trigger");
    const notiDropdown = document.getElementById("noti-dropdown-layer");
    const notiBadgeCount = document.getElementById("noti-badge-count");
    const notiListContainer = document.getElementById("noti-list-container");
    const notiClearAll = document.getElementById("noti-clear-all");

    // 알림창 레이어 토글 제어
    if (notiTrigger && notiDropdown) {
        notiTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            
            // 현재 열려있는지 확인 후 토글 제어
            if (notiDropdown.style.display === "none" || notiDropdown.style.display === "") {
                notiDropdown.style.display = "block";
                if(notiWrapper) notiWrapper.classList.add("active");
            } else {
                notiDropdown.style.display = "none";
                if(notiWrapper) notiWrapper.classList.remove("active");
            }
        });
    }

    // 바깥 영역 클릭 시 알림창 닫기
    document.addEventListener("click", (e) => {
        if (notiWrapper && !notiWrapper.contains(e.target)) {
            if (notiDropdown) notiDropdown.style.display = "none";
            notiWrapper.classList.remove("active");
        }
    });

    // 파이어베이스 런타임 수신 리스너 초기화 분기
    auth.onAuthStateChanged((user) => {
        if (user) {
            initRealtimeNotificationEngine(user.uid);
        } else {
            resetNotificationInterface();
        }
    });

    // 🛠️ [실시간 리스너]: 🔥 user/{uid}/notifications 컬렉션 트래킹 (보안 규칙과 동기화 완료)
    function initRealtimeNotificationEngine(uid) {
        // 기존 "users" 대격변 에러 원인을 단수형 "user"로 매핑 수정하여 권한 블로킹을 우회합니다.
        const notiRef = collection(db, "user", uid, "notifications");
        const q = query(notiRef, orderBy("createdAt", "desc"));

        onSnapshot(q, (snapshot) => {
            let unreadCounter = 0;
            cachedNotificationArray = []; // 상단에 전역 선언된 배열 초기화 매핑
            
            // 데이터 추출 순회 공정
            snapshot.forEach((doc) => {
                const data = doc.data();
                cachedNotificationArray.push({ id: doc.id, ...data });
                if (!data.read) unreadCounter++;
            });

            // [신규 유입 확인 공정]: 수신 데이터 개수가 늘어났을 때만 최신 건 토스트 노출
            if (snapshot.docChanges().length > 0) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added" && snapshot.metadata.hasPendingWrites === false) {
                        const newAlert = change.doc.data();
                        triggerToastNotification(newAlert.title || "새 알림", newAlert.message || "");
                    }
                });
            }

            updateInterfaceView(unreadCounter);
        }, (error) => {
            console.error("Firestore live session sync pipeline blocked:", error);
        });
    }

    // 인터페이스 뷰포트 레이아웃 갱신
    function updateInterfaceView(unreadCount) {
        if (notiBadgeCount) {
            notiBadgeCount.innerText = unreadCount;
            notiBadgeCount.classList.toggle('active', unreadCount > 0);
        }

        if (!notiListContainer) return;

        if (cachedNotificationArray.length === 0) {
            notiListContainer.innerHTML = `<li class="noti-empty" style="color: #626975; font-size: 0.85rem; text-align: center; padding: 32px 0; font-weight: 500;">새로운 알림이 없습니다.</li>`;
            return;
        }

        // 컨테이너 초기화 후 바인딩
        notiListContainer.innerHTML = "";
        cachedNotificationArray.forEach((noti) => {
            const li = document.createElement('li');
            li.className = `noti-item ${noti.read ? '' : 'unread'}`;
            
            // 가상 시간 포맷터 연산
            const dateStr = noti.createdAt?.seconds 
                ? new Date(noti.createdAt.seconds * 1000).toLocaleDateString()
                : "방금 전";

            li.innerHTML = `
                <div class="noti-item-title">${noti.title || '알림'}</div>
                <div class="noti-item-msg">${noti.message || ''}</div>
                <span class="noti-item-time">${dateStr}</span>
            `;

            // 클릭 시 읽음 패치 트랙 바인딩
            li.addEventListener('click', async () => {
                if (!noti.read) {
                    await markAsReadSingleItem(noti.id);
                }
                if (noti.link) {
                    window.location.href = noti.link;
                }
            });

            notiListContainer.appendChild(li);
        });
    }

    // 단일 항목 마크 리드 트랜잭션 함수 (🔥 "user" 경로로 전면 수정)
    async function markAsReadSingleItem(docId) {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        try {
            const targetDocRef = doc(db, "user", uid, "notifications", docId);
            await updateDoc(targetDocRef, { read: true });
        } catch (err) {
            console.error("Single mark read logic failed:", err);
        }
    }

    // 일괄 읽음 처리 (Mark all as read - 🔥 "user" 경로로 전면 수정)
    if (notiClearAll) {
        notiClearAll.addEventListener('click', async () => {
            const uid = auth.currentUser?.uid;
            if (!uid || cachedNotificationArray.length === 0) return;

            try {
                // 상용 대역폭 성능 안정성을 위해 일괄 병렬 업데이트 트랙 구동
                const updatePromises = cachedNotificationArray
                    .filter(item => !item.read)
                    .map(item => {
                        const targetDocRef = doc(db, "user", uid, "notifications", item.id);
                        return updateDoc(targetDocRef, { read: true });
                    });

                if (updatePromises.length > 0) {
                    await Promise.all(updatePromises);
                }
                triggerToastNotification("일괄 완료", "모든 알림을 읽음 처리했습니다.");
            } catch (err) {
                console.error("Batch clearance implementation error:", err);
            }
        });
    }

    function resetNotificationInterface() {
        if (notiBadgeCount) notiBadgeCount.classList.remove('active');
        if (notiListContainer) notiListContainer.innerHTML = `<li class="noti-empty">로그인이 필요합니다.</li>`;
    }
});