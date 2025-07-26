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

    // 动态加载的食谱数据
    let recipeData = [];
    
    // 获取所有食谱文件列表
    async function loadAllRecipes() {
        try {
            // 尝试从API获取文件列表，如果失败则使用硬编码列表
            let recipeFiles;
            try {
                const response = await fetch('/api/recipes');
                if (response.ok) {
                    const apiData = await response.json();
                    recipeFiles = Object.keys(apiData).map(key => `${key}.json`);
                } else {
                    throw new Error('API不可用');
                }
            } catch (apiError) {
                console.log('API获取失败，使用本地文件列表');
                // 使用硬编码的文件列表作为后备
                recipeFiles = [
                    '0bcce3e6-0dbc-41f9-9716-926a20681d21.json',
                    '0f419663-a616-417f-b92f-d8a34265bef4.json',
                    '184f5a43-c7c3-4392-92db-16150d5c7acf.json',
                    '1cfc1f81-5312-40ae-ba5d-536e8da78e89.json',
                    '2f9c4071-346d-4a5b-b2c8-0020239399f9.json',
                    '30f078f3-4207-40fc-98db-3524bb7579ee.json',
                    '611218b4-4851-46b4-8cfe-91ae8b98360e.json',
                    '687218b4-4851-42b4-8gfe-71ae8b98360e.json',
                    '6def49d0-94a6-4796-8857-79ba8cab2b55.json',
                    '73b4e9be-c822-4890-afd8-2e8ff6ab9769.json',
                    '7819780d-2d6f-45a4-8bef-ed29eb2502a1.json',
                    '8b001ca9-acc1-4177-a01e-dbef065273ae.json',
                    'a0ce32cf-890c-44c4-b0da-4a254bbbe904.json',
                    'f96157ff-1423-4487-ab07-a893f45c6e23.json',
                    'ff644d8e-8be8-4eed-b0d0-d087c1dc1593.json',
                    'ff714d8b-8be8-4eed-b0d0-d087c1dc4514.json'
                ];
            }
            
            const loadPromises = recipeFiles.map(async (filename) => {
                try {
                    const response = await fetch(`recipes/${filename}`);
                    if (!response.ok) return null;
                    
                    const data = await response.json();
                    const recipeKey = Object.keys(data)[0];
                    const recipe = data[recipeKey];
                    
                    // 提取UUID（去掉.json扩展名）
                    const uuid = filename.replace('.json', '');
                    
                    return {
                        id: uuid,
                        title: recipe.title || recipeKey,
                        image: recipe.image || 'images/placeholder.jpg',
                        time: recipe.time || '30min',
                        likes: recipe.likes || '0',
                        category: recipe.category || '其他',
                        ingredients: recipe.ingredients || [],
                        cuisine: recipe.category || '家常菜',
                        uuid: uuid
                    };
                } catch (error) {
                    console.error(`加载食谱文件 ${filename} 失败:`, error);
                    return null;
                }
            });
            
            const results = await Promise.all(loadPromises);
            recipeData = results.filter(recipe => recipe !== null);
            console.log(`成功加载 ${recipeData.length} 个食谱`);
            console.log('加载的食谱:', recipeData.map(r => r.title));
            
        } catch (error) {
            console.error('加载食谱数据失败:', error);
            // 如果加载失败，使用默认数据
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

    let searchTimer;
    let currentKeyword = '';

    // 初始化
    init();

    async function init() {
        // 先加载所有食谱数据
        await loadAllRecipes();
        
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
            
            // 搜索食材 - 支持数组和字符串格式
            if (Array.isArray(recipe.ingredients)) {
                return recipe.ingredients.some(ingredient => {
                    // 如果ingredient包含逗号或顿号，说明是组合的食材字符串，需要分割
                    if (ingredient.includes('、') || ingredient.includes('，') || ingredient.includes(',')) {
                        const splitIngredients = ingredient.split(/[、，,]/).map(item => item.trim());
                        return splitIngredients.some(splitIngredient => {
                            const cleanIngredient = splitIngredient.replace(/\d+[克毫升个片根颗块段汤匙]/g, '').trim();
                            return cleanIngredient.toLowerCase().includes(lowerKeyword) || 
                                   splitIngredient.toLowerCase().includes(lowerKeyword);
                        });
                    } else {
                        // 处理带数量的食材，如"五花肉500克"
                        const cleanIngredient = ingredient.replace(/\d+[克毫升个片根颗块段汤匙]/g, '').trim();
                        return cleanIngredient.toLowerCase().includes(lowerKeyword) || 
                               ingredient.toLowerCase().includes(lowerKeyword);
                    }
                });
            } else if (typeof recipe.ingredients === 'string') {
                return recipe.ingredients.toLowerCase().includes(lowerKeyword);
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
                <div class="result-item" onclick="goToRecipeDetail('${recipe.id}')">
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
            // 如果有UUID，使用UUID跳转
            if (recipe.uuid) {
                window.location.href = `recipe-detail.html?id=${recipe.uuid}`;
            } else {
                // 向后兼容：使用旧的参数格式
                let param = 'salad'; // 默认值
                if (recipe.title.includes('排骨')) {
                    param = 'paigu';
                }
                window.location.href = `recipe-detail.html?recipe=${param}`;
            }
        }
    };
});