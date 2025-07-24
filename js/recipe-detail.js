document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const backBtn = document.querySelector('.back-btn');
    const shareBtn = document.querySelector('.share-btn');
    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    const decreaseBtn = document.querySelector('.portion-btn.decrease');
    const increaseBtn = document.querySelector('.portion-btn.increase');
    const portionCount = document.querySelector('.portion-count');
    const startCookingBtn = document.querySelector('.start-cooking-btn');
    const recipeImage = document.querySelector('.recipe-image');

    // 获取URL参数
    function getQueryParam(name) {
        const url = new URL(window.location.href);
        return url.searchParams.get(name);
    }

    // 菜品数据
    const recipes = {
        '牛油果番茄沙拉': {
            image: 'images/沙拉.jpeg',
            title: '牛油果番茄沙拉',
            category: '健康轻食',
            time: '40min',
            likes: '500+',
            ingredients: [
                '西红柿 2 颗',
                '牛油果 1 颗',
                '黄瓜 1 根',
                '洋葱 1 颗'
            ],
            condiments: [
                '沙拉酱 150ml（约等于两勺）'
            ],
            steps: [
                '将西红柿、牛油果、黄瓜、洋葱洗净切块。',
                '将所有蔬菜放入大碗中，加入沙拉酱。',
                '轻轻拌匀，使酱料均匀包裹蔬菜。',
                '装盘，点缀香菜即可享用。'
            ]
        },
        '糖醋排骨': {
            image: 'images/排骨.jpg',
            title: '糖醋排骨',
            category: '家常菜',
            time: '60min',
            likes: '800+',
            ingredients: [
                '排骨 500g',
                '生姜 3 片',
                '葱 1 根',
                '蒜 2 瓣'
            ],
            condiments: [
                '生抽 2勺',
                '老抽 1勺',
                '醋 2勺',
                '糖 3勺',
                '料酒 1勺'
            ],
            steps: [
                '排骨冷水下锅，焯水去血沫，捞出沥干。',
                '锅中加油，放入排骨煎至微黄。',
                '加入姜片、葱段、蒜炒香。',
                '倒入生抽、老抽、醋、糖、料酒，翻炒均匀。',
                '加适量清水，盖锅小火炖30分钟。',
                '大火收汁，至汤汁浓稠即可出锅。'
            ]
        }
    };

    // 获取参数
    const recipeName = getQueryParam('name') || '牛油果番茄沙拉';
    const recipe = recipes[recipeName] || recipes['牛油果番茄沙拉'];

    // 设置图片
    if (recipeImage) recipeImage.style.backgroundImage = `url('${recipe.image}')`;

    // 设置标题、分类、时间、点赞
    const titleEl = document.querySelector('.recipe-name');
    if (titleEl) titleEl.textContent = recipe.title;
    const categoryEl = document.querySelector('.recipe-category');
    if (categoryEl) categoryEl.textContent = recipe.category;
    const timeEl = document.querySelector('.stat-item img[alt="时间"]')?.nextElementSibling;
    if (timeEl) timeEl.textContent = recipe.time;
    const likesEl = document.querySelector('.stat-item img[alt="点赞"]')?.nextElementSibling;
    if (likesEl) likesEl.textContent = recipe.likes;

    // 设置食材
    const ingredientsGroups = document.querySelectorAll('.ingredients-group');
    if (ingredientsGroups[0]) {
        ingredientsGroups[0].querySelector('ul').innerHTML = recipe.ingredients.map(i => `<li><span class="ingredient-checkbox checked"></span>${i}</li>`).join('');
    }
    if (ingredientsGroups[1]) {
        ingredientsGroups[1].querySelector('ul').innerHTML = recipe.condiments.map(i => `<li><span class="ingredient-checkbox checked"></span>${i}</li>`).join('');
    }

    // 食材勾选交互
    function bindIngredientCheckbox() {
        document.querySelectorAll('.ingredient-checkbox').forEach(function(box) {
            box.addEventListener('click', function() {
                box.classList.toggle('checked');
            });
        });
    }
    bindIngredientCheckbox();

    // 添加到购菜篮按钮点击事件
    var addBtn = document.querySelector('.add-to-cart-btn');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            // 获取选中的食材
            var checkedIngredients = document.querySelectorAll('.ingredient-checkbox.checked');
            // 获取份数
            var portionText = document.querySelector('.portion-count')?.textContent || '1份';
            var portion = parseInt(portionText) || 1;
            
            // 收集选中的食材数据
            var basketItems = [];
            checkedIngredients.forEach(function(item) {
                var itemText = item.parentElement.textContent.trim();
                var itemName = itemText.split(' ')[0]; // 提取食材名称
                var itemQuantity = itemText.match(/\d+/g); // 提取数字
                
                basketItems.push({
                    name: itemName,
                    quantity: itemQuantity ? itemQuantity[0] : 1,
                    unit: itemText.match(/[颗根片勺]/g) ? itemText.match(/[颗根片勺]/g)[0] : '',
                    portion: portion
                });
            });
            
            // 保存到localStorage
            var existingItems = JSON.parse(localStorage.getItem('basketItems') || '[]');
            var newBasket = existingItems.concat(basketItems);
            localStorage.setItem('basketItems', JSON.stringify(newBasket));
            
            alert('已添加 ' + checkedIngredients.length + ' 种食材到购菜篮！');
            
            // 跳转到购菜篮页面
            if (confirm('是否立即前往购菜篮查看？')) {
                window.location.href = 'shopping-basket.html';
            }
        });
    }

    // 设置步骤概览
    const stepsSection = document.querySelector('.steps-section');
    if (stepsSection && recipe.steps) {
        stepsSection.innerHTML = '<h2>步骤概览</h2>' + recipe.steps.map((step, idx) => `<div class="step-item">步骤${idx+1}：${step}</div>`).join('');
    }

    // 返回按钮
    backBtn.addEventListener('click', function() {
        window.location.href = 'index.html';
    });

    // 分享按钮
    shareBtn.addEventListener('click', function() {
        // 这里可以添加分享功能
        alert('分享功能即将推出！');
    });

    // 份数控制
    let portion = 1;
    
    decreaseBtn.addEventListener('click', function() {
        if (portion > 1) {
            portion--;
            updatePortion();
        }
    });

    increaseBtn.addEventListener('click', function() {
        if (portion < 10) {
            portion++;
            updatePortion();
        }
    });

    function updatePortion() {
        portionCount.textContent = portion + '份';
    }

    // 开始烹饪
    startCookingBtn.addEventListener('click', function() {
        // 跳转到食谱制作过程页面，并传递当前食谱类型和名称
        let recipeType = 'salad';
        if (recipe.title === '糖醋排骨') {
            recipeType = 'paigu';
        }
        // 传递name参数，以便返回时能回到正确的详情页
        const recipeName = encodeURIComponent(recipe.title);
        window.location.href = `recipe-cooking.html?recipe=${recipeType}&from=${recipeType}&name=${recipeName}`;
    });
});

// 监听滚动事件实现图片放大效果
document.addEventListener('DOMContentLoaded', function() {
    const recipeDetail = document.querySelector('.recipe-detail');
    const recipeImage = document.querySelector('.recipe-image');
    
    if (recipeDetail && recipeImage) {
        recipeDetail.addEventListener('scroll', function() {
            const scrolled = this.scrollTop;
            const heroHeight = 350;
            const scale = 1 + (scrolled * 0.0005); // 调整这个数值可以改变放大速度
            
            if (scrolled <= heroHeight) {
                recipeImage.style.transform = `scale(${scale})`;
            }
        });
    }
});