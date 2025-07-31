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

    let recipeData = [];
    let searchTimer;
    let currentKeyword = '';

    init();

    async function init() {
        await loadAllRecipes();
        loadSearchHistory();
        bindEvents();
        searchInput.focus();
    }

    async function loadAllRecipes() {
        try {
            const response = await fetch('/api/recipes');
            if (response.ok) {
                recipeData = await response.json();
                console.log(`成功加载 ${recipeData.length} 个食谱`);
            } else {
                throw new Error('API不可用');
            }
        } catch (error) {
            console.error('加载食谱数据失败:', error);
            recipeData = [
                {
                    id: 'salad',
                    title: '牛油果番茄沙拉',
                    image: 'images/沙拉.jpeg',
                    time: '40min',
                    likes: '500+',
                    category: '沙拉',
                    ingredients: ['牛油果', '番茄', '黄瓜', '洋葱'],
                    cuisine: '西餐'
                },
                {
                    id: 'paigu',
                    title: '糖醋排骨',
                    image: 'images/排骨.jpg',
                    time: '60min',
                    likes: '800+',
                    category: '荤菜',
                    ingredients: ['排骨', '糖', '醋', '生抽'],
                    cuisine: '川菜'
                }
            ];
        }
    }

    function bindEvents() {
        // 基础事件绑定
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('keypress', handleKeyPress);
        clearBtn.addEventListener('click', clearSearch);
        clearHistoryBtn.addEventListener('click', clearSearchHistory);
        
        // 使用事件委托处理所有动态和静态元素
        document.addEventListener('click', handleGlobalClick);
    }
    
    function handleGlobalClick(e) {
        // 处理返回按钮
        if (e.target.closest('.back-btn') || e.target.closest('.back-btn img')) {
            window.location.href = 'home.html';
            return;
        }
        
        // 处理搜索建议标签
        const suggestionTag = e.target.closest('.suggestion-tag');
        if (suggestionTag) {
            const keyword = suggestionTag.dataset.keyword;
            searchInput.value = keyword;
            performSearch(keyword);
            return;
        }
        
        // 处理清除按钮
        if (e.target.closest('#clearBtn') || e.target.closest('#clearBtn img')) {
            clearSearch();
            return;
        }
        
        // 处理历史记录文本
        const historyText = e.target.closest('.history-text');
        if (historyText) {
            const keyword = historyText.textContent;
            searchInput.value = keyword;
            performSearch(keyword);
            return;
        }
        
        // 处理历史记录删除按钮
        const deleteHistory = e.target.closest('.delete-history');
        if (deleteHistory) {
            const historyItem = deleteHistory.closest('.history-item');
            const index = Array.from(historyList.children).indexOf(historyItem);
            deleteHistoryItem(index);
            return;
        }
        
        // 处理浏览推荐按钮
        if (e.target.closest('.browse-btn')) {
            window.location.href = 'home.html';
            return;
        }
        
        // 处理食谱结果项
        const resultItem = e.target.closest('.result-item');
        if (resultItem) {
            const recipeId = resultItem.dataset.recipeId || 
                            resultItem.querySelector('.result-image').style.backgroundImage.match(/\/([^\/]+)\.jpg/)?.[1] ||
                            resultItem.querySelector('.result-title').textContent;
            goToRecipeDetail(recipeId);
            return;
        }
    }

    function handleSearchInput(e) {
        const value = e.target.value.trim();
        clearBtn.style.display = value ? 'flex' : 'none';
        
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            value ? performSearch(value) : showDefaultState();
        }, 300);
    }

    function handleKeyPress(e) {
        if (e.key === 'Enter') {
            const value = searchInput.value.trim();
            value && performSearch(value);
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
        searchSuggestions.style.display = 'none';
        searchHistory.style.display = 'none';
        noResults.style.display = 'none';
        
        searchResults.style.display = 'block';
        resultsList.innerHTML = '<div class="loading">搜索中...</div>';
        
        setTimeout(() => {
            const results = searchRecipes(keyword);
            displaySearchResults(results, keyword);
            saveSearchHistory(keyword);
        }, 500);
    }

    function searchRecipes(keyword) {
        const lowerKeyword = keyword.toLowerCase();
        
        return recipeData.filter(recipe => {
            if (recipe.title.toLowerCase().includes(lowerKeyword)) return true;
            if (recipe.category.toLowerCase().includes(lowerKeyword)) return true;
            if (recipe.cuisine && recipe.cuisine.toLowerCase().includes(lowerKeyword)) return true;
            
            if (Array.isArray(recipe.ingredients)) {
                return recipe.ingredients.some(ingredient => {
                    if (typeof ingredient === 'string') {
                        const cleanIngredient = ingredient.replace(/\d+[克毫升个片根颗块段汤匙]/g, '').trim();
                        return cleanIngredient.toLowerCase().includes(lowerKeyword) || 
                               ingredient.toLowerCase().includes(lowerKeyword);
                    }
                    return false;
                });
            }
            return false;
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
                <div class="result-item" data-recipe-id="${recipe.id}">
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
        history = history.filter(item => item.keyword !== keyword);
        history.unshift({ keyword, timestamp: Date.now() });
        
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
                    <div class="history-text">${item.keyword}</div>
                    <div class="history-actions">
                        <span class="history-time">${timeStr}</span>
                        <div class="delete-history">
                            <img src="images/close.svg" alt="删除">
                        </div>
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = historyHTML;
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

    function goToRecipeDetail(recipeId) {
        window.location.href = `recipe-detail.html?id=${recipeId}`;
    }
});