import fetch from '../../fetch/index.js';
import util from '../../utils/util.js';
var app = getApp();
Page({
  data: {
    state: '交易成功',
    payInfo: {},
    showButton: false,
    clickCount: 0,
    payPasswordArr: [],
    modalHide: true,
    // 退款弹框新增
    passwordArr: ['', '', '', '', '', ''],
    pasInputVal: ''
  },
  onLoad() { },
  onShow() {
    this.initPage();
    this.initData();
    console.log('detail app.cacheInfo:', app.getCacheInfo());
  },
  initPage() {
    const info = app.getCacheInfo();
    const self = this;
    if (info.mchPrivatekey) {
      const { refundAuth } = info;
      if (refundAuth === '1') {
        self.setData({ showBtn: true });
      } else if (refundAuth === '0') {
        self.setData({ showBtn: false });
      }
    }
  },
  initData() {
    let payInfo = app.globalData.refundInfo;
    let currState = "交易成功";
    let showBtn = false;
    if (payInfo.orderState == '00') {//未发生退款成功交易
      if (payInfo.refundState == '90') {
        currState = '已退款交易订单';
      } else if (payInfo.refundState == '08') {
        currState = '退款处理中';
      } else if (payInfo.refundState == '91') {
        currState = '部分退款';
      } else {
        showBtn = true;
      }
    } else {
      if (payInfo.orderState == "08") {//退款中
        currState = '退款处理中';
      } else if (payInfo.orderState == "03") {//已退款
        currState = '退款成功';
      } else if (payInfo.orderState == "09") { //交易失败
        currState = '交易失败';
      }
    }
    this.setData({
      payInfo: payInfo,
      showButton: showBtn,
      state: currState,
      modalHide: true
    })
  },
  onSubmit(e) {//确认退款密码
    let pwd = e.detail.value.payPassword;
    if (pwd) {
      this.refundEvent(pwd);
    } else {
      wx.showToast({
        icon: 'none',
        title: '请输入密码！'
      })
    }
  },
  closeModal() {//关闭弹窗
    this.setData({
      modalHide: true,
      passwordArr: ['', '', '', '', '', ''],
      pasInputVal: ''
    })
  },
  //打开弹窗
  openModal() {
    const info = app.getCacheInfo();
    const { role, refundAuth } = info;
    if (role == 'cashier' && refundAuth == '0') {
      //无退款权限收银员
      wx.showToast({
        icon: 'none',
        title: '该账号没有退款权限！'
      })
      this.setData({ modalHide: true });
    } else {
      this.setData({
        modalHide: false
      })
    }
  },
  //退款
  refundEvent(pwd) {
    wx.showLoading({ title: '退款中...' });
    const { deviceFlag, version, refundInfo: { mchOrderId, orderAmt = '' } } = app.globalData;
    const info = app.getCacheInfo();
    const { mchId = '', shopId = '', userName = '', role = '', terminalNo = '' } = info;
    const mchRefundId = "RQM" + "" + new Date().getTime() + "" + util.getRandom(10);

    if (this.data.clickCount) return;//非 0 时阻止

    this.data.clickCount++;

    let params = {
      service: 'mch.refund',
      version,
      deviceFlag,
      mchId,
      shopId,
      refundPwd: pwd,
      userName,
      role,
      mchOrderId,
      mchRefundId,
      refundAmt: orderAmt,
      refundDes: '退款',
      terminalNo //终端号
    };

    fetch
      .gateway(params)
      .then(res => {
        wx.hideLoading();
        const { returnCode = '', returnMsg = '' } = res.data;
        if (returnCode == "SUCCESS") {
          wx.redirectTo({ url: '/pages/refund/refund?amount=' + orderAmt });
        } else {
          if (returnCode == "PROCESSING") {
            wx.redirectTo({ url: "/pages/processing/processing?type=refund" })
          } else {
            wx.redirectTo({ url: `/pages/fail/fail?type=refund&delta=1&Msg=${returnMsg}` })
          }
        }
      })
  },
  // 密码输入
  pasInput(e) {
    const value = e.detail.value;
    const passwordArr = this.data.passwordArr;
    const newArr = passwordArr.map((ele, index) => {
      if (index < value.split('').length) {
        return '●'
      } else {
        return '';
      }
    })
    this.setData({ passwordArr: newArr, pasInputVal: value });
  },
  bubble() {
    console.log('阻止冒泡');
  }
});
