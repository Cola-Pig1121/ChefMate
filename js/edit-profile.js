// 编辑资料页面功能
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('profileForm');
    const saveBtn = document.getElementById('saveBtn');
    const avatarInput = document.getElementById('avatarInput');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarContainer = document.querySelector('.avatar-container');
    const bioTextarea = document.getElementById('bio');
    const bioCount = document.getElementById('bioCount');

    // 默认用户数据
    const defaultUserData = {
        username: 'Chef',
        phone: '00000000000',
        email: '',
        gender: '',
        birthday: '',
        bio: '',
        avatar: '../images/user_default.jpg',
        dietary: [],
        cookingLevel: '',
        favoritesCuisine: ''
    };

    // 从localStorage加载用户数据
    function loadUserData() {
        const savedData = localStorage.getItem('chefmate_user_profile');
        return savedData ? { ...defaultUserData, ...JSON.parse(savedData) } : defaultUserData;
    }

    // 保存用户数据到localStorage
    function saveUserData(data) {
        localStorage.setItem('chefmate_user_profile', JSON.stringify(data));
    }

    // 初始化表单数据
    function initializeForm() {
        const userData = loadUserData();
        
        // 填充基本信息
        document.getElementById('username').value = userData.username || '';
        document.getElementById('phone').value = userData.phone || '';
        document.getElementById('email').value = userData.email || '';
        document.getElementById('gender').value = userData.gender || '';
        document.getElementById('birthday').value = userData.birthday || '';
        document.getElementById('bio').value = userData.bio || '';
        document.getElementById('cookingLevel').value = userData.cookingLevel || '';
        document.getElementById('favoritesCuisine').value = userData.favoritesCuisine || '';
        
        // 设置头像
        if (userData.avatar) {
            avatarPreview.src = userData.avatar;
        }
        
        // 设置饮食偏好
        const dietaryCheckboxes = document.querySelectorAll('input[name="dietary"]');
        dietaryCheckboxes.forEach(checkbox => {
            checkbox.checked = userData.dietary.includes(checkbox.value);
        });
        
        // 更新字符计数
        updateCharCount();
    }

    // 头像上传功能
    avatarContainer.addEventListener('click', function() {
        avatarInput.click();
    });

    avatarInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // 验证文件类型
            if (!file.type.startsWith('image/')) {
                showMessage('请选择图片文件');
                return;
            }
            
            // 验证文件大小 (5MB)
            if (file.size > 5 * 1024 * 1024) {
                showMessage('图片大小不能超过5MB');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                avatarPreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // 字符计数功能
    function updateCharCount() {
        const currentLength = bioTextarea.value.length;
        bioCount.textContent = currentLength;
        
        if (currentLength > 180) {
            bioCount.style.color = '#ff5252';
        } else if (currentLength > 150) {
            bioCount.style.color = '#FFA242';
        } else {
            bioCount.style.color = '#999';
        }
    }

    bioTextarea.addEventListener('input', updateCharCount);

    // 表单验证
    function validateForm() {
        const username = document.getElementById('username').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const email = document.getElementById('email').value.trim();
        
        if (!username) {
            showMessage('请输入用户名');
            return false;
        }
        
        if (username.length < 2 || username.length > 20) {
            showMessage('用户名长度应在2-20个字符之间');
            return false;
        }
        
        if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
            showMessage('请输入正确的手机号');
            return false;
        }
        
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showMessage('请输入正确的邮箱地址');
            return false;
        }
        
        return true;
    }

    // 收集表单数据
    function collectFormData() {
        const formData = new FormData(form);
        const data = {};
        
        // 基本信息
        data.username = formData.get('username').trim();
        data.phone = formData.get('phone').trim();
        data.email = formData.get('email').trim();
        data.gender = formData.get('gender');
        data.birthday = formData.get('birthday');
        data.bio = formData.get('bio').trim();
        data.cookingLevel = formData.get('cookingLevel');
        data.favoritesCuisine = formData.get('favoritesCuisine');
        
        // 头像
        data.avatar = avatarPreview.src;
        
        // 饮食偏好
        data.dietary = [];
        const dietaryCheckboxes = document.querySelectorAll('input[name="dietary"]:checked');
        dietaryCheckboxes.forEach(checkbox => {
            data.dietary.push(checkbox.value);
        });
        
        return data;
    }

    // 保存表单
    function saveProfile() {
        if (!validateForm()) {
            return;
        }
        
        // 显示加载状态
        saveBtn.classList.add('loading');
        saveBtn.textContent = '保存中...';
        
        // 模拟网络延迟
        setTimeout(() => {
            try {
                const formData = collectFormData();
                saveUserData(formData);
                
                // 显示成功消息
                showMessage('保存成功！', 'success');
                
                // 延迟跳转回个人中心
                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 1500);
                
            } catch (error) {
                console.error('保存失败:', error);
                showMessage('保存失败，请重试');
            } finally {
                // 恢复按钮状态
                saveBtn.classList.remove('loading');
                saveBtn.textContent = '保存';
            }
        }, 1000);
    }

    // 显示消息提示
    function showMessage(message, type = 'error') {
        // 移除已存在的消息
        const existingMessage = document.querySelector('.success-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageEl = document.createElement('div');
        messageEl.className = 'success-message';
        messageEl.textContent = message;
        
        if (type === 'success') {
            messageEl.style.background = 'rgba(87, 180, 0, 0.9)';
        }
        
        document.body.appendChild(messageEl);
        
        // 显示消息
        setTimeout(() => {
            messageEl.classList.add('show');
        }, 100);
        
        // 自动隐藏
        setTimeout(() => {
            messageEl.classList.remove('show');
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }, 2000);
    }

    // 事件监听
    saveBtn.addEventListener('click', saveProfile);
    
    // 表单提交事件
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        saveProfile();
    });
    
    // 输入框回车提交
    form.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            saveProfile();
        }
    });

    // 初始化表单
    initializeForm();
    
    // 页面离开前提醒
    let formChanged = false;
    
    // 监听表单变化
    form.addEventListener('input', function() {
        formChanged = true;
    });
    
    form.addEventListener('change', function() {
        formChanged = true;
    });
    
    // 页面离开提醒
    window.addEventListener('beforeunload', function(e) {
        if (formChanged) {
            e.preventDefault();
            e.returnValue = '您有未保存的更改，确定要离开吗？';
            return e.returnValue;
        }
    });
    
    // 保存成功后清除变化标记
    const originalSaveProfile = saveProfile;
    saveProfile = function() {
        originalSaveProfile();
        formChanged = false;
    };
});