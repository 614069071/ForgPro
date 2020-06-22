import fetch from '../../fetch/index.js';
import { fsm, faceSendMes } from '../../utils/util.js';
const app = getApp();

Page({
  data: {
    shops: []
  },
  onLoad() {
    wx.showLoading({ title: 'loading…' });
    this.getShopList();
  },
  onShow() {
    console.log('shop onshow app.cacheInfo', app.getCacheInfo());
  },
  //获取门店列表
  getShopList() {
    const self = this;
    const { deviceFlag, version } = app.globalData;
    const info = app.getCacheInfo();
    const { mchId = '', shopId = '', terminalNo = '' } = info;
    let obj = { deviceFlag, version, mchId, terminalNo, service: 'get_shop_list' };
    let params = Object.assign({}, obj);

    fetch
      .gateway(params)
      .then(res => {
        wx.hideLoading();
        let shopList = JSON.parse(res.data.shopList || '[]');

        if (!shopList.length) return;

        for (let i = 0; i < shopList.length; i++) {
          if (shopList[i].shopId === shopId) {
            shopList[i].checked = true;
          }
        }
        self.setData({
          shops: shopList
        })
      })
  },
  setShop(e, callback) {
    const { shop } = e.detail.value;
    const [shopId, shopName] = shop.split('@');
    const info = app.getCacheInfo();
    const data = Object.assign({}, info, { shopId, shopName });

    console.log(data, 'setShop');

    fsm.set(data, () => {
      app.setCacheInfo(callback, data);
      faceSendMes({ type: 'reload' });
    });
  },
  onSubmit(e) {
    const { shop } = e.detail.value;
    const pages = getCurrentPages();
    const route = (pages[pages.length - 2] || {}).route || '';

    if (shop) {
      this.setShop(e, function () {
        route ? wx.navigateBack() : wx.redirectTo({ url: '/pages/keyboard/keyboard' })
      });
    } else {
      wx.showToast({
        icon: 'none',
        title: '请选择门店！'
      });
    }
  },
});
