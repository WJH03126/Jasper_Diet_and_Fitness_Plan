const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const TAG = '[cloud:calcWeightRecommend]'

exports.main = async (event, context) => {
  const sessionId = 'fn_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6)
  const { height, weight, gender, equipment } = event

  console.log(`${TAG} entry session=${sessionId} height=${height} weight=${weight} gender=${gender} equipment=${JSON.stringify({ id: equipment?.equipment_id, name: equipment?.name, type: equipment?.equipment_type, factor: equipment?.base_load_factor })}`)

  if (!weight || !equipment) {
    console.warn(`${TAG} warn session=${sessionId} reason=missing_param weight=${weight} equipmentId=${equipment?.equipment_id}`)
    return { code: -1, message: '缺少必要参数' }
  }

  try {
    const baseFactor = equipment.base_load_factor || 0
    const equipmentType = equipment.equipment_type

    if (equipmentType === 4 || baseFactor === 0) {
      const result = { weight: null, sets: 3, reps: 12, duration: 60 }
      console.log(`${TAG} step=selfWeight type=${equipmentType} result=${JSON.stringify(result)}`)
      return { code: 0, message: '计算成功', data: result }
    }

    const genderFactor = gender === 1 ? 1.0 : 0.75
    const heightFactor = height ? (height / 170) : 1.0
    const recommendWeight = Math.round(weight * baseFactor * genderFactor * heightFactor * 10) / 10

    const muscleGroup = equipment.muscle_group || ''
    let sets = 3
    let reps = 12

    if (muscleGroup.includes('力量') || equipment.name?.includes('硬拉') || equipment.name?.includes('深蹲')) {
      sets = 4
      reps = 6
    } else if (muscleGroup.includes('耐力')) {
      sets = 3
      reps = 15
    }

    const result = { weight: recommendWeight, sets, reps, unit: 'kg' }
    console.log(`${TAG} ok session=${sessionId} weight=${recommendWeight} sets=${sets} reps=${reps}`)
    return { code: 0, message: '计算成功', data: result }
  } catch (err) {
    console.error(`${TAG} error session=${sessionId} equipmentId=${equipment?.equipment_id} name=${err.name} message=${err.message} stack=${err.stack?.split('\n').slice(0, 5).join(' | ')}`)
    return { code: -1, message: '计算失败：' + err.message }
  }
}
