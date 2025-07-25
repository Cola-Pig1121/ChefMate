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
            username: 'Aion',
            phone: '186****3779',
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
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