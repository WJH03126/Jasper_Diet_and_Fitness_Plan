const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const TAG = '[cloud:calcNutritionTarget]'

exports.main = async (event, context) => {
  const sessionId = 'fn_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6)
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { height, weight, gender, age = 25, activity_level = 1 } = event

  console.log(`${TAG} entry session=${sessionId} openid=${openid} height=${height} weight=${weight} gender=${gender} age=${age} activity=${activity_level}`)

  if (!height || !weight || !gender) {
    console.warn(`${TAG} warn session=${sessionId} reason=missing_param height=${height} weight=${weight} gender=${gender}`)
    return { code: -1, message: '缺少必要参数' }
  }

  try {
    const bmr = calcBMR(weight, height, gender, age)
    const PAL_MAP = { 1: 1.375, 2: 1.55, 3: 1.725 }
    const PAL = PAL_MAP[activity_level] || 1.375
    const EER = bmr * PAL

    console.log(`${TAG} step=calc_bmr bmr=${bmr} pal=${PAL} eer=${Math.round(EER)}`)

    const energy_min = Math.round(EER * 0.9)
    const energy_max = Math.round(EER * 1.1)
    const protein_min = Math.round((EER * 0.1) / 4)
    const protein_max = Math.round((EER * 0.2) / 4)
    const fat_min = Math.round((EER * 0.2) / 9)
    const fat_max = Math.round((EER * 0.3) / 9)
    const carb_min = Math.round((EER * 0.5) / 4)
    const carb_max = Math.round((EER * 0.65) / 4)
    const fiber_min = 25
    const fiber_max = 30
    const salt_min = 0
    const salt_max = 5

    console.log(`${TAG} step=calc_result energy=${energy_min}-${energy_max} protein=${protein_min}-${protein_max} fat=${fat_min}-${fat_max} carb=${carb_min}-${carb_max}`)

    console.log(`${TAG} step=query_user openid=${openid}`)
    const userRes = await db.collection('user_info').where({ openid }).get()
    if (userRes.data.length === 0) {
      console.error(`${TAG} error session=${sessionId} reason=user_not_found openid=${openid}`)
      return { code: -1, message: '用户不存在' }
    }
    const user_id = userRes.data[0].user_id
    console.log(`${TAG} step=query_user ok user_id=${user_id}`)

    const targetCollection = db.collection('user_nutrition_target')
    console.log(`${TAG} step=query_existing_target user_id=${user_id}`)
    const existingRes = await targetCollection.where({
      user_id
    }).orderBy('version', 'desc').limit(1).get()

    const nextVersion = (existingRes.data[0]?.version || 0) + 1
    console.log(`${TAG} step=next_version version=${nextVersion}`)

    const targetData = {
      target_id: 'tgt_' + Date.now().toString(36),
      user_id,
      energy_min, energy_max,
      protein_min, protein_max,
      fat_min, fat_max,
      carb_min, carb_max,
      fiber_min, fiber_max,
      salt_min, salt_max,
      version: nextVersion,
      effect_date: new Date(),
      create_time: db.serverDate()
    }

    console.log(`${TAG} step=save_target target_id=${targetData.target_id}`)
    await targetCollection.add({ data: targetData })
    console.log(`${TAG} step=save_target ok`)

    const result = {
      energy: { min: energy_min, max: energy_max },
      protein: { min: protein_min, max: protein_max },
      fat: { min: fat_min, max: fat_max },
      carb: { min: carb_min, max: carb_max },
      fiber: { min: fiber_min, max: fiber_max },
      salt: { min: salt_min, max: salt_max },
      version: nextVersion
    }

    console.log(`${TAG} ok session=${sessionId} user_id=${user_id} version=${nextVersion}`)
    return { code: 0, message: '计算成功', data: result }
  } catch (err) {
    console.error(`${TAG} error session=${sessionId} openid=${openid} name=${err.name} message=${err.message} stack=${err.stack?.split('\n').slice(0, 5).join(' | ')}`)
    return { code: -1, message: '计算失败：' + err.message }
  }
}

function calcBMR(weight, height, gender, age) {
  if (gender === 1) {
    return Math.round(88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age))
  } else {
    return Math.round(447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age))
  }
}
