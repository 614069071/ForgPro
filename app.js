import fetch from './fetch/index.js';
import * as request from './fetch/request.js';
import utils, { fsm } from './utils/util.js';
import { appId, hostAppId, miniappType } from './config';
import rsaSign from './utils/rsaSign.js';

if (appId === 'wx5dfee4b4e54b5a61' && !miniappType) {
  console.log = () => { }
}

// pro: TXAP11939007428ND002112  新 TXAP11951002379ND002112
// fsm.set({ terminalNo: 'TXAP11951002379ND002112' });//测试账号

App({
  globalData: {
    refundInfo: {},
    bannerArr: ['/images/banner4.jpg'],
    backAppInfo: { appId, hostAppId, miniappType },
    frontAppInfo: { appId },
    deviceFlag: 'QINGWAPROv2',
    version: 'v2.0'
  },
  cacheInfo: {},
  onLaunch() {
    let isDebug = false;
    if (appId === 'wx5797cc3edc495083') {
      isDebug = true;
    } else {
      isDebug = miniappType ? true : false;
    }

    const info = fsm.get();
    wx.setEnableDebug({ enableDebug: isDebug });
    this.setCacheInfo(null, info);
    this.getDeviceProp(info);
  },
  //获取设备序列号
  getDeviceProp(info) {
    const self = this;
    wxfaceapp.checkWxFacePayOsInfo({
      success(res) {
        const { terminalNo = '', mchId = '', mchPrivatekey = '' } = info;
        const { osSerialNumber, screenInfo } = res;
        const bannerUpdateInfo = { terminalNo, mchId, mchPrivatekey };
        const data = { terminalNo: osSerialNumber };

        console.log(info, 'app info');
        console.log(res, '设备信息');

        if (screenInfo === 'back-screen') {
          utils.removeSavedFile();
          self.updateBanner(bannerUpdateInfo);
        }

        if (terminalNo) return;

        fsm.set(data, () => {
          self.setCacheInfo(null, data);
        });
      },
      fail(err) {
        console.log('获取设备号失败', err);
      }
    })
  },
  // 更新banner
  updateBanner(info) {
    const { deviceFlag, version } = this.globalData;
    const { terminalNo = '', mchId = '', mchPrivatekey = '' } = info;
    const params = { mchId, terminalNo, deviceFlag, version, service: 'mch_get_advertisement' };

    if (!mchPrivatekey) return;

    fetch
      .gateway(params)
      .then((res) => {
        utils.removeSavedFile();//清除下载到本地的图片

        const { returnCode = '', machineAdvert = '[]' } = res.data;
        const imagesArr = JSON.parse(machineAdvert || '[]') || [];

        if (returnCode !== 'SUCCESS' || !imagesArr.length) return;

        const list = utils.sort(imagesArr).map(ele => decodeURIComponent(ele.picture)); // 排序 转码
        // 下载图片存储在本地
        utils.downloadFile(list)
          .then(res => {
            console.log(res, 'app update banner downloadFile success');
            utils.faceSendMes({ type: 'reload' });
          })
      })
  },
  // 写入缓存数据
  setCacheInfo(callback, data) {
    const cache = data || fsm.get();
    console.log(cache, data, 'app setCacheInfo cache');
    request.install(cache);
    rsaSign.install(cache.qfqPublickey);
    this.cacheInfo = cache;
    callback && callback(cache);
  },
  getCacheInfo() {
    if (Object.keys(this.cacheInfo).length) {
      console.log('cache from app');
      return this.cacheInfo;
    } else if (Object.keys(fsm.get()).length) {
      const info = fsm.get();
      console.log('cache from fsm');
      this.setCacheInfo(null, info);
      return info;
    } else {
      console.log('cache from null');
      return {}
    }
  }
})