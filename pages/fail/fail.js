Page({
  data: {
    countTime: 12,
    service: '支付失败，请重新支付',
    type: 'trade',
    delta: 1,
    clear: false
  },
  onLoad(query) {
    if (query.type) {
      this.setData({
        service: query.Msg
      })
      this.data.type = 'record';
    }

    if (query.delta) {
      this.setData({ delta: query.delta });
    }
  },
  //返回收银
  goToIndex() {
    this.setData({ clear: true });
  },
  goToBack() {
    const { delta } = this.data;
    const d = parseInt(delta) || 1;
    wx.navigateBack({ delta: d });
  }
});
