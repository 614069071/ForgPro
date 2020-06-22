import rsaSign from '../utils/rsaSign.js'
import utils from '../utils/util.js'

let cahcheInfo = {};

export const install = info => {
  // console.log('request cacheInfo', info);
  cahcheInfo = info;
}

const baseUrl = "https://combinedpay.qifenqian.com";//正式版
// const baseUrl = "https://combinedpay-uat.qifenqian.com";// uat
// const baseUrl = "https://sitcombined.qifenqian.com";//测试

const header = { "Content-Type": "application/x-www-form-urlencoded" };

export const loginHttp = (url, params) => {
  let signCode = rsaSign.signature(rsaSign.paramsWithASCII(params.data));
  let sign_data = { signType: 'RSA', signMsg: signCode };  // 加签
  const data = Object.assign({}, params.data, sign_data);

  const apiName = params.data.service || '时间戳';
  console.log('params', apiName, data);
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + url,
      data,
      header,
      method: 'POST',
      dataType: 'json',
      success(res) {
        let signObj = Object.assign({}, res.data);
        delete signObj.signType;
        delete signObj.signMsg;
        let pk = rsaSign.initpublicKey
        let isValid = rsaSign.vfSignature(signObj, res.data.signMsg, pk);
        console.log('login 验签');
        if (isValid) {
          resolve(res);
        } else {
          wx.showToast({
            title: '登录验签失败',
            success: () => { }
          });
          reject();
        }
      },
      fail(err) {
        reject(err);
        console.log('fail', apiName);
      },
      complete() {
        wx.hideLoading();
      }
    })
  })
}

export const http = (url, params) => {
  let mchPrivatekey = '';

  if (cahcheInfo.mchPrivatekey) {
    mchPrivatekey = cahcheInfo.mchPrivatekey;
  } else if (utils.fsm.get().mchPrivatekey) {
    mchPrivatekey = utils.fsm.get().mchPrivatekey;
  }

  let signCode = '';

  if (mchPrivatekey) {
    let prikey = '-----BEGIN PRIVATE KEY-----' + mchPrivatekey + '-----END PRIVATE KEY-----';
    signCode = rsaSign.signature(rsaSign.paramsWithASCII(params.data), prikey);
  } else {
    wx.showToast({
      icon: 'none',
      title: '请重新登录'
    });
    return;
  }

  let sign_data = { signType: 'RSA', signMsg: signCode }; // 加签
  const data = Object.assign({}, params.data, sign_data);
  const apiName = params.data.service || '时间戳';

  console.log('params', apiName, data);
  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + url,
      data,
      header,
      method: 'POST',
      dataType: 'json',
      success(res) {
        console.log('验签');
        let signObj = Object.assign({}, res.data);
        delete signObj.signType;
        delete signObj.signMsg;
        let isValid = true;
        if (res.data && res.data.returnCode == 'SUCCESS' && res.data.signMsg) {
          isValid = rsaSign.vfSignature(signObj, res.data.signMsg);
        }
        if (isValid || data.service == 'mch.query.orderstatus') {//退出登陆不验签
          resolve(res);
        } else {
          wx.showToast({
            title: '验签失败！',
            success: () => { }
          });
          reject();
        }
      },
      fail(err) {
        reject(err);
        console.log('fail', apiName);
      },
      complete() {
        wx.hideLoading();
      }
    })
  })
}