// 购菜篮页面功能
document.addEventListener('DOMContentLoaded', function() {
    const categoryTabs = document.querySelectorAll('.tab');
    const shoppingItems = document.querySelectorAll('.shopping-item');
    const quantityBtns = document.querySelectorAll('.quantity-btn');
    const clearBtn = document.querySelector('.clear-btn');
    const shareBtn = document.querySelector('.share-btn');
    const addItemBtn = document.querySelector('.add-item-button');
    const selectAllBtn = document.getElementById('selectAllBtn');
    
    let isAllSelected = false;

    // 分类筛选功能
    categoryTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有active状态
            categoryTabs.forEach(t => t.classList.remove('active'));
            // 添加active状态到当前标签
            this.classList.add('active');
            
            const selectedCategory = this.dataset.category;
            
            // 筛选显示物品
            shoppingItems.forEach(item => {
                if (selectedCategory === 'all' || item.dataset.category === selectedCategory) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // 更新全选按钮状态
            updateSelectAllButton();
            
            // 平滑滚动到列表顶部
            const listContainer = document.querySelector('.shopping-list-container');
            listContainer.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    });

    // 数量控制功能
    quantityBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const quantitySpan = this.parentNode.querySelector('.quantity');
            let currentQuantity = parseInt(quantitySpan.textContent);
            
            if (this.classList.contains('plus')) {
                currentQuantity++;
            } else if (this.classList.contains('minus') && currentQuantity > 0) {
                currentQuantity--;
            }
            
            quantitySpan.textContent = currentQuantity;
            
            // 如果数量为0，自动取消选中
            if (currentQuantity === 0) {
                const checkbox = this.closest('.shopping-item').querySelector('input[type="checkbox"]');
                checkbox.checked = false;
            }
        });
    });

    // 复选框状态变化
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const item = this.closest('.shopping-item');
            if (this.checked) {
                item.style.backgroundColor = '#f0f8ff';
            } else {
                item.style.backgroundColor = 'white';
            }
            updateSelectAllButton();
        });
    });

    // 全选/全不选功能
    selectAllBtn.addEventListener('click', function() {
        const visibleCheckboxes = getVisibleCheckboxes();
        
        if (isAllSelected) {
            // 全不选
            visibleCheckboxes.forEach(checkbox => {
                checkbox.checked = false;
                const item = checkbox.closest('.shopping-item');
                item.style.backgroundColor = 'white';
            });
            isAllSelected = false;
            updateSelectAllButtonText();
            showMessage('已取消全选');
        } else {
            // 全选
            visibleCheckboxes.forEach(checkbox => {
                checkbox.checked = true;
                const item = checkbox.closest('.shopping-item');
                item.style.backgroundColor = '#f0f8ff';
            });
            isAllSelected = true;
            updateSelectAllButtonText();
            showMessage(`已选中 ${visibleCheckboxes.length} 个物品`);
        }
    });

    // 获取当前可见的复选框
    function getVisibleCheckboxes() {
        const visibleItems = Array.from(shoppingItems).filter(item => 
            item.style.display !== 'none'
        );
        return visibleItems.map(item => item.querySelector('input[type="checkbox"]'));
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
    clearBtn.addEventListener('click', function() {
        const checkedItems = document.querySelectorAll('input[type="checkbox"]:checked');
        
        if (checkedItems.length === 0) {
            showMessage('没有选中的物品');
            return;
        }
        
        if (confirm(`确定要清空 ${checkedItems.length} 个已选物品吗？`)) {
            checkedItems.forEach(checkbox => {
                checkbox.checked = false;
                const item = checkbox.closest('.shopping-item');
                item.style.backgroundColor = 'white';
                
                // 重置数量为1
                const quantitySpan = item.querySelector('.quantity');
                quantitySpan.textContent = '1';
            });
            
            showMessage('已清空选中物品');
        }
    });

    // 分享清单功能
    shareBtn.addEventListener('click', function() {
        const allItems = [];
        shoppingItems.forEach(item => {
            const name = item.querySelector('h3').textContent;
            const desc = item.querySelector('p').textContent;
            const quantity = item.querySelector('.quantity').textContent;
            const checked = item.querySelector('input[type="checkbox"]').checked;
            
            allItems.push({
                name,
                desc,
                quantity,
                checked
            });
        });
        
        const checkedItems = allItems.filter(item => item.checked);
        
        if (checkedItems.length === 0) {
            showMessage('请先选择要分享的物品');
            return;
        }
        
        // 生成分享文本
        let shareText = '📝 我的购菜清单：\n\n';
        checkedItems.forEach((item, index) => {
            shareText += `${index + 1}. ${item.name} - ${item.desc} × ${item.quantity}\n`;
        });
        shareText += '\n🍳 来自 ChefMate 应用';
        
        // 尝试使用Web Share API
        if (navigator.share) {
            navigator.share({
                title: '购菜清单',
                text: shareText
            }).catch(err => {
                console.log('分享失败:', err);
                copyToClipboard(shareText);
            });
        } else {
            // 备用方案：复制到剪贴板
            copyToClipboard(shareText);
        }
    });

    // 添加食材功能
    addItemBtn.addEventListener('click', function() {
        const itemName = prompt('请输入食材名称：');
        if (itemName && itemName.trim()) {
            addNewItem(itemName.trim());
        }
    });

    // 添加新物品到列表
    function addNewItem(name) {
        const shoppingList = document.querySelector('.shopping-list');
        const newItemId = 'item' + Date.now();
        
        const newItemHTML = `
            <div class="shopping-item" data-category="all">
                <div class="item-check">
                    <input type="checkbox" id="${newItemId}">
                    <label for="${newItemId}"></label>
                </div>
                <div class="item-info">
                    <h3>${name}</h3>
                    <p>自定义添加</p>
                </div>
                <div class="item-quantity">
                    <button class="quantity-btn minus">-</button>
                    <span class="quantity">1</span>
                    <button class="quantity-btn plus">+</button>
                </div>
            </div>
        `;
        
        // 在添加按钮前插入新物品
        addItemBtn.insertAdjacentHTML('beforebegin', newItemHTML);
        
        // 为新物品绑定事件
        const newItem = addItemBtn.previousElementSibling;
        bindItemEvents(newItem);
        
        showMessage(`已添加 "${name}" 到购菜篮`);
        
        // 滚动到新添加的物品
        newItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 为物品绑定事件
    function bindItemEvents(item) {
        // 数量控制
        const quantityBtns = item.querySelectorAll('.quantity-btn');
        quantityBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const quantitySpan = this.parentNode.querySelector('.quantity');
                let currentQuantity = parseInt(quantitySpan.textContent);
                
                if (this.classList.contains('plus')) {
                    currentQuantity++;
                } else if (this.classList.contains('minus') && currentQuantity > 0) {
                    currentQuantity--;
                }
                
                quantitySpan.textContent = currentQuantity;
                
                if (currentQuantity === 0) {
                    const checkbox = this.closest('.shopping-item').querySelector('input[type="checkbox"]');
                    checkbox.checked = false;
                    item.style.backgroundColor = 'white';
                }
            });
        });
        
        // 复选框
        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                item.style.backgroundColor = '#f0f8ff';
            } else {
                item.style.backgroundColor = 'white';
            }
            updateSelectAllButton();
        });
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
            // 备用方案
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
        // 移除已存在的消息
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
        
        // 显示消息
        setTimeout(() => {
            messageEl.style.opacity = '1';
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            messageEl.style.opacity = '0';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }, 2000);
    }

    // 初始化：显示所有物品
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
        activeTab.click();
    }
    
    // 初始化全选按钮状态
    updateSelectAllButton();
});