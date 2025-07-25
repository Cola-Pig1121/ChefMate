// 收藏页面功能
document.addEventListener('DOMContentLoaded', function() {
    const categoryTabs = document.querySelectorAll('.tab');
    const favoritesList = document.getElementById('favoritesList');
    const emptyState = document.getElementById('emptyState');
    
    let currentCategory = 'all';
    
    // 默认收藏数据（示例）
    const defaultFavorites = [
        {
            id: 'recipe_1',
            type: 'recipes',
            title: '牛油果番茄沙拉',
            image: 'images/沙拉.jpeg',
            time: '40min',
            likes: '500+',
            category: '健康轻食',
            addedTime: Date.now() - 86400000 // 1天前
        },
        {
            id: 'recipe_2',
            type: 'recipes',
            title: '糖醋排骨',
            image: 'images/排骨.jpg',
            time: '60min',
            likes: '800+',
            category: '家常菜',
            addedTime: Date.now() - 172800000 // 2天前
        }
    ];

    // 初始化
    init();

    function init() {
        // 确保有默认收藏数据
        const favorites = getFavorites();
        if (favorites.length === 0) {
            localStorage.setItem('chefmate_favorites', JSON.stringify(defaultFavorites));
        }
        
        bindEvents();
        loadFavorites();
    }

    function bindEvents() {
        // 分类标签点击事件
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // 移除所有active状态
                categoryTabs.forEach(t => t.classList.remove('active'));
                // 添加active状态到当前标签
                this.classList.add('active');
                
                currentCategory = this.dataset.category;
                loadFavorites();
            });
        });
    }

    // 获取收藏数据
    function getFavorites() {
        const favorites = localStorage.getItem('chefmate_favorites');
        return favorites ? JSON.parse(favorites) : [];
    }

    // 保存收藏数据
    function saveFavorites(favorites) {
        localStorage.setItem('chefmate_favorites', JSON.stringify(favorites));
    }

    // 加载收藏列表
    function loadFavorites() {
        const favorites = getFavorites();
        let filteredFavorites = favorites;

        // 按分类筛选
        if (currentCategory !== 'all') {
            filteredFavorites = favorites.filter(item => item.type === currentCategory);
        }

        // 按添加时间排序（最新的在前）
        filteredFavorites.sort((a, b) => b.addedTime - a.addedTime);

        if (filteredFavorites.length === 0) {
            showEmptyState();
        } else {
            showFavoritesList(filteredFavorites);
        }
    }

    // 显示收藏列表
    function showFavoritesList(favorites) {
        emptyState.style.display = 'none';
        favoritesList.style.display = 'block';

        let favoritesHTML = '';
        favorites.forEach(item => {
            const timeAgo = getTimeAgo(item.addedTime);
            
            favoritesHTML += `
                <div class="favorite-item" data-id="${item.id}" onclick="goToDetail('${item.id}', '${item.type}')">
                    <div class="favorite-image" style="background-image: url('${item.image}')"></div>
                    <div class="favorite-info">
                        <div class="favorite-title">${item.title}</div>
                        <div class="favorite-meta">
                            ${item.time ? `
                                <div class="favorite-meta-item">
                                    <img src="images/time.svg" alt="时间">
                                    <span>${item.time}</span>
                                </div>
                            ` : ''}
                            ${item.likes ? `
                                <div class="favorite-meta-item">
                                    <img src="images/likes.svg" alt="点赞">
                                    <span>${item.likes}</span>
                                </div>
                            ` : ''}
                            <div class="favorite-meta-item">
                                <img src="images/time.svg" alt="收藏时间">
                                <span>${timeAgo}</span>
                            </div>
                        </div>
                        <div class="favorite-category">${item.category}</div>
                    </div>
                    <div class="favorite-actions">
                        <div class="action-icon share-icon" onclick="shareItem(event, '${item.id}')">
                            <img src="images/share.svg" alt="分享">
                        </div>
                        <div class="action-icon remove-favorite" onclick="removeFavorite(event, '${item.id}')">
                            <img src="images/close.svg" alt="取消收藏">
                        </div>
                    </div>
                </div>
            `;
        });

        favoritesList.innerHTML = favoritesHTML;
    }

    // 显示空状态
    function showEmptyState() {
        favoritesList.style.display = 'none';
        emptyState.style.display = 'block';
    }

    // 计算时间差
    function getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        
        const date = new Date(timestamp);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    // 跳转到详情页
    window.goToDetail = function(id, type) {
        if (type === 'recipes') {
            // 根据ID跳转到对应的食谱详情页
            if (id === 'recipe_1') {
                window.location.href = 'recipe-detail.html?recipe=salad';
            } else if (id === 'recipe_2') {
                window.location.href = 'recipe-detail.html?recipe=ribs';
            }
        }
        // 可以扩展其他类型的跳转逻辑
    };

    // 分享收藏项
    window.shareItem = function(event, id) {
        event.stopPropagation();
        
        const favorites = getFavorites();
        const item = favorites.find(fav => fav.id === id);
        
        if (!item) return;
        
        const shareText = `📖 推荐一个${item.category}食谱：${item.title}\n\n🍳 来自 ChefMate 应用`;
        
        if (navigator.share) {
            navigator.share({
                title: item.title,
                text: shareText
            }).catch(err => {
                console.log('分享失败:', err);
                copyToClipboard(shareText);
            });
        } else {
            copyToClipboard(shareText);
        }
    };

    // 取消收藏
    window.removeFavorite = function(event, id) {
        event.stopPropagation();
        
        if (confirm('确定要取消收藏吗？')) {
            const favorites = getFavorites();
            const updatedFavorites = favorites.filter(fav => fav.id !== id);
            saveFavorites(updatedFavorites);
            
            // 添加删除动画
            const item = document.querySelector(`[data-id="${id}"]`);
            if (item) {
                item.classList.add('removing');
                setTimeout(() => {
                    loadFavorites();
                    showMessage('已取消收藏');
                }, 300);
            }
        }
    };

    // 复制到剪贴板
    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showMessage('已复制到剪贴板');
            }).catch(() => {
                showMessage('复制失败');
            });
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showMessage('已复制到剪贴板');
            } catch (err) {
                showMessage('复制失败');
            }
            document.body.removeChild(textArea);
        }
    }

    // 显示消息提示
    function showMessage(message) {
        const existingMessage = document.querySelector('.toast-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageEl = document.createElement('div');
        messageEl.className = 'toast-message';
        messageEl.textContent = message;
        messageEl.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            messageEl.style.opacity = '1';
        }, 100);
        
        setTimeout(() => {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }, 2000);
    }

    // 全局函数：添加到收藏（供其他页面调用）
    window.addToFavorites = function(item) {
        const favorites = getFavorites();
        
        // 检查是否已收藏
        if (favorites.some(fav => fav.id === item.id)) {
            showMessage('已经收藏过了');
            return false;
        }
        
        // 添加收藏时间
        item.addedTime = Date.now();
        
        favorites.unshift(item);
        saveFavorites(favorites);
        showMessage('已添加到收藏');
        return true;
    };

    // 全局函数：检查是否已收藏
    window.isFavorited = function(id) {
        const favorites = getFavorites();
        return favorites.some(fav => fav.id === id);
    };

    // 全局函数：从收藏中移除
    window.removeFromFavorites = function(id) {
        const favorites = getFavorites();
        const updatedFavorites = favorites.filter(fav => fav.id !== id);
        saveFavorites(updatedFavorites);
        showMessage('已取消收藏');
        return true;
    };
});