import fetch from '../../fetch/index.js';
import util from '../../utils/util.js';
const app = getApp();

Page({
  data: {
    amount: '0'
  },
  onLoad(ops) {
    this.setData({ amount: ops.amount });
    // 默认使用扫码支付
    this.goToCodePay();
  },
  onShow() {
    this.onRemoteMegHandle();
    console.log('cashier app.cacheInfo:', app.getCacheInfo());
  },
  onHide() { },
  onUnload() { },
  goToCancel(mes = '') {
    wx.navigateBack({
      fail() {
        wx.reLaunch({ url: '/pages/index/index' })
      }
    });
    // 取消支付，通知后屏
    const data = JSON.stringify({ type: 'cancel', mes });

    util.faceSendMes(data);
  },
  // 扫码支付（二维码支付）
  goToCodePay() {
    const self = this;
    // 监听扫码器
    wxfaceapp.listenCodePayment({
      success() {
        //注册扫码支付
        wxfaceapp.onCodePayEvent((res) => {
          const qrCode = res.code; // 付款码
          const data = {
            codeType: 'C',//F  刷脸 C 扫码 
            barCode: qrCode
          };
          // 支付
          self.startCashier(data);
        })
      },
      fail(err) {
        console.log('扫码支付失败');
      }
    })
  },
  // 刷脸支付
  goToFacePay: util.throttle(function () {
    const self = this;
    // 刷脸支付模块
    wxfaceapp.facePay({
      requireFaceCode: true, //是否需要获取付款码返回给小程序
      success() {
        //刷脸成功
        wxfaceapp.onFacePayPassEvent(function (r) {
          const { faceCode } = r;// 付款码
          const data = {
            codeType: 'F',//F  刷脸 C 扫码 
            barCode: faceCode //付款码
          };
          // 支付
          self.startCashier(data);
        })
      },
      fail(err) {
        console.log('刷脸失败', err)
      }
    })
  }),
  // 支付流程
  startCashier({ codeType, barCode }) {
    const self = this;
    let mchOrderId = "QM" + "" + new Date().getTime() + "" + util.getRandom(10);
    const amount = this.data.amount;
    //获取七分钱时间戳
    const params = { orderTimestamp: new Date().getTime() };
    fetch
      .getTimeStamp(params)
      .then(res => {
        const { data } = res;
        self.cardPayEvent({
          codeType: codeType,//F  刷脸 C 扫码
          mchOrderId,
          authCode: barCode,//条形码
          orderTimestamp: data,
          orderAmt: amount,//付款金额
        });
      })
  },
  //聚合支付（刷卡支付api）
  cardPayEvent(paramObj) {
    const wxReg = /^1[012345]\d{16}$/;
    const alipayReg = /((^2[56789]\d{14}$)|(^2[56789]\d{16}$)|(^3[0]\d{14}$)|(^3[0]\d{16}$))/;
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

    const { deviceFlag, version, frontAppInfo } = app.globalData;
    const info = app.getCacheInfo();
    const { terminalNo = '', mchId = '', shopId = '', cashierId = '', shopName = '', role = '', userName = '' } = info;
    let cashierMobile;

    if (role == 'cashier') {
      cashierMobile = userName || '';
    }
    if (role == 'ent') {
      cashierMobile = ''
    }

    const data = {
      deviceFlag,
      version,
      service: 'qing_wa',
      channel,
      cashierMobile,
      mchId,//商户ID
      shopId,//门店ID
      cashierId,//收银员ID
      terminalNo,//终端号
      merchantName: shopName,//商户名
      prodName: shopName,
      prodDesc: shopName,
      payType: upayType,//刷脸or扫码付款
      orderTimeOut: 5000
    };
    const fullParam = Object.assign({}, paramObj, data);

    fetch
      .gateway(fullParam)
      .then(res => {
        const { returnCode, needQuery } = res.data;
        const { codeType, orderAmt, mchOrderId } = fullParam;
        const data = JSON.stringify({ type: 'result', returnCode, needQuery, codeType, orderAmt, mchOrderId });

        if (channel !== 'wx') {
          //通知后屏收款结果
          util.faceSendMes(data);
        }

        wx.navigateBack({
          fail() {
            wx.reLaunch({ url: '/pages/index/index' })
          }
        });
      })
      .catch(() => {
        wx.navigateBack({
          fail() {
            wx.reLaunch({ url: '/pages/index/index' })
          }
        });
      })
  },
  // 启动后屏小程序
  launchMpApp() {
    const { appId, hostAppId, miniappType } = app.globalData.backAppInfo;
    const launchPage = "/pages/keyboard/keyboard";
    wxfaceapp.launchMp({
      appId,
      hostAppId,
      miniappType,
      launchPage,
      needLogin: 0,
      success() {
        console.log('cahhier开启后屏收银成功')
      },
      fail() {
        console.log('cahhier开启后屏收银失败')
      }
    })
  },
  // 监听消息
  onRemoteMegHandle() {
    wxfaceapp.onRemoteMessage(function (res) {
      const data = JSON.parse(res.content);

      if (data.type == 'cancle') {//取消支付
        wx.navigateBack({
          fail() {
            wx.reLaunch({ url: '/pages/index/index' })
          }
        });
      } else if (data.type === 'back') {
        wx.navigateBack({
          fail() {
            wx.reLaunch({ url: '/pages/index/index' })
          }
        });
      }
    });
  }
})