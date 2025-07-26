import csv
import json
import uuid
import os

# 读取CSV文件并生成JSON文件
def generate_recipe_json():
    # 确保recipes目录存在
    if not os.path.exists('recipes'):
        os.makedirs('recipes')
    
    # 读取CSV文件
    with open('recipe.csv', 'r', encoding='utf-8-sig') as csvfile:
        reader = csv.reader(csvfile)
        
        # 跳过标题行
        next(reader)
        
        # 为每一行创建JSON文件
        for row in reader:
            # 生成UUID作为文件名
            file_name = str(uuid.uuid4()) + '.json'
            file_path = os.path.join('recipes', file_name)
            
            # 解析食材和步骤
            ingredients_list = row[2].split(' | ') if len(row) > 2 else []
            steps_list = row[3].split(' | ') if len(row) > 3 else []
            
            # 创建JSON数据
            recipe_data = {
                row[0]: {
                    "image": "images/placeholder.jpg",
                    "title": row[0],
                    "category": row[1] if len(row) > 1 else "",
                    "time": "60min",
                    "likes": "100+",
                    "ingredients": ingredients_list,
                    "condiments": [],
                    "steps": steps_list
                }
            }
            
            # 写入JSON文件
            with open(file_path, 'w', encoding='utf-8') as jsonfile:
                json.dump(recipe_data, jsonfile, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    generate_recipe_json()