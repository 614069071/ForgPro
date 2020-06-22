import fetch from '../../fetch/index.js';
import utils, { fsm, faceSendMes } from '../../utils/util.js';

const app = getApp();

Page({
  data: {
    role: ''
  },
  onLoad({ role }) {
    console.log(role, 'setting onload ops');
    this.setData({ role });
  },
  onShow() {
    console.log('setting app.cacheInfo:', app.getCacheInfo());
  },
  // 监听前屏收银推送消息
  onKeyBoardHandle() {
    const self = this;

    wxfaceapp.onRemoteMessage(function (res) {
      const data = JSON.parse(res.content) || {};//推送消息
      // 接受到消息后，打开收银页面
      if (data.type === 'update') {//更新提示
        wx.showToast({
          title: data.mes
        })
      }
    });
  },
  //退出登录请求
  logoutRequest() {
    const { deviceFlag, version } = app.globalData;
    const info = app.getCacheInfo();
    const { role, userName, mchId, terminalNo } = info;
    let obj = { deviceFlag, version, role, userName, mchId, terminalNo, service: 'mch_logout' };
    let params = Object.assign({}, obj);

    try {
      fetch
        .gateway(params)
        .then(res => {
          let tips = res.data.returnCode == "SUCCESS" ? '退出登录成功！' : '请重新登录';

          wx.showToast({
            icon: 'success',
            title: tips,
            success: () => {
              wx.reLaunch({ url: '/pages/login/login' });
            }
          })
        })
        .catch(() => {
          wx.reLaunch({ url: '/pages/login/login' });
        })
    } catch (e) {
      wx.reLaunch({ url: '/pages/login/login' });
    }
  },
  // 退出
  goToExit() {
    const self = this;
    wx.showModal({
      content: '是否退出登录？',
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          self.logoutRequest();
        }
      },
    });
  },
  // 更新banner图
  goToUpdateBanner() {
    const self = this;
    wx.showModal({
      content: '是否更新广告',
      showCancel: true,
      cancelText: '取消',
      confirmText: '确认',
      success({ confirm }) {
        if (!confirm) return;
        self.updateBanner();
      }
    })
  },
  //更新广告
  updateBanner() {
    wx.showToast({
      title: '广告更新中。。。',
      duration: 10000
    });

    const self = this;
    const { deviceFlag, version } = app.globalData;
    const info = app.getCacheInfo();
    const { terminalNo = '', mchId = '', mchPrivatekey = '' } = info;
    let params = { mchId, terminalNo, deviceFlag, version, service: 'mch_get_advertisement' };

    if (!mchPrivatekey) {
      wx.showToast({
        title: '请先登录',
        duration: 1500,
        success() {
          wx.reLaunch({ url: '/pages/login/login' });
        }
      });
      return;
    }

    fetch
      .gateway(params)
      .then((res) => {
        // wx.hideLoading();
        utils.removeSavedFile();
        const { returnCode = '', machineAdvert = '[]' } = res.data;

        if (returnCode == 'SUCCESS') {
          const imagesArr = JSON.parse(machineAdvert || '[]') || [];

          if (!imagesArr.length) {
            wx.showToast({ title: '暂无更新' });
            return;
          }

          const list = utils.sort(imagesArr).map(ele => decodeURIComponent(ele.picture));    // 排序 转码
          console.log(list, 'list');

          // 下载图片存储在本地
          utils.downloadFile(list)
            .then(res => {
              wx.showToast({ title: '更新成功' });

              console.log(res, 'setting downloadFile success');

              faceSendMes({ type: 'reload' });
            })
        } else {
          wx.showToast({ title: '更新失败' });
        }
      })
      .catch((err) => {
        wx.showToast({ title: '更新失败' });
      })
  },
});
