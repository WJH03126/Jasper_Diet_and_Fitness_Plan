const exercises = [
  { exercise_id: 'ex_pushup', name: '标准俯卧撑', category: 1, equipment_type: 4, calories_per_minute: 0.18, muscle_group: '胸大肌' },
  { exercise_id: 'ex_pushup_incline', name: '上斜俯卧撑', category: 1, equipment_type: 4, calories_per_minute: 0.16, muscle_group: '上胸肌' },
  { exercise_id: 'ex_pushup_decline', name: '下斜俯卧撑', category: 1, equipment_type: 4, calories_per_minute: 0.17, muscle_group: '下胸肌' },
  { exercise_id: 'ex_dips', name: '双杠臂屈伸', category: 1, equipment_type: 4, calories_per_minute: 0.2, muscle_group: '胸肌+三头' },
  { exercise_id: 'ex_bench_press', name: '杠铃卧推', category: 1, equipment_type: 1, calories_per_minute: 0.22, muscle_group: '胸大肌' },
  { exercise_id: 'ex_dumbbell_press', name: '哑铃卧推', category: 1, equipment_type: 1, calories_per_minute: 0.2, muscle_group: '胸大肌' },
  { exercise_id: 'ex_cable_fly', name: '绳索夹胸', category: 1, equipment_type: 3, calories_per_minute: 0.15, muscle_group: '胸肌中缝' },

  { exercise_id: 'ex_pullup', name: '引体向上', category: 2, equipment_type: 1, calories_per_minute: 0.25, muscle_group: '背阔肌' },
  { exercise_id: 'ex_pullup_neg', name: '反向引体', category: 2, equipment_type: 1, calories_per_minute: 0.18, muscle_group: '上背' },
  { exercise_id: 'ex_bentover_row', name: '俯身划船', category: 2, equipment_type: 1, calories_per_minute: 0.22, muscle_group: '背阔肌' },
  { exercise_id: 'ex_deadlift', name: '硬拉', category: 2, equipment_type: 1, calories_per_minute: 0.3, muscle_group: '全背+后链' },
  { exercise_id: 'ex_lat_pulldown', name: '高位下拉', category: 2, equipment_type: 2, calories_per_minute: 0.18, muscle_group: '背阔肌' },
  { exercise_id: 'ex_seated_row', name: '坐姿划船', category: 2, equipment_type: 2, calories_per_minute: 0.17, muscle_group: '中背' },
  { exercise_id: 'ex_single_arm_row', name: '单臂绳索划船', category: 2, equipment_type: 3, calories_per_minute: 0.15, muscle_group: '背阔肌' },

  { exercise_id: 'ex_shoulder_press', name: '推举', category: 3, equipment_type: 1, calories_per_minute: 0.2, muscle_group: '三角肌' },
  { exercise_id: 'ex_dumbbell_press', name: '哑铃推肩', category: 3, equipment_type: 1, calories_per_minute: 0.18, muscle_group: '三角肌' },
  { exercise_id: 'ex_lateral_raise', name: '侧平举', category: 3, equipment_type: 1, calories_per_minute: 0.12, muscle_group: '三角肌中束' },
  { exercise_id: 'ex_front_raise', name: '前平举', category: 3, equipment_type: 1, calories_per_minute: 0.1, muscle_group: '三角肌前束' },
  { exercise_id: 'ex_rear_fly', name: '后束飞鸟', category: 3, equipment_type: 3, calories_per_minute: 0.1, muscle_group: '三角肌后束' },
  { exercise_id: 'ex_face_pull', name: '面拉', category: 3, equipment_type: 3, calories_per_minute: 0.12, muscle_group: '后束+上背' },

  { exercise_id: 'ex_barbell_curl', name: '杠铃弯举', category: 4, equipment_type: 1, calories_per_minute: 0.15, muscle_group: '肱二头肌' },
  { exercise_id: 'ex_dumbbell_curl', name: '哑铃弯举', category: 4, equipment_type: 1, calories_per_minute: 0.14, muscle_group: '肱二头肌' },
  { exercise_id: 'ex_hammer_curl', name: '锤式弯举', category: 4, equipment_type: 1, calories_per_minute: 0.13, muscle_group: '肱肌' },
  { exercise_id: 'ex_tricep_pushdown', name: '三头下压', category: 4, equipment_type: 3, calories_per_minute: 0.14, muscle_group: '肱三头肌' },
  { exercise_id: 'ex_tricep_skullcrusher', name: '仰卧臂屈伸', category: 4, equipment_type: 1, calories_per_minute: 0.15, muscle_group: '肱三头肌' },
  { exercise_id: 'ex_dips', name: '双杠臂屈伸', category: 4, equipment_type: 4, calories_per_minute: 0.18, muscle_group: '肱三头肌' },
  { exercise_id: 'ex_french_press', name: '法式推举', category: 4, equipment_type: 1, calories_per_minute: 0.14, muscle_group: '肱三头肌长头' },

  { exercise_id: 'ex_squat', name: '深蹲', category: 5, equipment_type: 1, calories_per_minute: 0.28, muscle_group: '股四头肌' },
  { exercise_id: 'ex_front_squat', name: '前蹲', category: 5, equipment_type: 1, calories_per_minute: 0.26, muscle_group: '股四头肌' },
  { exercise_id: 'ex_goblet_squat', name: '壶铃深蹲', category: 5, equipment_type: 1, calories_per_minute: 0.24, muscle_group: '股四头肌' },
  { exercise_id: 'ex_lunge', name: '箭步蹲', category: 5, equipment_type: 1, calories_per_minute: 0.25, muscle_group: '股四头肌+腘绳' },
  { exercise_id: 'ex_leg_press', name: '腿举', category: 5, equipment_type: 2, calories_per_minute: 0.22, muscle_group: '股四头肌' },
  { exercise_id: 'ex_leg_extension', name: '腿屈伸', category: 5, equipment_type: 2, calories_per_minute: 0.18, muscle_group: '股四头肌' },
  { exercise_id: 'ex_leg_curl', name: '腿弯举', category: 5, equipment_type: 2, calories_per_minute: 0.16, muscle_group: '腘绳肌' },
  { exercise_id: 'ex_rdl', name: '罗马尼亚硬拉', category: 5, equipment_type: 1, calories_per_minute: 0.24, muscle_group: '腘绳肌' },
  { exercise_id: 'ex_calf_raise', name: '提踵', category: 5, equipment_type: 2, calories_per_minute: 0.12, muscle_group: '小腿三头肌' },
  { exercise_id: 'ex_jump', name: '深蹲跳', category: 5, equipment_type: 4, calories_per_minute: 0.3, muscle_group: '全身爆发' },

  { exercise_id: 'ex_crunch', name: '卷腹', category: 6, equipment_type: 4, calories_per_minute: 0.14, muscle_group: '腹直肌' },
  { exercise_id: 'ex_plank', name: '平板支撑', category: 6, equipment_type: 4, calories_per_minute: 0.1, muscle_group: '核心稳定' },
  { exercise_id: 'ex_leg_raise', name: '悬垂举腿', category: 6, equipment_type: 4, calories_per_minute: 0.16, muscle_group: '下腹' },
  { exercise_id: 'ex_side_plank', name: '侧平板', category: 6, equipment_type: 4, calories_per_minute: 0.09, muscle_group: '腹斜肌' },
  { exercise_id: 'ex_good_morning', name: '早安式', category: 6, equipment_type: 1, calories_per_minute: 0.15, muscle_group: '竖脊肌' },
  { exercise_id: 'ex_back_extension', name: '山羊挺身', category: 6, equipment_type: 2, calories_per_minute: 0.12, muscle_group: '下背' },

  { exercise_id: 'ex_pistol', name: '单腿深蹲', category: 5, equipment_type: 4, calories_per_minute: 0.25, muscle_group: '单腿股四' },
  { exercise_id: 'ex_burpee', name: '波比跳', category: 1, equipment_type: 4, calories_per_minute: 0.35, muscle_group: '全身' },
  { exercise_id: 'ex_mountain_climber', name: '登山跑', category: 6, equipment_type: 4, calories_per_minute: 0.3, muscle_group: '核心+心肺' },
  { exercise_id: 'ex_high_knee', name: '高抬腿', category: 5, equipment_type: 4, calories_per_minute: 0.32, muscle_group: '心肺' },
  { exercise_id: 'ex_jump_rope', name: '跳绳', category: 5, equipment_type: 4, calories_per_minute: 0.3, muscle_group: '小腿+心肺' },

  { exercise_id: 'ex_warmup_rope_arm', name: '弹力绳肩外旋', category: 7, equipment_type: 5, calories_per_minute: 0.12, muscle_group: '肩部激活' },
  { exercise_id: 'ex_warmup_rope_leg', name: '弹力绳侧走', category: 7, equipment_type: 5, calories_per_minute: 0.15, muscle_group: '臀中肌' },
  { exercise_id: 'ex_warmup_rope_push', name: '弹力绳胸前推', category: 7, equipment_type: 5, calories_per_minute: 0.13, muscle_group: '胸部热身' },
  { exercise_id: 'ex_warmup_rope_pull', name: '弹力绳面拉', category: 7, equipment_type: 5, calories_per_minute: 0.14, muscle_group: '后束+肩胛' },
  { exercise_id: 'ex_warmup_rope_squat', name: '弹力绳深蹲', category: 7, equipment_type: 5, calories_per_minute: 0.18, muscle_group: '下肢激活' },
  { exercise_id: 'ex_warmup_foam', name: '泡沫轴滚压', category: 7, equipment_type: 5, calories_per_minute: 0.08, muscle_group: '全身放松' },
  { exercise_id: 'ex_warmup_highfive', name: '原地高抬腿', category: 7, equipment_type: 4, calories_per_minute: 0.25, muscle_group: '心肺+腿' },
  { exercise_id: 'ex_warmup_mountain', name: '登山跑', category: 7, equipment_type: 4, calories_per_minute: 0.28, muscle_group: '核心+心肺' }

]

module.exports = exercises
