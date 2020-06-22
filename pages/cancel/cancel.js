Page({
  data: {
    countTime: 12,
    mes: '支付已取消',
    clear: false
  },
  onLoad({ mes = '' }) {
    if (!mes) return;
    this.setData({ mes });
  },
  goToIndex() {
    this.setData({ clear: true });
  },
  //返回收银
  goToBack() {
    wx.navigateBack();
  }
});
