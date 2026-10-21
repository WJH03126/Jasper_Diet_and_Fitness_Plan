const foods = [
  { food_id: 'fd_001', name: '白米饭', standard_weight: 150, energy_per_100g: 116, protein_per_100g: 2.6, fat_per_100g: 0.3, carb_per_100g: 25.9, fiber_per_100g: 0.3, salt_per_100g: 0.06, applicable_meal: 4 },
  { food_id: 'fd_002', name: '糙米饭', standard_weight: 150, energy_per_100g: 111, protein_per_100g: 2.6, fat_per_100g: 1.0, carb_per_100g: 23.0, fiber_per_100g: 1.8, salt_per_100g: 0.05, applicable_meal: 4 },
  { food_id: 'fd_003', name: '全麦面包', standard_weight: 80, energy_per_100g: 246, protein_per_100g: 8.3, fat_per_100g: 5.1, carb_per_100g: 45.8, fiber_per_100g: 6.0, salt_per_100g: 0.4, applicable_meal: 1 },
  { food_id: 'fd_004', name: '燕麦片', standard_weight: 40, energy_per_100g: 377, protein_per_100g: 15.0, fat_per_100g: 6.7, carb_per_100g: 61.6, fiber_per_100g: 10.6, salt_per_100g: 0.0, applicable_meal: 1 },
  { food_id: 'fd_005', name: '玉米', standard_weight: 200, energy_per_100g: 112, protein_per_100g: 4.0, fat_per_100g: 1.2, carb_per_100g: 22.8, fiber_per_100g: 2.9, salt_per_100g: 0.0, applicable_meal: 4 },
  { food_id: 'fd_006', name: '红薯', standard_weight: 200, energy_per_100g: 99, protein_per_100g: 1.1, fat_per_100g: 0.2, carb_per_100g: 23.1, fiber_per_100g: 1.6, salt_per_100g: 0.1, applicable_meal: 4 },
  { food_id: 'fd_007', name: '紫薯', standard_weight: 200, energy_per_100g: 82, protein_per_100g: 1.2, fat_per_100g: 0.2, carb_per_100g: 19.9, fiber_per_100g: 1.6, salt_per_100g: 0.0, applicable_meal: 4 },
  { food_id: 'fd_008', name: '意大利面', standard_weight: 100, energy_per_100g: 350, protein_per_100g: 12.5, fat_per_100g: 1.8, carb_per_100g: 70.0, fiber_per_100g: 3.0, salt_per_100g: 0.12, applicable_meal: 2 },

  { food_id: 'fd_101', name: '鸡胸肉', standard_weight: 150, energy_per_100g: 165, protein_per_100g: 31.0, fat_per_100g: 3.6, carb_per_100g: 0.0, fiber_per_100g: 0.0, salt_per_100g: 0.04, applicable_meal: 4 },
  { food_id: 'fd_102', name: '鸡腿肉', standard_weight: 150, energy_per_100g: 181, protein_per_100g: 25.4, fat_per_100g: 8.1, carb_per_100g: 0.0, fiber_per_100g: 0.0, salt_per_100g: 0.03, applicable_meal: 4 },
  { food_id: 'fd_103', name: '牛肉', standard_weight: 150, energy_per_100g: 250, protein_per_100g: 26.0, fat_per_100g: 15.0, carb_per_100g: 0.0, fiber_per_100g: 0.0, salt_per_100g: 0.04, applicable_meal: 4 },
  { food_id: 'fd_104', name: '瘦猪肉', standard_weight: 150, energy_per_100g: 143, protein_per_100g: 20.3, fat_per_100g: 6.2, carb_per_100g: 1.5, fiber_per_100g: 0.0, salt_per_100g: 0.05, applicable_meal: 4 },
  { food_id: 'fd_105', name: '三文鱼', standard_weight: 150, energy_per_100g: 139, protein_per_100g: 17.2, fat_per_100g: 7.8, carb_per_100g: 0.0, fiber_per_100g: 0.0, salt_per_100g: 0.01, applicable_meal: 4 },
  { food_id: 'fd_106', name: '虾仁', standard_weight: 150, energy_per_100g: 48, protein_per_100g: 10.4, fat_per_100g: 0.5, carb_per_100g: 1.4, fiber_per_100g: 0.0, salt_per_100g: 0.17, applicable_meal: 4 },
  { food_id: 'fd_107', name: '鳕鱼', standard_weight: 150, energy_per_100g: 82, protein_per_100g: 17.7, fat_per_100g: 0.6, carb_per_100g: 0.0, fiber_per_100g: 0.0, salt_per_100g: 0.01, applicable_meal: 4 },
  { food_id: 'fd_108', name: '鸡蛋', standard_weight: 50, energy_per_100g: 144, protein_per_100g: 13.3, fat_per_100g: 8.8, carb_per_100g: 2.8, fiber_per_100g: 0.0, salt_per_100g: 0.13, applicable_meal: 4 },
  { food_id: 'fd_109', name: '鸭胸肉', standard_weight: 150, energy_per_100g: 133, protein_per_100g: 18.0, fat_per_100g: 5.5, carb_per_100g: 0.2, fiber_per_100g: 0.0, salt_per_100g: 0.06, applicable_meal: 4 },

  { food_id: 'fd_201', name: '西兰花', standard_weight: 150, energy_per_100g: 36, protein_per_100g: 4.1, fat_per_100g: 0.6, carb_per_100g: 4.3, fiber_per_100g: 1.6, salt_per_100g: 0.01, applicable_meal: 4 },
  { food_id: 'fd_202', name: '菠菜', standard_weight: 150, energy_per_100g: 23, protein_per_100g: 2.9, fat_per_100g: 0.4, carb_per_100g: 3.6, fiber_per_100g: 2.2, salt_per_100g: 0.04, applicable_meal: 4 },
  { food_id: 'fd_203', name: '胡萝卜', standard_weight: 150, energy_per_100g: 37, protein_per_100g: 1.0, fat_per_100g: 0.2, carb_per_100g: 8.8, fiber_per_100g: 3.2, salt_per_100g: 0.02, applicable_meal: 4 },
  { food_id: 'fd_204', name: '黄瓜', standard_weight: 150, energy_per_100g: 15, protein_per_100g: 0.8, fat_per_100g: 0.2, carb_per_100g: 2.9, fiber_per_100g: 0.5, salt_per_100g: 0.01, applicable_meal: 4 },
  { food_id: 'fd_205', name: '西红柿', standard_weight: 150, energy_per_100g: 19, protein_per_100g: 0.9, fat_per_100g: 0.2, carb_per_100g: 4.0, fiber_per_100g: 1.2, salt_per_100g: 0.01, applicable_meal: 4 },
  { food_id: 'fd_206', name: '生菜', standard_weight: 150, energy_per_100g: 13, protein_per_100g: 1.3, fat_per_100g: 0.3, carb_per_100g: 2.0, fiber_per_100g: 0.9, salt_per_100g: 0.01, applicable_meal: 4 },
  { food_id: 'fd_207', name: '彩椒', standard_weight: 150, energy_per_100g: 22, protein_per_100g: 1.0, fat_per_100g: 0.4, carb_per_100g: 5.4, fiber_per_100g: 2.1, salt_per_100g: 0.01, applicable_meal: 4 },
  { food_id: 'fd_208', name: '芦笋', standard_weight: 150, energy_per_100g: 19, protein_per_100g: 1.4, fat_per_100g: 0.1, carb_per_100g: 4.9, fiber_per_100g: 2.1, salt_per_100g: 0.01, applicable_meal: 4 },
  { food_id: 'fd_209', name: '蘑菇', standard_weight: 150, energy_per_100g: 24, protein_per_100g: 2.7, fat_per_100g: 0.1, carb_per_100g: 4.1, fiber_per_100g: 2.0, salt_per_100g: 0.05, applicable_meal: 4 },
  { food_id: 'fd_210', name: '山药', standard_weight: 150, energy_per_100g: 57, protein_per_100g: 1.9, fat_per_100g: 0.2, carb_per_100g: 12.4, fiber_per_100g: 0.8, salt_per_100g: 0.01, applicable_meal: 4 },

  { food_id: 'fd_301', name: '牛奶', standard_weight: 250, energy_per_100g: 54, protein_per_100g: 3.0, fat_per_100g: 3.2, carb_per_100g: 3.4, fiber_per_100g: 0.0, salt_per_100g: 0.05, applicable_meal: 1 },
  { food_id: 'fd_302', name: '无糖酸奶', standard_weight: 200, energy_per_100g: 72, protein_per_100g: 2.5, fat_per_100g: 2.7, carb_per_100g: 9.3, fiber_per_100g: 0.0, salt_per_100g: 0.04, applicable_meal: 1 },
  { food_id: 'fd_303', name: '奶酪', standard_weight: 50, energy_per_100g: 328, protein_per_100g: 25.7, fat_per_100g: 23.5, carb_per_100g: 3.5, fiber_per_100g: 0.0, salt_per_100g: 0.7, applicable_meal: 3 },
  { food_id: 'fd_304', name: '豆浆', standard_weight: 300, energy_per_100g: 30, protein_per_100g: 3.0, fat_per_100g: 1.6, carb_per_100g: 1.1, fiber_per_100g: 0.2, salt_per_100g: 0.03, applicable_meal: 1 },
  { food_id: 'fd_305', name: '豆腐', standard_weight: 150, energy_per_100g: 81, protein_per_100g: 8.1, fat_per_100g: 3.7, carb_per_100g: 4.2, fiber_per_100g: 0.4, salt_per_100g: 0.12, applicable_meal: 4 },

  { food_id: 'fd_401', name: '香蕉', standard_weight: 150, energy_per_100g: 93, protein_per_100g: 1.4, fat_per_100g: 0.2, carb_per_100g: 22.0, fiber_per_100g: 2.6, salt_per_100g: 0.0, applicable_meal: 3 },
  { food_id: 'fd_402', name: '苹果', standard_weight: 150, energy_per_100g: 52, protein_per_100g: 0.2, fat_per_100g: 0.2, carb_per_100g: 13.5, fiber_per_100g: 1.2, salt_per_100g: 0.01, applicable_meal: 3 },
  { food_id: 'fd_403', name: '蓝莓', standard_weight: 100, energy_per_100g: 57, protein_per_100g: 0.7, fat_per_100g: 0.3, carb_per_100g: 14.5, fiber_per_100g: 2.4, salt_per_100g: 0.0, applicable_meal: 3 },
  { food_id: 'fd_404', name: '草莓', standard_weight: 150, energy_per_100g: 32, protein_per_100g: 1.0, fat_per_100g: 0.2, carb_per_100g: 7.1, fiber_per_100g: 2.2, salt_per_100g: 0.01, applicable_meal: 3 },
  { food_id: 'fd_405', name: '猕猴桃', standard_weight: 100, energy_per_100g: 61, protein_per_100g: 0.8, fat_per_100g: 0.6, carb_per_100g: 11.9, fiber_per_100g: 2.6, salt_per_100g: 0.01, applicable_meal: 3 },
  { food_id: 'fd_406', name: '橙子', standard_weight: 150, energy_per_100g: 48, protein_per_100g: 0.8, fat_per_100g: 0.4, carb_per_100g: 11.1, fiber_per_100g: 2.4, salt_per_100g: 0.0, applicable_meal: 3 },

  { food_id: 'fd_501', name: '花生', standard_weight: 30, energy_per_100g: 574, protein_per_100g: 24.8, fat_per_100g: 44.3, carb_per_100g: 16.2, fiber_per_100g: 5.5, salt_per_100g: 0.08, applicable_meal: 3 },
  { food_id: 'fd_502', name: '杏仁', standard_weight: 30, energy_per_100g: 578, protein_per_100g: 22.5, fat_per_100g: 50.6, carb_per_100g: 19.7, fiber_per_100g: 8.0, salt_per_100g: 0.05, applicable_meal: 3 },
  { food_id: 'fd_503', name: '牛油果', standard_weight: 100, energy_per_100g: 160, protein_per_100g: 2.0, fat_per_100g: 14.7, carb_per_100g: 8.5, fiber_per_100g: 7.0, salt_per_100g: 0.0, applicable_meal: 4 },

  { food_id: 'fd_601', name: '橄榄油', standard_weight: 10, energy_per_100g: 899, protein_per_100g: 0.0, fat_per_100g: 99.9, carb_per_100g: 0.0, fiber_per_100g: 0.0, salt_per_100g: 0.0, applicable_meal: 4 },
  { food_id: 'fd_602', name: '黑巧克力', standard_weight: 30, energy_per_100g: 546, protein_per_100g: 4.9, fat_per_100g: 34.3, carb_per_100g: 61.1, fiber_per_100g: 8.7, salt_per_100g: 0.04, applicable_meal: 3 }
]

module.exports = foods
