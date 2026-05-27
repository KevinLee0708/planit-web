/**
 * Planit Realtime Notification Listener & Component UI Injection Architecture Engine
 */
import { db, auth } from "./firebase.js"; // 🎯 [경로 보정]: 공통 js 폴더 위치 기준으로 상위 매핑 확인
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let cachedNotificationArray = []; 

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

    setTimeout(() => unit.classList.add('visible'), 50);
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

    if (notiTrigger && notiDropdown) {
        notiTrigger.style.cursor = "pointer"; // 마우스 호버 시 포인터 강제 부여
        
        notiTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            
            // 🎯 [토글 버그 완벽 제어]: 계산된 스타일을 읽어와서 토글 처리 안전성 보장
            const currentDisplay = window.getComputedStyle(notiDropdown).display;
            if (currentDisplay === "none") {
                notiDropdown.style.setProperty("display", "block", "important");
                if(notiWrapper) notiWrapper.classList.add("active");
            } else {
                notiDropdown.style.setProperty("display", "none", "important");
                if(notiWrapper) notiWrapper.classList.remove("active");
            }
        });
    }

    document.addEventListener("click", (e) => {
        if (notiWrapper && !notiWrapper.contains(e.target)) {
            if (notiDropdown) notiDropdown.style.setProperty("display", "none");
            notiWrapper.classList.remove("active");
        }
    });

    auth.onAuthStateChanged((user) => {
        if (user) {
            initRealtimeNotificationEngine(user.uid);
        } else {
            resetNotificationInterface();
        }
    });

    function initRealtimeNotificationEngine(uid) {
        const notiRef = collection(db, "user", uid, "notifications");
        const q = query(notiRef, orderBy("createdAt", "desc"));

        onSnapshot(q, (snapshot) => {
            let unreadCounter = 0;
            cachedNotificationArray = []; 
            
            snapshot.forEach((doc) => {
                const data = doc.data();
                cachedNotificationArray.push({ id: doc.id, ...data });
                if (!data.read) unreadCounter++;
            });

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
            console.error("Firestore sync blocked:", error);
        });
    }

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

        notiListContainer.innerHTML = "";
        cachedNotificationArray.forEach((noti) => {
            const li = document.createElement('li');
            li.className = `noti-item ${noti.read ? '' : 'unread'}`;
            
            const dateStr = noti.createdAt?.seconds 
                ? new Date(noti.createdAt.seconds * 1000).toLocaleDateString()
                : "방금 전";

            li.innerHTML = `
                <div class="noti-item-title" style="font-weight: 700; color: #fff; font-size: 0.85rem;">${noti.title || '알림'}</div>
                <div class="noti-item-msg" style="color: #8A919E; font-size: 0.8rem; margin-top: 2px;">${noti.message || ''}</div>
                <span class="noti-item-time" style="color: #626975; font-size: 0.7rem; display: block; margin-top: 4px;">${dateStr}</span>
            `;

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

    async function markAsReadSingleItem(docId) {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        try {
            const targetDocRef = doc(db, "user", uid, "notifications", docId);
            await updateDoc(targetDocRef, { read: true });
        } catch (err) {
            console.error(err);
        }
    }

    if (notiClearAll) {
        notiClearAll.addEventListener('click', async () => {
            const uid = auth.currentUser?.uid;
            if (!uid || cachedNotificationArray.length === 0) return;

            try {
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
                console.error(err);
            }
        });
    }

    function resetNotificationInterface() {
        if (notiBadgeCount) notiBadgeCount.classList.remove('active');
        if (notiListContainer) notiListContainer.innerHTML = `<li class="noti-empty" style="color: #626975; font-size: 0.85rem; text-align: center; padding: 24px 0;">로그인이 필요합니다.</li>`;
    }
});