from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import uuid

def create_app():
    app = Flask(__name__)
    CORS(app)  # 启用CORS支持
    
    # 配置静态文件夹
    app.static_folder = '../recipes'
    
    @app.route('/api/recipes')
    def get_recipes():
        """获取所有食谱的列表"""
        recipes_dir = os.path.join(app.root_path, '../recipes')
        recipes = []
        
        # 检查目录是否存在
        if not os.path.exists(recipes_dir):
            return jsonify({'error': 'Recipes directory not found'}), 404
        
        # 遍历所有JSON文件
        for filename in os.listdir(recipes_dir):
            if filename.endswith('.json'):
                file_path = os.path.join(recipes_dir, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        # 获取食谱名称（JSON文件中的键）
                        recipe_name = list(data.keys())[0]
                        recipe_data = data[recipe_name]
                        
                        # 添加食谱信息到列表
                        recipes.append({
                            'id': os.path.splitext(filename)[0],  # 使用文件名作为ID
                            'name': recipe_name,
                            'title': recipe_data.get('title', recipe_name),
                            'category': recipe_data.get('category', ''),
                            'time': recipe_data.get('time', '未知'),
                            'likes': recipe_data.get('likes', 0),
                            'image': recipe_data.get('image', 'images/placeholder.jpg')
                        })
                except Exception as e:
                    print(f"Error reading {filename}: {str(e)}")
                    continue
        
        return jsonify(recipes)
    
    @app.route('/api/recipes/<recipe_id>')
    def get_recipe(recipe_id):
        """获取特定食谱的详细信息"""
        recipes_dir = os.path.join(app.root_path, '../recipes')
        file_path = os.path.join(recipes_dir, f'{recipe_id}.json')
        
        # 检查文件是否存在
        if not os.path.exists(file_path):
            return jsonify({'error': 'Recipe not found'}), 404
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return jsonify(data)
        except Exception as e:
            return jsonify({'error': f'Error reading recipe: {str(e)}'}), 500
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=3000)