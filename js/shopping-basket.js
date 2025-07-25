// 购菜篮页面功能
document.addEventListener('DOMContentLoaded', function() {
    const clearBtn = document.querySelector('.clear-btn');
    const shareBtn = document.querySelector('.share-btn');
    const addItemBtn = document.querySelector('.add-item-button');
    const selectAllBtn = document.getElementById('selectAllBtn');
    
    let isAllSelected = false;
    let currentCategory = 'all';
    
    // 默认分类数据
    const defaultCategories = [
        { id: 'all', name: '全部', icon: '' },
        { id: 'vegetables', name: '蔬菜', icon: '🥬' },
        { id: 'fruits', name: '水果', icon: '🍎' },
        { id: 'meat', name: '肉类', icon: '🥩' },
        { id: 'seafood', name: '海鲜', icon: '🐟' },
        { id: 'dairy', name: '乳制品', icon: '🥛' },
        { id: 'grains', name: '谷物', icon: '🌾' },
        { id: 'seasoning', name: '调料', icon: '🧂' }
    ];
    
    // 默认购物数据
    const defaultMarketData = [
        {
            id: 'item1',
            name: '番茄',
            description: '500g，中等大小',
            category: 'vegetables',
            quantity: 2,
            checked: false
        },
        {
            id: 'item2',
            name: '牛油果',
            description: '2个，熟透的',
            category: 'fruits',
            quantity: 1,
            checked: false
        },
        {
            id: 'item3',
            name: '排骨',
            description: '500g，新鲜',
            category: 'meat',
            quantity: 1,
            checked: false
        },
        {
            id: 'item4',
            name: '醋',
            description: '100ml，米醋',
            category: 'seasoning',
            quantity: 1,
            checked: false
        },
        {
            id: 'item5',
            name: '白砂糖',
            description: '250g',
            category: 'seasoning',
            quantity: 1,
            checked: false
        }
    ];
    
    // 初始化
    init();
    
    function init() {
        // 检查并清理损坏的localStorage数据
        validateAndCleanStorage();
        // 首先检查是否有localStorage数据，如果没有则使用HTML中的默认数据
        initializeFromHTML();
        loadCategories();
        bindEvents();
        updateSelectAllButton();
    }
    
    // 验证并清理localStorage数据
    function validateAndCleanStorage() {
        try {
            const marketData = localStorage.getItem('chefmate_market_data');
            if (marketData) {
                const parsed = JSON.parse(marketData);
                if (!Array.isArray(parsed)) {
                    console.log('Market data is not an array, clearing...');
                    localStorage.removeItem('chefmate_market_data');
                }
            }
            
            const categories = localStorage.getItem('chefmate_categories');
            if (categories) {
                const parsed = JSON.parse(categories);
                if (!Array.isArray(parsed)) {
                    console.log('Categories data is not an array, clearing...');
                    localStorage.removeItem('chefmate_categories');
                }
            }
        } catch (error) {
            console.error('Error validating storage data:', error);
            localStorage.removeItem('chefmate_market_data');
            localStorage.removeItem('chefmate_categories');
        }
    }
    
    // 从HTML初始化数据
    function initializeFromHTML() {
        const savedData = localStorage.getItem('chefmate_market_data');
        
        if (!savedData) {
            // 如果没有保存的数据，从HTML中提取默认数据
            const htmlItems = document.querySelectorAll('.shopping-item');
            let marketData = [];
            
            if (htmlItems.length > 0) {
                htmlItems.forEach(item => {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    const nameElement = item.querySelector('h3');
                    const descElement = item.querySelector('p');
                    const quantityElement = item.querySelector('.quantity');
                    
                    if (checkbox && nameElement && descElement && quantityElement) {
                        marketData.push({
                            id: checkbox.id || 'item_' + Date.now() + '_' + Math.random(),
                            name: nameElement.textContent,
                            description: descElement.textContent,
                            category: item.dataset.category || 'vegetables',
                            quantity: parseInt(quantityElement.textContent) || 1,
                            checked: checkbox.checked
                        });
                    }
                });
            } else {
                // 如果HTML中没有项目，使用默认数据
                marketData = defaultMarketData;
            }
            
            saveMarketData(marketData);
            renderShoppingList(marketData);
        } else {
            // 如果有保存的数据，用保存的数据重新渲染
            try {
                const marketData = JSON.parse(savedData);
                if (Array.isArray(marketData)) {
                    renderShoppingList(marketData);
                } else {
                    console.error('Saved data is not an array, using default data');
                    saveMarketData(defaultMarketData);
                    renderShoppingList(defaultMarketData);
                }
            } catch (error) {
                console.error('Error parsing saved data:', error);
                saveMarketData(defaultMarketData);
                renderShoppingList(defaultMarketData);
            }
        }
    }
    
    // 加载购物数据
    function loadMarketData() {
        const savedData = localStorage.getItem('chefmate_market_data');
        let marketData = savedData ? JSON.parse(savedData) : defaultMarketData;
        
        // 如果没有数据，使用默认数据
        if (!savedData) {
            saveMarketData(marketData);
        }
        
        renderShoppingList(marketData);
    }
    
    // 保存购物数据
    function saveMarketData(data) {
        localStorage.setItem('chefmate_market_data', JSON.stringify(data));
    }
    
    // 获取购物数据
    function getMarketData() {
        const savedData = localStorage.getItem('chefmate_market_data');
        try {
            const data = savedData ? JSON.parse(savedData) : [];
            return Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Error parsing market data:', error);
            return [];
        }
    }
    
    // 加载分类数据
    function loadCategories() {
        const savedCategories = localStorage.getItem('chefmate_categories');
        let categories = savedCategories ? JSON.parse(savedCategories) : defaultCategories;
        
        // 如果没有数据，使用默认数据
        if (!savedCategories) {
            saveCategories(categories);
        }
        
        renderCategories(categories);
    }
    
    // 保存分类数据
    function saveCategories(categories) {
        localStorage.setItem('chefmate_categories', JSON.stringify(categories));
    }
    
    // 获取分类数据
    function getCategories() {
        const savedCategories = localStorage.getItem('chefmate_categories');
        return savedCategories ? JSON.parse(savedCategories) : defaultCategories;
    }
    
    // 显示添加分类弹窗
    function showAddCategoryModal() {
        const modalHTML = `
            <div class="add-item-modal" id="addCategoryModal">
                <div class="modal-overlay" onclick="closeAddCategoryModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>添加分类</h3>
                        <button class="modal-close" onclick="closeAddCategoryModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="categoryName">分类名称</label>
                            <input type="text" id="categoryName" placeholder="请输入分类名称" maxlength="10">
                        </div>
                        <div class="form-group">
                            <label for="categoryIcon">图标 (可选)</label>
                            <input type="text" id="categoryIcon" placeholder="如：🥕 🍖 🧀" maxlength="2">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel" onclick="closeAddCategoryModal()">取消</button>
                        <button class="btn-confirm" onclick="confirmAddCategory()">添加</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        setTimeout(() => {
            const nameInput = document.getElementById('categoryName');
            nameInput.focus();
            
            const modal = document.getElementById('addCategoryModal');
            modal.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmAddCategory();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeAddCategoryModal();
                }
            });
        }, 100);
    }

    // 渲染分类标签
    function renderCategories(categories) {
        const categoryTabs = document.querySelector('.category-tabs');
        
        // 检查是否已经有HTML中的标签，如果有则保留并增强
        const existingTabs = categoryTabs.querySelectorAll('.tab:not(.add-category-tab)');
        
        if (existingTabs.length > 0 && !localStorage.getItem('chefmate_categories')) {
            // 如果HTML中已有标签且没有保存的分类数据，则增强现有标签
            enhanceExistingTabs();
        } else {
            // 否则完全重新渲染
            let tabsHTML = '';
            
            categories.forEach(category => {
                const activeClass = category.id === currentCategory ? 'active' : '';
                const deleteBtn = category.id !== 'all' && category.id.startsWith('custom_') ? 
                    '<span class="delete-category" onclick="deleteCategory(\'' + category.id + '\')">×</span>' : '';
                
                tabsHTML += `
                    <div class="tab ${activeClass}" data-category="${category.id}">
                        ${category.icon} ${category.name}
                        ${deleteBtn}
                    </div>
                `;
            });
            
            categoryTabs.innerHTML = tabsHTML;
        }
        
        // 添加"添加分类"按钮（如果还没有的话）
        if (!categoryTabs.querySelector('.add-category-tab')) {
            const addCategoryBtn = document.createElement('div');
            addCategoryBtn.className = 'tab add-category-tab';
            addCategoryBtn.textContent = '+ 添加分类';
            addCategoryBtn.onclick = showAddCategoryModal;
            categoryTabs.appendChild(addCategoryBtn);
        }
        
        bindCategoryEvents();
    }
    
    // 删除分类
    window.deleteCategory = function(categoryId) {
        if (confirm('确定要删除这个分类吗？')) {
            const categories = getCategories();
            const updatedCategories = categories.filter(cat => cat.id !== categoryId);
            saveCategories(updatedCategories);
            
            // 如果删除的是当前选中的分类，切换到"全部"
            if (currentCategory === categoryId) {
                currentCategory = 'all';
            }
            
            renderCategories(updatedCategories);
            showMessage('分类已删除');
        }
    };
    
    // 删除分类
    window.deleteCategory = function(categoryId) {
        if (confirm('确定要删除这个分类吗？')) {
            const categories = getCategories();
            const updatedCategories = categories.filter(cat => cat.id !== categoryId);
            
            // 如果删除的是当前选中的分类，切换到"全部"
            if (currentCategory === categoryId) {
                currentCategory = 'all';
            }
            
            // 将该分类下的物品移动到默认分类
            const marketData = getMarketData();
            marketData.forEach(item => {
                if (item.category === categoryId) {
                    item.category = 'vegetables'; // 默认移动到蔬菜分类
                }
            });
            
            saveCategories(updatedCategories);
            saveMarketData(marketData);
            renderCategories(updatedCategories);
            renderShoppingList(marketData);
            
            showMessage('分类已删除');
        }
    };
    
    // 增强现有的HTML标签
    function enhanceExistingTabs() {
        const existingTabs = document.querySelectorAll('.tab:not(.add-category-tab)');
        const categories = [];
        
        existingTabs.forEach(tab => {
            const categoryId = tab.dataset.category;
            const categoryName = tab.textContent.trim();
            
            // 为现有分类添加图标
            const iconMap = {
                'all': '',
                'vegetables': '🥬',
                'fruits': '🍎',
                'meat': '🥩',
                'seafood': '🐟',
                'dairy': '🥛',
                'grains': '🌾',
                'seasoning': '🧂'
            };
            
            const icon = iconMap[categoryId] || '📦';
            if (icon) {
                tab.innerHTML = `${icon} ${categoryName}`;
            }
            
            categories.push({
                id: categoryId,
                name: categoryName,
                icon: icon
            });
        });
        
        saveCategories(categories);
    }
    
    // 渲染购物列表
    function renderShoppingList(marketData) {
        const shoppingList = document.querySelector('.shopping-list');
        const addItemBtn = document.querySelector('.add-item-button');
        
        // 确保marketData是数组
        if (!Array.isArray(marketData)) {
            console.error('marketData is not an array:', marketData);
            marketData = [];
        }
        
        if (marketData.length === 0) {
            showEmptyBasket();
            return;
        }
        
        // 清除现有的购物项目，但保留添加按钮
        const existingItems = shoppingList.querySelectorAll('.shopping-item');
        existingItems.forEach(item => item.remove());
        
        // 渲染新的购物项目
        marketData.forEach(item => {
            const checkedAttr = item.checked ? 'checked' : '';
            const bgColor = item.checked ? '#f0f8ff' : 'white';
            
            const itemHTML = `
                <div class="shopping-item" data-category="${item.category}" data-id="${item.id}" style="background-color: ${bgColor};">
                    <div class="item-check">
                        <input type="checkbox" id="${item.id}" ${checkedAttr}>
                        <label for="${item.id}"></label>
                    </div>
                    <div class="item-info">
                        <h3>${item.name}</h3>
                        <p>${item.description}</p>
                    </div>
                    <div class="item-quantity">
                        <button class="quantity-btn minus">-</button>
                        <span class="quantity">${item.quantity}</span>
                        <button class="quantity-btn plus">+</button>
                    </div>
                </div>
            `;
            
            // 在添加按钮前插入新项目
            addItemBtn.insertAdjacentHTML('beforebegin', itemHTML);
        });
        
        bindItemEvents();
        filterItemsByCategory();
    }
    
    // 绑定事件
    function bindEvents() {
        // 全选按钮
        selectAllBtn.addEventListener('click', handleSelectAll);
        
        // 清空已选按钮
        clearBtn.addEventListener('click', handleClearSelected);
        
        // 分享按钮
        shareBtn.addEventListener('click', handleShare);
        
        // 添加食材按钮 - 确保与HTML中的按钮绑定
        if (addItemBtn) {
            addItemBtn.addEventListener('click', showAddItemModal);
        }
    }
    
    // 绑定分类事件
    function bindCategoryEvents() {
        const categoryTabs = document.querySelectorAll('.tab:not(.add-category-tab)');
        categoryTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                // 移除所有active状态
                categoryTabs.forEach(t => t.classList.remove('active'));
                // 添加active状态到当前标签
                this.classList.add('active');
                
                currentCategory = this.dataset.category;
                filterItemsByCategory();
                updateSelectAllButton();
            });
        });
        
        // 添加鼠标滚轮支持（PC端）
        const categoryTabsContainer = document.querySelector('.category-tabs');
        if (categoryTabsContainer) {
            categoryTabsContainer.addEventListener('wheel', function(e) {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    this.scrollLeft += e.deltaY;
                }
            });
        }
    }
    
    // 绑定物品事件
    function bindItemEvents() {
        const shoppingItems = document.querySelectorAll('.shopping-item');
        
        shoppingItems.forEach(item => {
            // 复选框事件
            const checkbox = item.querySelector('input[type=\"checkbox\"]');
            checkbox.addEventListener('change', function() {
                const itemId = this.id;
                const marketData = getMarketData();
                const itemData = marketData.find(data => data.id === itemId);
                
                if (itemData) {
                    itemData.checked = this.checked;
                    saveMarketData(marketData);
                }
                
                if (this.checked) {
                    item.style.backgroundColor = '#f0f8ff';
                } else {
                    item.style.backgroundColor = 'white';
                }
                updateSelectAllButton();
            });
            
            // 数量控制事件
            const quantityBtns = item.querySelectorAll('.quantity-btn');
            quantityBtns.forEach(btn => {
                btn.addEventListener('click', function() {
                    const quantitySpan = this.parentNode.querySelector('.quantity');
                    let currentQuantity = parseInt(quantitySpan.textContent);
                    const itemId = item.dataset.id;
                    
                    if (this.classList.contains('plus')) {
                        currentQuantity++;
                    } else if (this.classList.contains('minus') && currentQuantity > 0) {
                        currentQuantity--;
                    }
                    
                    if (currentQuantity === 0) {
                        removeShoppingItem(item);
                        return;
                    }
                    
                    quantitySpan.textContent = currentQuantity;
                    
                    // 更新localStorage
                    const marketData = getMarketData();
                    const itemData = marketData.find(data => data.id === itemId);
                    if (itemData) {
                        itemData.quantity = currentQuantity;
                        saveMarketData(marketData);
                    }
                });
            });
        });
    }
    
    // 按分类筛选物品
    function filterItemsByCategory() {
        const shoppingItems = document.querySelectorAll('.shopping-item');
        
        shoppingItems.forEach(item => {
            if (currentCategory === 'all' || item.dataset.category === currentCategory) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
        
        // 平滑滚动到列表顶部
        const listContainer = document.querySelector('.shopping-list-container');
        listContainer.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    // 获取当前可见的复选框
    function getVisibleCheckboxes() {
        const visibleItems = Array.from(document.querySelectorAll('.shopping-item')).filter(item => 
            item.style.display !== 'none'
        );
        return visibleItems.map(item => item.querySelector('input[type=\"checkbox\"]'));
    }
    
    // 全选/全不选功能
    function handleSelectAll() {
        const visibleCheckboxes = getVisibleCheckboxes();
        const marketData = getMarketData();
        
        if (isAllSelected) {
            // 全不选
            visibleCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                const item = checkbox.closest('.shopping-item');
                item.style.backgroundColor = 'white';
                
                // 更新数据
                const itemData = marketData.find(data => data.id === checkbox.id);
                if (itemData) {
                    itemData.checked = false;
                }
            });
            isAllSelected = false;
            showMessage('已取消全选');
        } else {
            // 全选
            visibleCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
                const item = checkbox.closest('.shopping-item');
                item.style.backgroundColor = '#f0f8ff';
                
                // 更新数据
                const itemData = marketData.find(data => data.id === checkbox.id);
                if (itemData) {
                    itemData.checked = true;
                }
            });
            isAllSelected = true;
            showMessage(`已选中 ${visibleCheckboxes.length} 个物品`);
        }
        
        saveMarketData(marketData);
        updateSelectAllButtonText();
    }
    
    // 更新全选按钮状态
    function updateSelectAllButton() {
        const visibleCheckboxes = getVisibleCheckboxes();
        const checkedCount = visibleCheckboxes.filter(cb => cb.checked).length;
        
        if (checkedCount === 0) {
            isAllSelected = false;
        } else if (checkedCount === visibleCheckboxes.length) {
            isAllSelected = true;
        } else {
            isAllSelected = false;
        }
        
        updateSelectAllButtonText();
    }
    
    // 更新全选按钮文字和样式
    function updateSelectAllButtonText() {
        const selectAllText = selectAllBtn.querySelector('.select-all-text');
        
        if (isAllSelected) {
            selectAllText.textContent = '全不选';
            selectAllBtn.classList.add('deselect');
        } else {
            selectAllText.textContent = '全选';
            selectAllBtn.classList.remove('deselect');
        }
    }
    
    // 清空已选功能
    function handleClearSelected() {
        const checkedItems = document.querySelectorAll('input[type=\"checkbox\"]:checked');
        
        if (checkedItems.length === 0) {
            showMessage('没有选中的物品');
            return;
        }
        
        if (confirm(`确定要移除 ${checkedItems.length} 个已选物品吗？`)) {
            let removedCount = 0;
            const totalToRemove = checkedItems.length;
            
            checkedItems.forEach((checkbox, index) => {
                const item = checkbox.closest('.shopping-item');
                
                setTimeout(() => {
                    removeShoppingItem(item);
                    removedCount++;
                    
                    if (removedCount === totalToRemove) {
                        setTimeout(() => {
                            showMessage(`已移除 ${totalToRemove} 个物品`);
                        }, 350);
                    }
                }, index * 100);
            });
        }
    }
    
    // 分享功能
    function handleShare() {
        const allItems = getMarketData();
        const checkedItems = allItems.filter(item => item.checked);
        
        if (checkedItems.length === 0) {
            showMessage('请先选择要分享的物品');
            return;
        }
        
        let shareText = '📝 我的购菜清单：\\n\\n';
        checkedItems.forEach((item, index) => {
            shareText += `${index + 1}. ${item.name} - ${item.description} × ${item.quantity}\\n`;
        });
        shareText += '\\n🍳 来自 ChefMate 应用';
        
        if (navigator.share) {
            navigator.share({
                title: '购菜清单',
                text: shareText
            }).catch(err => {
                console.log('分享失败:', err);
                copyToClipboard(shareText);
            });
        } else {
            copyToClipboard(shareText);
        }
    }
    
    // 显示添加食材弹窗
    function showAddItemModal() {
        const categories = getCategories().filter(cat => cat.id !== 'all');
        let categoryOptions = '';
        categories.forEach(cat => {
            categoryOptions += `<option value="${cat.id}">${cat.name}</option>`;
        });
        
        const modalHTML = `
            <div class="add-item-modal" id="addItemModal">
                <div class="modal-overlay" onclick="closeAddItemModal()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>添加食材</h3>
                        <button class="modal-close" onclick="closeAddItemModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="itemName">食材名称</label>
                            <input type="text" id="itemName" placeholder="请输入食材名称" maxlength="20">
                        </div>
                        <div class="form-group">
                            <label for="itemWeight">重量/数量</label>
                            <input type="text" id="itemWeight" placeholder="如：500g、2个、1包" maxlength="10">
                        </div>
                        <div class="form-group">
                            <label>大小规格</label>
                            <div class="size-options">
                                <label class="size-option">
                                    <input type="radio" name="itemSize" value="极小">
                                    <span>极小</span>
                                </label>
                                <label class="size-option">
                                    <input type="radio" name="itemSize" value="小">
                                    <span>小</span>
                                </label>
                                <label class="size-option">
                                    <input type="radio" name="itemSize" value="中等" checked>
                                    <span>中等</span>
                                </label>
                                <label class="size-option">
                                    <input type="radio" name="itemSize" value="大">
                                    <span>大</span>
                                </label>
                                <label class="size-option">
                                    <input type="radio" name="itemSize" value="极大">
                                    <span>极大</span>
                                </label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="itemCategory">分类</label>
                            <select id="itemCategory">
                                ${categoryOptions}
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-cancel" onclick="closeAddItemModal()">取消</button>
                        <button class="btn-confirm" onclick="confirmAddItem()">添加</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        setTimeout(() => {
            const nameInput = document.getElementById('itemName');
            nameInput.focus();
            
            const modal = document.getElementById('addItemModal');
            modal.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmAddItem();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    closeAddItemModal();
                }
            });
        }, 100);
    }
    
    // 关闭弹窗
    window.closeAddItemModal = function() {
        const modal = document.getElementById('addItemModal');
        if (modal) modal.remove();
    };
    
    window.closeAddCategoryModal = function() {
        const modal = document.getElementById('addCategoryModal');
        if (modal) modal.remove();
    };
    
    // 确认添加食材
    window.confirmAddItem = function() {
        const name = document.getElementById('itemName').value.trim();
        const weight = document.getElementById('itemWeight').value.trim();
        const size = document.querySelector('input[name=\"itemSize\"]:checked').value;
        const category = document.getElementById('itemCategory').value;
        
        if (!name) {
            showMessage('请输入食材名称');
            return;
        }
        
        let description = '';
        if (weight) {
            description += weight;
        }
        if (size) {
            description += (description ? '，' : '') + size;
        }
        if (!description) {
            description = '自定义添加';
        }
        
        addNewItem(name, description, category);
        closeAddItemModal();
    };
    
    // 确认添加分类
    window.confirmAddCategory = function() {
        const name = document.getElementById('categoryName').value.trim();
        const icon = document.getElementById('categoryIcon').value.trim();
        
        if (!name) {
            showMessage('请输入分类名称');
            return;
        }
        
        const categories = getCategories();
        const newCategory = {
            id: 'custom_' + Date.now(),
            name: name,
            icon: icon || '📦'
        };
        
        categories.push(newCategory);
        saveCategories(categories);
        renderCategories(categories);
        
        showMessage(`已添加分类 "${name}"`);
        closeAddCategoryModal();
    };
    
    // 添加新物品
    function addNewItem(name, description = '自定义添加', category = 'vegetables') {
        const marketData = getMarketData();
        const newItem = {
            id: 'item_' + Date.now(),
            name: name,
            description: description,
            category: category,
            quantity: 1,
            checked: false
        };
        
        marketData.push(newItem);
        saveMarketData(marketData);
        renderShoppingList(marketData);
        
        showMessage(`已添加 "${name}" 到购菜篮`);
        
        // 滚动到新添加的物品
        setTimeout(() => {
            const newItemElement = document.querySelector(`[data-id="${newItem.id}"]`);
            if (newItemElement) {
                newItemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }
    
    // 移除购物物品
    function removeShoppingItem(item) {
        const itemId = item.dataset.id;
        const itemName = item.querySelector('h3').textContent;
        
        // 从数据中移除
        const marketData = getMarketData();
        const updatedData = marketData.filter(data => data.id !== itemId);
        saveMarketData(updatedData);
        
        // 添加移除动画
        item.style.transition = 'all 0.3s ease';
        item.style.transform = 'translateX(-100%)';
        item.style.opacity = '0';
        
        setTimeout(() => {
            if (item.parentNode) {
                item.remove();
                updateSelectAllButton();
                showMessage(`已移除 "${itemName}"`);
                
                // 检查是否还有物品
                const remainingItems = document.querySelectorAll('.shopping-item');
                if (remainingItems.length === 0) {
                    showEmptyBasket();
                }
            }
        }, 300);
    }
    
    // 显示空购物篮状态
    function showEmptyBasket() {
        const shoppingList = document.querySelector('.shopping-list');
        const addItemBtn = document.querySelector('.add-item-button');
        
        // 清除所有购物项目，但保留添加按钮
        const existingItems = shoppingList.querySelectorAll('.shopping-item');
        existingItems.forEach(item => item.remove());
        
        // 在添加按钮前插入空状态
        const emptyStateHTML = `
            <div class="empty-basket" style="text-align: center; padding: 40px 20px; color: #999;">
                <div style="font-size: 48px; margin-bottom: 15px;">🛒</div>
                <h3 style="font-size: 18px; margin-bottom: 10px; color: #666;">购菜篮空空如也</h3>
                <p style="font-size: 14px; margin-bottom: 20px;">去添加一些食材吧</p>
                <button onclick="window.location.href='home.html'" style="
                    background: #FFA242; 
                    color: white; 
                    border: none; 
                    border-radius: 20px; 
                    padding: 10px 20px; 
                    font-size: 14px; 
                    cursor: pointer;
                ">浏览食谱</button>
            </div>
        `;
        
        addItemBtn.insertAdjacentHTML('beforebegin', emptyStateHTML);
    }
    
    // 复制到剪贴板
    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showMessage('清单已复制到剪贴板');
            }).catch(() => {
                showMessage('复制失败，请手动复制');
            });
        } else {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showMessage('清单已复制到剪贴板');
            } catch (err) {
                showMessage('复制失败，请手动复制');
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
});