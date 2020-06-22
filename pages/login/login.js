import fetch from '../../fetch/index';
import utils from '../../utils/util';
var app = getApp();
// 商户   139 0000 0000 13632849522  a123456   退款密码  123456
// 收银员 137 7777 7777 15100000001 13122335566   123456    退款密码 123456
Page({
  data: {
    userName: '',
    password: '',
    role: '',
    loginbtn: false,
    items: [
      { 'name': '收银员', 'value': 'cashier', 'checked': true },
      { 'name': '商户', 'value': 'ent' }
    ]
  },
  onLoad() { },
  onShow() {
    console.log('login app.cacheInfo:', app.getCacheInfo());

    this.initAppGlobal();
    utils.removeSavedFile();//清除下载到本地的图片
    utils.faceSendMes({ type: 'reload' });
  },
  usernameInp(e) {
    let { value } = e.detail;
    let str = value.replace(/\s+/g, "");
    this.setData({ userName: str });
  },
  passwordInp(e) {
    const val = e.detail.value;
    this.setData({ password: val });
  },
  deleteUsername() {
    this.setData({ userName: '' });
  },
  deletePassword() {
    this.setData({ password: '' });
  },
  goToSubmit(e) {
    wx.showLoading({ title: 'loading...' });
    const self = this;
    let info = e.detail.value;

    info.userName = info.userName.replace(/\s/g, '');

    let count = utils.validate(info) || 0;//校验正则
    const { deviceFlag, version } = app.globalData;

    this.setData({ loginbtn: true });

    const infoValue = app.getCacheInfo();
    const terminalNo = infoValue.terminalNo || '';

    if (count) {
      this.setData({ loginbtn: false });
      return;
    }

    let obj = { terminalNo, deviceFlag, version, service: 'mch_login' };
    let params = Object.assign({}, info, obj);

    fetch
      .login(params)
      .then(res => {
        const {
          mchPrivatekey = '',
          qfqPublickey = '',
          returnCode = '',
          mchId = '',
          cashierId = '',
          shopId = '',
          shopName = '',
          refundAuth = '0',
          cashierName = ''
        } = res.data;

        const bannerUpdateInfo = { terminalNo, mchId, mchPrivatekey };

        if (returnCode && returnCode == "SUCCESS") {
          const infoData = {};//存储账号数据

          infoData.mchId = mchId;
          infoData.mchPrivatekey = mchPrivatekey;//私钥
          infoData.qfqPublickey = qfqPublickey;//公钥
          infoData.userName = info.userName;
          infoData.cashierName = cashierName;//收银员名字
          infoData.role = info.role || '';

          wx.showToast({
            icon: 'success',
            title: '登录成功！',
            success: () => {
              if (info.role == "cashier") {//收银员
                infoData.cashierId = cashierId;
                infoData.shopId = shopId;
                infoData.shopName = shopName;
                infoData.refundAuth = refundAuth;

                const fileData = Object.assign({}, infoValue, infoData);

                utils.fsm.set(fileData, () => {
                  wx.redirectTo({ url: '/pages/keyboard/keyboard' });//收银
                  self.loginUpdateBanner(bannerUpdateInfo);//登录更新图片
                  app.setCacheInfo(null, fileData);
                });
              }
              if (info.role == 'ent') {//商户
                infoData.cashierId = '';
                infoData.shopId = '';
                infoData.shopName = '';
                // 存储信息
                const fileData = Object.assign({}, infoValue, infoData);

                utils.fsm.set(fileData, () => {
                  wx.redirectTo({ url: '/pages/shop/shop' });//门店选择
                  self.loginUpdateBanner(bannerUpdateInfo);//登录更新图片
                  app.setCacheInfo(null, fileData);
                });
              }
            }
          });
          return;
        }

        wx.showToast({
          icon: 'none',
          title: '登录失败 !',
          success: () => {
            self.setData({
              loginbtn: false
            })
          }
        });
      })
      .catch(err => {
        wx.showToast({
          icon: 'none',
          title: '网络异常！',
          success: () => {
            self.setData({
              loginbtn: false
            })
          }
        });
      })
  },
  // 登录时更新广告
  loginUpdateBanner(info) {
    const { deviceFlag, version } = app.globalData;
    const { terminalNo = '', mchId = '', mchPrivatekey = '' } = info;
    let params = { mchId, terminalNo, deviceFlag, version, service: 'mch_get_advertisement' };

    if (!mchPrivatekey) return;

    fetch
      .gateway(params)
      .then((res) => {
        const { returnCode = '', machineAdvert = '[]' } = res.data;
        const imagesArr = JSON.parse(machineAdvert || '[]') || [];

        if (returnCode !== 'SUCCESS' || !imagesArr.length) return;

        const list = utils.sort(imagesArr).map(ele => decodeURIComponent(ele.picture));    // 排序 转码

        // 下载图片存储在本地
        utils.downloadFile(list)
          .then(res => {
            console.log(res, 'login downloadFile success');
            utils.faceSendMes({ type: 'reload' });//刷新首页，更新数据
          })
      })
  },
  foucus(e) {
    const height = e.detail.height;
    console.log(height, 'height');
    if (!height) return;
  },
  //清除全局变量数据
  initAppGlobal() {
    app.globalData.refundInfo = {};//退款信息

    const data = app.getCacheInfo();
    const { terminalNo } = data;
    const infoData = { terminalNo };

    utils.fsm.set(infoData, () => {
      app.setCacheInfo(null, infoData);
    });
  },
});
