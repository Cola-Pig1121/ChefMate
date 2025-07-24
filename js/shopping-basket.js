document.addEventListener('DOMContentLoaded', function() {
    // 从localStorage加载购物清单
    loadShoppingList();
    
    // 加载购物清单函数
    function loadShoppingList() {
        const shoppingList = document.querySelector('.shopping-list');
        const basketItems = JSON.parse(localStorage.getItem('basketItems') || '[]');
        
        // 如果有保存的购物项目，清空默认展示的项目
        if (basketItems.length > 0) {
            shoppingList.innerHTML = '';
            
            // 添加每个购物项目到清单
            basketItems.forEach((item, index) => {
                const itemHtml = `
                    <div class="shopping-item">
                        <div class="item-check">
                            <input type="checkbox" id="item${index}">
                            <label for="item${index}"></label>
                        </div>
                        <div class="item-info">
                            <h3>${item.name}</h3>
                            <p>${item.quantity}${item.unit || ''} × ${item.portion || 1}份</p>
                        </div>
                        <div class="item-quantity">
                            <button class="quantity-btn minus">-</button>
                            <span class="quantity">${item.portion || 1}</span>
                            <button class="quantity-btn plus">+</button>
                        </div>
                    </div>
                `;
                shoppingList.innerHTML += itemHtml;
            });
            
            // 重新绑定事件处理
            bindEventHandlers();
        }
    }
    
    // 绑定事件处理函数
    function bindEventHandlers() {
        // 重新绑定数量调整按钮
        const minusButtons = document.querySelectorAll('.minus');
        const plusButtons = document.querySelectorAll('.plus');
        
        minusButtons.forEach(button => {
            button.addEventListener('click', function() {
                const quantityElement = this.nextElementSibling;
                let quantity = parseInt(quantityElement.textContent);
                
                if (quantity > 1) {
                    quantity--;
                    quantityElement.textContent = quantity;
                    updateItemInStorage(button, quantity);
                }
            });
        });
        
        plusButtons.forEach(button => {
            button.addEventListener('click', function() {
                const quantityElement = this.previousElementSibling;
                let quantity = parseInt(quantityElement.textContent);
                
                quantity++;
                quantityElement.textContent = quantity;
                updateItemInStorage(button, quantity);
            });
        });
        
        // 重新绑定复选框功能
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const item = this.closest('.shopping-item');
                if (this.checked) {
                    item.style.opacity = '0.6';
                } else {
                    item.style.opacity = '1';
                }
            });
        });
        
        // 重新绑定滑动手势
        let touchStartX = 0;
        const items = document.querySelectorAll('.shopping-item');
        
        items.forEach(item => {
            item.addEventListener('touchstart', function(e) {
                touchStartX = e.touches[0].clientX;
            });
            
            item.addEventListener('touchmove', function(e) {
                const touchEndX = e.touches[0].clientX;
                const diff = touchStartX - touchEndX;
                
                if (diff > 100) {
                    this.classList.add('slide-left');
                } else {
                    this.classList.remove('slide-left');
                }
            });
            
            item.addEventListener('touchend', function(e) {
                if (this.classList.contains('slide-left')) {
                    if (confirm('确定要删除此项吗？')) {
                        this.style.opacity = '0';
                        setTimeout(() => {
                            // 删除localStorage中对应的项目
                            const index = Array.from(document.querySelectorAll('.shopping-item')).indexOf(this);
                            removeItemFromStorage(index);
                            this.remove();
                        }, 300);
                    } else {
                        this.classList.remove('slide-left');
                    }
                }
            });
        });
    }
    
    // 更新localStorage中的项目数量
    function updateItemInStorage(button, newQuantity) {
        const item = button.closest('.shopping-item');
        const index = Array.from(document.querySelectorAll('.shopping-item')).indexOf(item);
        
        const basketItems = JSON.parse(localStorage.getItem('basketItems') || '[]');
        if (basketItems[index]) {
            basketItems[index].portion = newQuantity;
            localStorage.setItem('basketItems', JSON.stringify(basketItems));
        }
    }
    
    // 从localStorage中删除项目
    function removeItemFromStorage(index) {
        const basketItems = JSON.parse(localStorage.getItem('basketItems') || '[]');
        if (index >= 0 && index < basketItems.length) {
            basketItems.splice(index, 1);
            localStorage.setItem('basketItems', JSON.stringify(basketItems));
        }
    }
    // 分类标签切换
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // 移除所有active状态
            tabs.forEach(t => t.classList.remove('active'));
            // 添加active状态到当前标签
            this.classList.add('active');
            
            // 获取当前选中的分类
            const category = this.textContent.trim();
            filterItems(category);
        });
    });
    
    // 根据分类过滤购物清单
    function filterItems(category) {
        const items = document.querySelectorAll('.shopping-item');
        
        if (category === '全部') {
            // 显示所有项目
            items.forEach(item => {
                item.style.display = 'flex';
            });
            return;
        }
        
        // 这里可以根据实际情况进行分类过滤
        // 此处为简化示例，实际应用中需要为每个项目添加分类属性
        items.forEach(item => {
            const itemName = item.querySelector('h3').textContent;
            let showItem = false;
            
            if (category === '蔬菜' && (itemName.includes('番茄') || itemName.includes('牛油果'))) {
                showItem = true;
            } else if (category === '肉类' && itemName.includes('排骨')) {
                showItem = true;
            } else if (category === '调料' && (itemName.includes('醋') || itemName.includes('砂糖'))) {
                showItem = true;
            }
            
            item.style.display = showItem ? 'flex' : 'none';
        });
    }
    
    // 数量调整按钮
    const minusButtons = document.querySelectorAll('.minus');
    const plusButtons = document.querySelectorAll('.plus');
    
    minusButtons.forEach(button => {
        button.addEventListener('click', function() {
            const quantityElement = this.nextElementSibling;
            let quantity = parseInt(quantityElement.textContent);
            
            if (quantity > 1) {
                quantity--;
                quantityElement.textContent = quantity;
            }
        });
    });
    
    plusButtons.forEach(button => {
        button.addEventListener('click', function() {
            const quantityElement = this.previousElementSibling;
            let quantity = parseInt(quantityElement.textContent);
            
            quantity++;
            quantityElement.textContent = quantity;
        });
    });
    
    // 清空已选按钮
    const clearButton = document.querySelector('.clear-btn');
    clearButton.addEventListener('click', function() {
        const checkedItems = document.querySelectorAll('input[type="checkbox"]:checked');
        
        if (checkedItems.length === 0) {
            alert('请先选择要删除的食材');
            return;
        }
        
        if (confirm('确定要删除选中的' + checkedItems.length + '个食材吗？')) {
            // 收集要删除的索引
            const indexesToRemove = [];
            checkedItems.forEach(checkbox => {
                const item = checkbox.closest('.shopping-item');
                const index = Array.from(document.querySelectorAll('.shopping-item')).indexOf(item);
                indexesToRemove.push(index);
                
                item.style.opacity = '0';
                setTimeout(() => {
                    item.remove();
                }, 300);
            });
            
            // 从localStorage中删除选中项
            const basketItems = JSON.parse(localStorage.getItem('basketItems') || '[]');
            // 从大到小排序，这样删除时不会影响其他索引
            indexesToRemove.sort((a, b) => b - a);
            
            indexesToRemove.forEach(index => {
                if (index >= 0 && index < basketItems.length) {
                    basketItems.splice(index, 1);
                }
            });
            
            localStorage.setItem('basketItems', JSON.stringify(basketItems));
        }
    });
    
    // 分享清单按钮
    const shareButton = document.querySelector('.share-btn');
    shareButton.addEventListener('click', function() {
        // 这里可以添加分享功能
        alert('分享功能即将上线，敬请期待！');
    });
    
    // 添加食材按钮
    const addButton = document.querySelector('.add-item-button');
    addButton.addEventListener('click', function() {
        // 这里可以添加新建食材的功能
        alert('添加食材功能即将上线，敬请期待！');
    });
    
    // 复选框功能
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const item = this.closest('.shopping-item');
            if (this.checked) {
                item.style.opacity = '0.6';
            } else {
                item.style.opacity = '1';
            }
        });
    });
    
    // 添加滑动手势以删除项目
    let touchStartX = 0;
    const items = document.querySelectorAll('.shopping-item');
    
    items.forEach(item => {
        item.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
        });
        
        item.addEventListener('touchmove', function(e) {
            const touchEndX = e.touches[0].clientX;
            const diff = touchStartX - touchEndX;
            
            // 向左滑动超过100px时，添加删除提示
            if (diff > 100) {
                this.classList.add('slide-left');
            } else {
                this.classList.remove('slide-left');
            }
        });
        
        item.addEventListener('touchend', function(e) {
            if (this.classList.contains('slide-left')) {
                if (confirm('确定要删除此项吗？')) {
                    this.style.opacity = '0';
                    setTimeout(() => {
                        this.remove();
                    }, 300);
                } else {
                    this.classList.remove('slide-left');
                }
            }
        });
    });
}); 