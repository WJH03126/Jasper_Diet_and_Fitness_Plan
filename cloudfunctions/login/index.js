const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const TAG = '[cloud:login]'

exports.main = async (event, context) => {
  const sessionId = 'fn_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6)
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  console.log(`${TAG} entry session=${sessionId} openid=${openid} event=${JSON.stringify({ nickname: event.nickname, hasAvatar: !!event.avatar_url })}`)

  try {
    const userCollection = db.collection('user_info')
    console.log(`${TAG} step=query_user openid=${openid}`)
    const userRes = await userCollection.where({ openid }).get()
    console.log(`${TAG} step=query_user result count=${userRes.data.length}`)

    let userInfo
    if (userRes.data.length === 0) {
      const userId = 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9)
      console.log(`${TAG} step=create_user userId=${userId}`)
      const createRes = await userCollection.add({
        data: {
          user_id: userId,
          openid,
          nickname: event.nickname || '微信用户',
          real_name: '',
          gender: 0,
          height: 0,
          weight: 0,
          avatar_url: event.avatar_url || '',
          activity_level: 1,
          create_time: db.serverDate(),
          update_time: db.serverDate()
        }
      })
      console.log(`${TAG} step=create_user ok _id=${createRes._id}`)
      const newUser = await userCollection.doc(createRes._id).get()
      userInfo = newUser.data
    } else {
      userInfo = userRes.data[0]
      console.log(`${TAG} step=found_user userId=${userInfo.user_id} needUpdate=${!!(event.nickname || event.avatar_url)}`)
      if (event.nickname || event.avatar_url) {
        await userCollection.doc(userInfo._id).update({
          data: {
            nickname: event.nickname || userInfo.nickname,
            avatar_url: event.avatar_url || userInfo.avatar_url,
            update_time: db.serverDate()
          }
        })
        console.log(`${TAG} step=update_user ok`)
        userInfo.nickname = event.nickname || userInfo.nickname
        userInfo.avatar_url = event.avatar_url || userInfo.avatar_url
      }
    }

    console.log(`${TAG} ok session=${sessionId} userId=${userInfo.user_id} nickname=${userInfo.nickname}`)
    return {
      code: 0,
      message: '登录成功',
      data: {
        openid,
        token: wxContext.APPID + '_' + Date.now(),
        userInfo
      }
    }
  } catch (err) {
    console.error(`${TAG} error session=${sessionId} openid=${openid} name=${err.name} message=${err.message} stack=${err.stack?.split('\n').slice(0, 5).join(' | ')}`)
    return {
      code: -1,
      message: '登录失败：' + err.message
    }
  }
}
