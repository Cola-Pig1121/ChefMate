document.addEventListener('DOMContentLoaded', function() {
    // 加载用户资料
    loadUserProfile();
    
    // 编辑资料按钮 - 移到前面确保优先执行
    const editButton = document.querySelector('.edit-profile');
    console.log('Edit button found:', editButton); // 调试信息
    if (editButton) {
        editButton.addEventListener('click', function(e) {
            console.log('Edit button clicked'); // 调试信息
            e.preventDefault();
            window.location.href = 'edit-profile.html';
        });
    } else {
        console.error('Edit button not found!');
    }
    
    // 初始化标签切换功能（如果存在的话）
    const tabItems = document.querySelectorAll('.section-tab');
    const contentContainer = document.querySelector('.collection-grid');
    
    // 模拟数据
    const userData = {
        notes: [
            {
                id: 1,
                title: '牛油果番茄沙拉',
                image: 'images/沙拉.jpeg',
                time: '40min',
                likes: '500+'
            },
            {
                id: 2,
                title: '糖醋排骨',
                image: 'images/排骨.jpg',
                time: '60min',
                likes: '800+'
            }
        ],
        favorites: [
            {
                id: 3,
                title: '牛油果番茄沙拉',
                image: 'images/沙拉.jpeg',
                time: '40min',
                likes: '500+'
            }
        ],
        likes: [
            {
                id: 4,
                title: '糖醋排骨',
                image: 'images/排骨.jpg',
                time: '60min',
                likes: '800+'
            }
        ]
    };
    
    // 切换标签功能（只有当元素存在时才执行）
    if (tabItems.length > 0 && contentContainer) {
        tabItems.forEach((tab, index) => {
            tab.addEventListener('click', function() {
                // 移除所有active状态
                tabItems.forEach(t => t.classList.remove('active'));
                // 添加active状态到当前标签
                tab.classList.add('active');
                
                // 根据选中的标签显示不同内容
                if (index === 0) {
                    renderItems(userData.notes, '笔记');
                } else if (index === 1) {
                    renderItems(userData.favorites, '收藏');
                } else if (index === 2) {
                    renderItems(userData.likes, '喜欢');
                }
            });
        });
        
        // 默认显示笔记标签内容
        renderItems(userData.notes, '笔记');
    }
    
    // 渲染内容项
    function renderItems(items, type) {
        if (!contentContainer) return; // 如果容器不存在就直接返回
        
        if (items.length === 0) {
            // 显示空状态
            contentContainer.innerHTML = `
                <div class="empty-state" style="grid-column: span 2;">
                    <img src="images/logo.svg" alt="暂无内容">
                    <p>暂无${type}，继续探索美食世界吧！</p>
                </div>
            `;
            return;
        }
        
        // 渲染项目列表
        let itemsHTML = '';
        items.forEach(item => {
            itemsHTML += `
                <div class="collection-item" onclick="window.location.href='recipe-detail.html?recipe=${item.id === 1 ? 'salad' : 'ribs'}'">
                    <div class="collection-image" style="background-image: url('${item.image}')"></div>
                    <div class="collection-info">
                        <div class="collection-name">${item.title}</div>
                        <div class="collection-meta">
                            <div class="meta-item">
                                <img src="images/time.svg" alt="时间">
                                <span>${item.time}</span>
                            </div>
                            <div class="meta-item">
                                <img src="images/likes.svg" alt="点赞">
                                <span>${item.likes}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        contentContainer.innerHTML = itemsHTML;
    }
    
    // 加载用户资料函数
    function loadUserProfile() {
        const defaultUserData = {
            username: 'Chef',
            phone: '00000000000',
            avatar: '../images/user_default.jpg'
        };
        
        const savedData = localStorage.getItem('chefmate_user_profile');
        const userData = savedData ? { ...defaultUserData, ...JSON.parse(savedData) } : defaultUserData;
        
        // 更新页面显示
        const profileName = document.querySelector('.profile-name');
        const profileEmail = document.querySelector('.profile-email');
        const profileAvatar = document.querySelector('.profile-avatar img');
        
        if (profileName) {
            profileName.textContent = userData.username || '未设置';
        }
        
        if (profileEmail) {
            profileEmail.textContent = userData.phone || userData.email || '未设置';
        }
        
        if (profileAvatar && userData.avatar) {
            profileAvatar.src = userData.avatar;
        }
    }
});

// 显示反馈功能
function showFeedback() {
    const feedbackOptions = [
        '功能建议',
        '问题反馈',
        '使用体验',
        '其他意见'
    ];
    
    let optionsHTML = feedbackOptions.map((option, index) => 
        `<button class="feedback-option" onclick="submitFeedback('${option}')">${option}</button>`
    ).join('');
    
    // 创建反馈弹窗
    const modal = document.createElement('div');
    modal.className = 'feedback-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeFeedbackModal()"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h3>意见反馈</h3>
                <button class="close-btn" onclick="closeFeedbackModal()">×</button>
            </div>
            <div class="modal-body">
                <p>请选择反馈类型：</p>
                <div class="feedback-options">
                    ${optionsHTML}
                </div>
                <textarea id="feedbackText" placeholder="请详细描述您的意见或建议..." rows="4"></textarea>
                <div class="modal-actions">
                    <button class="cancel-btn" onclick="closeFeedbackModal()">取消</button>
                    <button class="submit-btn" onclick="submitFeedbackText()">提交</button>
                </div>
            </div>
        </div>
    `;
    
    // 添加样式
    const style = document.createElement('style');
    style.textContent = `
        .feedback-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
        }
        
        .modal-content {
            background: white;
            border-radius: 15px;
            width: 90%;
            max-width: 400px;
            position: relative;
            animation: slideUp 0.3s ease-out;
        }
        
        @keyframes slideUp {
            from {
                opacity: 0;
                transform: translateY(50px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 20px 10px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .modal-header h3 {
            margin: 0;
            font-size: 18px;
            color: #333;
        }
        
        .close-btn {
            background: none;
            border: none;
            font-size: 24px;
            color: #999;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .modal-body p {
            margin: 0 0 15px;
            color: #666;
        }
        
        .feedback-options {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }
        
        .feedback-option {
            padding: 10px;
            border: 2px solid #f0f0f0;
            border-radius: 8px;
            background: white;
            color: #666;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .feedback-option:hover,
        .feedback-option.selected {
            border-color: #FFA242;
            color: #FFA242;
            background: rgba(255, 162, 66, 0.05);
        }
        
        #feedbackText {
            width: 100%;
            border: 2px solid #f0f0f0;
            border-radius: 8px;
            padding: 12px;
            font-size: 14px;
            resize: vertical;
            margin-bottom: 20px;
            font-family: inherit;
        }
        
        #feedbackText:focus {
            outline: none;
            border-color: #FFA242;
        }
        
        .modal-actions {
            display: flex;
            gap: 10px;
        }
        
        .cancel-btn,
        .submit-btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .cancel-btn {
            background: #f5f5f5;
            color: #666;
        }
        
        .cancel-btn:hover {
            background: #e0e0e0;
        }
        
        .submit-btn {
            background: #FFA242;
            color: white;
        }
        
        .submit-btn:hover {
            background: #ff9020;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // 选择反馈类型
    window.selectedFeedbackType = '';
    window.submitFeedback = function(type) {
        window.selectedFeedbackType = type;
        // 更新按钮状态
        document.querySelectorAll('.feedback-option').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.textContent === type) {
                btn.classList.add('selected');
            }
        });
    };
    
    // 提交反馈
    window.submitFeedbackText = function() {
        const feedbackText = document.getElementById('feedbackText').value.trim();
        const feedbackType = window.selectedFeedbackType;
        
        if (!feedbackType) {
            alert('请选择反馈类型');
            return;
        }
        
        if (!feedbackText) {
            alert('请输入反馈内容');
            return;
        }
        
        // 保存反馈到localStorage（实际应用中应该发送到服务器）
        const feedback = {
            type: feedbackType,
            content: feedbackText,
            timestamp: new Date().toISOString(),
            id: Date.now()
        };
        
        const existingFeedbacks = JSON.parse(localStorage.getItem('chefmate_feedbacks') || '[]');
        existingFeedbacks.push(feedback);
        localStorage.setItem('chefmate_feedbacks', JSON.stringify(existingFeedbacks));
        
        closeFeedbackModal();
        showToast('感谢您的反馈！我们会认真考虑您的建议。');
    };
    
    // 关闭弹窗
    window.closeFeedbackModal = function() {
        const modal = document.querySelector('.feedback-modal');
        const style = document.querySelector('style');
        if (modal) modal.remove();
        if (style) style.remove();
        
        // 清理全局函数
        delete window.selectedFeedbackType;
        delete window.submitFeedback;
        delete window.submitFeedbackText;
        delete window.closeFeedbackModal;
    };
}

// 显示提示消息
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 10001;
        animation: fadeInOut 3s ease-in-out;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInOut {
            0%, 100% { opacity: 0; }
            20%, 80% { opacity: 1; }
        }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
        if (style.parentNode) style.parentNode.removeChild(style);
    }, 3000);
} 