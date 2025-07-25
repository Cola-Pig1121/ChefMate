// 搜索页面功能
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const searchHistory = document.getElementById('searchHistory');
    const searchResults = document.getElementById('searchResults');
    const noResults = document.getElementById('noResults');
    const historyList = document.getElementById('historyList');
    const resultsList = document.getElementById('resultsList');
    const resultsTitle = document.getElementById('resultsTitle');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // 模拟食谱数据
    const recipeData = [
        {
            id: 1,
            title: '牛油果番茄沙拉',
            image: 'images/沙拉.jpeg',
            time: '40min',
            likes: '500+',
            category: '沙拉',
            ingredients: ['牛油果', '番茄', '黄瓜', '洋葱'],
            cuisine: '西餐'
        },
        {
            id: 2,
            title: '糖醋排骨',
            image: 'images/排骨.jpg',
            time: '60min',
            likes: '800+',
            category: '荤菜',
            ingredients: ['排骨', '糖', '醋', '生抽'],
            cuisine: '川菜'
        },
        {
            id: 3,
            title: '蒜蓉西兰花',
            image: 'images/logo.svg',
            time: '15min',
            likes: '300+',
            category: '素菜',
            ingredients: ['西兰花', '蒜', '盐'],
            cuisine: '粤菜'
        },
        {
            id: 4,
            title: '番茄鸡蛋汤',
            image: 'images/logo.svg',
            time: '20min',
            likes: '600+',
            category: '汤',
            ingredients: ['番茄', '鸡蛋', '葱'],
            cuisine: '家常菜'
        }
    ];

    let searchTimer;
    let currentKeyword = '';

    // 初始化
    init();

    function init() {
        loadSearchHistory();
        bindEvents();
        
        // 自动聚焦搜索框
        searchInput.focus();
    }

    function bindEvents() {
        // 搜索输入事件
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('keypress', handleKeyPress);
        
        // 清除按钮
        clearBtn.addEventListener('click', clearSearch);
        
        // 建议标签点击
        const suggestionTags = document.querySelectorAll('.suggestion-tag');
        suggestionTags.forEach(tag => {
            tag.addEventListener('click', function() {
                const keyword = this.dataset.keyword;
                searchInput.value = keyword;
                performSearch(keyword);
            });
        });
        
        // 清空历史记录
        clearHistoryBtn.addEventListener('click', clearSearchHistory);
    }

    function handleSearchInput(e) {
        const value = e.target.value.trim();
        
        // 显示/隐藏清除按钮
        if (value) {
            clearBtn.style.display = 'flex';
        } else {
            clearBtn.style.display = 'none';
        }
        
        // 防抖搜索
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            if (value) {
                performSearch(value);
            } else {
                showDefaultState();
            }
        }, 300);
    }

    function handleKeyPress(e) {
        if (e.key === 'Enter') {
            const value = searchInput.value.trim();
            if (value) {
                performSearch(value);
            }
        }
    }

    function clearSearch() {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        showDefaultState();
        searchInput.focus();
    }

    function showDefaultState() {
        searchSuggestions.style.display = 'block';
        searchHistory.style.display = getSearchHistory().length > 0 ? 'block' : 'none';
        searchResults.style.display = 'none';
        noResults.style.display = 'none';
    }

    function performSearch(keyword) {
        currentKeyword = keyword;
        
        // 隐藏其他状态
        searchSuggestions.style.display = 'none';
        searchHistory.style.display = 'none';
        noResults.style.display = 'none';
        
        // 显示加载状态
        searchResults.style.display = 'block';
        resultsList.innerHTML = '<div class="loading">搜索中...</div>';
        
        // 模拟搜索延迟
        setTimeout(() => {
            const results = searchRecipes(keyword);
            displaySearchResults(results, keyword);
            
            // 保存搜索历史
            saveSearchHistory(keyword);
        }, 500);
    }

    function searchRecipes(keyword) {
        const lowerKeyword = keyword.toLowerCase();
        
        return recipeData.filter(recipe => {
            // 搜索标题
            if (recipe.title.toLowerCase().includes(lowerKeyword)) {
                return true;
            }
            
            // 搜索分类
            if (recipe.category.toLowerCase().includes(lowerKeyword)) {
                return true;
            }
            
            // 搜索菜系
            if (recipe.cuisine.toLowerCase().includes(lowerKeyword)) {
                return true;
            }
            
            // 搜索食材
            return recipe.ingredients.some(ingredient => 
                ingredient.toLowerCase().includes(lowerKeyword)
            );
        });
    }

    function displaySearchResults(results, keyword) {
        resultsTitle.textContent = `"${keyword}" 的搜索结果 (${results.length})`;
        
        if (results.length === 0) {
            searchResults.style.display = 'none';
            noResults.style.display = 'block';
            return;
        }
        
        let resultsHTML = '';
        results.forEach(recipe => {
            resultsHTML += `
                <div class="result-item" onclick="goToRecipeDetail(${recipe.id})">
                    <div class="result-image" style="background-image: url('${recipe.image}')"></div>
                    <div class="result-info">
                        <div class="result-title">${highlightKeyword(recipe.title, keyword)}</div>
                        <div class="result-meta">
                            <div class="result-meta-item">
                                <img src="images/time.svg" alt="时间">
                                <span>${recipe.time}</span>
                            </div>
                            <div class="result-meta-item">
                                <img src="images/likes.svg" alt="点赞">
                                <span>${recipe.likes}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        resultsList.innerHTML = resultsHTML;
    }

    function highlightKeyword(text, keyword) {
        if (!keyword) return text;
        
        const regex = new RegExp(`(${keyword})`, 'gi');
        return text.replace(regex, '<span style="color: #FFA242; font-weight: 500;">$1</span>');
    }

    function saveSearchHistory(keyword) {
        let history = getSearchHistory();
        
        // 移除重复项
        history = history.filter(item => item.keyword !== keyword);
        
        // 添加到开头
        history.unshift({
            keyword: keyword,
            timestamp: Date.now()
        });
        
        // 限制历史记录数量
        if (history.length > 10) {
            history = history.slice(0, 10);
        }
        
        localStorage.setItem('chefmate_search_history', JSON.stringify(history));
        loadSearchHistory();
    }

    function getSearchHistory() {
        const history = localStorage.getItem('chefmate_search_history');
        return history ? JSON.parse(history) : [];
    }

    function loadSearchHistory() {
        const history = getSearchHistory();
        
        if (history.length === 0) {
            searchHistory.style.display = 'none';
            return;
        }
        
        let historyHTML = '';
        history.forEach((item, index) => {
            const timeStr = formatTime(item.timestamp);
            historyHTML += `
                <div class="history-item">
                    <div class="history-text" onclick="searchFromHistory('${item.keyword}')">${item.keyword}</div>
                    <div class="history-actions">
                        <span class="history-time">${timeStr}</span>
                        <div class="delete-history" onclick="deleteHistoryItem(${index})">
                            <img src="images/close.svg" alt="删除">
                        </div>
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = historyHTML;
        
        // 只在默认状态下显示历史记录
        if (searchInput.value.trim() === '') {
            searchHistory.style.display = 'block';
        }
    }

    function formatTime(timestamp) {
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

    function clearSearchHistory() {
        localStorage.removeItem('chefmate_search_history');
        searchHistory.style.display = 'none';
    }

    // 全局函数
    window.searchFromHistory = function(keyword) {
        searchInput.value = keyword;
        performSearch(keyword);
    };

    window.deleteHistoryItem = function(index) {
        let history = getSearchHistory();
        history.splice(index, 1);
        localStorage.setItem('chefmate_search_history', JSON.stringify(history));
        loadSearchHistory();
    };

    window.goToRecipeDetail = function(recipeId) {
        // 根据食谱ID跳转到详情页
        const recipe = recipeData.find(r => r.id === recipeId);
        if (recipe) {
            let param = 'salad'; // 默认值
            if (recipe.title.includes('排骨')) {
                param = 'ribs';
            }
            window.location.href = `recipe-detail.html?recipe=${param}`;
        }
    };
});