const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const TAG = '[cloud:sendSubscribeMsg]'

exports.main = async (event, context) => {
  const sessionId = 'fn_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6)
  const { plan_id, plan_name, equipment_count } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  console.log(`${TAG} entry session=${sessionId} openid=${openid} plan_id=${plan_id} plan_name=${plan_name} equipment_count=${equipment_count}`)

  try {
    console.log(`${TAG} step=query_user openid=${openid}`)
    const userRes = await db.collection('user_info').where({ openid }).get()
    if (userRes.data.length === 0) {
      console.error(`${TAG} error session=${sessionId} reason=user_not_found openid=${openid}`)
      return { code: -1, message: '用户不存在' }
    }

    console.log(`${TAG} step=query_plan plan_id=${plan_id}`)
    const planRes = await db.collection('fitness_plan').where({ plan_id }).get()
    if (planRes.data.length === 0) {
      console.error(`${TAG} error session=${sessionId} reason=plan_not_found plan_id=${plan_id}`)
      return { code: -1, message: '计划不存在' }
    }
    const plan = planRes.data[0]
    console.log(`${TAG} step=query_plan ok status=${plan.status} name=${plan.plan_name}`)

    if (plan.status === 1 || plan.status === 2) {
      console.warn(`${TAG} skip session=${sessionId} reason=plan_completed_or_canceled status=${plan.status}`)
      return { code: 1, message: '计划已完成或已取消，跳过推送' }
    }

    console.log(`${TAG} step=subscribe_send templateId=your_template_id`)
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: 'your_template_id',
      page: 'pages/calendar/calendar',
      data: {
        thing1: { value: plan_name || '今日训练计划' },
        number2: { value: equipment_count || plan.plan_content?.length || 0 },
        time3: { value: formatTime(plan.remind_time) }
      }
    })
    console.log(`${TAG} ok session=${sessionId} result=${JSON.stringify(result)}`)
    return { code: 0, message: '推送成功', data: result }
  } catch (err) {
    console.error(`${TAG} error session=${sessionId} openid=${openid} plan_id=${plan_id} name=${err.name} message=${err.message} stack=${err.stack?.split('\n').slice(0, 5).join(' | ')}`)
    return { code: -1, message: '推送失败：' + err.message }
  }
}

function formatTime(dateStr) {
  const d = new Date(dateStr || Date.now())
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
