Page({
  data: {
    amount: 0,
    countTime: 12,
    clear: false
  },
  onLoad(query) {
    this.getAmount(query.amount);
  },
  getAmount(amount = 0) {
    this.setData({ amount });
  },
  goToRecord() {
    this.setData({ clear: true });
  },
  //返回列表页
  goToBack() {
    const pages = getCurrentPages();
    const recordPage = pages[pages.length - 2];
    recordPage.setData({ isRefundBack: true });
    wx.navigateBack({ delta: 1 });
  }
});
