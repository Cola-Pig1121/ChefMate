document.addEventListener('DOMContentLoaded', function () {
    // 初始化底部导航栏
    initBottomNavigation();
    // 加载用户头像
    loadUserAvatar();
    
    // 标签切换功能
    window.showTab = function (tabId) {
        // 隐藏所有内容
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => {
            content.classList.add('hidden');
        });

        // 显示选中的内容
        document.getElementById(tabId).classList.remove('hidden');

        // 更新标签状态
        const tabItems = document.querySelectorAll('.tab-item');
        tabItems.forEach(item => item.classList.remove('active'));

        // 根据内容ID更新对应标签的active状态
        if (tabId === 'main-content') {
            document.querySelector('.tab-item:first-child').classList.add('active');
        } else if (tabId === 'profile-content') {
            document.querySelector('.tab-item:last-child').classList.add('active');
        }
    };

    // 开始烹饪按钮功能
    window.startCooking = function () {
        // 这里可以添加开始烹饪的逻辑
        alert('开始烹饪功能即将推出！');
    };

    // 日期选择器交互
    const dateCircles = document.querySelectorAll('.date-circle');
    dateCircles.forEach(circle => {
        circle.addEventListener('click', function () {
            // 移除所有active状态
            dateCircles.forEach(c => c.classList.remove('active'));
            // 添加active状态到点击的日期
            this.classList.add('active');

            // 这里可以添加选择日期后的逻辑
            const selectedDate = this.textContent;
            console.log('选中日期：', selectedDate);
        });
    });

    // 搜索框点击事件
    const searchBar = document.querySelector('.search-bar');
    if (searchBar) {
        searchBar.addEventListener('click', function () {
            window.location.href = 'search.html';
        });
    }

    // 食谱详情展示
    window.showRecipeDetail = function (recipeName) {
        // 这里可以根据食谱名称显示相应的详情页
        alert(`查看${recipeName}的详细做法！`);
    };

    // 返回功能
    window.goBack = function () {
        // 显示主页
        showTab('main-content');
    };

    // 收藏按钮功能
    const favoriteButtons = document.querySelectorAll('.favorite-button');
    favoriteButtons.forEach(button => {
        button.addEventListener('click', function () {
            const icon = this.querySelector('i');
            if (icon.classList.contains('far')) {
                icon.classList.remove('far');
                icon.classList.add('fas');
                icon.style.color = '#ff9500';
            } else {
                icon.classList.remove('fas');
                icon.classList.add('far');
                icon.style.color = '';
            }
        });
    });

    // 语音输入功能
    const startCookingBtn = document.querySelector('.start-cooking');
    const voiceInputContainer = document.querySelector('.voice-input-container');

    // 检查元素是否存在
    if (!startCookingBtn) {
        console.log('start-cooking按钮不存在，跳过语音输入功能');
        // 继续执行其他代码，不要return
    } else {
        // 只有当按钮存在时才绑定语音输入事件
        initVoiceInput(startCookingBtn, voiceInputContainer);
    }

    function initVoiceInput(startCookingBtn, voiceInputContainer) {
        let touchStartY = 0;
        let isRecording = false;
        let longPressTimer;

        // 禁用默认的触摸行为
        document.addEventListener('touchmove', function (e) {
            if (isRecording) {
                e.preventDefault();
            }
        }, { passive: false });

        // 长按开始录音
        startCookingBtn.addEventListener('touchstart', function (e) {
            console.log('Touch start detected');
            touchStartY = e.touches[0].clientY;

            // 设置长按定时器
            longPressTimer = setTimeout(() => {
                console.log('Long press triggered');
                isRecording = true;
                startCookingBtn.classList.add('recording');
                if (voiceInputContainer) voiceInputContainer.classList.add('active');
                console.log('开始录音');
            }, 500); // 500ms长按触发
        }, { passive: false });

        // 触摸移动时检测是否需要取消
        startCookingBtn.addEventListener('touchmove', function (e) {
            console.log('Touch move detected');
            if (isRecording) {
                const currentY = e.touches[0].clientY;
                const moveDistance = touchStartY - currentY;
                console.log('Move distance:', moveDistance);

                // 如果向上移动超过50像素，显示取消状态
                if (moveDistance > 50) {
                    if (voiceInputContainer) voiceInputContainer.classList.add('cancel');
                } else {
                    if (voiceInputContainer) voiceInputContainer.classList.remove('cancel');
                }
            }
        }, { passive: false });

        // 触摸结束时处理录音结果
        startCookingBtn.addEventListener('touchend', function (e) {
            console.log('Touch end detected');
            clearTimeout(longPressTimer);

            if (isRecording) {
                const endY = e.changedTouches[0].clientY;
                const moveDistance = touchStartY - endY;
                console.log('Final move distance:', moveDistance);

                if (moveDistance > 50) {
                    // 取消录音
                    console.log('取消录音');
                } else {
                    // 完成录音
                    console.log('完成录音');
                }

                // 重置状态
                isRecording = false;
                startCookingBtn.classList.remove('recording');
                if (voiceInputContainer) voiceInputContainer.classList.remove('active');
                if (voiceInputContainer) voiceInputContainer.classList.remove('cancel');
            }
        });

        // 触摸取消时清理状态
        startCookingBtn.addEventListener('touchcancel', function () {
            console.log('Touch cancelled');
            clearTimeout(longPressTimer);
            if (isRecording) {
                isRecording = false;
                startCookingBtn.classList.remove('recording');
                if (voiceInputContainer) voiceInputContainer.classList.remove('active');
                if (voiceInputContainer) voiceInputContainer.classList.remove('cancel');
                console.log('录音被中断');
            }
        });

        // 防止长按时出现系统菜单
        startCookingBtn.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });
    }

    // 食谱卡片点击跳转
    const recipeCards = document.querySelectorAll('.recipe-card');
    recipeCards.forEach(card => {
        card.addEventListener('click', function () {
            const title = card.querySelector('h3')?.innerText || '';
            const param = encodeURIComponent(title);
            window.location.href = `recipe-detail.html?name=${param}`;
        });
    });

    const topBar = document.querySelector('.top-bar');
    const bottomNav = document.querySelector('.bottom-nav');

    function updateBlur() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPercentage = Math.min(Math.max(scrollTop / maxScroll, 0), 1);

        // 更新顶栏的模糊效果
        const topBlur = 10 * (1 - scrollPercentage);
        if (topBar) {
            topBar.style.backdropFilter = `blur(${topBlur}px)`;
            topBar.style.webkitBackdropFilter = `blur(${topBlur}px)`;
        }

        // 更新底栏的模糊效果
        const bottomBlur = 10 * scrollPercentage;
        if (bottomNav) {
            bottomNav.style.backdropFilter = `blur(${bottomBlur}px)`;
            bottomNav.style.webkitBackdropFilter = `blur(${bottomBlur}px)`;
        }
    }

    // 监听滚动事件
    window.addEventListener('scroll', updateBlur);
    // 初始化效果
    updateBlur();

    // 初始化底部导航栏功能
    function initBottomNavigation() {
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');
        const currentPage = getCurrentPage();

        // 设置当前页面的active状态
        setActiveNavItem(currentPage);

        // 为每个导航项添加点击事件
        navItems.forEach((item) => {
            item.addEventListener('click', function (e) {
                // 如果已经是当前页面，不执行跳转
                if (this.classList.contains('active')) {
                    e.preventDefault();
                    // 添加一个小的弹跳动画表示已经在当前页面
                    this.style.animation = 'none';
                    setTimeout(() => {
                        this.style.animation = 'navBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
                    }, 10);
                    return;
                }

                // 添加点击动画
                this.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 150);

                // 延迟跳转以显示动画
                setTimeout(() => {
                    // 执行原有的跳转逻辑
                    const onclick = this.getAttribute('onclick');
                    if (onclick) {
                        eval(onclick);
                    }
                }, 200);
            });

            // 添加触摸反馈
            item.addEventListener('touchstart', function () {
                this.style.transform = 'scale(0.95)';
            });

            item.addEventListener('touchend', function () {
                setTimeout(() => {
                    this.style.transform = '';
                }, 100);
            });
        });
    }

    // 获取当前页面名称
    function getCurrentPage() {
        const path = window.location.pathname;
        const page = path.substring(path.lastIndexOf('/') + 1);

        // 处理不同的页面名称
        switch (page) {
            case 'home.html':
            case 'index.html':
            case '':
                return 'home';
            case 'shopping-basket.html':
                return 'shopping';
            case 'profile.html':
                return 'profile';
            default:
                return 'home';
        }
    }

    // 设置活跃的导航项
    function setActiveNavItem(currentPage) {
        const navItems = document.querySelectorAll('.bottom-nav .nav-item');

        // 清除所有active状态
        navItems.forEach(item => item.classList.remove('active'));

        // 根据当前页面设置active状态
        let activeIndex = 0;
        switch (currentPage) {
            case 'home':
                activeIndex = 0;
                break;
            case 'shopping':
                activeIndex = 1;
                break;
            case 'profile':
                activeIndex = 2;
                break;
        }

        if (navItems[activeIndex]) {
            navItems[activeIndex].classList.add('active');
            // 添加进入动画
            setTimeout(() => {
                navItems[activeIndex].style.animation = 'navBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            }, 100);
        }
    }

    // 加载用户头像函数
    function loadUserAvatar() {
        const defaultUserData = {
            avatar: 'https://randomuser.me/api/portraits/women/44.jpg'
        };

        const savedData = localStorage.getItem('chefmate_user_profile');
        const userData = savedData ? { ...defaultUserData, ...JSON.parse(savedData) } : defaultUserData;

        const userAvatarImg = document.getElementById('userAvatarImg');
        if (userAvatarImg && userData.avatar) {
            userAvatarImg.src = userData.avatar;
        }
    }
});

// 添加平滑滚动效果
document.addEventListener('scroll', function () {
    // 可以在这里添加滚动相关的动画效果
}, { passive: true });