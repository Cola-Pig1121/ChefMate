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
            const shoppingItem = this.closest('.shopping-item');
            
            if (this.classList.contains('plus')) {
                currentQuantity++;
            } else if (this.classList.contains('minus') && currentQuantity > 0) {
                currentQuantity--;
            }
            
            quantitySpan.textContent = currentQuantity;
            
            // 如果数量为0，自动移除物品
            if (currentQuantity === 0) {
                removeShoppingItem(shoppingItem);
                return;
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
        
        if (confirm(`确定要移除 ${checkedItems.length} 个已选物品吗？`)) {
            let removedCount = 0;
            const totalToRemove = checkedItems.length;
            
            checkedItems.forEach((checkbox, index) => {
                const item = checkbox.closest('.shopping-item');
                
                // 添加延迟动画效果
                setTimeout(() => {
                    removeShoppingItem(item);
                    removedCount++;
                    
                    // 最后一个物品移除后显示总结消息
                    if (removedCount === totalToRemove) {
                        setTimeout(() => {
                            showMessage(`已移除 ${totalToRemove} 个物品`);
                        }, 350);
                    }
                }, index * 100); // 每个物品延迟100ms
            });
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
        showAddItemModal();
    });

    // 显示添加食材弹窗
    function showAddItemModal() {
        // 创建弹窗HTML
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
                                <option value="vegetables">蔬菜</option>
                                <option value="fruits">水果</option>
                                <option value="meat">肉类</option>
                                <option value="seafood">海鲜</option>
                                <option value="dairy">乳制品</option>
                                <option value="grains">谷物</option>
                                <option value="seasoning">调料</option>
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
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 聚焦到名称输入框
        setTimeout(() => {
            const nameInput = document.getElementById('itemName');
            nameInput.focus();
            
            // 添加键盘事件
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

    // 关闭添加食材弹窗
    window.closeAddItemModal = function() {
        const modal = document.getElementById('addItemModal');
        if (modal) {
            modal.remove();
        }
    };

    // 确认添加食材
    window.confirmAddItem = function() {
        const name = document.getElementById('itemName').value.trim();
        const weight = document.getElementById('itemWeight').value.trim();
        const size = document.querySelector('input[name="itemSize"]:checked').value;
        const category = document.getElementById('itemCategory').value;
        
        if (!name) {
            showMessage('请输入食材名称');
            return;
        }
        
        // 构建描述文本
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

    // 添加新物品到列表
    function addNewItem(name, description = '自定义添加', category = 'vegetables') {
        const shoppingList = document.querySelector('.shopping-list');
        const newItemId = 'item' + Date.now();
        
        const newItemHTML = `
            <div class="shopping-item" data-category="${category}">
                <div class="item-check">
                    <input type="checkbox" id="${newItemId}">
                    <label for="${newItemId}"></label>
                </div>
                <div class="item-info">
                    <h3>${name}</h3>
                    <p>${description}</p>
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
        
        // 更新全选按钮状态
        updateSelectAllButton();
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
                
                // 如果数量为0，自动移除物品
                if (currentQuantity === 0) {
                    removeShoppingItem(item);
                    return;
                }
                
                updateSelectAllButton();
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

    // 移除购物物品
    function removeShoppingItem(item) {
        const itemName = item.querySelector('h3').textContent;
        
        // 添加移除动画
        item.style.transition = 'all 0.3s ease';
        item.style.transform = 'translateX(-100%)';
        item.style.opacity = '0';
        
        // 动画完成后移除元素
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
        shoppingList.innerHTML = `
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