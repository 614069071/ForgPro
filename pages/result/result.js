Page({
  data: {
    amount: 0,
    countTime: 12,
    clear: false
  },
  onLoad({ amount = 0 }) {
    this.setData({ amount });
  },
  //返回首页
  goToIndex() {
    this.setData({ clear: true });
  },
  goToBack() {
    wx.navigateBack();
  }
});
