const app = getApp();
import { faceSendMes } from '../../utils/util';
import fetch from '../../fetch/index.js';
let resTimer = null;
let rnum = 0;
//校验金额正则
const reg = /(^[1-9][0-9]{0,4}([.][0-9]{0,2})?$)|(^0?(\.[0-9]{0,2})?$)/;

// socket
let is_socket_open = false;
let socket_url = 'ws://192.168.1.192:8083';//测试地址
let SocketTask = null;

Page({
  data: {
    shopName: '',
    amount: '',
    isLoading: false,
    countTime: 30,
    resultTxt: '等待用户支付…',
    isCountdownHide: true,
    clear: false,
    username: '',
    role: ''
  },
  onLoad() {
    console.log('keyboard onload', app.getCacheInfo());
    // socket
    // this.startConnectSocket();
    // this.handSocketEvents();
  },
  onShow() {
    this.update();
    // 监听前屏消息
    this.onRemoteMegHandle();
    rnum = 0;
    resTimer = null;
    console.log('keyboard app.cacheInfo:', app.getCacheInfo());
  },
  onUnload() {
    rnum = 0;
    this.setData({ amount: '', isLoading: false, isCountdownHide: true });
    wx.hideLoading();
    resTimer = null;
  },
  update() {
    const cacheInfo = app.getCacheInfo();
    const { shopName = '', cashierName = '', mchPrivatekey = '', role = '' } = cacheInfo;
    const username = cashierName.length ? `（${cashierName}）` : '';
    this.setData({ shopName, username, isLoading: false, amount: '', role });
    if (mchPrivatekey) return;
    wx.redirectTo({ url: '/pages/login/login' })
  },
  // 监听前屏消息
  onRemoteMegHandle() {
    const self = this;

    wxfaceapp.onRemoteMessage(function (res) {
      // loading时才监听消息,防止loading消失时，页面发生跳转
      if (!self.data.isLoading) return;

      const data = JSON.parse(res.content);

      if (data.type === 'result') {//支付结果
        self.dealResult(data);
      } else if (data.type === 'cancel') {
        wx.navigateTo({ url: `/pages/cancel/cancel?mes=${data.mes}` });
        self.resProcess();
      } else if (data.type === 'hideLoading') {
        self.setData({ isLoading: false });
      }
    });
  },
  // 处理交易结果
  dealResult(data) {
    const self = this;
    if (data.result) {
      if (data.result === 'result') {
        wx.navigateTo({ url: `/pages/result/result?amount=${data.orderAmt}` });
        self.resProcess();
      } else if (data.result === 'fail') {
        wx.navigateTo({ url: "/pages/fail/fail" });
      }
    } else {
      const { returnCode, needQuery, codeType, orderAmt, mchOrderId } = data;
      if (returnCode === 'SUCCESS') {
        wx.navigateTo({ url: `/pages/result/result?amount=${orderAmt}` });
        self.resProcess();
      } else {
        if (needQuery == "Y") {
          // 支付结果查询中(或 超额支付场景) 进入倒计时
          self.setData({ isCountdownHide: false });
        } else {
          wx.navigateTo({ url: "/pages/fail/fail" });
          self.resProcess();
        }
      }
    }
  },
  //获取交易结果
  getPayRes(obj) {
    const self = this;
    const { codeType, orderAmt, mchOrderId } = obj;
    const { version } = app.globalData;
    const info = app.getCacheInfo();
    const { terminalNo, mchId } = info;
    const param = { version, mchId, terminalNo, mchOrderId, service: 'mch.query.orderstatus' };

    fetch
      .gateway(param)
      .then(res => {
        const { returnCode, tradeStatus } = res.data;

        if (returnCode === "SUCCESS") {
          if (tradeStatus === "TRADE_SUCCESS") {
            clearInterval(resTimer);
            wx.navigateTo({ url: `/pages/result/result?amount=${orderAmt}` });
            self.resProcess();
          }
          if (tradeStatus === "BUYER_PAYING") {
            rnum++;
            if (rnum < 10) {
              resTimer = setTimeout(function () {
                self.getPayRes(obj)
              }, 3000)
            } else {
              clearInterval(resTimer);
              wx.navigateTo({ url: "/pages/fail/fail" });
              self.resProcess();
            }
          }
          if (tradeStatus === "TRADE_CLOSED") {
            clearInterval(resTimer);
            wx.navigateTo({ url: "/pages/fail/fail" });
            self.resProcess();
          }
        } else {
          clearInterval(resTimer);
          wx.navigateTo({ url: "/pages/fail/fail" });
          self.resProcess();
        }
      })
  },
  // 设置
  goToSetting() {
    wx.navigateTo({ url: '/pages/setting/setting' });
  },
  // 金额输入
  inputAmount(e) {
    const { key } = e.target.dataset;
    let { amount } = this.data;
    if (amount === '' && key === '.') {
      amount = '0.';
      this.setData({ amount });
    }
    amount += key;
    const flag = reg.test(amount);
    if (!flag) return;
    this.setData({ amount });
  },
  // 删除金额
  deleteAmount() {
    let { amount } = this.data;
    if (!amount.length) return;
    amount = amount.slice(0, -1);
    this.setData({ amount });
  },
  // 付款
  goToPayment() {
    const self = this;
    let { amount } = this.data;

    if (!parseFloat(amount)) return;//金额为0.00 | 0.0 | 0

    const data = JSON.stringify({ type: 'pay', amount });

    this.setData({ amount: '', isLoading: true, clear: false, isCountdownHide: true });

    faceSendMes(data, null, () => {
      self.setData({ isLoading: false });
      wx.showToast({ title: '收款失败' });
    });
  },
  // 取消支付
  goToCancle() {
    this.setData({ isLoading: false, isCountdownHide: true, countTime: 30 });
    faceSendMes({ type: 'cancle' });
  },
  // 初始化页面
  resProcess() {
    this.setData({ isLoading: false, isCountdownHide: true, clear: true, countTime: 30 });
  },
  // 超额支付场景
  hideLoading() {
    console.log('hideLoading');
    this.setData({ isLoading: false, countTime: 30, isCountdownHide: true });
  },
  // 连接 socket
  startConnectSocket() {
    SocketTask = wx.connectSocket({
      url: socket_url,
      success(res) {
        console.log('socket连接成功', res)
      },
      fail(err) {
        wx.showToast({ title: '网络异常！' })
        console.log(err)
      }
    });
  },
  // socket 事件
  handSocketEvents() {
    // 打开
    SocketTask.onOpen(res => {
      is_socket_open = true;
      console.log('Socket连接打开', res)
      const test_data = {
        code: "connect",
        sendSn: "yyy",//设备号
        value: ""
      };
      this.sendSocketMessage(test_data);
    })
    // 关闭
    SocketTask.onClose(res => {
      console.log('Socket连接关闭', res)
      is_socket_open = false;
    })
    // 错误
    SocketTask.onError(err => {
      console.log('Socket错误信息', err)
      is_socket_open = false
    })
    // 响应消息
    SocketTask.onMessage(res => {
      this.dealSocketMessage(res);
      console.log('监听服务器返回的消息', res)
    })
  },
  // 发送socket消息
  sendSocketMessage(data) {
    const socket_data = typeof data === 'object' ? JSON.stringify(data) : data;
    if (is_socket_open) {
      SocketTask.send({ data: socket_data })
    } else {
      console.log('is_socket_open false');
      this.startConnectSocket();
      SocketTask.send({ data: socket_data })
    }
  },
  // 处理socket消息
  dealSocketMessage(data) {
    const str = data.data.split('[')[0];
    const socket_data = JSON.parse(str);
    switch (socket_data.type) {
      case 'payment':
        console.log('支付');
        this.setData({ amount: socket_data.amount });
        this.goToPayment();
        break;
      case 'refund':
        console.log('退款');
        break;
      case 'login':
        console.log('登录');
        break;
      default:
        console.log('default', socket_data);
        break;
    }
  },
  // 关闭 socket
  closeSocket(data = '') {
    SocketTask.close({
      reason: data,//关闭socket原因
      success(res) {
        console.log(res);
      },
      fail(err) {
        console.log(err);
      }
    });
  }
})