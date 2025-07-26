# ChefMate - 智能菜谱助手

ChefMate是一款智能菜谱助手应用，帮助用户发现、收藏和购买食材制作美食。

## 功能特点

### 1. 首页 (home.html)
- 浏览推荐菜谱
- 按分类筛选菜谱（鲁菜、川菜、粤菜等）
- 搜索菜谱功能
- 收藏喜欢的菜谱
- 语音输入搜索菜谱
- 日期选择功能

### 2. 菜谱详情 (recipe-detail.html)
- 查看菜谱详细信息（食材、步骤等）
- 收藏菜谱功能
- 添加食材到购物篮
- 分享菜谱
- 调整食材分量
- 进入烹饪模式

### 3. 收藏夹 (favorites.html)
- 查看收藏的菜谱
- 查看收藏的食材
- 分类筛选（全部、菜谱、食材）
- 删除收藏项
- 分享功能

### 4. 购物篮 (shopping-basket.html)
- 管理购物清单
- 按分类查看食材（蔬菜、水果、肉类等）
- 添加新食材
- 添加新分类
- 标记已购买食材
- 调整食材数量
- 收藏常用食材
- 分享购物清单

### 5. 个人中心 (profile.html)
- 查看个人资料
- 编辑个人资料
- 查看成就徽章
- 设置功能

### 6. 搜索功能 (search.html)
- 搜索菜谱
- 按分类筛选
- 语音搜索

## 技术实现

### 前端
- HTML5 + CSS3 + JavaScript
- 响应式设计，适配移动端
- 本地存储 (localStorage)

### 后端
- Python Flask API
- 语音识别功能
- 菜谱数据管理

## 使用说明

1. 打开 `index.html` 进入应用
2. 在首页浏览推荐菜谱或使用搜索功能查找菜谱
3. 点击菜谱卡片查看详细信息
4. 在菜谱详情页可以：
   - 收藏菜谱
   - 添加所需食材到购物篮
   - 调整食材分量
   - 分享菜谱
5. 在购物篮页面可以：
   - 管理购物清单
   - 按分类查看食材
   - 添加新食材
   - 标记已购买食材
6. 在收藏夹页面可以：
   - 查看收藏的菜谱和食材
   - 删除不需要的收藏项

## 开发说明

### 项目结构
```
chefmateweb/
├── index.html          # 应用入口
├── home.html           # 首页
├── recipe-detail.html  # 菜谱详情页
├── favorites.html      # 收藏夹页
├── shopping-basket.html# 购物篮页
├── profile.html        # 个人中心页
├── search.html         # 搜索页
├── css/                # 样式文件
├── js/                 # JavaScript文件
├── images/             # 图片资源
├── recipes/            # 菜谱数据文件
└── backend/            # 后端API
```

### 主要JavaScript文件
- `script.js`: 首页功能实现
- `recipe-detail.js`: 菜谱详情页功能实现
- `favorites.js`: 收藏夹功能实现
- `shopping-basket.js`: 购物篮功能实现
- `profile.js`: 个人中心功能实现
- `search.js`: 搜索功能实现

### 本地存储键名
- `chefmate_favorites`: 收藏数据
- `chefmate_market_data`: 购物篮数据
- `chefmate_categories`: 自定义分类数据
- `chefmate_user_info`: 用户信息

## 后端API
后端使用Python Flask实现，提供以下功能：
- 语音识别转文字
- 菜谱数据管理
- 用户数据管理

运行后端服务：
```bash
python backend/app.py
```

## 注意事项
1. 应用使用localStorage存储数据，请勿清除浏览器数据
2. 部分功能需要网络连接（如语音识别）
3. 应用适配移动端，建议在手机上使用获得最佳体验
