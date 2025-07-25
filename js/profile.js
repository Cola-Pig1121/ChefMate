document.addEventListener('DOMContentLoaded', function() {
    // 初始化标签切换功能
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
    
    // 切换标签功能
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
    
    // 渲染内容项
    function renderItems(items, type) {
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
    
    // 默认显示笔记标签内容
    renderItems(userData.notes, '笔记');
    
    // 编辑资料按钮
    const editButton = document.querySelector('.edit-profile');
    if (editButton) {
        editButton.addEventListener('click', function() {
            alert('编辑资料功能即将上线，敬请期待！');
        });
    }
}); 