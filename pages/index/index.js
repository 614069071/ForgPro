const app = getApp();
import util, { faceSendMes } from '../../utils/util.js';
import fetch from '../../fetch/index.js';
let rnum = 0;

Page({
  data: {
    mchOrderId: '',
    bannerList: ['/images/banner4.jpg'],
    // 支付相关
    paymentHide: true,
    amount: '0',
    autoplay: true
  },
  onLoad() {
    const self = this;
    const info = app.getCacheInfo();

    this.launchMpApp(info.mchPrivatekey);
    this.onKeyBoardHandle();
    util.getSavedFileList()
      .then(arr => {
        console.log(arr, 'images list');
        const list = arr.length ? arr : ['/images/banner4.jpg'];
        self.setData({ bannerList: list });
      })

    faceSendMes({ type: 'hideLoading' });
    console.log('index onload app.cacheInfo:', app.getCacheInfo());
  },
  onShow() {
    rnum = 0;
    console.log('index onshow  app.cacheInfo:', app.getCacheInfo());
  },
  goToCodePayInit() {
    wxfaceapp.listenCodePayment({
      success() {
        wxfaceapp.onCodePayEvent(() => {
          console.log('index2');
        })
      },
      fail(err) {
        console.log('index扫码支付失败', err);
      }
    })
  },
  onKeyBoardHandle() {
    const self = this;

    wxfaceapp.onRemoteMessage(function (res) {
      const data = JSON.parse(res.content) || {};
      console.log('后屏发送消息为：', data);
      // 接受到消息后，打开收银页面
      if (data.type === 'pay') {//支付
        self.setData({ paymentHide: false, autoplay: false, amount: data.amount });//显示支付页
        self.goToCodePay();
      } else if (data.type == 'cancle') {//取消支付
        self.setData({ paymentHide: true, autoplay: true });
        self.goToCodePayInit();
      } else if (data.type === 'reload') {//重载页面
        wx.reLaunch({ url: '/pages/index/index' });
        app.setCacheInfo();
      }
    });
  },
  launchMpApp(mchPrivatekey) {
    const { appId, hostAppId, miniappType } = app.globalData.backAppInfo;
    let path = mchPrivatekey ? "/pages/keyboard/keyboard" : "/pages/login/login";

    wxfaceapp.launchMp({
      appId, hostAppId, miniappType, launchPage: path, needLogin: 0,
      success(res) {
        console.log('index开启后屏收银成功')
      },
      fail(err) {
        console.log(err, 'index开启后屏收银失败')
      }
    })
  },
  goToCancel(mes = '') {
    this.setData({ paymentHide: true, autoplay: true });
    this.goToCodePayInit();
    const data = JSON.stringify({ type: 'cancel', mes });
    faceSendMes(data);
  },
  // 扫码支付（二维码支付）
  goToCodePay() {
    const self = this;
    wxfaceapp.listenCodePayment({
      success() {
        wxfaceapp.onCodePayEvent((res) => {
          const qrCode = res.code;
          const data = { codeType: 'C', barCode: qrCode };

          self.startCashier(data);
        })
      },
      fail(err) {
        console.log('扫码支付失败', err);
        faceSendMes({ type: 'cancel', mes: '扫码支付失败' });
      }
    })
  },
  // 刷脸支付
  goToFacePay: util.throttle(function () {
    const self = this;
    wxfaceapp.facePay({
      requireFaceCode: true,
      success() {
        //刷脸成功 event
        wxfaceapp.onFacePayPassEvent(function (r) {
          console.log('刷脸成功:', r);
          const { faceCode } = r;
          const data = { codeType: 'F', barCode: faceCode };

          self.startCashier(data);
        });

        wxfaceapp.onFacePayFailedEvent(function (r) {
          console.log('刷脸失败:', r);
        });
        wxfaceapp.onQueryPaymentSucEvent(function (r) {
          console.log('查单成功:', r);
        });
        wxfaceapp.onQueryPaymentFailedEvent(function (r) {
          console.log('查单失败:', r);
        });
      },
      fail(err) {
        console.log('刷脸失败', err);
        faceSendMes({ type: 'cancel', mes: '刷脸支付失败' });
      }
    })
  }),
  // 支付流程
  startCashier({ codeType, barCode }) {
    const self = this;
    const mchOrderId = "QM" + new Date().getTime() + util.getRandom(10);
    const params = { orderTimestamp: new Date().getTime() };
    const amount = this.data.amount;

    fetch
      .getTimeStamp(params)
      .then(res => {
        const { data } = res;
        const dataCard = { codeType, mchOrderId, authCode: barCode, orderTimestamp: data, orderAmt: amount };

        self.cardPayEvent(dataCard);
      })
  },
  //聚合支付（刷卡支付api）
  cardPayEvent(paramObj) {
    console.log('聚合支付 1');
    const wxReg = /^1[012345]\d{16}$/;
    const alipayReg = /((^2[56789]\d{14,22}$)|(^30\d{14,22}$))/;
    const unionpayReg = /^62[0-9A-Za-z]*$/;
    let channel = "alipay";
    let upayType = "SK";
    const self = this;

    // 商户信息
    if (wxReg.test(paramObj.authCode)) {
      //微信付款
      channel = "wx";
    } else if (alipayReg.test(paramObj.authCode)) {
      //支付宝
      channel = "alipay";
    } else if (unionpayReg.test(paramObj.authCode)) {
      //云闪付
      channel = "unionpay";
    } else {
      console.log('authCode', authCode);
      // 暂不支持
      wx.showToast({
        title: '暂不支持该支付类型',
        success() {
          self.goToCancel('暂不支持该支付类型');
        }
      });
      return;
    }
    if (paramObj.codeType == 'F') {
      upayType = "SL";
    }

    const { deviceFlag, version } = app.globalData;
    const info = app.getCacheInfo();
    const { terminalNo = '', mchId = '', shopId = '', cashierId = '', shopName = '', role = '', userName = '' } = info;
    let cashierMobile = '';

    if (role == 'cashier') {
      cashierMobile = userName || '';
    }
    if (role == 'ent') {
      cashierMobile = ''
    }

    const data = {
      deviceFlag, version, service: 'qing_wa', channel, cashierMobile, mchId, shopId, cashierId, terminalNo,
      merchantName: shopName, prodName: shopName, prodDesc: shopName, payType: upayType, orderTimeOut: 5000
    };
    const fullParam = Object.assign({}, paramObj, data);

    self.setData({ paymentHide: true, autoplay: true });
    self.goToCodePayInit();

    fetch
      .gateway(fullParam)
      .then(res => {
        const { returnCode, needQuery } = res.data;
        const { codeType, orderAmt, mchOrderId } = fullParam;
        const data = JSON.stringify({ type: 'result', returnCode, needQuery, codeType, orderAmt, mchOrderId });

        util.faceSendMes(data);
        if (returnCode !== 'SUCCESS' && needQuery === "Y") {
          const params = { mchOrderId, orderAmt, codeType };
          self.getPayRes(params);
        }
      })
      .catch((err) => {
        console.log('cardPayEvent err', err);
      })
  },
  //轮询获取交易结果
  getPayRes(obj) {
    console.log('轮询获取交易结果');
    const self = this;
    const { mchOrderId } = obj;
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
            clearTimeout(resTimer);
            util.faceSendMes({ type: 'result', result: 'result' });
          }
          if (tradeStatus === "BUYER_PAYING") {
            rnum++;
            if (rnum < 7) {
              resTimer = setTimeout(function () {
                self.getPayRes(obj)
              }, 3000)
            } else {
              clearTimeout(resTimer);
              util.faceSendMes({ type: 'result', result: 'fail' });
            }
          }
          if (tradeStatus === "TRADE_CLOSED") {
            clearTimeout(resTimer);
            util.faceSendMes({ type: 'result', result: 'fail' });
          }
        } else {
          clearTimeout(resTimer);
          util.faceSendMes({ type: 'result', result: 'fail' });
        }
      })
  },
  hideGoLogin() {
    util.manyClickExecute(() => {
      wx.redirectTo({ url: '/pages/keyboard/keyboard' });
    })
  }
})