const equipments = [
  { equipment_id: 'eq_chest_001', name: '平板杠铃卧推架', primary_part: 1, muscle_group: '胸大肌', equipment_type: 1, base_load_factor: 0.85, action_description: '平躺握杠，手臂伸直，下放至胸，推起' },
  { equipment_id: 'eq_chest_002', name: '上斜哑铃卧推凳', primary_part: 1, muscle_group: '上胸肌', equipment_type: 1, base_load_factor: 0.7, action_description: '凳30度，哑铃推起，控制下放' },
  { equipment_id: 'eq_chest_003', name: '下斜卧推凳', primary_part: 1, muscle_group: '下胸肌', equipment_type: 1, base_load_factor: 0.65, action_description: '下斜角度，针对下胸' },
  { equipment_id: 'eq_chest_004', name: '史密斯卧推架', primary_part: 1, muscle_group: '胸大肌', equipment_type: 2, base_load_factor: 0.8, action_description: '史密斯机固定轨迹，安全卧推' },
  { equipment_id: 'eq_chest_005', name: '推胸训练器', primary_part: 1, muscle_group: '胸大肌', equipment_type: 2, base_load_factor: 0.75, action_description: '坐姿推胸，固定轨迹' },
  { equipment_id: 'eq_chest_006', name: '绳索夹胸器', primary_part: 1, muscle_group: '胸肌中缝', equipment_type: 3, base_load_factor: 0.55, action_description: '高位绳索，夹胸收缩' },

  { equipment_id: 'eq_back_001', name: '引体向上杠', primary_part: 2, muscle_group: '背阔肌', equipment_type: 1, base_load_factor: 0.9, action_description: '悬垂引体，下拉到胸' },
  { equipment_id: 'eq_back_002', name: '高位下拉器', primary_part: 2, muscle_group: '背阔肌', equipment_type: 2, base_load_factor: 0.85, action_description: '宽握下拉，控制上背' },
  { equipment_id: 'eq_back_003', name: '坐姿划船器', primary_part: 2, muscle_group: '中背', equipment_type: 2, base_load_factor: 0.8, action_description: '窄握划船，收缩下背' },
  { equipment_id: 'eq_back_004', name: '杠铃划船架', primary_part: 2, muscle_group: '背阔肌', equipment_type: 1, base_load_factor: 0.8, action_description: '俯身划船，刺激厚背' },
  { equipment_id: 'eq_back_005', name: '单臂绳索划船器', primary_part: 2, muscle_group: '背阔肌', equipment_type: 3, base_load_factor: 0.65, action_description: '单侧绳索，孤立背阔肌' },

  { equipment_id: 'eq_shoulder_001', name: '坐姿哑铃推肩凳', primary_part: 3, muscle_group: '三角肌', equipment_type: 1, base_load_factor: 0.65, action_description: '坐姿推肩，控制下放' },
  { equipment_id: 'eq_shoulder_002', name: '史密斯推肩机', primary_part: 3, muscle_group: '三角肌', equipment_type: 2, base_load_factor: 0.7, action_description: '史密斯固定轨迹推肩' },
  { equipment_id: 'eq_shoulder_003', name: '侧平举训练器', primary_part: 3, muscle_group: '三角肌中束', equipment_type: 2, base_load_factor: 0.5, action_description: '固定轨迹侧平举' },
  { equipment_id: 'eq_shoulder_004', name: '俯身绳索飞鸟器', primary_part: 3, muscle_group: '三角肌后束', equipment_type: 3, base_load_factor: 0.45, action_description: '俯身绳索飞鸟' },

  { equipment_id: 'eq_arm_001', name: '曲杆', primary_part: 4, muscle_group: '肱二头肌', equipment_type: 1, base_load_factor: 0.55, action_description: '曲杆弯举，孤立二头' },
  { equipment_id: 'eq_arm_002', name: '绳索下压器', primary_part: 4, muscle_group: '肱三头肌', equipment_type: 3, base_load_factor: 0.6, action_description: '直杆下压三头' },
  { equipment_id: 'eq_arm_003', name: '锤式弯举架', primary_part: 4, muscle_group: '肱肌', equipment_type: 1, base_load_factor: 0.5, action_description: '哑铃锤式弯举' },
  { equipment_id: 'eq_arm_004', name: '坐姿臂屈伸器', primary_part: 4, muscle_group: '肱三头肌', equipment_type: 2, base_load_factor: 0.6, action_description: '固定轨迹臂屈伸' },

  { equipment_id: 'eq_leg_001', name: '深蹲架', primary_part: 5, muscle_group: '股四头肌', equipment_type: 1, base_load_factor: 1.0, action_description: '杠铃深蹲，大腿训练之王' },
  { equipment_id: 'eq_leg_002', name: '腿举机', primary_part: 5, muscle_group: '股四头肌', equipment_type: 2, base_load_factor: 0.9, action_description: '45度腿举，安全高效' },
  { equipment_id: 'eq_leg_003', name: '腿屈伸器', primary_part: 5, muscle_group: '股四头肌', equipment_type: 2, base_load_factor: 0.75, action_description: '坐姿腿屈伸，孤立股四' },
  { equipment_id: 'eq_leg_004', name: '腿弯举器', primary_part: 5, muscle_group: '腘绳肌', equipment_type: 2, base_load_factor: 0.7, action_description: '俯卧腿弯举，练后大腿' },
  { equipment_id: 'eq_leg_005', name: '罗马尼亚硬拉架', primary_part: 5, muscle_group: '腘绳肌', equipment_type: 1, base_load_factor: 0.9, action_description: 'RDL，腘绳肌之王' },
  { equipment_id: 'eq_leg_006', name: '提踵训练器', primary_part: 5, muscle_group: '小腿三头肌', equipment_type: 2, base_load_factor: 0.8, action_description: '小腿提踵，控制顶峰' },

  { equipment_id: 'eq_core_001', name: '卷腹训练凳', primary_part: 6, muscle_group: '腹直肌', equipment_type: 2, base_load_factor: 0.35, action_description: '可调角度卷腹凳' },
  { equipment_id: 'eq_core_002', name: '罗马椅', primary_part: 6, muscle_group: '竖脊肌', equipment_type: 2, base_load_factor: 0.3, action_description: '山羊挺身，练下背' },
  { equipment_id: 'eq_core_003', name: '悬垂举腿杠', primary_part: 6, muscle_group: '下腹', equipment_type: 4, base_load_factor: 0.4, action_description: '单杠悬垂举腿' },

  { equipment_id: 'eq_warmup_001', name: '弹力绳', primary_part: 7, muscle_group: '全身热身', equipment_type: 5, base_load_factor: 0.35, action_description: '套脚或固定，提供持续阻力，适合热身激活' },
  { equipment_id: 'eq_warmup_002', name: '弹力带', primary_part: 7, muscle_group: '关节活动', equipment_type: 5, base_load_factor: 0.25, action_description: '环绕膝部或脚踝，灵活度训练' },
  { equipment_id: 'eq_warmup_003', name: '泡沫轴', primary_part: 7, muscle_group: '放松筋膜', equipment_type: 5, base_load_factor: 0.1, action_description: '滚压肌群，放松筋膜，训练后使用' }

]

module.exports = equipments
